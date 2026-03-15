/**
 * Persona — 从文件系统加载人格文件，构建系统提示词
 *
 * 文件加载顺序（优先级从高到低）：
 * 1. AGENT.md   — 人格 + 行为规则（受保护，Agent 不能修改）
 * 2. TOOLS.md   — 已安装工具描述
 * 3. MEMORY.md  — 长期记忆（Agent 可读写）
 * 4. HEARTBEAT.md — 定时任务清单
 *
 * 全部拼接后注入 system prompt 的 # Agent Context 区域
 */
import fs from 'fs';
import path from 'path';

export interface PersonaFile {
  name: string;
  content: string;
  protected: boolean; // Agent 不能修改
}

/** 加载顺序 */
const PERSONA_FILES: Array<{ filename: string; header: string; protected: boolean }> = [
  { filename: 'AGENT.md', header: 'Agent Identity', protected: true },
  { filename: 'TOOLS.md', header: 'Available Tools', protected: false },
  { filename: 'MEMORY.md', header: 'Memory', protected: false },
  { filename: 'HEARTBEAT.md', header: 'Scheduled Tasks', protected: false },
];

/** 单文件最大字符数 */
const MAX_FILE_SIZE = 20_000;
/** 总计最大字符数 */
const MAX_TOTAL_SIZE = 150_000;

/**
 * 从目录加载人格文件
 */
export function loadPersonaFiles(dir: string): PersonaFile[] {
  const files: PersonaFile[] = [];

  for (const { filename, protected: isProtected } of PERSONA_FILES) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) continue;

    // 截断
    if (content.length > MAX_FILE_SIZE) {
      const half = Math.floor(MAX_FILE_SIZE / 2);
      content = content.slice(0, half) + '\n\n... [truncated] ...\n\n' + content.slice(-half);
    }

    files.push({ name: filename, content, protected: isProtected });
  }

  return files;
}

/**
 * 把人格文件构建成系统提示词的一部分
 */
export function buildPersonaPrompt(files: PersonaFile[]): string {
  if (files.length === 0) return '';

  const sections: string[] = ['# Agent Context', ''];

  let totalSize = 0;
  for (const file of files) {
    if (totalSize + file.content.length > MAX_TOTAL_SIZE) break;

    const header = PERSONA_FILES.find(f => f.filename === file.name)?.header || file.name;
    sections.push(`## ${header}`, '', file.content, '');
    totalSize += file.content.length;
  }

  return sections.join('\n');
}

/**
 * 从目录加载并构建完整系统提示词
 */
export function loadPersonaPrompt(dir: string): string {
  const files = loadPersonaFiles(dir);
  return buildPersonaPrompt(files);
}

/**
 * 写入 MEMORY.md（Agent 可调用）
 */
export function writeMemory(dir: string, content: string): void {
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), content, 'utf-8');
}

/**
 * 追加到 MEMORY.md
 */
export function appendMemory(dir: string, entry: string): void {
  const filePath = path.join(dir, 'MEMORY.md');
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const timestamp = new Date().toISOString().split('T')[0];
  fs.writeFileSync(filePath, existing + `\n\n## ${timestamp}\n\n${entry}`, 'utf-8');
}
