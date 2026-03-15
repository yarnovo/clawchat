import type { LLMProvider, ChatMessage, ToolDefinition } from './llm.js';
import type { Tool, ToolResult } from './types.js';
import type { Memory } from './memory.js';
import { InMemory } from './memory.js';
import { loadPersonaPrompt } from './persona.js';

export interface AgentOptions {
  /** LLM 提供者 */
  llm: LLMProvider;
  /** 可用工具 */
  tools?: Tool[];
  /** 系统提示词（直接传入字符串） */
  systemPrompt?: string;
  /** 工作目录（从中加载 AGENT.md / TOOLS.md / MEMORY.md / HEARTBEAT.md） */
  workDir?: string;
  /** 记忆（默认 InMemory） */
  memory?: Memory;
  /** 最大工具调用轮数（防止无限循环，默认 20） */
  maxRounds?: number;
  /** 每轮回调 */
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onText?: (text: string) => void;
}

export class Agent {
  private llm: LLMProvider;
  private tools: Map<string, Tool>;
  private toolDefs: ToolDefinition[];
  private systemPrompt: string;
  private memory: Memory;
  private maxRounds: number;
  private onToolCall?: AgentOptions['onToolCall'];
  private onToolResult?: AgentOptions['onToolResult'];
  private onText?: AgentOptions['onText'];

  constructor(options: AgentOptions) {
    this.llm = options.llm;
    this.memory = options.memory || new InMemory();
    this.maxRounds = options.maxRounds || 20;
    this.onToolCall = options.onToolCall;
    this.onToolResult = options.onToolResult;
    this.onText = options.onText;

    // 构建系统提示词：直接传入 > 从 workDir 加载人格文件 > 默认
    if (options.systemPrompt) {
      this.systemPrompt = options.systemPrompt;
    } else if (options.workDir) {
      const personaPrompt = loadPersonaPrompt(options.workDir);
      this.systemPrompt = personaPrompt || 'You are a helpful assistant.';
    } else {
      this.systemPrompt = 'You are a helpful assistant.';
    }

    // 注册工具
    this.tools = new Map();
    this.toolDefs = [];
    for (const tool of options.tools || []) {
      this.tools.set(tool.name, tool);
      this.toolDefs.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      });
    }
  }

  /**
   * 核心 — while 循环
   */
  async run(userMessage: string): Promise<string> {
    // 加入用户消息
    this.memory.addMessage({ role: 'user', content: userMessage });

    let round = 0;

    while (round < this.maxRounds) {
      round++;

      // 构建完整消息列表
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.memory.getMessages(),
      ];

      // 调 LLM
      const response = await this.llm.chat(
        messages,
        this.toolDefs.length > 0 ? this.toolDefs : undefined,
      );

      // LLM 直接回复文本
      if (response.tool_calls.length === 0) {
        const text = response.content || '';
        this.memory.addMessage({ role: 'assistant', content: text });
        this.onText?.(text);
        return text;
      }

      // LLM 要调工具 — 先把 assistant 消息（含 tool_calls）存入历史
      this.memory.addMessage({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      });

      // 执行每个工具调用
      for (const call of response.tool_calls) {
        const tool = this.tools.get(call.name);
        let result: ToolResult;

        if (!tool) {
          result = { content: `Tool "${call.name}" not found`, isError: true };
        } else {
          try {
            const args = JSON.parse(call.arguments);
            this.onToolCall?.(call.name, args);
            result = await tool.execute(args);
          } catch (err) {
            result = {
              content: `Error: ${err instanceof Error ? err.message : String(err)}`,
              isError: true,
            };
          }
        }

        this.onToolResult?.(call.name, result);

        // 把工具结果加入历史
        this.memory.addMessage({
          role: 'tool',
          content: result.content,
          tool_call_id: call.id,
        });
      }

      // 回到 while 循环顶部，让 LLM 继续
    }

    return '[Agent reached max rounds]';
  }
}
