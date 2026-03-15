import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const write: Tool = {
  name: 'write',
  description: 'Write content to a file (creates directories if needed)',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
  execute: async (args) => {
    try {
      fs.mkdirSync(path.dirname(args.path as string), { recursive: true });
      fs.writeFileSync(args.path as string, args.content as string, 'utf-8');
      return { content: `Written: ${args.path}` };
    } catch (err: any) {
      return { content: `Error: ${err.message}`, isError: true };
    }
  },
};
