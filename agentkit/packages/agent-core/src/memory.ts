import type { ChatMessage } from './llm.js';

/**
 * Memory — 管理对话历史
 */
export interface Memory {
  /** 获取历史消息 */
  getMessages(): ChatMessage[];
  /** 追加消息 */
  addMessage(message: ChatMessage): void;
  /** 清空 */
  clear(): void;
}

/**
 * 最简单的内存 Memory — 数组存储
 */
export class InMemory implements Memory {
  private messages: ChatMessage[] = [];

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
  }

  clear(): void {
    this.messages = [];
  }
}
