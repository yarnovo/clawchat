import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { memoryExtension } from '../index.js';
import type { AgenticContext } from '@agentkit/agentic';

/**
 * Helper: create a temp directory and return a minimal AgenticContext.
 */
function makeTempCtx(): { ctx: AgenticContext; tmpDir: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-ext-test-'));
  return {
    tmpDir,
    ctx: { workDir: tmpDir, eventLoop: null as any },
  };
}

describe('memoryExtension', () => {
  let tmpDir: string;
  let ctx: AgenticContext;

  beforeEach(() => {
    const t = makeTempCtx();
    tmpDir = t.tmpDir;
    ctx = t.ctx;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── Basic shape ────────────────────────────────────────────
  it('returns an Extension with name "memory"', () => {
    const ext = memoryExtension();
    expect(ext.name).toBe('memory');
    expect(ext.setup).toBeTypeOf('function');
    expect(ext.systemPrompt).toBeTypeOf('function');
    expect(ext.postBash).toBeTypeOf('function');
    expect(ext.info).toBeTypeOf('function');
  });

  // ─── setup ──────────────────────────────────────────────────
  describe('setup', () => {
    it('loads MEMORY.md if it exists', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '## 2024-01-01\n- remember this');
      const ext = memoryExtension();
      await ext.setup!(ctx);
      const info = ext.info!() as { loaded: boolean; size: number };
      expect(info.loaded).toBe(true);
      expect(info.size).toBeGreaterThan(0);
    });

    it('skips gracefully if MEMORY.md does not exist', async () => {
      const ext = memoryExtension();
      await ext.setup!(ctx);
      const info = ext.info!() as { loaded: boolean; size: number };
      expect(info.loaded).toBe(false);
      expect(info.size).toBe(0);
    });

    it('truncates content if it exceeds maxSize', async () => {
      const maxSize = 50;
      const longContent = 'x'.repeat(200);
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), longContent);
      const ext = memoryExtension({ maxSize });
      await ext.setup!(ctx);

      const info = ext.info!() as { size: number };
      // maxSize chars + '\n[truncated]' (12 chars)
      expect(info.size).toBe(maxSize + '\n[truncated]'.length);

      // The system prompt should contain the truncation marker
      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('[truncated]');
    });

    it('trims whitespace from the loaded content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '  hello  \n\n');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('hello');
      // The trimmed content should not have leading/trailing whitespace
      expect(prompt).not.toContain('  hello  ');
    });

    it('treats an empty (whitespace-only) file as no content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '   \n\n  ');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const info = ext.info!() as { loaded: boolean; size: number };
      expect(info.loaded).toBe(false);
      expect(info.size).toBe(0);
    });
  });

  // ─── systemPrompt ──────────────────────────────────────────
  describe('systemPrompt', () => {
    it('returns instructions + content when MEMORY.md has content', async () => {
      const memContent = '## 2024-01-01\n- important note';
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), memContent);
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const prompt = ext.systemPrompt!()!;

      // Must include the instruction block
      expect(prompt).toContain('## Memory');
      expect(prompt).toContain('MEMORY.md');
      expect(prompt).toContain('追加记忆');

      // Must include the actual memory content
      expect(prompt).toContain('### 当前记忆内容');
      expect(prompt).toContain('important note');
    });

    it('returns instructions only when MEMORY.md does not exist', async () => {
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const prompt = ext.systemPrompt!()!;

      expect(prompt).toContain('## Memory');
      expect(prompt).not.toContain('### 当前记忆内容');
    });

    it('uses a custom filename in instructions when configured', async () => {
      const customName = 'NOTES.md';
      fs.writeFileSync(path.join(tmpDir, customName), 'custom content');
      const ext = memoryExtension({ filename: customName });
      await ext.setup!(ctx);

      const prompt = ext.systemPrompt!()!;

      expect(prompt).toContain(customName);
      expect(prompt).toContain('custom content');
      // Should NOT reference the default filename
      expect(prompt).not.toContain('MEMORY.md');
    });

    it('returns instructions referencing default filename before setup', () => {
      const ext = memoryExtension();
      // systemPrompt can be called before setup; content is empty
      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('MEMORY.md');
      expect(prompt).not.toContain('### 当前记忆内容');
    });
  });

  // ─── postBash ──────────────────────────────────────────────
  describe('postBash', () => {
    it('hot-reloads content after detecting a write with >', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'initial');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      // Simulate the Agent appending to the file
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'initial\n- new stuff');
      await ext.postBash!('echo "- new stuff" >> MEMORY.md', '', false);

      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('new stuff');

      const info = ext.info!() as { size: number };
      expect(info.size).toBe('initial\n- new stuff'.length);
    });

    it('hot-reloads content after detecting a write with tee', async () => {
      const ext = memoryExtension();
      await ext.setup!(ctx);

      // File created by tee
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'tee content');
      await ext.postBash!('echo "tee content" | tee MEMORY.md', '', false);

      const info = ext.info!() as { loaded: boolean };
      expect(info.loaded).toBe(true);

      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('tee content');
    });

    it('ignores commands that do not reference the memory file', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'original');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      // Overwrite the file on disk but run an unrelated command
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'changed on disk');
      await ext.postBash!('echo "hello" > other.txt', '', false);

      // Content should still be the original (not reloaded)
      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('original');
      expect(prompt).not.toContain('changed on disk');
    });

    it('ignores commands that mention filename but have no write operator', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'original');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'changed on disk');
      await ext.postBash!('cat MEMORY.md', '', false);

      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('original');
    });

    it('truncates on hot-reload if content exceeds maxSize', async () => {
      const maxSize = 30;
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'short');
      const ext = memoryExtension({ maxSize });
      await ext.setup!(ctx);

      // Simulate a write that makes the file exceed maxSize
      const bigContent = 'a'.repeat(100);
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), bigContent);
      await ext.postBash!('echo "lots" >> MEMORY.md', '', false);

      const info = ext.info!() as { size: number };
      expect(info.size).toBe(maxSize + '\n[truncated]'.length);
    });

    it('works with custom filename', async () => {
      const customName = 'NOTES.md';
      fs.writeFileSync(path.join(tmpDir, customName), 'initial');
      const ext = memoryExtension({ filename: customName });
      await ext.setup!(ctx);

      fs.writeFileSync(path.join(tmpDir, customName), 'updated notes');
      await ext.postBash!('echo "updated" >> NOTES.md', '', false);

      const prompt = ext.systemPrompt!()!;
      expect(prompt).toContain('updated notes');
    });
  });

  // ─── info ──────────────────────────────────────────────────
  describe('info', () => {
    it('returns file, loaded, and size when MEMORY.md has content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'some content');
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const info = ext.info!();
      expect(info).toEqual({
        file: 'MEMORY.md',
        loaded: true,
        size: 'some content'.length,
      });
    });

    it('returns loaded=false and size=0 when MEMORY.md is absent', async () => {
      const ext = memoryExtension();
      await ext.setup!(ctx);

      const info = ext.info!();
      expect(info).toEqual({
        file: 'MEMORY.md',
        loaded: false,
        size: 0,
      });
    });

    it('reports the custom filename', async () => {
      const ext = memoryExtension({ filename: 'BRAIN.md' });
      await ext.setup!(ctx);

      const info = ext.info!();
      expect(info).toEqual({
        file: 'BRAIN.md',
        loaded: false,
        size: 0,
      });
    });
  });
});
