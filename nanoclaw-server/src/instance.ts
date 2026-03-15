import * as containerClient from "./container-client.js";

// NanoClaw instance management
// Each Agent gets its own NanoClaw Docker container with HTTP bridge

const NANOCLAW_IMAGE =
  process.env["NANOCLAW_IMAGE"] || "nanoclaw-agent:local";
const NANOCLAW_NETWORK =
  process.env["NANOCLAW_NETWORK"] || "clawchat_default";

// im-server URL for agent reply callback (inside Docker network)
const IM_SERVER_CALLBACK_URL =
  process.env["IM_SERVER_CALLBACK_URL"] ||
  "http://host.docker.internal:3000/v1/im/internal/agent-reply";

const WEBHOOK_PORT = 18790;

export interface InstanceConfig {
  agentId: string;
  accountId: string; // Agent's IM account ID
  model: string; // e.g. "claude-sonnet-4-20250514"
  apiKey: string; // Anthropic API key
  baseUrl?: string; // unused for NanoClaw (Anthropic only)
  systemPrompt?: string;
  gatewayToken?: string; // unused for NanoClaw
}

function containerName(agentId: string): string {
  return `nanoclaw-${agentId}`;
}

// Build environment variables for the NanoClaw container
// If baseUrl is provided (e.g. OpenRouter), use ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN
// Otherwise, use ANTHROPIC_API_KEY directly (native Anthropic)
function buildEnv(config: InstanceConfig): string[] {
  const authEnv = config.baseUrl
    ? [
        `ANTHROPIC_BASE_URL=${config.baseUrl}`,
        `ANTHROPIC_AUTH_TOKEN=${config.apiKey}`,
        `ANTHROPIC_API_KEY=`,
      ]
    : [`ANTHROPIC_API_KEY=${config.apiKey}`];

  return [
    ...authEnv,
    `CLAWCHAT_WEBHOOK_PORT=${WEBHOOK_PORT}`,
    `CLAWCHAT_CALLBACK_URL=${IM_SERVER_CALLBACK_URL}`,
    `CLAWCHAT_AGENT_ACCOUNT_ID=${config.accountId}`,
    `CLAWCHAT_AGENT_ID=${config.agentId}`,
    `NODE_OPTIONS=--max-old-space-size=1024`,
    ...(config.systemPrompt ? [`CLAWCHAT_SYSTEM_PROMPT=${config.systemPrompt}`] : []),
  ];
}

function volumeName(agentId: string): string {
  return `nanoclaw-data-${agentId}`;
}

// Create and start a NanoClaw instance for an Agent
export async function createInstance(
  config: InstanceConfig,
): Promise<{ containerId: string; volumeName: string }> {
  const name = containerName(config.agentId);
  const volName = volumeName(config.agentId);

  // Create persistent volume for Agent data
  await containerClient.createVolume(volName);

  const result = await containerClient.createContainer({
    name,
    image: NANOCLAW_IMAGE,
    env: buildEnv(config),
    network: NANOCLAW_NETWORK,
    ports: { [WEBHOOK_PORT]: 0 }, // 0 = random host port
    volumes: { [volName]: "/app/data" }, // persist NanoClaw data
    cpus: 1,
  });

  return { containerId: result.id, volumeName: volName };
}

// Send a chat message to an Agent's NanoClaw container via bridge webhook
// The reply is delivered asynchronously via callback to im-server
export async function chat(
  agentId: string,
  sessionKey: string,
  message: string,
  senderId: string,
  senderName?: string,
): Promise<void> {
  const name = containerName(agentId);

  // All services on the same Docker network — use container name directly
  const webhookUrl = `http://${name}:${WEBHOOK_PORT}/webhook/message`;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: sessionKey,
      senderId,
      senderName: senderName || senderId,
      content: message,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NanoClaw webhook failed: ${res.status} ${body}`);
  }
}

// Stop an Agent's NanoClaw instance
export async function stopInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.stopContainer(name);
}

// Start a stopped Agent's NanoClaw instance
export async function startInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.startContainer(name);
}

// Remove an Agent's NanoClaw instance
export async function removeInstance(
  agentId: string,
  removeData = false,
): Promise<void> {
  const name = containerName(agentId);

  try {
    await containerClient.removeContainer(name);
  } catch {
    // Container might not exist
  }

  if (removeData) {
    try {
      await containerClient.removeVolume(volumeName(agentId));
    } catch {
      // Volume might not exist
    }
  }
}

// Get status of an Agent's NanoClaw instance
export async function getInstanceStatus(agentId: string): Promise<{
  state: string;
}> {
  const name = containerName(agentId);
  const info = await containerClient.getContainer(name);

  return {
    state: info?.state ?? "not_found",
  };
}

// Get logs from an Agent's NanoClaw instance
export async function getInstanceLogs(
  agentId: string,
  tail = 100,
): Promise<string> {
  const name = containerName(agentId);
  return containerClient.getContainerLogs(name, tail);
}
