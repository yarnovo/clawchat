/**
 * Agentic 三个核心概念：
 *
 * Provider  → 供给（构造时注入：LLM、Session）
 * Channel   → 感知 + 行动（连接外部世界，双向事件流）
 * Extension → 增强（修改 Agent 行为：prompt 注入、bash 拦截）
 */
import type { EventLoop } from '@agentkit/event-loop';

/** Channel 和 Extension 共享的上下文 */
export interface AgenticContext {
  workDir: string;
  eventLoop: EventLoop;
}

/**
 * Channel — 连接外部世界
 *
 * 例：HTTP、WebSocket、Scheduler、Telegram、Slack
 */
export interface Channel {
  name: string;
  setup(ctx: AgenticContext): Promise<void>;
  teardown?(): Promise<void>;
  /** 教 Agent 怎么跟这个 Channel 配合 */
  systemPrompt?(): string | undefined;
  info?(): Record<string, unknown>;
}

/**
 * Extension — 增强 Agent 行为
 *
 * 注入知识：systemPrompt()
 * 拦截 bash：preBash / postBash
 *
 * 例：Skills、Memory、Logging、RateLimit
 */
export interface Extension {
  name: string;
  setup?(ctx: AgenticContext): Promise<void>;
  teardown?(): Promise<void>;
  systemPrompt?(): string | undefined;
  preBash?(command: string): Promise<HookResult>;
  postBash?(command: string, output: string, isError: boolean): Promise<void>;
  info?(): Record<string, unknown>;
}

export interface HookResult {
  allowed: boolean;
  reason?: string;
}
