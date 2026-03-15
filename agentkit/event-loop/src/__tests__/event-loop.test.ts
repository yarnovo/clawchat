import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEvent, EventLoop } from '../index.js';
import type { AgentEvent } from '../index.js';

// ========================================
// createEvent()
// ========================================

describe('createEvent', () => {
  it('generates id, timestamp, and assigns type/source/payload', () => {
    const event = createEvent('message', 'user', { text: 'hello' });

    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.type).toBe('message');
    expect(event.source).toBe('user');
    expect(event.payload).toEqual({ text: 'hello' });
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('generates unique ids for different events', () => {
    const a = createEvent('a', 's', {});
    const b = createEvent('b', 's', {});
    expect(a.id).not.toBe(b.id);
  });

  it('sets priority when provided', () => {
    const event = createEvent('msg', 'src', {}, 5);
    expect(event.priority).toBe(5);
  });

  it('leaves priority undefined when not provided', () => {
    const event = createEvent('msg', 'src', {});
    expect(event.priority).toBeUndefined();
  });
});

// ========================================
// EventLoop constructor
// ========================================

describe('EventLoop constructor', () => {
  it('uses sequential strategy by default', () => {
    const loop = new EventLoop();
    // Verify default behaviour: push resolves one at a time (sequential)
    // We indirectly test by confirming it works without options
    expect(loop.pending).toBe(0);
    expect(loop.isProcessing).toBe(false);
  });

  it('accepts custom options', () => {
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 500,
      batchMax: 5,
    });
    expect(loop.pending).toBe(0);
    expect(loop.isProcessing).toBe(false);
  });
});

// ========================================
// EventLoop.push() — sequential strategy
// ========================================

describe('EventLoop.push() — sequential', () => {
  let loop: EventLoop;

  beforeEach(() => {
    loop = new EventLoop({ strategy: 'sequential' });
    loop.start();
  });

  afterEach(() => {
    loop.stop();
  });

  it('returns a promise that resolves with the handler result', async () => {
    loop.onProcess(async (_events) => 'done');

    const result = await loop.push(createEvent('test', 'src', {}));
    expect(result).toBe('done');
  });

  it('processes events one at a time', async () => {
    const order: number[] = [];
    loop.onProcess(async (events) => {
      expect(events.length).toBe(1);
      const idx = events[0].payload['idx'] as number;
      order.push(idx);
      return `result-${idx}`;
    });

    const p1 = loop.push(createEvent('test', 'src', { idx: 1 }));
    const p2 = loop.push(createEvent('test', 'src', { idx: 2 }));
    const p3 = loop.push(createEvent('test', 'src', { idx: 3 }));

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe('result-1');
    expect(r2).toBe('result-2');
    expect(r3).toBe('result-3');
    expect(order).toEqual([1, 2, 3]);
  });

  it('does not process events before start() is called', async () => {
    const loop2 = new EventLoop({ strategy: 'sequential' });
    const handler = vi.fn(async () => 'ok');
    loop2.onProcess(handler);

    // Push without calling start()
    const p = loop2.push(createEvent('test', 'src', {}));
    // Give microtasks a chance to run
    await new Promise((r) => setTimeout(r, 50));
    expect(handler).not.toHaveBeenCalled();
    expect(loop2.pending).toBe(1);

    // Now start and it should drain
    loop2.start();
    const result = await p;
    expect(result).toBe('ok');
    expect(handler).toHaveBeenCalledTimes(1);
    loop2.stop();
  });

  it('does not process if no handler is registered', async () => {
    // No onProcess handler registered
    loop.push(createEvent('test', 'src', {}));
    await new Promise((r) => setTimeout(r, 50));
    expect(loop.pending).toBe(1);
  });
});

// ========================================
// EventLoop — batch strategy
// ========================================

