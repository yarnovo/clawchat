import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { schedulerChannel } from '../index.js';
import type { Channel, AgenticContext } from '@agentkit/agentic';
import type { EventLoop } from '@agentkit/event-loop';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temp working directory and return its path */
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-test-'));
}

/** Write a HEARTBEAT.md file in the given workDir */
function writeHeartbeat(workDir: string, content: string): void {
  fs.writeFileSync(path.join(workDir, 'HEARTBEAT.md'), content, 'utf-8');
}

/** Build a minimal mock EventLoop with a push spy */
function mockEventLoop(): EventLoop {
  return {
    push: vi.fn().mockResolvedValue(''),
    fire: vi.fn(),
    bind: vi.fn(),
    get isProcessing() { return false; },
  } as unknown as EventLoop;
}

/** Build an AgenticContext from a workDir + optional EventLoop */
function makeCtx(workDir: string, loop?: EventLoop): AgenticContext {
  return { workDir, eventLoop: loop ?? mockEventLoop() };
}

/** Clean up a temp directory (best-effort) */
function rmDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('schedulerChannel', () => {
  let workDir: string;
  let channel: Channel;

  beforeEach(() => {
    workDir = makeTmpDir();
    channel = schedulerChannel();
  });

  afterEach(async () => {
    // Always teardown to clear timers / watchers
    try { await channel.teardown?.(); } catch { /* ignore */ }
    rmDir(workDir);
  });

  // ---- name ----
  it('returns a Channel with name "scheduler"', () => {
    expect(channel.name).toBe('scheduler');
  });

  // ---- systemPrompt ----
  it('systemPrompt returns HEARTBEAT.md format documentation', () => {
    const prompt = channel.systemPrompt?.();
    expect(prompt).toBeDefined();
    expect(prompt).toContain('HEARTBEAT.md');
    expect(prompt).toContain('cron:');
    expect(prompt).toContain('prompt:');
    // Should mention the format rule about ## heading
    expect(prompt).toContain('## ');
  });

  // ---- setup: loads tasks from HEARTBEAT.md ----
  describe('setup', () => {
    it('loads tasks from a valid HEARTBEAT.md', async () => {
      writeHeartbeat(workDir, `## Morning Report
cron: 0 9 * * *
prompt: Generate a morning report

## Hourly Check
cron: 0 * * * *
prompt: Run hourly health check
`);

      const loop = mockEventLoop();
      await channel.setup(makeCtx(workDir, loop));

      const info = channel.info?.() as { tasks: Array<{ name: string; cron: string; nextRun?: string }> };
      expect(info).toBeDefined();
      expect(info.tasks).toHaveLength(2);
      expect(info.tasks[0].name).toBe('Morning Report');
      expect(info.tasks[0].cron).toBe('0 9 * * *');
      expect(info.tasks[1].name).toBe('Hourly Check');
      expect(info.tasks[1].cron).toBe('0 * * * *');
      // nextRun should be computed
      expect(info.tasks[0].nextRun).toBeDefined();
      expect(info.tasks[1].nextRun).toBeDefined();
    });

    it('handles missing HEARTBEAT.md gracefully (zero tasks)', async () => {
      // No HEARTBEAT.md written — workDir is empty
      const loop = mockEventLoop();
      await channel.setup(makeCtx(workDir, loop));

      const info = channel.info?.() as { tasks: Array<unknown> };
      expect(info.tasks).toHaveLength(0);
    });

    it('creates a scheduler.log file on setup', async () => {
      writeHeartbeat(workDir, `## Task A
cron: */5 * * * *
prompt: Do something
`);
      await channel.setup(makeCtx(workDir));

      const logPath = path.join(workDir, 'logs', 'scheduler.log');
      expect(fs.existsSync(logPath)).toBe(true);
      const logContent = fs.readFileSync(logPath, 'utf-8');
      expect(logContent).toContain('Started: 1 tasks');
    });
  });

  // ---- parseHeartbeat: valid entries ----
  describe('parseHeartbeat (via setup + info)', () => {
    it('parses valid entries with name, cron, and prompt', async () => {
      writeHeartbeat(workDir, `## Daily Digest
cron: 30 8 * * *
prompt: Summarize yesterday's activity
`);

      await channel.setup(makeCtx(workDir));
      const info = channel.info?.() as { tasks: Array<{ name: string; cron: string }> };
      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].name).toBe('Daily Digest');
      expect(info.tasks[0].cron).toBe('30 8 * * *');
    });

    it('reports missing cron or prompt (skips the task, logs error)', async () => {
      writeHeartbeat(workDir, `## Missing Cron
prompt: No cron here

## Missing Prompt
cron: 0 9 * * *

## Valid Task
cron: 0 10 * * *
prompt: Do something valid
`);

      await channel.setup(makeCtx(workDir));

      // Only the valid task should be loaded
      const info = channel.info?.() as { tasks: Array<{ name: string }> };
      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].name).toBe('Valid Task');

      // Errors should be logged
      const logContent = fs.readFileSync(path.join(workDir, 'logs', 'scheduler.log'), 'utf-8');
      expect(logContent).toContain('Skipped: "Missing Cron": missing cron or prompt');
      expect(logContent).toContain('Skipped: "Missing Prompt": missing cron or prompt');
    });

    it('reports invalid cron expression (skips the task, logs error)', async () => {
      writeHeartbeat(workDir, `## Bad Cron
cron: not-a-valid-cron
prompt: This will fail

## Good Task
cron: */10 * * * *
prompt: This is fine
`);

      await channel.setup(makeCtx(workDir));

      const info = channel.info?.() as { tasks: Array<{ name: string }> };
      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].name).toBe('Good Task');

      const logContent = fs.readFileSync(path.join(workDir, 'logs', 'scheduler.log'), 'utf-8');
      expect(logContent).toContain('Skipped: "Bad Cron": invalid cron');
    });

    it('handles empty content (zero tasks)', async () => {
      writeHeartbeat(workDir, '');
      await channel.setup(makeCtx(workDir));

      const info = channel.info?.() as { tasks: Array<unknown> };
      expect(info.tasks).toHaveLength(0);
    });

    it('handles content with only whitespace (zero tasks)', async () => {
      writeHeartbeat(workDir, '   \n\n   \n');
      await channel.setup(makeCtx(workDir));

      const info = channel.info?.() as { tasks: Array<unknown> };
      expect(info.tasks).toHaveLength(0);
    });
  });

  // ---- teardown ----
  describe('teardown', () => {
    it('clears timer and watcher without error', async () => {
      writeHeartbeat(workDir, `## Task
cron: 0 9 * * *
prompt: Do it
`);

      await channel.setup(makeCtx(workDir));

      // teardown should not throw
      await expect(channel.teardown!()).resolves.toBeUndefined();

      // Log should record "Stopped"
      const logContent = fs.readFileSync(path.join(workDir, 'logs', 'scheduler.log'), 'utf-8');
      expect(logContent).toContain('Stopped');
    });

    it('teardown works even when no HEARTBEAT.md exists', async () => {
      await channel.setup(makeCtx(workDir));
      await expect(channel.teardown!()).resolves.toBeUndefined();
    });
  });

  // ---- info ----
  describe('info', () => {
    it('returns tasks list with name, cron, and nextRun', async () => {
      writeHeartbeat(workDir, `## Alpha
cron: 0 9 * * *
prompt: Alpha prompt

## Beta
cron: 30 14 * * 1-5
prompt: Beta prompt
`);

      await channel.setup(makeCtx(workDir));
      const info = channel.info?.() as { tasks: Array<{ name: string; cron: string; nextRun?: string }> };

      expect(info.tasks).toHaveLength(2);

      expect(info.tasks[0]).toEqual(expect.objectContaining({ name: 'Alpha', cron: '0 9 * * *' }));
      expect(info.tasks[0].nextRun).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date string

      expect(info.tasks[1]).toEqual(expect.objectContaining({ name: 'Beta', cron: '30 14 * * 1-5' }));
      expect(info.tasks[1].nextRun).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns empty tasks list when no HEARTBEAT.md', async () => {
      await channel.setup(makeCtx(workDir));
      const info = channel.info?.() as { tasks: Array<unknown> };
      expect(info.tasks).toEqual([]);
    });
  });

  // ---- cron polling ----
  describe('cron polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires event when a task is due', async () => {
      // Create a task with a cron that was due in the past (every minute)
      writeHeartbeat(workDir, `## Frequent Task
cron: * * * * *
prompt: Run every minute
`);

      const loop = mockEventLoop();
      await channel.setup(makeCtx(workDir, loop));

      // The task should have nextRun set. We advance time past 60s to trigger the poll.
      // First, set the task's nextRun to "now" so it fires on next poll
      const info = channel.info?.() as { tasks: Array<{ name: string; nextRun?: string }> };
      expect(info.tasks).toHaveLength(1);

      // Advance past the poll interval (60_000ms)
      await vi.advanceTimersByTimeAsync(60_000);

      // loop.push should have been called with a timer event
      expect(loop.push).toHaveBeenCalled();
      const call = (loop.push as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.type).toBe('timer');
      expect(call.source).toBe('scheduler');
      expect(call.payload.prompt).toBe('Run every minute');
      expect(call.payload.taskName).toBe('Frequent Task');
    });

    it('does not fire event for task not yet due', async () => {
      // A task scheduled at a specific far-future time (e.g., 0 0 1 1 * = Jan 1 midnight)
      writeHeartbeat(workDir, `## Yearly Task
cron: 0 0 1 1 *
prompt: Happy New Year
`);

      const loop = mockEventLoop();
      await channel.setup(makeCtx(workDir, loop));

      // Advance one poll interval
      await vi.advanceTimersByTimeAsync(60_000);

      // Should NOT have fired because the task is far in the future
      expect(loop.push).not.toHaveBeenCalled();
    });

    it('logs success after event push', async () => {
      writeHeartbeat(workDir, `## Quick Task
cron: * * * * *
prompt: Quick run
`);

      const loop = mockEventLoop();
      await channel.setup(makeCtx(workDir, loop));

      await vi.advanceTimersByTimeAsync(60_000);

      const logContent = fs.readFileSync(path.join(workDir, 'logs', 'scheduler.log'), 'utf-8');
      expect(logContent).toMatch(/Quick Task/);
    });

    it('logs failure when event push rejects', async () => {
      writeHeartbeat(workDir, `## Failing Task
cron: * * * * *
prompt: This will fail
`);

      const loop = mockEventLoop();
      (loop.push as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('push failed'));
      await channel.setup(makeCtx(workDir, loop));

      await vi.advanceTimersByTimeAsync(60_000);

      const logContent = fs.readFileSync(path.join(workDir, 'logs', 'scheduler.log'), 'utf-8');
      expect(logContent).toContain('Failing Task: push failed');
    });
  });

  // ---- multiple sections ----
  describe('edge cases', () => {
    it('handles multiple valid and invalid sections mixed', async () => {
      writeHeartbeat(workDir, `## Valid One
cron: 0 8 * * *
prompt: First valid

## No Prompt
cron: 0 9 * * *

## Bad Cron Entry
cron: invalid-expr
prompt: Will fail

## Valid Two
cron: 30 17 * * 5
prompt: Second valid
`);

      await channel.setup(makeCtx(workDir));
      const info = channel.info?.() as { tasks: Array<{ name: string }> };

      expect(info.tasks).toHaveLength(2);
      expect(info.tasks.map(t => t.name)).toEqual(['Valid One', 'Valid Two']);
    });

    it('handles section with extra whitespace and blank lines', async () => {
      writeHeartbeat(workDir, `
## Spaced Out

cron: 0 12 * * *

prompt: Lunchtime reminder

`);

      await channel.setup(makeCtx(workDir));
      const info = channel.info?.() as { tasks: Array<{ name: string; cron: string }> };

      expect(info.tasks).toHaveLength(1);
      expect(info.tasks[0].name).toBe('Spaced Out');
      expect(info.tasks[0].cron).toBe('0 12 * * *');
    });
  });
});
