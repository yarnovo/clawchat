import { execSync } from 'child_process';
import type { Tool } from '@agentkit/core';

export const bash: Tool = {
  name: 'bash',
  description: 'Execute a shell command and return stdout/stderr',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
    },
    required: ['command'],
  },
  execute: async (args) => {
    try {
      const output = execSync(args.command as string, {
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      return { content: output.slice(0, 10000) };
    } catch (err: any) {
      return { content: `Error: ${err.stderr || err.message}`.slice(0, 5000), isError: true };
    }
  },
};
