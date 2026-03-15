/**
 * OpenAI-compatible LLM Provider
 * 支持百炼(qwen)、DeepSeek、OpenAI、任何 OpenAI 兼容端点
 */
import OpenAI from 'openai';
import type { LLMProvider, LLMResponse, ChatMessage, ToolCall, ToolDefinition } from '@agentkit/core';

export interface OpenAIProviderOptions {
  /** API Key */
  apiKey: string;
  /** API 端点（默认 https://api.openai.com/v1） */
  baseURL?: string;
  /** 模型名称（默认 gpt-4o） */
  model?: string;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 温度 */
  temperature?: number;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model || 'gpt-4o';
    this.maxTokens = options.maxTokens || 4096;
    this.temperature = options.temperature ?? 0.7;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => this.toOpenAIMessage(m)),
      tools: tools && tools.length > 0 ? tools as any : undefined,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    });

    const choice = response.choices[0];
    const toolCalls: ToolCall[] = [];

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        });
      }
    }

    return {
      content: choice.message.content,
      tool_calls: toolCalls,
      finish_reason: choice.finish_reason || 'stop',
    };
  }

  private toOpenAIMessage(msg: ChatMessage): any {
    const base: any = { role: msg.role, content: msg.content };

    if (msg.role === 'tool' && msg.tool_call_id) {
      base.tool_call_id = msg.tool_call_id;
    }

    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      base.tool_calls = msg.tool_calls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }

    return base;
  }
}
