/**
 * Container orchestrator 抽象接口
 * 当前只有 Docker 实现，未来可扩展 Firecracker / Podman 等
 */

export interface ContainerOrchestrator {
  run(opts: RunContainerOpts): Promise<ContainerInfo>;
  stop(containerId: string, timeout?: number): Promise<void>;
  remove(containerId: string): Promise<void>;
  inspect(containerId: string): Promise<ContainerStatus>;
  list(filter?: ContainerFilter): Promise<ContainerInfo[]>;
  waitHealthy(containerName: string, timeout: number): Promise<boolean>;
}

export interface RunContainerOpts {
  name: string;
  image: string;
  env: Record<string, string>;
  volumes: { host: string; container: string }[];
  network: string;
  resources: { memoryMB: number; cpus: number; pidsLimit: number };
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  channelUrl: string;
}

export interface ContainerStatus {
  running: boolean;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  exitCode?: number;
}

export interface ContainerFilter {
  label?: string;
  status?: string[];
}