describe('EventLoop — batch strategy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accumulates events and processes after batchWindow timeout', async () => {
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 1000,
      batchMax: 100, // high max so window triggers first
    });

    const handler = vi.fn(async (events: AgentEvent[]) => {
      return `processed-${events.length}`;
    });
    loop.onProcess(handler);
    loop.start();

    const p1 = loop.push(createEvent('a', 'src', { idx: 1 }));
    const p2 = loop.push(createEvent('b', 'src', { idx: 2 }));

    expect(handler).not.toHaveBeenCalled();

    // Advance past the batch window
    vi.advanceTimersByTime(1000);

    // Let the async handler run
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'a' }),
        expect.objectContaining({ type: 'b' }),
      ]),
    );
    expect(r1).toBe('processed-2');
    expect(r2).toBe('processed-2');

    loop.stop();
  });

  it('processes immediately when batchMax is reached', async () => {
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 10_000, // very long window — shouldn't matter
      batchMax: 3,
    });

    const handler = vi.fn(async (events: AgentEvent[]) => {
      return `batch-${events.length}`;
    });
    loop.onProcess(handler);
    loop.start();

    const p1 = loop.push(createEvent('a', 'src', {}));
    const p2 = loop.push(createEvent('b', 'src', {}));
    const p3 = loop.push(createEvent('c', 'src', {})); // hits batchMax

    // No need to advance timers — it should fire immediately
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(r1).toBe('batch-3');
    expect(r2).toBe('batch-3');
    expect(r3).toBe('batch-3');

    loop.stop();
  });

  it('clears pending batch timer when batchMax is reached', async () => {
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 5000,
      batchMax: 2,
    });

    loop.onProcess(async () => 'ok');
    loop.start();

    // First push schedules a batch timer
    const p1 = loop.push(createEvent('a', 'src', {}));
    // Second push hits batchMax, should clear the timer and drain immediately
    const p2 = loop.push(createEvent('b', 'src', {}));

    await Promise.all([p1, p2]);

    // Advance past the old batchWindow — should not cause errors or extra processing
    vi.advanceTimersByTime(5000);

    loop.stop();
  });

  it('re-schedules batch for remaining items after a batch completes', async () => {
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 500,
      batchMax: 100,
    });

    const calls: number[] = [];
    loop.onProcess(async (events: AgentEvent[]) => {
      calls.push(events.length);
      return 'ok';
    });
    loop.start();

    // Push one event, let it batch after the window
    const p1 = loop.push(createEvent('a', 'src', {}));
    await vi.advanceTimersByTimeAsync(500);
    await p1;
    expect(calls).toEqual([1]);

    // Push two more events, let them batch
    const p2 = loop.push(createEvent('b', 'src', {}));
    const p3 = loop.push(createEvent('c', 'src', {}));
    await vi.advanceTimersByTimeAsync(500);
    await Promise.all([p2, p3]);
    expect(calls).toEqual([1, 2]);

    loop.stop();
  });
});

// ========================================
// EventLoop — priority strategy
// ========================================

describe('EventLoop — priority strategy', () => {
  it('sorts events by priority before processing', async () => {
    const loop = new EventLoop({ strategy: 'priority' });

    const processedOrder: number[] = [];
    loop.onProcess(async (events) => {
      expect(events.length).toBe(1);
      processedOrder.push(events[0].payload['prio'] as number);
      return 'ok';
    });

    // Push events with different priorities before starting
    const p1 = loop.push(createEvent('low', 'src', { prio: 10 }, 10));
    const p2 = loop.push(createEvent('high', 'src', { prio: 1 }, 1));
    const p3 = loop.push(createEvent('med', 'src', { prio: 5 }, 5));

    loop.start();

    await Promise.all([p1, p2, p3]);

    // Higher priority (lower number) should be processed first
    expect(processedOrder).toEqual([1, 5, 10]);
    loop.stop();
  });

  it('uses default priority 10 when not specified', async () => {
    const loop = new EventLoop({ strategy: 'priority' });

    const processedOrder: string[] = [];
    loop.onProcess(async (events) => {
      processedOrder.push(events[0].type);
      return 'ok';
    });

    // No explicit priority (defaults to 10)
    const p1 = loop.push(createEvent('default-prio', 'src', {}));
    // Explicit priority 5 — should go first
    const p2 = loop.push(createEvent('prio-5', 'src', {}, 5));

    loop.start();
    await Promise.all([p1, p2]);

    expect(processedOrder).toEqual(['prio-5', 'default-prio']);
    loop.stop();
  });
});

// ========================================
// EventLoop.fire() — fire-and-forget
// ========================================

describe('EventLoop.fire()', () => {
  it('pushes event without returning a promise', () => {
    const loop = new EventLoop();
    loop.onProcess(async () => 'ok');
    loop.start();

    const result = loop.fire(createEvent('test', 'src', {}));
    expect(result).toBeUndefined();
    loop.stop();
  });

  it('does not throw when handler errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const loop = new EventLoop();
    loop.onProcess(async () => {
      throw new Error('boom');
    });
    loop.start();

    // Should not throw
    loop.fire(createEvent('test', 'src', {}));

    // Give the async rejection handler time to run
    await new Promise((r) => setTimeout(r, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('boom'),
    );

    consoleErrorSpy.mockRestore();
    loop.stop();
  });
});

// ========================================
// EventLoop.on() / emit() — event listener system
// ========================================

