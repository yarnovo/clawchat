import { execSync } from 'child_process';
import type { Tool } from '@agentkit/core';

export const webFetch: Tool = {
  name: 'web_fetch',
  description: 'Fetch a URL and return its content',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
    },
    required: ['url'],
  },
  execute: async (args) => {
    try {
      const output = execSync(
        `curl -sL --max-time 10 "${args.url as string}" | head -c 10000`,
        { encoding: 'utf-8', timeout: 15000 },
      );
      return { content: output };
    } catch {
      return { content: 'Fetch failed', isError: true };
    }
  },
};
