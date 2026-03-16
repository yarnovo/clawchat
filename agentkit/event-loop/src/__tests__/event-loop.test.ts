import { describe, it, expect, vi } from 'vitest';
import { createEvent, EventLoop, formatEvent } from '../index.js';
import type { AgentEvent, Runnable } from '../index.js';

// ---- helpers ----

function makeAgent(reply = 'agent reply'): Runnable & { run: ReturnType<typeof vi.fn>; inject: ReturnType<typeof vi.fn> } {
  return {
    run: vi.fn().mockResolvedValue(reply),
    inject: vi.fn(),
  };
}

// ========================================
// createEvent()
// ========================================

describe('createEvent', () => {
  it('generates id, timestamp, and assigns type/source/payload', () => {
    const event = createEvent('message', 'user', { text: 'hello' });
    expect(event.id).toBeDefined();
    expect(event.type).toBe('message');
    expect(event.source).toBe('user');
    expect(event.payload).toEqual({ text: 'hello' });
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('generates unique ids', () => {
    const a = createEvent('a', 's', {});
    const b = createEvent('b', 's', {});
    expect(a.id).not.toBe(b.id);
  });
});

// ========================================
// formatEvent()
// ========================================

describe('formatEvent', () => {
  it('formats message events as plain text', () => {
    const event = createEvent('message', 'http', { text: 'hello world' });
    expect(formatEvent(event)).toBe('hello world');
  });

  it('formats timer events with task name and prompt', () => {
    const event = createEvent('timer', 'scheduler', { taskName: 'daily', prompt: 'report' });
    expect(formatEvent(event)).toBe('[定时任务: daily] report');
  });

  it('formats unknown event types as JSON', () => {
    const event = createEvent('webhook', 'github', { action: 'push' });
    expect(formatEvent(event)).toBe('[webhook:github] {"action":"push"}');
  });
});

// ========================================
// EventLoop.push() — idle agent
// ========================================

describe('EventLoop.push() — agent idle', () => {
  it('calls agent.run() when agent is idle', async () => {
    const loop = new EventLoop();
    const agent = makeAgent('hi there');
    loop.bind(agent);

    const result = await loop.push(createEvent('message', 'http', { text: 'hello' }));
    expect(agent.run).toHaveBeenCalledWith('hello');
    expect(result).toBe('hi there');
  });

  it('sets isProcessing during run', async () => {
    const loop = new EventLoop();
    let resolveRun!: (v: string) => void;

    const agent: Runnable = {
      run: vi.fn((): Promise<string> => new Promise(r => { resolveRun = r; })),
      inject: vi.fn(),
    };
    loop.bind(agent);

    const p = loop.push(createEvent('message', 'src', { text: 'test' }));
    // run is pending → isProcessing should be true
    expect(loop.isProcessing).toBe(true);

    resolveRun('ok');
    await p;
    expect(loop.isProcessing).toBe(false);
  });

  it('clears isProcessing after run completes', async () => {
    const loop = new EventLoop();
    loop.bind(makeAgent());
    await loop.push(createEvent('message', 'src', { text: 'x' }));
    expect(loop.isProcessing).toBe(false);
  });

  it('clears isProcessing even when run throws', async () => {
    const loop = new EventLoop();
    const agent: Runnable = {
      run: vi.fn().mockRejectedValue(new Error('boom')),
      inject: vi.fn(),
    };
    loop.bind(agent);

    await expect(loop.push(createEvent('message', 'src', { text: 'x' }))).rejects.toThrow('boom');
    expect(loop.isProcessing).toBe(false);
  });
});

// ========================================
// EventLoop.push() — agent busy → inject
// ========================================

describe('EventLoop.push() — agent busy → inject', () => {
  it('calls inject when agent is already running', async () => {
    const loop = new EventLoop();
    let resolveRun!: (value: string) => void;
    const agent: Runnable = {
      run: vi.fn((): Promise<string> => new Promise(r => { resolveRun = r; })),
      inject: vi.fn(),
    };
    loop.bind(agent);

    // First push starts run (pending)
    const p1 = loop.push(createEvent('message', 'http', { text: 'first' }));
    expect(loop.isProcessing).toBe(true);

    // Second push should inject
    const p2 = loop.push(createEvent('message', 'http', { text: 'second' }));
    expect(agent.inject).toHaveBeenCalledWith('second');
    expect(agent.run).toHaveBeenCalledTimes(1); // NOT called again

    // Resolve the run
    resolveRun('done');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('done');
    expect(r2).toBe('done'); // same result — they share the run
  });

  it('multiple inject calls all share the same run result', async () => {
    const loop = new EventLoop();
    let resolveRun!: (value: string) => void;
    const agent: Runnable = {
      run: vi.fn((): Promise<string> => new Promise(r => { resolveRun = r; })),
      inject: vi.fn(),
    };
    loop.bind(agent);

    const p1 = loop.push(createEvent('message', 'a', { text: 'msg1' }));
    const p2 = loop.push(createEvent('message', 'b', { text: 'msg2' }));
    const p3 = loop.push(createEvent('timer', 'c', { taskName: 't', prompt: 'p' }));

    expect(agent.inject).toHaveBeenCalledTimes(2);
    expect(agent.run).toHaveBeenCalledTimes(1);

    resolveRun('shared result');
    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual(['shared result', 'shared result', 'shared result']);
  });

  it('new push after run completes starts a new run', async () => {
    const loop = new EventLoop();
    const agent = makeAgent('reply');
    loop.bind(agent);

    await loop.push(createEvent('message', 'src', { text: 'first' }));
    expect(agent.run).toHaveBeenCalledTimes(1);
    expect(loop.isProcessing).toBe(false);

    await loop.push(createEvent('message', 'src', { text: 'second' }));
    expect(agent.run).toHaveBeenCalledTimes(2);
    expect(agent.inject).not.toHaveBeenCalled(); // no inject needed
  });
});

// ========================================
// EventLoop.fire() — fire-and-forget
// ========================================

describe('EventLoop.fire()', () => {
  it('pushes event without returning a promise', () => {
    const loop = new EventLoop();
    loop.bind(makeAgent());
    const result = loop.fire(createEvent('test', 'src', { text: 'hi' }));
    expect(result).toBeUndefined();
  });

  it('does not throw when handler errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loop = new EventLoop();
    const agent: Runnable = {
      run: vi.fn().mockRejectedValue(new Error('boom')),
      inject: vi.fn(),
    };
    loop.bind(agent);

    loop.fire(createEvent('test', 'src', { text: 'hi' }));
    await new Promise(r => setTimeout(r, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    consoleErrorSpy.mockRestore();
  });
});

// ========================================
// EventLoop — no agent bound
// ========================================

describe('EventLoop — no agent bound', () => {
  it('push throws when no agent is bound', async () => {
    const loop = new EventLoop();
    await expect(loop.push(createEvent('test', 'src', { text: 'x' }))).rejects.toThrow('no agent bound');
  });
});

// ========================================
// EventLoop.isProcessing
// ========================================

describe('EventLoop.isProcessing', () => {
  it('starts as false', () => {
    expect(new EventLoop().isProcessing).toBe(false);
  });
});
