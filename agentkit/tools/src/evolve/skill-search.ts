import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const skillSearch: Tool = {
  name: 'skill_search',
  description: 'Search available skills in the skills marketplace directory',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search keyword' },
      skillsDir: { type: 'string', description: 'Skills marketplace directory path' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const dir = (args.skillsDir as string) || '/workspace/skills-market';
    if (!fs.existsSync(dir)) return { content: 'Skills directory not found' };

    const query = (args.query as string).toLowerCase();
    const results: string[] = [];

    for (const entry of fs.readdirSync(dir)) {
      const skillDir = path.join(dir, entry);
      const skillFile = path.join(skillDir, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf-8').toLowerCase();
        if (entry.toLowerCase().includes(query) || content.includes(query)) {
          const firstLine = fs.readFileSync(skillFile, 'utf-8').split('\n')[0].slice(0, 60);
          results.push(`${entry}: ${firstLine}`);
        }
      }
    }

    return { content: results.length > 0 ? results.join('\n') : `No skills found for "${args.query}"` };
  },
};