describe('EventLoop.on() / emit()', () => {
  let loop: EventLoop;

  beforeEach(() => {
    loop = new EventLoop();
  });

  it('calls listener for matching event type', () => {
    const listener = vi.fn();
    loop.on('message', listener);

    const event = createEvent('message', 'src', { text: 'hi' });
    loop.emit(event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('does not call listener for non-matching event type', () => {
    const listener = vi.fn();
    loop.on('message', listener);

    loop.emit(createEvent('other', 'src', {}));

    expect(listener).not.toHaveBeenCalled();
  });

  it('calls wildcard "*" listener for all event types', () => {
    const wildcardListener = vi.fn();
    loop.on('*', wildcardListener);

    const event1 = createEvent('message', 'src', {});
    const event2 = createEvent('error', 'src', {});

    loop.emit(event1);
    loop.emit(event2);

    expect(wildcardListener).toHaveBeenCalledTimes(2);
    expect(wildcardListener).toHaveBeenCalledWith(event1);
    expect(wildcardListener).toHaveBeenCalledWith(event2);
  });

  it('calls both type-specific and wildcard listeners', () => {
    const typeListener = vi.fn();
    const wildcardListener = vi.fn();

    loop.on('message', typeListener);
    loop.on('*', wildcardListener);

    const event = createEvent('message', 'src', {});
    loop.emit(event);

    expect(typeListener).toHaveBeenCalledOnce();
    expect(wildcardListener).toHaveBeenCalledOnce();
  });

  it('supports multiple listeners on the same event type', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    loop.on('msg', l1);
    loop.on('msg', l2);

    const event = createEvent('msg', 'src', {});
    loop.emit(event);

    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it('handles emit with no registered listeners gracefully', () => {
    // Should not throw
    expect(() => loop.emit(createEvent('nobody-listens', 'src', {}))).not.toThrow();
  });
});

// ========================================
// EventLoop.start() / stop() — lifecycle
// ========================================

describe('EventLoop.start() / stop()', () => {
  it('start() enables processing of queued events', async () => {
    const loop = new EventLoop();
    loop.onProcess(async () => 'result');

    const p = loop.push(createEvent('test', 'src', {}));
    expect(loop.pending).toBe(1);

    loop.start();
    const result = await p;
    expect(result).toBe('result');
    loop.stop();
  });

  it('stop() prevents further processing', async () => {
    const loop = new EventLoop();
    const handler = vi.fn(async () => 'ok');
    loop.onProcess(handler);

    loop.start();
    loop.stop();

    loop.push(createEvent('test', 'src', {}));
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).not.toHaveBeenCalled();
    expect(loop.pending).toBe(1);
  });

  it('stop() clears batch timer', () => {
    vi.useFakeTimers();

    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 5000,
      batchMax: 100,
    });
    loop.onProcess(async () => 'ok');
    loop.start();

    loop.push(createEvent('a', 'src', {}));
    // Timer is now scheduled
    loop.stop();

    // Advancing time should NOT trigger processing
    vi.advanceTimersByTime(5000);
    expect(loop.pending).toBe(1);

    vi.useRealTimers();
  });
});

// ========================================
// EventLoop.pending / isProcessing — getters
// ========================================

describe('EventLoop.pending / isProcessing', () => {
  it('pending returns the number of queued events', async () => {
    const loop = new EventLoop();
    expect(loop.pending).toBe(0);

    loop.push(createEvent('a', 'src', {}));
    expect(loop.pending).toBe(1);

    loop.push(createEvent('b', 'src', {}));
    expect(loop.pending).toBe(2);
  });

  it('isProcessing is true during handler execution', async () => {
    const loop = new EventLoop();
    let seenProcessing = false;

    loop.onProcess(async () => {
      seenProcessing = loop.isProcessing;
      return 'ok';
    });
    loop.start();

    await loop.push(createEvent('test', 'src', {}));
    expect(seenProcessing).toBe(true);

    // Yield to let the finally block in drain() complete
    await new Promise((r) => setTimeout(r, 0));
    expect(loop.isProcessing).toBe(false);

    loop.stop();
  });
});

// ========================================
// Error handling
// ========================================

describe('Error handling', () => {
  it('rejects push() promise when handler throws an Error', async () => {
    const loop = new EventLoop();
    loop.onProcess(async () => {
      throw new Error('handler failed');
    });
    loop.start();

    await expect(loop.push(createEvent('test', 'src', {}))).rejects.toThrow('handler failed');
    loop.stop();
  });

  it('wraps non-Error throws into Error objects', async () => {
    const loop = new EventLoop();
    loop.onProcess(async () => {
      throw 'string-error'; // eslint-disable-line no-throw-literal
    });
    loop.start();

    await expect(loop.push(createEvent('test', 'src', {}))).rejects.toThrow('string-error');
    loop.stop();
  });

  it('rejects all batch items when handler throws', async () => {
    vi.useFakeTimers();

    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 500,
      batchMax: 100,
    });
    loop.onProcess(async () => {
      throw new Error('batch fail');
    });
    loop.start();

    const p1 = loop.push(createEvent('a', 'src', {}));
    const p2 = loop.push(createEvent('b', 'src', {}));

    vi.advanceTimersByTime(500);

    await expect(p1).rejects.toThrow('batch fail');
    await expect(p2).rejects.toThrow('batch fail');

    vi.useRealTimers();
    loop.stop();
  });

  it('continues processing subsequent events after a handler error', async () => {
    const loop = new EventLoop();
    let callCount = 0;
    loop.onProcess(async () => {
      callCount++;
      if (callCount === 1) throw new Error('first fails');
      return 'second ok';
    });
    loop.start();

    const p1 = loop.push(createEvent('a', 'src', {}));
    const p2 = loop.push(createEvent('b', 'src', {}));

    await expect(p1).rejects.toThrow('first fails');
    const r2 = await p2;
    expect(r2).toBe('second ok');
    loop.stop();
  });
});

