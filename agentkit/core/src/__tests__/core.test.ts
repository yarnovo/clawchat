import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../agent.js';
import { InMemorySession } from '../session.js';
import type { LLMProvider, LLMResponse, ChatMessage, ToolDefinition } from '../llm.js';

// ─── Mock child_process ──────────────────────────────────────────────
vi.mock('child_process', () => ({
  execSync: vi.fn(() => 'mock stdout'),
}));

import { execSync } from 'child_process';
const mockExecSync = vi.mocked(execSync);

// ─── Helper: create mock LLM ────────────────────────────────────────
function createMockLLM(responses: LLMResponse[]): LLMProvider {
  let callIndex = 0;
  return {
    chat: vi.fn(async (_msgs: ChatMessage[], _tools?: ToolDefinition[]): Promise<LLMResponse> => {
      if (callIndex >= responses.length) {
        // fallback: return a text-only response to stop the loop
        return { content: 'fallback', tool_calls: [], finish_reason: 'stop' };
      }
      return responses[callIndex++];
    }),
  };
}

// ─── InMemorySession ─────────────────────────────────────────────────
describe('InMemorySession', () => {
  let session: InMemorySession;

  beforeEach(() => {
    session = new InMemorySession();
  });

  it('starts empty', () => {
    expect(session.getMessages()).toEqual([]);
  });

  it('addMessage appends and getMessages returns copies', () => {
    const msg: ChatMessage = { role: 'user', content: 'hello' };
    session.addMessage(msg);
    expect(session.getMessages()).toEqual([msg]);

    // returned array is a copy (not the same reference)
    const a = session.getMessages();
    const b = session.getMessages();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('addMessage accumulates multiple messages', () => {
    session.addMessage({ role: 'user', content: '1' });
    session.addMessage({ role: 'assistant', content: '2' });
    session.addMessage({ role: 'tool', content: '3', tool_call_id: 'tc1' });
    expect(session.getMessages()).toHaveLength(3);
  });

  it('clear removes all messages', () => {
    session.addMessage({ role: 'user', content: 'a' });
    session.addMessage({ role: 'user', content: 'b' });
    session.clear();
    expect(session.getMessages()).toEqual([]);
  });
});

// ─── Agent constructor ───────────────────────────────────────────────
describe('Agent constructor', () => {
  it('uses default systemPrompt when none provided', async () => {
    const llm = createMockLLM([
      { content: 'hi', tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm });
    await agent.run('test');

    // The system prompt should be the default
    const chatCall = vi.mocked(llm.chat).mock.calls[0];
    expect(chatCall[0][0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' });
  });

  it('uses custom systemPrompt when provided', async () => {
    const llm = createMockLLM([
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm, systemPrompt: 'Be concise.' });
    await agent.run('test');

    const chatCall = vi.mocked(llm.chat).mock.calls[0];
    expect(chatCall[0][0]).toEqual({ role: 'system', content: 'Be concise.' });
  });

  it('uses provided session instead of default InMemorySession', async () => {
    const session = new InMemorySession();
    session.addMessage({ role: 'user', content: 'prior' });

    const llm = createMockLLM([
      { content: 'reply', tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm, session });
    await agent.run('new');

    // Session should contain the prior message plus the new user message
    const msgs = session.getMessages();
    expect(msgs[0]).toEqual({ role: 'user', content: 'prior' });
    expect(msgs[1]).toEqual({ role: 'user', content: 'new' });
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'reply' });
  });
});

// ─── Agent.run — text only (no tool calls) ───────────────────────────
describe('Agent.run — text response', () => {
  beforeEach(() => {
    mockExecSync.mockClear();
  });

  it('returns text from LLM when no tool calls', async () => {
    const llm = createMockLLM([
      { content: 'Hello, world!', tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm });
    const result = await agent.run('hi');
    expect(result).toBe('Hello, world!');
  });

  it('returns empty string when LLM content is null', async () => {
    const llm = createMockLLM([
      { content: null, tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm });
    const result = await agent.run('hi');
    expect(result).toBe('');
  });
});

// ─── Agent.run — bash tool calls ─────────────────────────────────────
describe('Agent.run — bash tool calls', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue('file1.txt\nfile2.txt');
  });

  it('executes bash and feeds result back to LLM', async () => {
    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Here are your files.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm });
    const result = await agent.run('list files');

    expect(mockExecSync).toHaveBeenCalledWith('ls', {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    expect(result).toBe('Here are your files.');
  });

  it('handles execSync throwing an error', async () => {
    const err = new Error('command failed');
    (err as any).stderr = 'permission denied';
    mockExecSync.mockImplementation(() => { throw err; });

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"rm -rf /"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Failed.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm });
    const result = await agent.run('delete everything');

    expect(result).toBe('Failed.');
  });

  it('handles execSync error without stderr (uses message)', async () => {
    const err = new Error('spawn failed');
    // no stderr property
    mockExecSync.mockImplementation(() => { throw err; });

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"bad"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Error handled.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm });
    const result = await agent.run('run bad command');
    expect(result).toBe('Error handled.');
  });

  it('truncates long output to 10000 chars', async () => {
    const longOutput = 'x'.repeat(20000);
    mockExecSync.mockReturnValue(longOutput);

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"cat big"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'done', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    await agent.run('read big file');

    // The tool message in session should have truncated content
    const msgs = session.getMessages();
    const toolMsg = msgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toHaveLength(10000);
  });
});

