import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock @agentkit/core ----

let capturedAgentOpts: any = null;

const mockAgentRun = vi.fn().mockResolvedValue('agent reply');
const mockAgentInject = vi.fn();

vi.mock('@agentkit/core', () => {
  class MockAgent {
    constructor(opts: any) {
      capturedAgentOpts = opts;
    }
    run = mockAgentRun;
    inject = mockAgentInject;
  }
  return { Agent: MockAgent, InMemorySession: class {} };
});

// ---- Mock @agentkit/event-loop ----

const mockBind = vi.fn();

vi.mock('@agentkit/event-loop', () => {
  class MockEventLoop {
    bind = mockBind;
    get isProcessing() { return true; }
  }
  return {
    EventLoop: MockEventLoop,
    createEvent: vi.fn(),
    formatEvent: vi.fn(),
  };
});

// ---- Import after mocks ----

import { AgentRunner } from '../runner.js';
import type { Channel, Extension, HookResult } from '../interfaces.js';

// ---- Helpers ----

function makeLLM() {
  return { chat: vi.fn() };
}

function makeChannel(overrides: Partial<Channel> & { name: string }): Channel {
  return {
    setup: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeExtension(overrides: Partial<Extension> & { name: string }): Extension {
  return {
    systemPrompt: () => undefined,
    ...overrides,
  };
}

// ---- Tests ----

describe('AgentRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAgentOpts = null;
  });

  // ---------- constructor ----------

  describe('constructor', () => {
    it('creates EventLoop instance', () => {
      const runner = new AgentRunner({ workspace: 'my-agent', llm: makeLLM() });
      expect(runner.eventLoop).toBeDefined();
    });
  });

  // ---------- use() ----------

  describe('use()', () => {
    it('classifies a plugin WITH systemPrompt as Extension', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      const ext = makeExtension({ name: 'ext-a', systemPrompt: () => 'hello' });
      const ret = runner.use(ext);
      expect(ret).toBe(runner);

      const info = runner.getInfo();
      expect(info.extensions).toEqual(['ext-a']);
      expect(info.channels).toEqual([]);
    });

    it('classifies a plugin WITH preBash as Extension', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      const ext: Extension = {
        name: 'blocker',
        preBash: vi.fn().mockResolvedValue({ allowed: true }),
      };
      runner.use(ext);
      const info = runner.getInfo();
      expect(info.extensions).toEqual(['blocker']);
    });

    it('classifies a plugin WITH postBash as Extension', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      const ext: Extension = {
        name: 'logger',
        postBash: vi.fn().mockResolvedValue(undefined),
      };
      runner.use(ext);
      const info = runner.getInfo();
      expect(info.extensions).toEqual(['logger']);
    });

    it('classifies a plugin WITHOUT systemPrompt/preBash/postBash as Channel', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      const ch = makeChannel({ name: 'http' });
      runner.use(ch);
      const info = runner.getInfo();
      expect(info.channels).toEqual(['http']);
      expect(info.extensions).toEqual([]);
    });

    it('correctly classifies mixed plugins', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(makeChannel({ name: 'ws' }));
      runner.use(makeExtension({ name: 'skills', systemPrompt: () => 'skill prompt' }));
      runner.use(makeChannel({ name: 'http' }));
      runner.use(makeExtension({ name: 'memory', systemPrompt: () => 'mem prompt' }));

      const info = runner.getInfo();
      expect(info.channels).toEqual(['ws', 'http']);
      expect(info.extensions).toEqual(['skills', 'memory']);
    });
  });

  // ---------- start() ----------

  describe('start()', () => {
    it('calls setup on extensions first, then channels', async () => {
      const order: string[] = [];
      const ext = makeExtension({
        name: 'ext',
        setup: vi.fn(async () => { order.push('ext-setup'); }),
        systemPrompt: () => undefined,
      });
      const ch = makeChannel({
        name: 'ch',
        setup: vi.fn(async () => { order.push('ch-setup'); }),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext).use(ch);
      await runner.start();

      expect(order).toEqual(['ext-setup', 'ch-setup']);
    });

    it('passes correct AgenticContext to setup', async () => {
      const extSetup = vi.fn().mockResolvedValue(undefined);
      const chSetup = vi.fn().mockResolvedValue(undefined);

      const ext = makeExtension({ name: 'e', setup: extSetup, systemPrompt: () => undefined });
      const ch = makeChannel({ name: 'c', setup: chSetup });

      const runner = new AgentRunner({ workspace: '/tmp/my-ws', llm: makeLLM() });
      runner.use(ext).use(ch);
      await runner.start();

      expect(extSetup).toHaveBeenCalledWith(
        expect.objectContaining({ workDir: expect.any(String), eventLoop: runner.eventLoop }),
      );
      expect(chSetup).toHaveBeenCalledWith(
        expect.objectContaining({ workDir: expect.any(String), eventLoop: runner.eventLoop }),
      );
    });

    it('collects systemPrompt from extensions joined by \\n\\n', async () => {
      const ext1 = makeExtension({ name: 'e1', systemPrompt: () => 'ext1 prompt' });
      const ext2 = makeExtension({ name: 'e2', systemPrompt: () => 'ext2 prompt' });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2);
      await runner.start();

      expect(capturedAgentOpts.systemPrompt).toBe('ext1 prompt\n\next2 prompt');
    });

    it('uses default systemPrompt when none provided', async () => {
      const ext = makeExtension({ name: 'e', systemPrompt: () => undefined });
      const ch = makeChannel({ name: 'c' });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext).use(ch);
      await runner.start();

      expect(capturedAgentOpts.systemPrompt).toBe('You are a helpful assistant.');
    });

    it('uses default systemPrompt when no plugins at all', async () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      await runner.start();
      expect(capturedAgentOpts.systemPrompt).toBe('You are a helpful assistant.');
    });

    it('filters out falsy systemPrompts', async () => {
      const ext1 = makeExtension({ name: 'e1', systemPrompt: () => undefined });
      const ext2 = makeExtension({ name: 'e2', systemPrompt: () => 'only this' });
      const ext3 = makeExtension({ name: 'e3', systemPrompt: () => '' });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2).use(ext3);
      await runner.start();

      expect(capturedAgentOpts.systemPrompt).toBe('only this');
    });

    it('creates Agent with llm and session from opts', async () => {
      const llm = makeLLM();
      const session = { getMessages: vi.fn(), addMessage: vi.fn(), clear: vi.fn() };

      const runner = new AgentRunner({ workspace: '/tmp', llm, session });
      await runner.start();

      expect(capturedAgentOpts.llm).toBe(llm);
      expect(capturedAgentOpts.session).toBe(session);
    });

    it('binds agent to EventLoop', async () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      await runner.start();
      expect(mockBind).toHaveBeenCalledWith(expect.objectContaining({ run: expect.any(Function), inject: expect.any(Function) }));
    });

    it('skips extension setup when setup is not defined', async () => {
      const ext: Extension = { name: 'no-setup', systemPrompt: () => 'hi' };
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext);
      await expect(runner.start()).resolves.toBeUndefined();
    });
  });

  // ---------- Extension hooks ----------

  describe('Extension hooks', () => {
    it('onBeforeBash: returns allowed when no extension blocks', async () => {
      const ext1 = makeExtension({
        name: 'e1',
        preBash: vi.fn().mockResolvedValue({ allowed: true }),
      });
      const ext2 = makeExtension({
        name: 'e2',
        preBash: vi.fn().mockResolvedValue({ allowed: true }),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2);
      await runner.start();

      const result = await capturedAgentOpts.onBeforeBash('ls -la');
      expect(result).toEqual({ allowed: true });
      expect(ext1.preBash).toHaveBeenCalledWith('ls -la');
      expect(ext2.preBash).toHaveBeenCalledWith('ls -la');
    });

    it('onBeforeBash: first blocker short-circuits', async () => {
      const ext1 = makeExtension({
        name: 'security',
        preBash: vi.fn().mockResolvedValue({ allowed: false, reason: 'dangerous' }),
      });
      const ext2 = makeExtension({
        name: 'e2',
        preBash: vi.fn().mockResolvedValue({ allowed: true }),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2);
      await runner.start();

      const result = await capturedAgentOpts.onBeforeBash('rm -rf /');
      expect(result).toEqual({ allowed: false, reason: 'security: dangerous' });
      expect(ext2.preBash).not.toHaveBeenCalled();
    });

    it('onBeforeBash: skips extensions without preBash', async () => {
      const ext1 = makeExtension({ name: 'no-hook', systemPrompt: () => 'sp' });
      const ext2 = makeExtension({
        name: 'has-hook',
        preBash: vi.fn().mockResolvedValue({ allowed: true }),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2);
      await runner.start();

      const result = await capturedAgentOpts.onBeforeBash('echo hi');
      expect(result).toEqual({ allowed: true });
    });

    it('onBeforeBash: undefined return does not block', async () => {
      const ext = makeExtension({
        name: 'returns-undef',
        preBash: vi.fn().mockResolvedValue(undefined),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext);
      await runner.start();

      const result = await capturedAgentOpts.onBeforeBash('echo ok');
      expect(result).toEqual({ allowed: true });
    });

    it('onAfterBash: propagates to all extensions', async () => {
      const ext1 = makeExtension({
        name: 'log1',
        postBash: vi.fn().mockResolvedValue(undefined),
      });
      const ext2 = makeExtension({
        name: 'log2',
        postBash: vi.fn().mockResolvedValue(undefined),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2);
      await runner.start();

      await capturedAgentOpts.onAfterBash('ls', 'file.txt', false);
      expect(ext1.postBash).toHaveBeenCalledWith('ls', 'file.txt', false);
      expect(ext2.postBash).toHaveBeenCalledWith('ls', 'file.txt', false);
    });

    it('onAfterBash: skips extensions without postBash', async () => {
      const ext = makeExtension({ name: 'no-post', systemPrompt: () => 'sp' });
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext);
      await runner.start();

      await expect(capturedAgentOpts.onAfterBash('cmd', 'out', true)).resolves.toBeUndefined();
    });
  });

  // ---------- stop() ----------

  describe('stop()', () => {
    it('tears down channels in reverse, then extensions in reverse', async () => {
      const order: string[] = [];

      const ext1 = makeExtension({
        name: 'ext1',
        teardown: vi.fn(async () => { order.push('ext1-teardown'); }),
      });
      const ext2 = makeExtension({
        name: 'ext2',
        teardown: vi.fn(async () => { order.push('ext2-teardown'); }),
      });
      const ch1 = makeChannel({
        name: 'ch1',
        teardown: vi.fn(async () => { order.push('ch1-teardown'); }),
      });
      const ch2 = makeChannel({
        name: 'ch2',
        teardown: vi.fn(async () => { order.push('ch2-teardown'); }),
      });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext1).use(ext2).use(ch1).use(ch2);
      await runner.start();
      await runner.stop();

      expect(order).toEqual([
        'ch2-teardown',
        'ch1-teardown',
        'ext2-teardown',
        'ext1-teardown',
      ]);
    });

    it('skips teardown when not defined', async () => {
      const ext = makeExtension({ name: 'no-teardown', systemPrompt: () => 'sp' });
      const ch = makeChannel({ name: 'no-teardown-ch' });

      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(ext).use(ch);
      await runner.start();
      await expect(runner.stop()).resolves.toBeUndefined();
    });
  });

  // ---------- chat() ----------

  describe('chat()', () => {
    it('delegates to agent.run()', async () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      await runner.start();

      mockAgentRun.mockResolvedValue('hi there');
      const result = await runner.chat('hello');

      expect(mockAgentRun).toHaveBeenCalledWith('hello');
      expect(result).toBe('hi there');
    });
  });

  // ---------- getInfo() ----------

  describe('getInfo()', () => {
    it('returns workspace basename, plugin names, and processing status', () => {
      const runner = new AgentRunner({ workspace: '/home/user/my-agent', llm: makeLLM() });
      runner.use(makeExtension({ name: 'skills', systemPrompt: () => 'sp' }));
      runner.use(makeChannel({ name: 'http' }));

      const info = runner.getInfo();
      expect(info.workspace).toBe('my-agent');
      expect(info.extensions).toEqual(['skills']);
      expect(info.channels).toEqual(['http']);
      expect(info.processing).toBe(true);
    });

    it('merges info() from plugins', () => {
      const runner = new AgentRunner({ workspace: '/tmp/ws', llm: makeLLM() });
      runner.use(makeExtension({
        name: 'memory',
        systemPrompt: () => undefined,
        info: () => ({ entries: 42 }),
      }));
      runner.use(makeChannel({
        name: 'http',
        info: () => ({ port: 3000 }),
      }));

      const info = runner.getInfo();
      expect(info.memory).toEqual({ entries: 42 });
      expect(info.http).toEqual({ port: 3000 });
    });

    it('skips plugins without info()', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      runner.use(makeExtension({ name: 'simple', systemPrompt: () => 'sp' }));
      runner.use(makeChannel({ name: 'basic' }));

      const info = runner.getInfo();
      expect(info).not.toHaveProperty('simple');
      expect(info).not.toHaveProperty('basic');
    });
  });

  // ---------- eventLoop getter ----------

  describe('eventLoop getter', () => {
    it('returns the EventLoop instance', () => {
      const runner = new AgentRunner({ workspace: '/tmp', llm: makeLLM() });
      const loop = runner.eventLoop;
      expect(loop).toBeDefined();
      expect(runner.eventLoop).toBe(loop);
    });
  });
});
