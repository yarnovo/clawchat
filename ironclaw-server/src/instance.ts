import * as containerClient from "./container-client.js";
import { signBody, deriveWebhookSecret } from "./hmac.js";
import { logger } from "./logger.js";

// IronClaw instance management
// Each Agent gets its own IronClaw Docker container with HTTP webhook

const IRONCLAW_IMAGE =
  process.env["IRONCLAW_IMAGE"] || "ironclaw-agent:local";
const IRONCLAW_NETWORK =
  process.env["IRONCLAW_NETWORK"] || "clawchat_default";

// im-server URL for agent reply callback (inside Docker network)
const IM_SERVER_CALLBACK_URL =
  process.env["IM_SERVER_CALLBACK_URL"] ||
  "http://host.docker.internal:3000/v1/im/internal/agent-reply";

const WEBHOOK_PORT = 8080;


// In-memory mapping of agentId → accountId (for callback)
const agentAccountMap = new Map<string, string>();

export interface InstanceConfig {
  agentId: string;
  accountId: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  gatewayToken?: string; // unused for IronClaw
}

function containerName(agentId: string): string {
  return `ironclaw-${agentId}`;
}

// Build environment variables for the IronClaw container
function buildEnv(config: InstanceConfig): string[] {
  return [
    `LLM_BACKEND=openai_compatible`,
    `LLM_API_KEY=${config.apiKey}`,
    `LLM_MODEL=${config.model}`,
    `LLM_BASE_URL=${config.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1"}`,
    `HTTP_PORT=${WEBHOOK_PORT}`,
    `HTTP_WEBHOOK_SECRET=${deriveWebhookSecret(config.agentId)}`,
    `DATABASE_BACKEND=libsql`,
    `LIBSQL_PATH=/tmp/ironclaw.db`,
    `AGENT_NAME=agent-${config.agentId}`,
    // Skip onboarding wizard in container mode
    `ONBOARD_COMPLETED=true`,
    // Disable features not needed for per-agent container mode
    `GATEWAY_ENABLED=false`,
    `CLI_ENABLED=false`,
    `RUST_LOG=ironclaw=info`,
    ...(config.systemPrompt ? [`AGENT_SYSTEM_PROMPT=${config.systemPrompt}`] : []),
  ];
}

// Create and start an IronClaw instance for an Agent
export async function createInstance(
  config: InstanceConfig,
): Promise<{ containerId: string }> {
  const name = containerName(config.agentId);

  // Store accountId mapping for callback
  agentAccountMap.set(config.agentId, config.accountId);

  const result = await containerClient.createContainer({
    name,
    image: IRONCLAW_IMAGE,
    env: buildEnv(config),
    network: IRONCLAW_NETWORK,
    ports: { [WEBHOOK_PORT]: 0 }, // 0 = random host port
    cpus: 1,
  });

  return { containerId: result.id };
}

// Send a chat message to an Agent's IronClaw container via HTTP webhook
// IronClaw uses synchronous wait_for_response mode — we wait for the reply
// then forward it to im-server via callback
export async function chat(
  agentId: string,
  sessionKey: string,
  message: string,
  senderId: string,
  senderName?: string,
): Promise<void> {
  const name = containerName(agentId);
  const webhookUrl = `http://${name}:${WEBHOOK_PORT}/webhook`;
  const secret = deriveWebhookSecret(agentId);

  const body = JSON.stringify({
    content: message,
    thread_id: sessionKey,
    wait_for_response: true,
  });

  const signature = signBody(secret, body);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IronClaw-Signature": signature,
    },
    body,
    signal: AbortSignal.timeout(65_000), // IronClaw has 60s timeout
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IronClaw webhook failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { response?: string };

  if (data.response) {
    const accountId = agentAccountMap.get(agentId);
    if (!accountId) {
      logger.warn({ agentId }, "No accountId mapping found, cannot callback");
      return;
    }

    // Forward reply to im-server
    const cbRes = await fetch(IM_SERVER_CALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: sessionKey,
        senderId: accountId,
        content: data.response,
        type: "text",
      }),
    });

    if (!cbRes.ok) {
      const cbText = await cbRes.text();
      logger.error({ agentId, status: cbRes.status, body: cbText }, "Callback to im-server failed");
    }
  }
}

// Stop an Agent's IronClaw instance
export async function stopInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.stopContainer(name);
}

// Start a stopped Agent's IronClaw instance
export async function startInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.startContainer(name);
}

// Remove an Agent's IronClaw instance
export async function removeInstance(
  agentId: string,
): Promise<void> {
  const name = containerName(agentId);
  agentAccountMap.delete(agentId);

  try {
    await containerClient.removeContainer(name);
  } catch {
    // Container might not exist
  }
}

// Get status of an Agent's IronClaw instance
export async function getInstanceStatus(agentId: string): Promise<{
  state: string;
}> {
  const name = containerName(agentId);
  const info = await containerClient.getContainer(name);

  return {
    state: info?.state ?? "not_found",
  };
}

// Get logs from an Agent's IronClaw instance
export async function getInstanceLogs(
  agentId: string,
  tail = 100,
): Promise<string> {
  const name = containerName(agentId);
  return containerClient.getContainerLogs(name, tail);
}
