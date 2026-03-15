import type { Tool } from '@agentkit/core';

// 第一层：生存工具（5 个）
import { bash } from './survive/bash.js';
import { read } from './survive/read.js';
import { write } from './survive/write.js';
import { webSearch } from './survive/web-search.js';
import { webFetch } from './survive/web-fetch.js';

// 第二层：进化工具（5 个）
import { skillSearch } from './evolve/skill-search.js';
import { skillInstall } from './evolve/skill-install.js';
import { toolList, setRegisteredTools } from './evolve/tool-list.js';
import { memoryWrite } from './evolve/memory-write.js';
import { memoryRead } from './evolve/memory-read.js';

// 第三层：协作工具（3 个）
import { message, setMessageHandler } from './collaborate/message.js';
import { taskCreate } from './collaborate/task-create.js';
import { taskStatus } from './collaborate/task-status.js';

export {
  // 生存
  bash, read, write, webSearch, webFetch,
  // 进化
  skillSearch, skillInstall, toolList, memoryWrite, memoryRead,
  // 协作
  message, taskCreate, taskStatus,
  // 运行时配置
  setRegisteredTools, setMessageHandler,
};

/** 全部 13 个内置工具 */
export function builtinTools(): Tool[] {
  return [
    bash, read, write, webSearch, webFetch,
    skillSearch, skillInstall, toolList, memoryWrite, memoryRead,
    message, taskCreate, taskStatus,
  ];
}
