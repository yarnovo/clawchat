import type { Tool } from '@agentkit/core';
import { bash } from './bash.js';
import { read } from './read.js';
import { write } from './write.js';
import { webSearch } from './web-search.js';
import { memoryWrite } from './memory-write.js';
import { memoryRead } from './memory-read.js';

export { bash, read, write, webSearch, memoryWrite, memoryRead };

/** 所有内置工具 */
export function builtinTools(): Tool[] {
  return [bash, read, write, webSearch, memoryWrite, memoryRead];
}
