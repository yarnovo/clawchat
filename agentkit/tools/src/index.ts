import type { Tool } from '@agentkit/core';

// 第一层：生存工具（5 个）
import { bash } from './bash.js';
import { read } from './read.js';
import { write } from './write.js';
import { webSearch } from './web-search.js';
import { webFetch } from './web-fetch.js';

// 第二层：进化工具（5 个）
import { skillSearch } from './skill-search.js';
import { skillInstall } from './skill-install.js';
import { toolList, setRegisteredTools } from './tool-list.js';
import { memoryWrite } from './memory-write.js';
import { memoryRead } from './memory-read.js';

// 第三层：协作工具（3 个）
import { message, setMessageHandler } from './message.js';
import { taskCreate } from './task-create.js';
import { taskStatus } from './task-status.js';

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
