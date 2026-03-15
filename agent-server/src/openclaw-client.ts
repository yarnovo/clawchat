// HTTP client for openclaw-server — manage OpenClaw instances

const OPENCLAW_SERVER_URL =
  process.env["OPENCLAW_SERVER_URL"] || "http://localhost:3003";

async function request(path: string, init?: RequestInit, requestId?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(
      Object.entries(init?.headers || {}).map(([k, v]) => [k, String(v)]),
    ),
  };
  if (requestId) headers["x-request-id"] = requestId;

  const res = await fetch(
    `${OPENCLAW_SERVER_URL}/v1/openclaw${path}`,
    { ...init, headers },
  );
  return { status: res.status, data: await res.json() };
}

export async function createInstance(opts: {
  agentId: string;
  accountId: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  gatewayToken?: string;
  requestId?: string;
}): Promise<{ containerId: string; volumeName: string }> {
  const { requestId: reqId, ...body } = opts;
  const res = await request("/instances", {
    method: "POST",
    body: JSON.stringify(body),
  }, reqId);
  if (res.status !== 201) {
    throw new Error(res.data.error || "Failed to create OpenClaw instance");
  }
  return res.data;
}

export async function startInstance(agentId: string, requestId?: string): Promise<void> {
  const res = await request(`/instances/${agentId}/start`, { method: "POST" }, requestId);
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to start instance");
  }
}

export async function stopInstance(agentId: string, requestId?: string): Promise<void> {
  const res = await request(`/instances/${agentId}/stop`, { method: "POST" }, requestId);
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to stop instance");
  }
}

export async function removeInstance(
  agentId: string,
  removeData = false,
  requestId?: string,
): Promise<void> {
  const res = await request(
    `/instances/${agentId}?removeData=${removeData}`,
    { method: "DELETE" },
    requestId,
  );
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to remove instance");
  }
}

export async function getInstanceStatus(
  agentId: string,
): Promise<{ state: string; gatewayConnected: boolean }> {
  const res = await request(`/instances/${agentId}`);
  return res.data;
}

export async function chat(opts: {
  agentId: string;
  message: string;
  sessionKey?: string;
  senderId?: string;
  senderName?: string;
  requestId?: string;
}): Promise<void> {
  const { requestId: reqId, ...body } = opts;
  const res = await request(`/instances/${opts.agentId}/chat`, {
    method: "POST",
    body: JSON.stringify({
      message: body.message,
      sessionKey: body.sessionKey,
      senderId: body.senderId,
      senderName: body.senderName,
    }),
  }, reqId);
  if (res.status !== 202 && res.status !== 200) {
    throw new Error(res.data.error || "Chat failed");
  }
}
