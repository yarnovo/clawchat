/**
 * Agent — 纯内核
 *
 * LLM + bash + System Prompt + While Loop
 *
 * bash 是内置的唯一工具，不对外暴露 Tool 接口。
 * 所有其他能力通过 Skill 的 prompt + scripts 提供。
 */
import { execSync } from 'child_process';
import type { LLMProvider, ChatMessage, ToolDefinition } from './llm.js';
import type { ChatSession } from './session.js';
import { InMemorySession } from './session.js';

export interface AgentOptions {
  llm: LLMProvider;
  systemPrompt?: string;
  session?: ChatSession;
  maxRounds?: number;
  /** bash 执行前拦截（返回 allowed:false 可阻止） */
  onBeforeBash?: (command: string) => Promise<{ allowed: boolean; reason?: string }>;
  /** bash 执行后通知 */
  onAfterBash?: (command: string, output: string, isError: boolean) => Promise<void>;
  /** LLM 回复文本时 */
  onText?: (text: string) => void;
}

/** bash 工具定义（内部，发给 LLM） */
const BASH_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'bash',
    description: 'Execute a shell command and return stdout/stderr',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string', description: 'Shell command to execute' } },
      required: ['command'],
    },
  },
};

export class Agent {
  private llm: LLMProvider;
  private systemPrompt: string;
  private session: ChatSession;
  private maxRounds: number;
  private onBeforeBash?: AgentOptions['onBeforeBash'];
  private onAfterBash?: AgentOptions['onAfterBash'];
  private onText?: AgentOptions['onText'];
  private inbox: ChatMessage[] = [];

  constructor(options: AgentOptions) {
    this.llm = options.llm;
    this.session = options.session || new InMemorySession();
    this.systemPrompt = options.systemPrompt || 'You are a helpful assistant.';
    this.maxRounds = options.maxRounds || 20;
    this.onBeforeBash = options.onBeforeBash;
    this.onAfterBash = options.onAfterBash;
    this.onText = options.onText;
  }

  /**
   * 在工具调用循环中注入用户消息。
   * 消息会在下一轮 LLM 调用前被排入 session。
   * JS 单线程保证 inject() 在 await 间隙执行，无竞态。
   */
  inject(content: string): void {
    this.inbox.push({ role: 'user', content });
  }

  /** 排空 inbox → session */
  private drainInbox(): void {
    while (this.inbox.length > 0) {
      this.session.addMessage(this.inbox.shift()!);
    }
  }

  async run(userMessage: string): Promise<string> {
    this.session.addMessage({ role: 'user', content: userMessage });
    let round = 0;

    while (round < this.maxRounds) {
      round++;
      this.drainInbox();
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.session.getMessages(),
      ];

      const response = await this.llm.chat(messages, [BASH_TOOL]);

      if (response.tool_calls.length === 0) {
        const text = response.content || '';
        this.session.addMessage({ role: 'assistant', content: text });
        this.onText?.(text);
        return text;
      }

      this.session.addMessage({
        role: 'assistant', content: response.content || '', tool_calls: response.tool_calls,
      });

      for (const call of response.tool_calls) {
        let content: string;
        let isError = false;

        if (call.name !== 'bash') {
          content = `Unknown tool: ${call.name}`;
          isError = true;
        } else {
          const args = JSON.parse(call.arguments);
          const command = args.command as string;

          // pre-hook
          if (this.onBeforeBash) {
            const check = await this.onBeforeBash(command);
            if (!check.allowed) {
              content = `Blocked: ${check.reason}`;
              isError = true;
              this.session.addMessage({ role: 'tool', content, tool_call_id: call.id });
              continue;
            }
          }

          // execute
          try {
            content = execSync(command, { encoding: 'utf-8', timeout: 30000, maxBuffer: 1024 * 1024 }).slice(0, 10000);
          } catch (err: any) {
            content = `Error: ${err.stderr || err.message}`.slice(0, 5000);
            isError = true;
          }

          // post-hook
          await this.onAfterBash?.(command, content, isError);
        }

        this.session.addMessage({ role: 'tool', content, tool_call_id: call.id });
      }
    }

    return '[Agent reached max rounds]';
  }
}