// ─── onBeforeBash hook ───────────────────────────────────────────────
describe('onBeforeBash hook', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue('ok');
  });

  it('allows execution when hook returns allowed: true', async () => {
    const onBeforeBash = vi.fn(async () => ({ allowed: true }));

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"echo hi"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'done', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onBeforeBash });
    await agent.run('say hi');

    expect(onBeforeBash).toHaveBeenCalledWith('echo hi');
    expect(mockExecSync).toHaveBeenCalledOnce();
  });

  it('blocks execution when hook returns allowed: false', async () => {
    const onBeforeBash = vi.fn(async () => ({ allowed: false, reason: 'dangerous' }));

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"rm -rf /"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Understood, blocked.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, onBeforeBash, session });
    const result = await agent.run('delete all');

    expect(onBeforeBash).toHaveBeenCalledWith('rm -rf /');
    expect(mockExecSync).not.toHaveBeenCalled();
    expect(result).toBe('Understood, blocked.');

    // The session should contain a tool message with blocked reason
    const msgs = session.getMessages();
    const toolMsg = msgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toBe('Blocked: dangerous');
  });

  it('blocks with undefined reason', async () => {
    const onBeforeBash = vi.fn(async () => ({ allowed: false }));

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"test"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, onBeforeBash, session });
    await agent.run('test');

    const msgs = session.getMessages();
    const toolMsg = msgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toBe('Blocked: undefined');
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});

// ─── onAfterBash hook ────────────────────────────────────────────────
describe('onAfterBash hook', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it('is called after successful execution', async () => {
    mockExecSync.mockReturnValue('success output');
    const onAfterBash = vi.fn(async () => {});

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"echo ok"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'done', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onAfterBash });
    await agent.run('test');

    expect(onAfterBash).toHaveBeenCalledWith('echo ok', 'success output', false);
  });

  it('is called after failed execution with isError=true', async () => {
    const err = new Error('fail');
    (err as any).stderr = 'some error';
    mockExecSync.mockImplementation(() => { throw err; });

    const onAfterBash = vi.fn(async () => {});

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"fail cmd"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'handled', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onAfterBash });
    await agent.run('test');

    expect(onAfterBash).toHaveBeenCalledWith('fail cmd', 'Error: some error', true);
  });

  it('is NOT called when beforeBash blocks', async () => {
    const onBeforeBash = vi.fn(async () => ({ allowed: false, reason: 'no' }));
    const onAfterBash = vi.fn(async () => {});

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onBeforeBash, onAfterBash });
    await agent.run('test');

    expect(onAfterBash).not.toHaveBeenCalled();
  });
});

