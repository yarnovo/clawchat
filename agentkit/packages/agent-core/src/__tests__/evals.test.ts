/**
 * Agent 评估测试 — vitest-evals ToolCallScorer
 */
import { describeEval, ToolCallScorer } from 'vitest-evals';
import { Agent } from '../agent.js';
import type { LLMProvider, LLMResponse, ChatMessage, ToolDefinition } from '../llm.js';
import type { Tool } from '../types.js';

// --- FakeLLM ---
class FakeLLM implements LLMProvider {
  private responses: LLMResponse[];
  private idx = 0;
  constructor(responses: LLMResponse[]) { this.responses = responses; }
  async chat(_msgs: ChatMessage[], _tools?: ToolDefinition[]): Promise<LLMResponse> {
    return this.responses[this.idx++]!;
  }
}

// --- 工具 ---
const tools: Tool[] = [
  {
    name: 'get_weather',
    description: '查询天气',
    parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    execute: async (args) => ({ content: `${args.city}: 晴天 25°C` }),
  },
  {
    name: 'calculate',
    description: '计算数学表达式',
    parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    execute: async (args) => {
      const result = eval(args.expression as string);
      return { content: String(result) };
    },
  },
  {
    name: 'get_time',
    description: '获取当前时间',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({ content: '2026-03-15 19:00' }),
  },
];

// --- 通用 task 构造器 ---
function makeTask(fakeResponses: LLMResponse[]) {
  return async (input: string) => {
    const llm = new FakeLLM(fakeResponses);
    const collected: Array<{ name: string; arguments: any; result: any }> = [];

    const agent = new Agent({
      llm,
      tools,
      systemPrompt: 'You are helpful.',
      onToolCall: (name, args) => collected.push({ name, arguments: args, result: undefined }),
      onToolResult: (name, res) => {
        const last = collected.findLast(c => c.name === name);
        if (last) last.result = res.content;
      },
    });

    const text = await agent.run(input);
    return { result: text, toolCalls: collected };
  };
}

// --- 单工具调用 ---
describeEval('L1: 单工具调用 - 天气', {
  data: async () => [{
    input: '北京天气怎么样？',
    expectedTools: [{ name: 'get_weather', arguments: { city: '北京' } }],
  }],
  task: makeTask([
    { content: null, tool_calls: [{ id: 'tc0', name: 'get_weather', arguments: '{"city":"北京"}' }], finish_reason: 'tool_use' },
    { content: '北京晴天 25°C', tool_calls: [], finish_reason: 'stop' },
  ]),
  scorers: [ToolCallScorer({ params: 'fuzzy' })],
});

describeEval('L1: 单工具调用 - 计算', {
  data: async () => [{
    input: '帮我算 42 * 58',
    expectedTools: [{ name: 'calculate', arguments: { expression: '42 * 58' } }],
  }],
  task: makeTask([
    { content: null, tool_calls: [{ id: 'tc0', name: 'calculate', arguments: '{"expression":"42 * 58"}' }], finish_reason: 'tool_use' },
    { content: '结果是 2436', tool_calls: [], finish_reason: 'stop' },
  ]),
  scorers: [ToolCallScorer({ params: 'fuzzy' })],
});

describeEval('L1: 单工具调用 - 时间', {
  data: async () => [{
    input: '现在几点了？',
    expectedTools: [{ name: 'get_time' }],
  }],
  task: makeTask([
    { content: null, tool_calls: [{ id: 'tc0', name: 'get_time', arguments: '{}' }], finish_reason: 'tool_use' },
    { content: '现在 19:00', tool_calls: [], finish_reason: 'stop' },
  ]),
  scorers: [ToolCallScorer({ params: 'fuzzy' })],
});

// --- 多工具调用 ---
describeEval('L1: 多工具调用', {
  data: async () => [{
    input: '北京天气怎么样？顺便告诉我现在几点',
    expectedTools: [
      { name: 'get_weather', arguments: { city: '北京' } },
      { name: 'get_time' },
    ],
  }],
  task: makeTask([
    {
      content: null,
      tool_calls: [
        { id: 'tc0', name: 'get_weather', arguments: '{"city":"北京"}' },
        { id: 'tc1', name: 'get_time', arguments: '{}' },
      ],
      finish_reason: 'tool_use',
    },
    { content: '北京晴天 25°C，现在 19:00', tool_calls: [], finish_reason: 'stop' },
  ]),
  scorers: [ToolCallScorer({ params: 'fuzzy' })],
});

// --- 纯文本 ---
describeEval('L1: 纯文本（不调工具）', {
  data: async () => [{
    input: '你好',
    expectedTools: [],
  }],
  task: makeTask([
    { content: '你好！', tool_calls: [], finish_reason: 'stop' },
  ]),
  scorers: [ToolCallScorer()],
});
