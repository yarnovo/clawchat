import fs from 'fs';
import type { Tool } from '@agentkit/core';

export const read: Tool = {
  name: 'read',
  description: 'Read a file and return its content',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
    },
    required: ['path'],
  },
  execute: async (args) => {
    try {
      const content = fs.readFileSync(args.path as string, 'utf-8');
      return { content: content.slice(0, 20000) };
    } catch (err: any) {
      return { content: `Error: ${err.message}`, isError: true };
    }
  },
};
