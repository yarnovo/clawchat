import type { Tool } from '@agentkit/core';

/**
 * tool_list — Agent 查看自己有哪些工具
 * 实际工具列表在运行时注入
 */
let registeredTools: string[] = [];

export function setRegisteredTools(tools: string[]): void {
  registeredTools = tools;
}

export const toolList: Tool = {
  name: 'tool_list',
  description: 'List all tools currently available to this agent',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async () => {
    return { content: registeredTools.length > 0 ? registeredTools.join('\n') : 'No tools registered' };
  },
};
