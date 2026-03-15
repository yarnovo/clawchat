/**
 * Orchestrator 工厂 + 统一导出
 */

export type {
  ContainerOrchestrator,
  RunContainerOpts,
  ContainerInfo,
  ContainerStatus,
  ContainerFilter,
} from './types.js';

export { DockerOrchestrator } from './docker.js';
export type { DockerOrchestratorConfig } from './docker.js';

export {
  createWorkspace,
  forkWorkspace,
  deleteWorkspace,
  workspaceExists,
  listWorkspaces,
  workspacePath,
} from './workspace.js';
export type { AgentConfig, ForkOptions } from './workspace.js';

import { DockerOrchestrator } from './docker.js';
import type { ContainerOrchestrator } from './types.js';

/**
 * 根据环境变量创建 orchestrator 实例
 * CONTAINER_RUNTIME=docker (默认)
 * DOCKER_SOCKET=/var/run/docker.sock (默认)
 */
export function createOrchestrator(): ContainerOrchestrator {
  const runtime = process.env.CONTAINER_RUNTIME || 'docker';

  if (runtime === 'docker') {
    return new DockerOrchestrator({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  throw new Error(`Unknown container runtime: ${runtime}`);
}
