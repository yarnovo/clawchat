/**
 * AgentRunner — 组装 Agent + EventLoop + Channel + Extension
 *
 * Provider（构造注入）: LLM, Session
 * Channel（.use()）: 外部世界 ↔ EventLoop
 * Extension（.use()）: 增强 Agent 行为
 */
import path from 'path';
import { Agent } from '@agentkit/core';
import type { LLMProvider, ChatSession } from '@agentkit/core';
import { EventLoop } from '@agentkit/event-loop';
import type { Channel, Extension, AgenticContext } from './interfaces.js';

export interface AgentRunnerOptions {
  workspace: string;
  /** Provider: LLM */
  llm: LLMProvider;
  /** Provider: Session（默认 InMemorySession） */
  session?: ChatSession;
}

function isExtension(x: Channel | Extension): x is Extension {
  return 'systemPrompt' in x || 'preBash' in x || 'postBash' in x;
}

export class AgentRunner {
  private channels: Channel[] = [];
  private extensions: Extension[] = [];
  private agent!: Agent;
  private loop: EventLoop;
  private workspace: string;
  private opts: AgentRunnerOptions;

  constructor(opts: AgentRunnerOptions) {
    this.workspace = path.resolve(opts.workspace);
    this.opts = opts;
    this.loop = new EventLoop();
  }

  use(plugin: Channel | Extension): this {
    if (isExtension(plugin)) this.extensions.push(plugin);
    else this.channels.push(plugin as Channel);
    return this;
  }

  get eventLoop(): EventLoop { return this.loop; }

  async start(): Promise<void> {
    const abs = this.workspace;
    const ctx: AgenticContext = { workDir: abs, eventLoop: this.loop };

    // 1. Setup Extensions + Channels
    for (const ext of this.extensions) await ext.setup?.(ctx);
    for (const ch of this.channels) await ch.setup(ctx);

    // 2. 收集 system prompt（Extensions + Channels 都可以注入）
    const prompts = [
      ...this.extensions.map(e => e.systemPrompt?.()),
      ...this.channels.map(c => c.systemPrompt?.()),
    ].filter((s): s is string => !!s);
    const systemPrompt = prompts.join('\n\n') || 'You are a helpful assistant.';

    // 3. 创建 Agent（bash 内置，hooks 路由到 Extensions）
    this.agent = new Agent({
      llm: this.opts.llm,
      systemPrompt,
      session: this.opts.session,
      onBeforeBash: async (command) => {
        for (const ext of this.extensions) {
          const r = await ext.preBash?.(command);
          if (r && !r.allowed) return { allowed: false, reason: `${ext.name}: ${r.reason}` };
        }
        return { allowed: true };
      },
      onAfterBash: async (command, output, isError) => {
        for (const ext of this.extensions) await ext.postBash?.(command, output, isError);
      },
    });

    // 4. 桥接：EventLoop ↔ Agent
    this.loop.bind(this.agent);

    console.log(`🚀 ${path.basename(abs)} started`);
    console.log(`   Extensions: ${this.extensions.map(e => e.name).join(', ') || 'none'}`);
    console.log(`   Channels: ${this.channels.map(c => c.name).join(', ') || 'none'}\n`);
  }

  async stop(): Promise<void> {
    for (const ch of [...this.channels].reverse()) await ch.teardown?.();
    for (const ext of [...this.extensions].reverse()) await ext.teardown?.();
  }

  async chat(text: string): Promise<string> {
    return this.agent.run(text);
  }

  getInfo(): Record<string, unknown> {
    const info: Record<string, unknown> = {
      workspace: path.basename(this.workspace),
      extensions: this.extensions.map(e => e.name),
      channels: this.channels.map(c => c.name),
      processing: this.loop.isProcessing,
    };
    for (const p of [...this.extensions, ...this.channels]) {
      const i = p.info?.();
      if (i) info[p.name] = i;
    }
    return info;
  }
}
