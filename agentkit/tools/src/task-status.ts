import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const taskStatus: Tool = {
  name: 'task_status',
  description: 'List all tasks and their status',
  parameters: {
    type: 'object',
    properties: {
      workDir: { type: 'string', description: 'Agent workspace directory' },
    },
    required: ['workDir'],
  },
  execute: async (args) => {
    const tasksDir = path.join(args.workDir as string, 'tasks');
    if (!fs.existsSync(tasksDir)) return { content: 'No tasks found' };

    const tasks: string[] = [];
    for (const file of fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'))) {
      try {
        const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
        tasks.push(`[${task.status}] ${task.id}: ${task.title}`);
      } catch { /* skip invalid */ }
    }

    return { content: tasks.length > 0 ? tasks.join('\n') : 'No tasks found' };
  },
};
