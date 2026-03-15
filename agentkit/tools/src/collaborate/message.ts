import type { Tool } from '@agentkit/core';

/**
 * message — 发送消息给用户（通过回调）
 * 实际发送逻辑在运行时通过 setMessageHandler 注入
 */
let messageHandler: ((text: string) => Promise<void>) | null = null;

export function setMessageHandler(handler: (text: string) => Promise<void>): void {
  messageHandler = handler;
}

export const message: Tool = {
  name: 'message',
  description: 'Send a message to the user',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Message text to send' },
    },
    required: ['text'],
  },
  execute: async (args) => {
    if (messageHandler) {
      await messageHandler(args.text as string);
      return { content: 'Message sent' };
    }
    return { content: args.text as string };
  },
};