// ========================================
// Branch coverage edge cases
// ========================================

describe('Branch coverage — edge cases', () => {
  it('priority sort handles mixed defined/undefined priorities', async () => {
    const loop = new EventLoop({ strategy: 'priority' });

    const processedTypes: string[] = [];
    loop.onProcess(async (events) => {
      processedTypes.push(events[0].type);
      return 'ok';
    });

    // Ensure both ?? branches are hit in the sort comparator:
    // - a.event.priority is undefined (falls back to 10)
    // - b.event.priority is defined (uses actual value)
    // and vice versa
    const p1 = loop.push(createEvent('no-prio', 'src', {})); // priority undefined → 10
    const p2 = loop.push(createEvent('explicit-5', 'src', {}, 5)); // priority 5
    const p3 = loop.push(createEvent('explicit-10', 'src', {}, 10)); // priority 10

    loop.start();
    await Promise.all([p1, p2, p3]);

    // explicit-5 (5) first, then no-prio (10) and explicit-10 (10)
    expect(processedTypes[0]).toBe('explicit-5');
    expect(processedTypes.length).toBe(3);
    loop.stop();
  });

  it('priority sort with all undefined priorities', async () => {
    const loop = new EventLoop({ strategy: 'priority' });

    const processedTypes: string[] = [];
    loop.onProcess(async (events) => {
      processedTypes.push(events[0].type);
      return 'ok';
    });

    // Both a and b have undefined priority → both hit the ?? 10 fallback
    const p1 = loop.push(createEvent('first', 'src', {}));
    const p2 = loop.push(createEvent('second', 'src', {}));

    loop.start();
    await Promise.all([p1, p2]);

    expect(processedTypes.length).toBe(2);
    loop.stop();
  });

  it('batch scheduleBatch hits batchMax without existing timer', async () => {
    vi.useFakeTimers();

    // batchMax = 1 means the very first push hits batchMax immediately,
    // so there's no existing batchTimer to clear
    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 5000,
      batchMax: 1,
    });

    const handler = vi.fn(async () => 'ok');
    loop.onProcess(handler);
    loop.start();

    const p = loop.push(createEvent('a', 'src', {}));
    await p;

    expect(handler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    loop.stop();
  });

  it('batch drain re-schedules remaining items via scheduleBatch (finally branch)', async () => {
    vi.useFakeTimers();

    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 200,
      batchMax: 2,
    });

    const calls: number[] = [];
    loop.onProcess(async (events: AgentEvent[]) => {
      calls.push(events.length);
      return 'ok';
    });
    loop.start();

    // Push 2 events to hit batchMax → immediate drain of first batch
    const p1 = loop.push(createEvent('a', 'src', {}));
    const p2 = loop.push(createEvent('b', 'src', {}));

    // While the first batch is being processed, push a third event.
    // When drain's finally block runs, queue.length > 0 and strategy is
    // 'batch', so it calls scheduleBatch() (line 147).
    const p3 = loop.push(createEvent('c', 'src', {}));

    await Promise.all([p1, p2]);

    // The third event is now waiting for its batch window
    expect(calls).toEqual([2]);

    // Advance past batch window to drain the remaining event
    await vi.advanceTimersByTimeAsync(200);
    await p3;

    expect(calls).toEqual([2, 1]);

    vi.useRealTimers();
    loop.stop();
  });

  it('scheduleBatch does not create duplicate timers', async () => {
    vi.useFakeTimers();

    const loop = new EventLoop({
      strategy: 'batch',
      batchWindow: 1000,
      batchMax: 100,
    });

    const handler = vi.fn(async () => 'ok');
    loop.onProcess(handler);
    loop.start();

    // Push two events without hitting batchMax — both go through scheduleBatch
    // The second push should NOT create a second timer (the !this.batchTimer guard)
    loop.push(createEvent('a', 'src', {}));
    loop.push(createEvent('b', 'src', {}));

    // Only one timer fires, processing both events as a single batch
    await vi.advanceTimersByTimeAsync(1000);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'a' }),
        expect.objectContaining({ type: 'b' }),
      ]),
    );

    vi.useRealTimers();
    loop.stop();
  });
});
