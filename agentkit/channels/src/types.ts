/**
 * Channel 接口 — 连接 Agent 和用户
 */
export interface Channel {
  name: string;
  connect(): Promise<void>;
  onMessage(handler: (input: string) => Promise<string>): void;
  sendMessage(text: string): Promise<void>;
  disconnect(): Promise<void>;
}