// ─── onText callback ─────────────────────────────────────────────────
describe('onText callback', () => {
  it('is called with the text content when LLM returns text', async () => {
    const onText = vi.fn();
    const llm = createMockLLM([
      { content: 'Hello!', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onText });
    await agent.run('greet');

    expect(onText).toHaveBeenCalledWith('Hello!');
    expect(onText).toHaveBeenCalledTimes(1);
  });

  it('is called with empty string when content is null', async () => {
    const onText = vi.fn();
    const llm = createMockLLM([
      { content: null, tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onText });
    await agent.run('test');

    expect(onText).toHaveBeenCalledWith('');
  });

  it('is not called during tool call rounds, only on final text', async () => {
    mockExecSync.mockReturnValue('ok');
    const onText = vi.fn();

    const llm = createMockLLM([
      {
        content: 'thinking...',
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Final answer', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, onText });
    await agent.run('test');

    // onText should only be called once for the final text response
    expect(onText).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledWith('Final answer');
  });
});

// ─── Max rounds limit ────────────────────────────────────────────────
describe('max rounds limit', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue('ok');
  });

  it('returns max rounds message when limit is hit', async () => {
    // LLM always returns tool calls, never text-only
    const infiniteToolCalls: LLMResponse = {
      content: null,
      tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"echo loop"}' }],
      finish_reason: 'tool_calls',
    };

    const llm = createMockLLM(
      Array(5).fill(infiniteToolCalls),
    );

    const agent = new Agent({ llm, maxRounds: 3 });
    const result = await agent.run('loop forever');

    expect(result).toBe('[Agent reached max rounds]');
    expect(llm.chat).toHaveBeenCalledTimes(3);
  });

  it('defaults to 20 rounds if not specified', async () => {
    const infiniteToolCalls: LLMResponse = {
      content: null,
      tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"echo loop"}' }],
      finish_reason: 'tool_calls',
    };

    const llm = createMockLLM(
      Array(25).fill(infiniteToolCalls),
    );

    const agent = new Agent({ llm });
    const result = await agent.run('loop');

    expect(result).toBe('[Agent reached max rounds]');
    expect(llm.chat).toHaveBeenCalledTimes(20);
  });
});

// ─── Unknown tool name ───────────────────────────────────────────────
describe('unknown tool name', () => {
  it('returns error message for unknown tool and adds to session', async () => {
    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'python', arguments: '{"code":"print(1)"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'I see the error.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    const result = await agent.run('run python');

    expect(result).toBe('I see the error.');

    const msgs = session.getMessages();
    const toolMsg = msgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toBe('Unknown tool: python');
  });

  it('does not call execSync for unknown tools', async () => {
    mockExecSync.mockClear();

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'unknown', arguments: '{}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm });
    await agent.run('test');

    expect(mockExecSync).not.toHaveBeenCalled();
  });
});

// ─── Multiple tool calls in one response ─────────────────────────────
describe('multiple tool calls in single response', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue('output');
  });

  it('processes all tool calls sequentially', async () => {
    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [
          { id: 'tc1', name: 'bash', arguments: '{"command":"echo a"}' },
          { id: 'tc2', name: 'bash', arguments: '{"command":"echo b"}' },
        ],
        finish_reason: 'tool_calls',
      },
      { content: 'Both done.', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    const result = await agent.run('run two');

    expect(result).toBe('Both done.');
    expect(mockExecSync).toHaveBeenCalledTimes(2);

    const toolMsgs = session.getMessages().filter(m => m.role === 'tool');
    expect(toolMsgs).toHaveLength(2);
    expect(toolMsgs[0].tool_call_id).toBe('tc1');
    expect(toolMsgs[1].tool_call_id).toBe('tc2');
  });

  it('handles mix of bash and unknown tools', async () => {
    mockExecSync.mockReturnValue('bash output');

    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [
          { id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' },
          { id: 'tc2', name: 'python', arguments: '{"code":"x"}' },
        ],
        finish_reason: 'tool_calls',
      },
      { content: 'mixed result', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    await agent.run('test');

    const toolMsgs = session.getMessages().filter(m => m.role === 'tool');
    expect(toolMsgs[0].content).toBe('bash output');
    expect(toolMsgs[1].content).toBe('Unknown tool: python');
  });
});

