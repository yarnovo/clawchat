import { execSync } from 'child_process';
import type { Tool } from '@agentkit/core';

export const webSearch: Tool = {
  name: 'web_search',
  description: 'Search the web and return results',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    try {
      const encoded = encodeURIComponent(args.query as string);
      const output = execSync(
        `curl -s "https://html.duckduckgo.com/html/?q=${encoded}" | head -c 5000`,
        { encoding: 'utf-8', timeout: 10000 },
      );
      return { content: output };
    } catch {
      return { content: 'Web search failed', isError: true };
    }
  },
};
