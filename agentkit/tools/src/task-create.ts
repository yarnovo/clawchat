import fs from 'fs';
import path from 'path';
import type { Tool } from '@agentkit/core';

export const taskCreate: Tool = {
  name: 'task_create',
  description: 'Create a sub-task and save it to the tasks directory',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Task description' },
      workDir: { type: 'string', description: 'Agent workspace directory' },
    },
    required: ['title', 'workDir'],
  },
  execute: async (args) => {
    const tasksDir = path.join(args.workDir as string, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    const id = Date.now().toString(36);
    const task = {
      id,
      title: args.title,
      description: args.description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(tasksDir, `${id}.json`), JSON.stringify(task, null, 2));
    return { content: `Task created: ${id} — ${args.title}` };
  },
};
