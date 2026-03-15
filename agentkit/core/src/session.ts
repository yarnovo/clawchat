import type { ChatMessage } from './llm.js';

export interface ChatSession {
  getMessages(): ChatMessage[];
  addMessage(message: ChatMessage): void;
  clear(): void;
}

/** 内存 Session — 测试、一次性对话 */
export class InMemorySession implements ChatSession {
  private msgs: ChatMessage[] = [];
  getMessages(): ChatMessage[] { return [...this.msgs]; }
  addMessage(message: ChatMessage): void { this.msgs.push(message); }
  clear(): void { this.msgs = []; }
}
