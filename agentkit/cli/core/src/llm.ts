/**
 * LLM Provider — 模型无关的接口
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

export interface LLMResponse {
  content: string | null;
  tool_calls: ToolCall[];
  finish_reason: string;
}

export interface LLMStreamEvent {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'done';
  text?: string;
  tool_call?: Partial<ToolCall>;
}

/**
 * 任何支持 OpenAI 兼容格式的模型都能实现这个接口
 */
export interface LLMProvider {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
  stream?(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<LLMStreamEvent>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
