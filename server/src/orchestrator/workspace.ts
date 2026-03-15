/**
 * Workspace 管理
 * 每个 Agent 有独立工作区: /data/workspaces/{agentId}/
 * 包含 AGENT.md (人格指令), MEMORY.md (持久记忆), skills/ (技能配置)
 */

import { mkdir, writeFile, cp, rm, rename, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_ROOT = process.env.DATA_ROOT || '/data';
const WORKSPACES_DIR = join(DATA_ROOT, 'workspaces');
const TRASH_DIR = join(DATA_ROOT, 'trash');

export interface AgentConfig {
  name: string;
  description?: string;
  persona?: string;
  systemPrompt?: string;
}

export interface ForkOptions {
  /** 是否保留源 Agent 的记忆 (MEMORY.md)，默认 false */
  keepMemory?: boolean;
}

/**
 * 获取 Agent 工作区路径
 */
export function workspacePath(agentId: string): string {
  return join(WORKSPACES_DIR, agentId);
}

/**
 * 创建新的 Agent 工作区
 */
export async function createWorkspace(agentId: string, config: AgentConfig): Promise<string> {
  const wsPath = workspacePath(agentId);

  await mkdir(wsPath, { recursive: true });
  await mkdir(join(wsPath, 'skills'), { recursive: true });

  // 生成 AGENT.md — Agent 的核心人格文件
  const agentMd = buildAgentMd(config);
  await writeFile(join(wsPath, 'AGENT.md'), agentMd, 'utf-8');

  // 空的 MEMORY.md — 运行时由 Agent 自行写入
  await writeFile(join(wsPath, 'MEMORY.md'), '', 'utf-8');

  return wsPath;
}

/**
 * Fork 一个已有的工作区到新 Agent
 */
export async function forkWorkspace(
  sourceId: string,
  targetId: string,
  options: ForkOptions = {},
): Promise<string> {
  const sourcePath = workspacePath(sourceId);
  const targetPath = workspacePath(targetId);

  // 确认源工作区存在
  await access(sourcePath);

  // 递归复制整个工作区
  await cp(sourcePath, targetPath, { recursive: true });

  // 可选清除记忆
  if (!options.keepMemory) {
    await writeFile(join(targetPath, 'MEMORY.md'), '', 'utf-8');
  }

  return targetPath;
}

/**
 * 删除工作区 (软删除 → 移到 trash)
 */
export async function deleteWorkspace(agentId: string): Promise<void> {
  const wsPath = workspacePath(agentId);

  try {
    await access(wsPath);
  } catch {
    // 工作区不存在，跳过
    return;
  }

  await mkdir(TRASH_DIR, { recursive: true });

  const trashPath = join(TRASH_DIR, `${agentId}-${Date.now()}`);
  await rename(wsPath, trashPath);
}

/**
 * 检查工作区是否存在
 */
export async function workspaceExists(agentId: string): Promise<boolean> {
  try {
    await access(workspacePath(agentId));
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出所有工作区
 */
export async function listWorkspaces(): Promise<string[]> {
  try {
    return await readdir(WORKSPACES_DIR);
  } catch {
    return [];
  }
}

// ── Internal ──

function buildAgentMd(config: AgentConfig): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push('');

  if (config.description) {
    lines.push(config.description);
    lines.push('');
  }

  if (config.persona) {
    lines.push('## Persona');
    lines.push('');
    lines.push(config.persona);
    lines.push('');
  }

  if (config.systemPrompt) {
    lines.push('## System Prompt');
    lines.push('');
    lines.push(config.systemPrompt);
    lines.push('');
  }

  return lines.join('\n');
}
