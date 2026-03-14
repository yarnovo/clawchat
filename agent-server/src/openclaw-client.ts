// HTTP client for openclaw-server — manage OpenClaw instances

const OPENCLAW_SERVER_URL =
  process.env["OPENCLAW_SERVER_URL"] || "http://localhost:3003";

async function request(path: string, init?: RequestInit) {
  const res = await fetch(
    `${OPENCLAW_SERVER_URL}/v1/openclaw${path}`,
    {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    },
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
}): Promise<{ containerId: string }> {
  const res = await request("/instances", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  if (res.status !== 201) {
    throw new Error(res.data.error || "Failed to create OpenClaw instance");
  }
  return res.data;
}

export async function startInstance(agentId: string): Promise<void> {
  const res = await request(`/instances/${agentId}/start`, { method: "POST" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to start instance");
  }
}

export async function stopInstance(agentId: string): Promise<void> {
  const res = await request(`/instances/${agentId}/stop`, { method: "POST" });
  if (res.status !== 200) {
    throw new Error(res.data.error || "Failed to stop instance");
  }
}

export async function removeInstance(
  agentId: string,
  removeData = false,
): Promise<void> {
  const res = await request(
    `/instances/${agentId}?removeData=${removeData}`,
    { method: "DELETE" },
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
}): Promise<void> {
  const res = await request(`/instances/${opts.agentId}/chat`, {
    method: "POST",
    body: JSON.stringify({
      message: opts.message,
      sessionKey: opts.sessionKey,
      senderId: opts.senderId,
      senderName: opts.senderName,
    }),
  });
  if (res.status !== 202 && res.status !== 200) {
    throw new Error(res.data.error || "Chat failed");
  }
}
