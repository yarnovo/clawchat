import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const memoryRead: Tool = {
  name: 'memory_read',
  description: 'Read MEMORY.md (long-term memory)',
  parameters: {
    type: 'object',
    properties: {
      workDir: { type: 'string', description: 'Agent workspace directory' },
    },
    required: ['workDir'],
  },
  execute: async (args) => {
    try {
      const filePath = path.join(args.workDir as string, 'MEMORY.md');
      if (!fs.existsSync(filePath)) return { content: 'No memory file found' };
      return { content: fs.readFileSync(filePath, 'utf-8').slice(0, 20000) };
    } catch (err: any) {
      return { content: `Error: ${err.message}`, isError: true };
    }
  },
};
