import * as containerClient from "./container-client.js";

// OpenClaw instance management
// Each Agent gets its own OpenClaw Docker container with ClawChat channel plugin

const OPENCLAW_IMAGE =
  process.env["OPENCLAW_IMAGE"] || "openclaw-agent:local";
const OPENCLAW_NETWORK =
  process.env["OPENCLAW_NETWORK"] || "clawchat_default";

// im-server URL for agent reply callback (inside Docker network)
const IM_SERVER_CALLBACK_URL =
  process.env["IM_SERVER_CALLBACK_URL"] ||
  "http://host.docker.internal:3000/v1/im/internal/agent-reply";

const WEBHOOK_PORT = 18790;

export interface InstanceConfig {
  agentId: string;
  accountId: string; // Agent's IM account ID
  model: string; // e.g. "qwen-max", "gpt-4o"
  apiKey: string; // encrypted key, decrypted before passing
  baseUrl?: string; // custom API base URL (OpenAI compatible)
  systemPrompt?: string;
  gatewayToken?: string;
}

function containerName(agentId: string): string {
  return `openclaw-${agentId}`;
}


const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

// Build environment variables for the OpenClaw container
function buildEnv(config: InstanceConfig): string[] {
  const token = config.gatewayToken || `agent-${config.agentId}`;
  const openclawConfig = JSON.stringify(buildConfig(config));
  return [
    `OPENCLAW_GATEWAY_TOKEN=${token}`,
    `OPENCLAW_GATEWAY_BIND=lan`,
    `OPENAI_API_KEY=${config.apiKey}`,
    `OPENCLAW_CONFIG_JSON=${openclawConfig}`,
    `NODE_OPTIONS=--max-old-space-size=1024`,
    `CLAWCHAT_WEBHOOK_PORT=${WEBHOOK_PORT}`,
    `CLAWCHAT_CALLBACK_URL=${IM_SERVER_CALLBACK_URL}`,
    `CLAWCHAT_AGENT_ACCOUNT_ID=${config.accountId}`,
    ...(config.systemPrompt ? [`CLAWCHAT_SYSTEM_PROMPT=${config.systemPrompt}`] : []),
  ];
}

// Build openclaw.json config — all providers use OpenAI compatible API
function buildConfig(config: InstanceConfig): object {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  return {
    models: {
      mode: "merge",
      providers: {
        custom: {
          apiKey: "${OPENAI_API_KEY}",
          baseUrl,
          api: "openai-completions",
          models: [{ id: config.model, name: config.model }],
        },
      },
    },
    gateway: {
      controlUi: {
        dangerouslyAllowHostHeaderOriginFallback: true,
      },
    },
    agents: {
      defaults: {
        model: { primary: `custom/${config.model}` },
      },
    },
    channels: {
      clawchat: { enabled: true },
    },
    plugins: {
      enabled: true,
    },
  };
}

// Create and start an OpenClaw instance for an Agent
export async function createInstance(
  config: InstanceConfig,
): Promise<{ containerId: string }> {
  const name = containerName(config.agentId);

  const result = await containerClient.createContainer({
    name,
    image: OPENCLAW_IMAGE,
    env: buildEnv(config),
    network: OPENCLAW_NETWORK,
    ports: { 18789: 0, [WEBHOOK_PORT]: 0 }, // 0 = random host port
    cpus: 1,
  });

  return { containerId: result.id };
}

// Send a chat message to an Agent's OpenClaw container via webhook
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
    throw new Error(`Webhook failed: ${res.status} ${body}`);
  }
}

// Stop an Agent's OpenClaw instance
export async function stopInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.stopContainer(name);
}

// Start a stopped Agent's OpenClaw instance
export async function startInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.startContainer(name);
}

// Remove an Agent's OpenClaw instance
export async function removeInstance(
  agentId: string,
): Promise<void> {
  const name = containerName(agentId);

  try {
    await containerClient.removeContainer(name);
  } catch {
    // Container might not exist
  }
}

// Get status of an Agent's OpenClaw instance
export async function getInstanceStatus(agentId: string): Promise<{
  state: string;
}> {
  const name = containerName(agentId);
  const info = await containerClient.getContainer(name);

  return {
    state: info?.state ?? "not_found",
  };
}

// Get logs from an Agent's OpenClaw instance
export async function getInstanceLogs(
  agentId: string,
  tail = 100,
): Promise<string> {
  const name = containerName(agentId);
  return containerClient.getContainerLogs(name, tail);
}
