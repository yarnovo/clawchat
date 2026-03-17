/**
 * Docker 容器编排实现
 * 通过 Docker socket 管理 agentkit 容器的完整生命周期
 */

import Docker from 'dockerode';
import type {
  ContainerOrchestrator,
  RunContainerOpts,
  ContainerInfo,
  ContainerStatus,
  ContainerFilter,
} from './types.js';

export interface DockerOrchestratorConfig {
  socketPath?: string;
}

const CONTAINER_INTERNAL_PORT = 4000;
const LABEL_PREFIX = 'clawchat';

export class DockerOrchestrator implements ContainerOrchestrator {
  private docker: Docker;

  constructor(config: DockerOrchestratorConfig = {}) {
    this.docker = new Docker({
      socketPath: config.socketPath || '/var/run/docker.sock',
    });
  }

  async run(opts: RunContainerOpts): Promise<ContainerInfo> {
    // 环境变量: Record → "KEY=VALUE" 数组
    const envArray = Object.entries(opts.env).map(([k, v]) => `${k}=${v}`);

    // 卷挂载: { host, container } → "host:container" 绑定
    const binds = opts.volumes.map((v) => `${v.host}:${v.container}`);

    const container = await this.docker.createContainer({
      name: opts.name,
      Image: opts.image,
      Env: envArray,
      Labels: {
        [`${LABEL_PREFIX}.managed`]: 'true',
        [`${LABEL_PREFIX}.agentId`]: opts.name.replace('agentkit-', ''),
      },
      HostConfig: {
        Binds: binds,
        NetworkMode: opts.network,
        Memory: opts.resources.memoryMB * 1024 * 1024,
        NanoCpus: opts.resources.cpus * 1e9,
        PidsLimit: opts.resources.pidsLimit,
        RestartPolicy: { Name: 'unless-stopped' },
      },
      // 健康检查: 每 5s ping 一次，3 次失败标记 unhealthy（用 node 代替 curl）
      Healthcheck: {
        Test: ['CMD-SHELL', `node -e "fetch('http://localhost:${CONTAINER_INTERNAL_PORT}/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"`],
        Interval: 5_000_000_000,  // 5s in nanoseconds
        Timeout: 3_000_000_000,   // 3s
        Retries: 3,
        StartPeriod: 10_000_000_000, // 10s 启动宽限
      },
    });

    await container.start();

    const info = await container.inspect();
    return {
      id: info.Id,
      name: opts.name,
      status: info.State.Status,
      channelUrl: `http://${opts.name}:${CONTAINER_INTERNAL_PORT}`,
    };
  }

  async stop(containerId: string, timeout = 10): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop({ t: timeout });
    } catch (err: unknown) {
      // 容器已停止不算错误
      if (!isNotRunningError(err)) throw err;
    }
    try {
      await container.remove({ force: true });
    } catch (err: unknown) {
      if (!isNotFoundError(err)) throw err;
    }
  }

  async remove(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.remove({ force: true });
    } catch (err: unknown) {
      if (!isNotFoundError(err)) throw err;
    }
  }

  async inspect(containerId: string): Promise<ContainerStatus> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    let health: ContainerStatus['health'] = 'none';
    if (info.State.Health) {
      const h = info.State.Health.Status;
      if (h === 'healthy' || h === 'unhealthy' || h === 'starting') {
        health = h;
      }
    }

    return {
      running: info.State.Running,
      health,
      exitCode: info.State.ExitCode,
    };
  }

  async list(filter?: ContainerFilter): Promise<ContainerInfo[]> {
    const filters: Record<string, string[]> = {
      label: [`${LABEL_PREFIX}.managed=true`],
    };

    if (filter?.label) {
      filters.label.push(filter.label);
    }
    if (filter?.status) {
      filters.status = filter.status;
    }

    const containers = await this.docker.listContainers({
      all: true,
      filters,
    });

    return containers.map((c) => {
      // Docker 返回的 Names 带前缀 "/"
      const name = c.Names[0]?.replace(/^\//, '') || '';
      return {
        id: c.Id,
        name,
        status: c.State,
        channelUrl: `http://${name}:${CONTAINER_INTERNAL_PORT}`,
      };
    });
  }

  async waitHealthy(containerName: string, timeout: number): Promise<boolean> {
    const container = this.docker.getContainer(containerName);
    const deadline = Date.now() + timeout;
    const pollInterval = 2000;

    while (Date.now() < deadline) {
      try {
        const info = await container.inspect();
        const healthStatus = info.State.Health?.Status;

        if (healthStatus === 'healthy') return true;
        if (healthStatus === 'unhealthy') return false;
        // 'starting' 或无健康检查 → 继续等
      } catch {
        // 容器可能还没完全启动
      }

      await sleep(pollInterval);
    }

    return false;
  }
}

// ── Helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNotRunningError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('is not running');
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && (err.message.includes('no such container') || err.message.includes('404'));
}
