/**
 * Persona — 从文件系统加载人格文件 + 技能，构建系统提示词
 *
 * 文件加载顺序（优先级从高到低）：
 * 1. AGENT.md     — 人格 + 行为规则（受保护，Agent 不能修改）
 * 2. TOOLS.md     — 已安装工具描述
 * 3. MEMORY.md    — 长期记忆（Agent 可读写）
 * 4. skills/*.md  — 技能（扫描 skills/ 目录下所有 SKILL.md）
 * 5. HEARTBEAT.md — 定时任务清单
 *
 * 全部拼接后注入 system prompt 的 # Agent Context 区域
 */
import fs from 'fs';
import path from 'path';

export interface PersonaFile {
  name: string;
  content: string;
  protected: boolean;
}

/** 加载顺序（skills 在 MEMORY 和 HEARTBEAT 之间动态插入） */
const PERSONA_FILES: Array<{ filename: string; header: string; protected: boolean }> = [
  { filename: 'AGENT.md', header: 'Agent Identity', protected: true },
  { filename: 'TOOLS.md', header: 'Available Tools', protected: false },
  { filename: 'MEMORY.md', header: 'Memory', protected: false },
  // skills 在这里动态插入
  { filename: 'HEARTBEAT.md', header: 'Scheduled Tasks', protected: false },
];

/** 单文件最大字符数 */
const MAX_FILE_SIZE = 20_000;
/** 单个技能最大字符数 */
const MAX_SKILL_SIZE = 10_000;
/** 总计最大字符数 */
const MAX_TOTAL_SIZE = 150_000;

function truncate(content: string, maxSize: number): string {
  if (content.length <= maxSize) return content;
  const half = Math.floor(maxSize / 2);
  return content.slice(0, half) + '\n\n... [truncated] ...\n\n' + content.slice(-half);
}

/**
 * 扫描 skills/ 目录，加载所有 SKILL.md
 */
export function loadSkills(dir: string): PersonaFile[] {
  const skillsDir = path.join(dir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const skills: PersonaFile[] = [];

  for (const entry of fs.readdirSync(skillsDir)) {
    const entryPath = path.join(skillsDir, entry);

    // skills/xxx/SKILL.md（子目录格式）
    if (fs.statSync(entryPath).isDirectory()) {
      const skillFile = path.join(entryPath, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        let content = fs.readFileSync(skillFile, 'utf-8').trim();
        if (content) {
          skills.push({
            name: `skill:${entry}`,
            content: truncate(content, MAX_SKILL_SIZE),
            protected: false,
          });
        }
      }
    }

    // skills/xxx.md（平铺格式）
    if (entry.endsWith('.md') && fs.statSync(entryPath).isFile()) {
      let content = fs.readFileSync(entryPath, 'utf-8').trim();
      if (content) {
        const name = entry.replace('.md', '');
        skills.push({
          name: `skill:${name}`,
          content: truncate(content, MAX_SKILL_SIZE),
          protected: false,
        });
      }
    }
  }

  return skills;
}

/**
 * 从目录加载人格文件 + 技能
 */
export function loadPersonaFiles(dir: string): PersonaFile[] {
  const files: PersonaFile[] = [];

  // AGENT.md, TOOLS.md, MEMORY.md
  for (const { filename, protected: isProtected } of PERSONA_FILES.slice(0, 3)) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) continue;
    files.push({ name: filename, content: truncate(content, MAX_FILE_SIZE), protected: isProtected });
  }

  // Skills（在 MEMORY 和 HEARTBEAT 之间）
  files.push(...loadSkills(dir));

  // HEARTBEAT.md
  const hb = PERSONA_FILES[3]; // HEARTBEAT.md
  const hbPath = path.join(dir, hb.filename);
  if (fs.existsSync(hbPath)) {
    let content = fs.readFileSync(hbPath, 'utf-8').trim();
    if (content) {
      files.push({ name: hb.filename, content: truncate(content, MAX_FILE_SIZE), protected: hb.protected });
    }
  }

  return files;
}

/**
 * 把人格文件 + 技能构建成系统提示词
 */
export function buildPersonaPrompt(files: PersonaFile[]): string {
  if (files.length === 0) return '';

  const sections: string[] = ['# Agent Context', ''];

  let totalSize = 0;
  for (const file of files) {
    if (totalSize + file.content.length > MAX_TOTAL_SIZE) break;

    // 技能用 Skill: xxx 作标题
    let header: string;
    if (file.name.startsWith('skill:')) {
      header = `Skill: ${file.name.slice(6)}`;
    } else {
      header = PERSONA_FILES.find(f => f.filename === file.name)?.header || file.name;
    }

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
 * 写入 MEMORY.md
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
