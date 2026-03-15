import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const skillInstall: Tool = {
  name: 'skill_install',
  description: 'Install a skill from the marketplace into the agent workspace',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Skill name to install' },
      workDir: { type: 'string', description: 'Agent workspace directory' },
      skillsDir: { type: 'string', description: 'Skills marketplace directory' },
    },
    required: ['name', 'workDir'],
  },
  execute: async (args) => {
    const marketDir = (args.skillsDir as string) || '/workspace/skills-market';
    const srcDir = path.join(marketDir, args.name as string);
    const dstDir = path.join(args.workDir as string, 'skills', args.name as string);

    if (!fs.existsSync(srcDir)) {
      return { content: `Skill "${args.name}" not found in marketplace`, isError: true };
    }

    fs.cpSync(srcDir, dstDir, { recursive: true });
    return { content: `Installed skill "${args.name}" to ${dstDir}` };
  },
};
