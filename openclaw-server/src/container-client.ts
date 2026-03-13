// HTTP client for container-server API

const CONTAINER_SERVER_URL =
  process.env["CONTAINER_SERVER_URL"] || "http://localhost:3002";

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${CONTAINER_SERVER_URL}/v1/containers${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return { status: res.status, data: await res.json() };
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export async function createContainer(opts: {
  name: string;
  image: string;
  env?: string[];
  volumes?: Record<string, string>;
  network?: string;
  memory?: number;
  cpus?: number;
  cmd?: string[];
}): Promise<{ id: string }> {
  const res = await request("/", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  if (res.status !== 201) {
    throw new Error(res.data.error || "Failed to create container");
  }
  return res.data;
}

export async function getContainer(
  id: string,
): Promise<ContainerInfo | null> {
  const res = await request(`/${id}`);
  if (res.status === 404) return null;
  return res.data;
}

export async function startContainer(id: string): Promise<void> {
  const res = await request(`/${id}/start`, { method: "POST" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to start container");
  }
}

export async function stopContainer(id: string): Promise<void> {
  const res = await request(`/${id}/stop`, { method: "POST" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to stop container");
  }
}

export async function removeContainer(id: string): Promise<void> {
  const res = await request(`/${id}`, { method: "DELETE" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to remove container");
  }
}

export async function getContainerLogs(
  id: string,
  tail = 100,
): Promise<string> {
  const res = await request(`/${id}/logs?tail=${tail}`);
  return res.data.logs;
}

export async function createVolume(name: string): Promise<void> {
  const res = await request("/volumes", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (res.status !== 201) {
    throw new Error(res.data.error || "Failed to create volume");
  }
}

export async function removeVolume(name: string): Promise<void> {
  const res = await request(`/volumes/${name}`, { method: "DELETE" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to remove volume");
  }
}
