// Runtime abstraction — route calls to the appropriate backend (openclaw, nanoclaw, or ironclaw)

import * as openclawClient from "./openclaw-client.js";
import * as nanoclawClient from "./nanoclaw-client.js";
import * as ironclawClient from "./ironclaw-client.js";

export interface CreateInstanceOpts {
  agentId: string;
  accountId: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  gatewayToken?: string;
  requestId?: string;
}

export interface ChatOpts {
  agentId: string;
  message: string;
  sessionKey?: string;
  senderId?: string;
  senderName?: string;
  requestId?: string;
}

export interface RuntimeClient {
  createInstance(opts: CreateInstanceOpts): Promise<{ containerId: string; volumeName: string }>;
  stopInstance(agentId: string, requestId?: string): Promise<void>;
  removeInstance(agentId: string, requestId?: string): Promise<void>;
  chat(opts: ChatOpts): Promise<void>;
}

const openclawAdapter: RuntimeClient = {
  createInstance: openclawClient.createInstance,
  stopInstance: openclawClient.stopInstance,
  removeInstance: (agentId, requestId) => openclawClient.removeInstance(agentId, false, requestId),
  chat: openclawClient.chat,
};

const nanoclawAdapter: RuntimeClient = {
  createInstance: nanoclawClient.createInstance,
  stopInstance: nanoclawClient.stopInstance,
  removeInstance: (agentId, requestId) => nanoclawClient.removeInstance(agentId, false, requestId),
  chat: nanoclawClient.chat,
};

const ironclawAdapter: RuntimeClient = {
  createInstance: ironclawClient.createInstance,
  stopInstance: ironclawClient.stopInstance,
  removeInstance: (agentId, requestId) => ironclawClient.removeInstance(agentId, false, requestId),
  chat: ironclawClient.chat,
};

const runtimeMap: Record<string, RuntimeClient> = {
  openclaw: openclawAdapter,
  nanoclaw: nanoclawAdapter,
  ironclaw: ironclawAdapter,
};

export function getRuntimeClient(runtime: "openclaw" | "nanoclaw" | "ironclaw"): RuntimeClient {
  return runtimeMap[runtime] ?? openclawAdapter;
}
