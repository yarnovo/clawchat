// HTTP client for container-server API

const CONTAINER_SERVER_URL =
  process.env["CONTAINER_SERVER_URL"] || "http://localhost:3002";

async function request(path: string, init?: RequestInit, requestId?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(
      Object.entries(init?.headers || {}).map(([k, v]) => [k, String(v)]),
    ),
  };
  if (requestId) headers["x-request-id"] = requestId;

  const res = await fetch(`${CONTAINER_SERVER_URL}/v1/containers${path}`, {
    ...init,
    headers,
  });
  return { status: res.status, data: await res.json() };
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ip?: string;
  ports?: Array<{ container: number; host: number }>;
}

export async function createContainer(opts: {
  name: string;
  image: string;
  env?: string[];
  ports?: Record<string, number>;
  volumes?: Record<string, string>;
  network?: string;
  memory?: number;
  cpus?: number;
  cmd?: string[];
  requestId?: string;
}): Promise<{ id: string }> {
  const { requestId: reqId, ...body } = opts;
  const res = await request("", {
    method: "POST",
    body: JSON.stringify(body),
  }, reqId);
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

export async function startContainer(id: string, requestId?: string): Promise<void> {
  const res = await request(`/${id}/start`, { method: "POST" }, requestId);
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to start container");
  }
}

export async function stopContainer(id: string, requestId?: string): Promise<void> {
  const res = await request(`/${id}/stop`, { method: "POST" }, requestId);
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to stop container");
  }
}

export async function removeContainer(id: string, requestId?: string): Promise<void> {
  const res = await request(`/${id}`, { method: "DELETE" }, requestId);
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
