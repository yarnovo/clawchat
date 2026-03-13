import Dockerode from "dockerode";

const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

export interface CreateContainerOpts {
  name: string;
  image: string;
  env?: string[];
  ports?: Record<string, number>; // containerPort -> hostPort
  volumes?: Record<string, string>; // hostPath -> containerPath
  network?: string;
  memory?: number; // bytes
  cpus?: number;
  cmd?: string[];
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: Array<{ container: number; host: number }>;
  createdAt: string;
}

function parseContainerInfo(data: Dockerode.ContainerInfo): ContainerInfo {
  return {
    id: data.Id.slice(0, 12),
    name: data.Names[0]?.replace(/^\//, "") ?? "",
    image: data.Image,
    state: data.State,
    status: data.Status,
    ports: (data.Ports ?? []).map((p) => ({
      container: p.PrivatePort,
      host: p.PublicPort ?? 0,
    })),
    createdAt: new Date(data.Created * 1000).toISOString(),
  };
}

// List containers (optionally filtered by label)
export async function listContainers(
  label?: string,
): Promise<ContainerInfo[]> {
  const filters: Record<string, string[]> = {};
  if (label) {
    filters["label"] = [label];
  }
  const containers = await docker.listContainers({ all: true, filters });
  return containers.map(parseContainerInfo);
}

// Create and start a container
export async function createContainer(
  opts: CreateContainerOpts,
): Promise<{ id: string }> {
  const portBindings: Record<string, Array<{ HostPort: string }>> = {};
  const exposedPorts: Record<string, object> = {};
  if (opts.ports) {
    for (const [containerPort, hostPort] of Object.entries(opts.ports)) {
      const key = `${containerPort}/tcp`;
      exposedPorts[key] = {};
      portBindings[key] = [{ HostPort: String(hostPort) }];
    }
  }

  const binds: string[] = [];
  if (opts.volumes) {
    for (const [host, container] of Object.entries(opts.volumes)) {
      binds.push(`${host}:${container}`);
    }
  }

  const container = await docker.createContainer({
    name: opts.name,
    Image: opts.image,
    Cmd: opts.cmd,
    Env: opts.env,
    ExposedPorts: exposedPorts,
    Labels: { "clawchat.managed": "true" },
    HostConfig: {
      PortBindings: portBindings,
      Binds: binds.length > 0 ? binds : undefined,
      NetworkMode: opts.network,
      Memory: opts.memory,
      NanoCpus: opts.cpus ? opts.cpus * 1e9 : undefined,
      RestartPolicy: { Name: "unless-stopped" },
    },
  });

  await container.start();
  return { id: container.id.slice(0, 12) };
}

// Get container info by ID or name
export async function getContainer(
  idOrName: string,
): Promise<ContainerInfo | null> {
  try {
    const container = docker.getContainer(idOrName);
    const info = await container.inspect();
    return {
      id: info.Id.slice(0, 12),
      name: info.Name.replace(/^\//, ""),
      image: info.Config.Image,
      state: info.State.Status,
      status: info.State.Status,
      ports: Object.entries(info.NetworkSettings.Ports ?? {}).map(
        ([key, bindings]) => ({
          container: parseInt(key),
          host: bindings?.[0] ? parseInt(bindings[0].HostPort) : 0,
        }),
      ),
      createdAt: info.Created,
    };
  } catch {
    return null;
  }
}

// Start a stopped container
export async function startContainer(idOrName: string): Promise<void> {
  const container = docker.getContainer(idOrName);
  await container.start();
}

// Stop a running container
export async function stopContainer(idOrName: string): Promise<void> {
  const container = docker.getContainer(idOrName);
  await container.stop();
}

// Remove a container (force stop if running)
export async function removeContainer(idOrName: string): Promise<void> {
  const container = docker.getContainer(idOrName);
  await container.remove({ force: true });
}

// Get container logs
export async function getContainerLogs(
  idOrName: string,
  tail = 100,
): Promise<string> {
  const container = docker.getContainer(idOrName);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
  });
  return logs.toString();
}

// Check if Docker daemon is accessible
export async function pingDocker(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

// Create a Docker volume
export async function createVolume(name: string): Promise<void> {
  await docker.createVolume({
    Name: name,
    Labels: { "clawchat.managed": "true" },
  });
}

// Remove a Docker volume
export async function removeVolume(name: string): Promise<void> {
  const volume = docker.getVolume(name);
  await volume.remove();
}
