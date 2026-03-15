/**
 * 工具定义 — Agent 可以调用的能力
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}
