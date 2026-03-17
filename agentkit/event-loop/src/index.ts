/**
 * EventLoop — Agent 的事件分发器
 *
 * Agent 空闲 → run()，Agent 忙碌 → inject()
 * 不再需要队列、锁、策略 — inject + drainInbox 天然解决。
 */
import { randomUUID } from 'crypto';

// ---- 类型 ----

export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/** 快捷创建事件 */
export function createEvent(
  type: string,
  source: string,
  payload: Record<string, unknown>,
): AgentEvent {
  return { id: randomUUID(), type, source, payload, timestamp: new Date() };
}

/** Agent 必须实现的最小接口 */
export interface Runnable {
  run(message: string): Promise<string>;
  inject(content: string): void;
  abort(): void;
}

// ---- 格式化 ----

export function formatEvent(event: AgentEvent): string {
  if (event.type === 'message') return event.payload.text as string;
  if (event.type === 'timer') return `[定时任务: ${event.payload.taskName}] ${event.payload.prompt}`;
  return `[${event.type}:${event.source}] ${JSON.stringify(event.payload)}`;
}

// ---- EventLoop ----

export class EventLoop {
  private agent: Runnable | null = null;
  private runningPromise: Promise<string> | null = null;

  /** 绑定 Agent */
  bind(agent: Runnable): void {
    this.agent = agent;
  }

  /** 推入事件，返回处理结果 */
  async push(event: AgentEvent): Promise<string> {
    if (!this.agent) throw new Error('EventLoop: no agent bound');

    const msg = formatEvent(event);

    if (this.runningPromise) {
      // Agent 正在跑 → inject，搭便车拿当前 run 的结果
      this.agent.inject(msg);
      return this.runningPromise;
    }

    // Agent 空闲 → 启动新 run
    this.runningPromise = this.agent.run(msg);
    try {
      return await this.runningPromise;
    } finally {
      this.runningPromise = null;
    }
  }

  /** 推入事件，不等结果 */
  fire(event: AgentEvent): void {
    this.push(event).catch(err =>
      console.error(`[EventLoop] ${event.type}:${event.source} error: ${(err as Error).message}`),
    );
  }

  /** 中断当前运行 */
  abort(): void {
    this.agent?.abort();
  }

  get isProcessing(): boolean { return this.runningPromise !== null; }
}
