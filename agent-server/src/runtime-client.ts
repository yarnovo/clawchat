// Runtime abstraction — route calls to the appropriate backend (openclaw or nanoclaw)

import * as openclawClient from "./openclaw-client.js";
import * as nanoclawClient from "./nanoclaw-client.js";

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
  createInstance(opts: CreateInstanceOpts): Promise<{ containerId: string }>;
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

export function getRuntimeClient(runtime: "openclaw" | "nanoclaw"): RuntimeClient {
  return runtime === "nanoclaw" ? nanoclawAdapter : openclawAdapter;
}
