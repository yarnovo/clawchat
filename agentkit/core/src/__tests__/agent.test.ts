import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../agent.js';
import type { LLMProvider, LLMResponse, ChatMessage, ToolDefinition } from '../llm.js';

/**
 * FakeLLM — 按预设脚本返回响应
 */
class FakeLLM implements LLMProvider {
  private responses: LLMResponse[];
  private callIndex = 0;
  public calls: ChatMessage[][] = [];

  constructor(responses: LLMResponse[]) {
    this.responses = responses;
  }

  async chat(messages: ChatMessage[], _tools?: ToolDefinition[]): Promise<LLMResponse> {
    this.calls.push([...messages]);
    const response = this.responses[this.callIndex];
    if (!response) throw new Error(`FakeLLM: no response for call #${this.callIndex}`);
    this.callIndex++;
    return response;
  }
}

describe('Agent', () => {
  it('returns text for simple chat', async () => {
    const llm = new FakeLLM([
      { content: '你好！', tool_calls: [], finish_reason: 'stop' },
    ]);
    const agent = new Agent({ llm, systemPrompt: 'Be helpful' });
    const result = await agent.run('hello');
    expect(result).toBe('你好！');
  });

  it('executes tool and returns final text', async () => {
    const llm = new FakeLLM([
      // 第一轮：LLM 请求调用工具
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'get_time', arguments: '{}' }],
        finish_reason: 'tool_use',
      },
      // 第二轮：LLM 收到工具结果后回复
      {
        content: '现在是 2026-03-15',
        tool_calls: [],
        finish_reason: 'stop',
      },
    ]);

    const tools = [{
      name: 'get_time',
      description: 'Get current time',
      parameters: { type: 'object', properties: {} },
      execute: async () => ({ content: '2026-03-15 18:00' }),
    }];

    const agent = new Agent({ llm, tools });
    const result = await agent.run('what time is it?');
    expect(result).toBe('现在是 2026-03-15');
    expect(llm.calls).toHaveLength(2);
  });

  it('handles multiple tool calls in one round', async () => {
    const llm = new FakeLLM([
      {
        content: null,
        tool_calls: [
          { id: 'tc1', name: 'tool_a', arguments: '{}' },
          { id: 'tc2', name: 'tool_b', arguments: '{}' },
        ],
        finish_reason: 'tool_use',
      },
      { content: 'done', tool_calls: [], finish_reason: 'stop' },
    ]);

    const tools = [
      { name: 'tool_a', description: 'A', parameters: {}, execute: async () => ({ content: 'result_a' }) },
      { name: 'tool_b', description: 'B', parameters: {}, execute: async () => ({ content: 'result_b' }) },
    ];

    const agent = new Agent({ llm, tools });
    const result = await agent.run('do both');
    expect(result).toBe('done');
  });

  it('handles tool not found', async () => {
    const llm = new FakeLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'nonexistent', arguments: '{}' }],
        finish_reason: 'tool_use',
      },
      { content: 'ok', tool_calls: [], finish_reason: 'stop' },
    ]);

    const onToolResult = vi.fn();
    const agent = new Agent({ llm, onToolResult });
    await agent.run('try missing tool');

    expect(onToolResult).toHaveBeenCalledWith('nonexistent', expect.objectContaining({
      content: expect.stringContaining('not found'),
      isError: true,
    }));
  });

  it('handles tool execution error', async () => {
    const llm = new FakeLLM([
      {
        content: null,
        tool_calls: [{ id: 'tc1', name: 'broken', arguments: '{}' }],
        finish_reason: 'tool_use',
      },
      { content: 'recovered', tool_calls: [], finish_reason: 'stop' },
    ]);

    const tools = [{
      name: 'broken',
      description: 'Always fails',
      parameters: {},
      execute: async () => { throw new Error('boom'); },
    }];

    const agent = new Agent({ llm, tools });
    const result = await agent.run('try broken');
    expect(result).toBe('recovered');
  });

  it('stops at max rounds', async () => {
    // LLM always requests tool call → infinite loop
    const llm = new FakeLLM(
      Array(5).fill({
        content: null,
        tool_calls: [{ id: 'tc', name: 'loop', arguments: '{}' }],
        finish_reason: 'tool_use',
      })
    );

    const tools = [{
      name: 'loop',
      description: 'Loop forever',
      parameters: {},
      execute: async () => ({ content: 'again' }),
    }];

    const agent = new Agent({ llm, tools, maxRounds: 3 });
    const result = await agent.run('loop');
    expect(result).toBe('[Agent reached max rounds]');
  });

  it('calls onToolCall and onText callbacks', async () => {
    const llm = new FakeLLM([
      { content: 'hi there', tool_calls: [], finish_reason: 'stop' },
    ]);

    const onText = vi.fn();
    const agent = new Agent({ llm, onText });
    await agent.run('hello');
    expect(onText).toHaveBeenCalledWith('hi there');
  });
});
