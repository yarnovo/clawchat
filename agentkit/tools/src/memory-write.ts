import type { Tool } from '@agentkit/core';
import { appendMemory } from '@agentkit/core';

export const memoryWrite: Tool = {
  name: 'memory_write',
  description: 'Append an entry to MEMORY.md (long-term memory)',
  parameters: {
    type: 'object',
    properties: {
      entry: { type: 'string', description: 'Memory entry to save' },
      workDir: { type: 'string', description: 'Agent workspace directory' },
    },
    required: ['entry', 'workDir'],
  },
  execute: async (args) => {
    try {
      appendMemory(args.workDir as string, args.entry as string);
      return { content: 'Memory saved' };
    } catch (err: any) {
      return { content: `Error: ${err.message}`, isError: true };
    }
  },
};
