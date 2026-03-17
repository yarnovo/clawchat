/**
 * Agent — 纯内核
 *
 * LLM + bash + System Prompt + While Loop
 *
 * bash 是内置的唯一工具，不对外暴露 Tool 接口。
 * 所有其他能力通过 Skill 的 prompt + scripts 提供。
 */
import { spawn, type ChildProcess } from 'child_process';
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
  private abortController: AbortController | null = null;
  private childProcess: ChildProcess | null = null;

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

  /** Abort the current run */
  abort(): void {
    this.abortController?.abort();
    this.childProcess?.kill('SIGTERM');
  }

  private execBash(command: string, signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'] });
      this.childProcess = child;

      let stdout = '';
      let stderr = '';
      let outputSize = 0;
      const MAX_OUTPUT = 1024 * 1024; // 1MB
      const TIMEOUT = 30_000;

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
      }, TIMEOUT);

      const onAbort = () => { child.kill('SIGTERM'); };
      signal.addEventListener('abort', onAbort);

      child.stdout!.on('data', (chunk: Buffer) => {
        outputSize += chunk.length;
        if (outputSize > MAX_OUTPUT) {
          child.kill('SIGTERM');
          return;
        }
        stdout += chunk.toString();
      });

      child.stderr!.on('data', (chunk: Buffer) => {
        outputSize += chunk.length;
        if (outputSize > MAX_OUTPUT) {
          child.kill('SIGTERM');
          return;
        }
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        this.childProcess = null;

        if (signal.aborted) {
          const err = new Error('Aborted');
          (err as any).stderr = 'Aborted';
          reject(err);
        } else if (code !== 0) {
          const err = new Error(`Process exited with code ${code}`);
          (err as any).stderr = stderr;
          reject(err);
        } else {
          resolve(stdout.slice(0, 10_000));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        this.childProcess = null;
        reject(err);
      });

      child.stdin!.end();
    });
  }

  async run(userMessage: string): Promise<string> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.session.addMessage({ role: 'user', content: userMessage });
    let round = 0;

    while (round < this.maxRounds) {
      if (signal.aborted) {
        const text = '[Aborted]';
        this.session.addMessage({ role: 'assistant', content: text });
        return text;
      }
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
            content = await this.execBash(command, signal);
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
