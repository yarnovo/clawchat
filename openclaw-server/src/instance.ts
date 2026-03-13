import * as containerClient from "./container-client.js";
import { GatewayClient } from "./gateway-client.js";

// OpenClaw instance management
// Each Agent gets its own OpenClaw Docker container + Gateway connection

const OPENCLAW_IMAGE =
  process.env["OPENCLAW_IMAGE"] || "openclaw:local";
const OPENCLAW_NETWORK =
  process.env["OPENCLAW_NETWORK"] || "clawchat_default";

// In-memory registry of active gateway connections
const gateways = new Map<string, GatewayClient>();

export interface InstanceConfig {
  agentId: string;
  model: string; // e.g. "anthropic/claude-sonnet-4-6"
  apiKey: string; // encrypted key, decrypted before passing
  systemPrompt?: string;
  gatewayToken?: string;
}

function containerName(agentId: string): string {
  return `openclaw-${agentId}`;
}

function volumeName(agentId: string): string {
  return `openclaw-data-${agentId}`;
}

// Build environment variables for the OpenClaw container
function buildEnv(config: InstanceConfig): string[] {
  const token = config.gatewayToken || `agent-${config.agentId}`;
  const env = [
    `OPENCLAW_GATEWAY_TOKEN=${token}`,
    `OPENCLAW_GATEWAY_BIND=lan`,
  ];

  // Set model provider API key
  if (config.model.startsWith("anthropic/")) {
    env.push(`ANTHROPIC_API_KEY=${config.apiKey}`);
  } else if (
    config.model.startsWith("openai/") ||
    config.model.startsWith("gpt-")
  ) {
    env.push(`OPENAI_API_KEY=${config.apiKey}`);
  } else {
    // Default to Anthropic
    env.push(`ANTHROPIC_API_KEY=${config.apiKey}`);
  }

  return env;
}

// Create and start an OpenClaw instance for an Agent
export async function createInstance(
  config: InstanceConfig,
): Promise<{ containerId: string }> {
  const name = containerName(config.agentId);
  const volume = volumeName(config.agentId);

  // Create volume for persistent data
  try {
    await containerClient.createVolume(volume);
  } catch {
    // Volume might already exist
  }

  const result = await containerClient.createContainer({
    name,
    image: OPENCLAW_IMAGE,
    env: buildEnv(config),
    volumes: { [volume]: "/home/openclaw/.openclaw" },
    network: OPENCLAW_NETWORK,
    memory: 256 * 1024 * 1024, // 256MB
    cpus: 0.5,
    cmd: [
      "node",
      "openclaw.mjs",
      "gateway",
      "--bind",
      "lan",
      "--allow-unconfigured",
    ],
  });

  return { containerId: result.id };
}

// Get or create a Gateway connection for an Agent
export async function getGateway(
  agentId: string,
  gatewayToken?: string,
): Promise<GatewayClient> {
  const existing = gateways.get(agentId);
  if (existing?.connected) return existing;

  const name = containerName(agentId);
  const token = gatewayToken || `agent-${agentId}`;

  // Connect via Docker internal network
  const url = `ws://${name}:18789`;
  const client = new GatewayClient(url, token);
  await client.connect();

  gateways.set(agentId, client);
  return client;
}

// Send a chat message to an Agent's OpenClaw instance
export async function chat(
  agentId: string,
  sessionKey: string,
  message: string,
  gatewayToken?: string,
): Promise<string> {
  const gw = await getGateway(agentId, gatewayToken);
  return gw.chat(sessionKey, message);
}

// Stop an Agent's OpenClaw instance
export async function stopInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);

  // Disconnect gateway
  const gw = gateways.get(agentId);
  if (gw) {
    gw.disconnect();
    gateways.delete(agentId);
  }

  await containerClient.stopContainer(name);
}

// Start a stopped Agent's OpenClaw instance
export async function startInstance(agentId: string): Promise<void> {
  const name = containerName(agentId);
  await containerClient.startContainer(name);
}

// Remove an Agent's OpenClaw instance and volume (soft: keep volume)
export async function removeInstance(
  agentId: string,
  removeData = false,
): Promise<void> {
  const name = containerName(agentId);

  // Disconnect gateway
  const gw = gateways.get(agentId);
  if (gw) {
    gw.disconnect();
    gateways.delete(agentId);
  }

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

// Get status of an Agent's OpenClaw instance
export async function getInstanceStatus(agentId: string): Promise<{
  state: string;
  gatewayConnected: boolean;
}> {
  const name = containerName(agentId);
  const info = await containerClient.getContainer(name);

  return {
    state: info?.state ?? "not_found",
    gatewayConnected: gateways.get(agentId)?.connected ?? false,
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
