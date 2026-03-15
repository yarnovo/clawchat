/**
 * plugin-memory — 长期记忆 Extension
 *
 * 从 MEMORY.md 加载记忆 → 注入 system prompt
 * 未来可扩展为向量存储、自动摘要等策略
 */
import fs from 'fs';
import path from 'path';
import type { Extension, AgenticContext } from '@agentkit/agentic';

export interface MemoryExtensionOptions {
  /** 记忆文件名，默认 MEMORY.md */
  filename?: string;
  /** 最大字符数，默认 20000 */
  maxSize?: number;
}

export function memoryExtension(opts: MemoryExtensionOptions = {}): Extension {
  const filename = opts.filename || 'MEMORY.md';
  const maxSize = opts.maxSize || 20_000;
  let content = '';
  let filePath = '';

  return {
    name: 'memory',

    setup: async (ctx: AgenticContext) => {
      filePath = path.join(ctx.workDir, filename);
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8').trim();
        if (content.length > maxSize) {
          content = content.slice(0, maxSize) + '\n[truncated]';
        }
        if (content) {
          console.log(`   Memory: ${filePath} (${content.length} chars)`);
        }
      }
    },

    systemPrompt: () => {
      if (!content) return undefined;
      return `## Long-term Memory\n\n${content}`;
    },

    // post-bash: 如果 Agent 写了 MEMORY.md，热更新记忆
    postBash: async (command) => {
      if (command.includes(filename) && (command.includes('>') || command.includes('tee'))) {
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8').trim();
          if (content.length > maxSize) content = content.slice(0, maxSize) + '\n[truncated]';
        }
      }
    },

    info: () => ({
      file: filename,
      loaded: content.length > 0,
      size: content.length,
    }),
  };
}
