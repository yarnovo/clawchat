/**
 * EventLoop — 通用事件总线
 *
 * 纯事件系统，不知道 Agent/LLM 的存在。
 * 外部通过 push/fire 推入事件，通过 onProcess 注册处理器。
 *
 * 策略：
 * - sequential: 逐个处理（默认）
 * - batch: 累积事件，窗口期后合并处理
 * - priority: 按优先级排序后逐个处理
 */
import { randomUUID } from 'crypto';

// ---- 类型 ----

export interface AgentEvent {
  id: string;
  type: string;           // 自定义事件类型
  source: string;         // 事件来源标识
  payload: Record<string, unknown>;
  priority?: number;      // 数字越小越优先，默认 10
  timestamp: Date;
}

export type QueueStrategy = 'sequential' | 'batch' | 'priority';

export interface EventLoopOptions {
  strategy?: QueueStrategy;
  /** batch 模式：等待窗口 (ms)，默认 1500 */
  batchWindow?: number;
  /** batch 模式：最大累积条数，默认 10 */
  batchMax?: number;
}

/** 快捷创建事件 */
export function createEvent(
  type: string,
  source: string,
  payload: Record<string, unknown>,
  priority?: number,
): AgentEvent {
  return { id: randomUUID(), type, source, payload, priority, timestamp: new Date() };
}

// ---- 内部 ----

interface QueueItem {
  event: AgentEvent;
  resolve: (result: string) => void;
  reject: (err: Error) => void;
}

type ProcessHandler = (events: AgentEvent[]) => Promise<string>;
type EventListener = (event: AgentEvent) => void;

// ---- EventLoop ----

export class EventLoop {
  private queue: QueueItem[] = [];
  private processing = false;
  private running = false;
  private handler: ProcessHandler | null = null;
  private listeners = new Map<string, EventListener[]>();

  private strategy: QueueStrategy;
  private batchWindow: number;
  private batchMax: number;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: EventLoopOptions = {}) {
    this.strategy = opts.strategy || 'sequential';
    this.batchWindow = opts.batchWindow || 1500;
    this.batchMax = opts.batchMax || 10;
  }

  /** 注册事件处理器 */
  onProcess(handler: ProcessHandler): void {
    this.handler = handler;
  }

  /** 推入事件，返回处理结果 */
  push(event: AgentEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ event, resolve, reject });
      if (this.strategy === 'priority') {
        this.queue.sort((a, b) => (a.event.priority ?? 10) - (b.event.priority ?? 10));
      }
      if (this.strategy === 'batch') this.scheduleBatch();
      else this.drain();
    });
  }

  /** 推入事件，不等结果（fire-and-forget） */
  fire(event: AgentEvent): void {
    this.push(event).catch(err =>
      console.error(`[EventLoop] ${event.type}:${event.source} error: ${(err as Error).message}`),
    );
  }

  /** 监听输出事件 */
  on(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(listener);
  }

  /** 发出输出事件 */
  emit(event: AgentEvent): void {
    for (const l of this.listeners.get(event.type) || []) l(event);
    for (const l of this.listeners.get('*') || []) l(event);
  }

  start(): void { this.running = true; this.drain(); }

  stop(): void {
    this.running = false;
    if (this.batchTimer) { clearTimeout(this.batchTimer); this.batchTimer = null; }
  }

  get pending(): number { return this.queue.length; }
  get isProcessing(): boolean { return this.processing; }

  // ---- 内部调度 ----

  private scheduleBatch(): void {
    if (this.queue.length >= this.batchMax) {
      if (this.batchTimer) { clearTimeout(this.batchTimer); this.batchTimer = null; }
      this.drain();
      return;
    }
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => { this.batchTimer = null; this.drain(); }, this.batchWindow);
    }
  }

  private async drain(): Promise<void> {
    if (this.processing || !this.running || this.queue.length === 0 || !this.handler) return;
    this.processing = true;
    try {
      if (this.strategy === 'batch') {
        await this.processItems(this.queue.splice(0));
      } else {
        await this.processItems([this.queue.shift()!]);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        if (this.strategy === 'batch') this.scheduleBatch();
        else this.drain();
      }
    }
  }

  private async processItems(items: QueueItem[]): Promise<void> {
    try {
      const result = await this.handler!(items.map(i => i.event));
      for (const item of items) item.resolve(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      for (const item of items) item.reject(error);
    }
  }
}