// ─── Session state across runs ───────────────────────────────────────
describe('session state across runs', () => {
  it('accumulates messages across multiple run() calls', async () => {
    const llm = createMockLLM([
      { content: 'reply1', tool_calls: [], finish_reason: 'stop' },
      { content: 'reply2', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });

    await agent.run('first');
    await agent.run('second');

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(4); // user1, assistant1, user2, assistant2
    expect(msgs[0]).toEqual({ role: 'user', content: 'first' });
    expect(msgs[1]).toEqual({ role: 'assistant', content: 'reply1' });
    expect(msgs[2]).toEqual({ role: 'user', content: 'second' });
    expect(msgs[3]).toEqual({ role: 'assistant', content: 'reply2' });
  });
});

// ─── LLM receives correct messages ──────────────────────────────────
describe('LLM receives correct messages', () => {
  it('passes system prompt + session messages + tools to LLM', async () => {
    const llm = createMockLLM([
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);

    const agent = new Agent({ llm, systemPrompt: 'Be helpful.' });
    await agent.run('hello');

    expect(llm.chat).toHaveBeenCalledTimes(1);
    const [messages, tools] = vi.mocked(llm.chat).mock.calls[0];

    // system + user
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'system', content: 'Be helpful.' });
    expect(messages[1]).toEqual({ role: 'user', content: 'hello' });

    // tools array contains bash tool
    expect(tools).toHaveLength(1);
    expect(tools![0].function.name).toBe('bash');
  });
});

// ─── Exports from index.ts ──────────────────────────────────────────
describe('index.ts exports', () => {
  it('exports Agent class', async () => {
    const mod = await import('../index.js');
    expect(mod.Agent).toBe(Agent);
  });

  it('exports InMemorySession class', async () => {
    const mod = await import('../index.js');
    expect(mod.InMemorySession).toBe(InMemorySession);
  });

  it('exports all expected named exports', async () => {
    const mod = await import('../index.js');
    expect(mod).toHaveProperty('Agent');
    expect(mod).toHaveProperty('InMemorySession');
    // Type exports are compile-time only, verify the module has the right shape
    expect(typeof mod.Agent).toBe('function');
    expect(typeof mod.InMemorySession).toBe('function');
  });
});

// ─── Assistant message with tool_calls includes content ──────────────
describe('assistant message with tool_calls', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue('result');
  });

  it('preserves assistant content alongside tool_calls in session', async () => {
    const llm = createMockLLM([
      {
        content: 'Let me check...',
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Done!', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    await agent.run('test');

    const assistantMsgs = session.getMessages().filter(m => m.role === 'assistant');
    // First assistant message has both content and tool_calls
    expect(assistantMsgs[0].content).toBe('Let me check...');
    expect(assistantMsgs[0].tool_calls).toHaveLength(1);
    // Second assistant message is the final text
    expect(assistantMsgs[1].content).toBe('Done!');
  });

  it('uses empty string for null content in assistant tool_call message', async () => {
    const llm = createMockLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'bash', arguments: '{"command":"ls"}' }],
        finish_reason: 'tool_calls',
      },
      { content: 'Done!', tool_calls: [], finish_reason: 'stop' },
    ]);

    const session = new InMemorySession();
    const agent = new Agent({ llm, session });
    await agent.run('test');

    const assistantMsgs = session.getMessages().filter(m => m.role === 'assistant');
    expect(assistantMsgs[0].content).toBe('');
  });
});
