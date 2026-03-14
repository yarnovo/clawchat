import {
  dispatchInboundReplyWithBase,
  getChatChannelMeta,
  DEFAULT_ACCOUNT_ID,
  buildBaseAccountStatusSnapshot,
  buildBaseChannelStatusSummary,
  createAccountStatusSink,
  runPassiveAccountLifecycle,
  type ChannelPlugin,
  type OpenClawConfig,
  type RuntimeEnv,
  type OutboundReplyPayload,
} from "openclaw/plugin-sdk/compat";
import { getClawChatRuntime } from "./runtime.js";
import {
  startWebhookServer,
  stopWebhookServer,
  type InboundMessage,
} from "./webhook.js";

const CHANNEL_ID = "clawchat" as const;
const WEBHOOK_PORT = parseInt(process.env["CLAWCHAT_WEBHOOK_PORT"] || "18790");
const CALLBACK_URL = process.env["CLAWCHAT_CALLBACK_URL"] || "";
const SYSTEM_PROMPT = process.env["CLAWCHAT_SYSTEM_PROMPT"] || undefined;

const MAX_CALLBACK_RETRIES = 5;

// im-server callback: POST agent reply back (with retry + exponential backoff)
async function sendReplyToImServer(
  conversationId: string,
  senderId: string,
  text: string,
) {
  if (!CALLBACK_URL) {
    console.error("[clawchat] CLAWCHAT_CALLBACK_URL not configured, cannot deliver reply");
    return;
  }

  const body = JSON.stringify({ conversationId, senderId, content: text, type: "text" });

  for (let attempt = 0; attempt < MAX_CALLBACK_RETRIES; attempt++) {
    try {
      const res = await fetch(CALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok || res.status === 202) return; // success

      const errText = await res.text();
      // 4xx errors are not retryable (bad request, not found, etc.)
      if (res.status >= 400 && res.status < 500) {
        console.error(`[clawchat] callback rejected (${res.status}): ${errText}`);
        return;
      }
      console.warn(`[clawchat] callback failed (${res.status}), attempt ${attempt + 1}/${MAX_CALLBACK_RETRIES}`);
    } catch (err) {
      console.warn(`[clawchat] callback error, attempt ${attempt + 1}/${MAX_CALLBACK_RETRIES}:`, err);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    if (attempt < MAX_CALLBACK_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  console.error(`[clawchat] callback failed after ${MAX_CALLBACK_RETRIES} attempts, message dropped`);
}

interface ResolvedAccount {
  accountId: string;
  name: string;
  enabled: boolean;
  configured: boolean;
}

const meta = getChatChannelMeta("clawchat");

export const clawchatPlugin: ChannelPlugin<ResolvedAccount> = {
  id: CHANNEL_ID,
  meta: {
    ...meta,
    name: "ClawChat",
    description: "ClawChat IM integration",
  },
  capabilities: {
    chatTypes: ["direct"],
    media: false,
    blockStreaming: true,
  },
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: () => ({
      accountId: DEFAULT_ACCOUNT_ID,
      name: "clawchat",
      enabled: true,
      configured: true,
    }),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: () => true,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
    }),
    resolveAllowFrom: () => ["*"],
    formatAllowFrom: ({ allowFrom }: { allowFrom: string[] }) => allowFrom,
    resolveDefaultTo: () => undefined,
  },
  security: {
    resolveDmPolicy: () => ({
      policy: "open",
      allowFrom: [],
      source: "default",
    }),
  },
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4000,
    chunker: (text, limit) =>
      getClawChatRuntime().channel.text.chunkMarkdownText(text, limit),
    sendText: async ({ to, text }) => {
      // `to` format: "clawchat:<conversationId>"
      const conversationId = to.startsWith("clawchat:") ? to.slice(9) : to;
      // senderId is resolved from config at container env level
      const agentAccountId = process.env["CLAWCHAT_AGENT_ACCOUNT_ID"] || "";
      await sendReplyToImServer(conversationId, agentAccountId, text);
      return { channel: CHANNEL_ID };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      ...buildBaseChannelStatusSummary(snapshot),
      webhookPort: WEBHOOK_PORT,
    }),
    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      ...buildBaseAccountStatusSnapshot({ account, runtime, probe }),
      webhookPort: WEBHOOK_PORT,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const core = getClawChatRuntime();
      const cfg = ctx.cfg as OpenClawConfig;
      const statusSink = createAccountStatusSink({
        accountId: ctx.accountId,
        setStatus: ctx.setStatus,
      });

      ctx.log?.info?.(`[clawchat] starting webhook server on port ${WEBHOOK_PORT}`);

      await runPassiveAccountLifecycle({
        abortSignal: ctx.abortSignal,
        start: async () => {
          // Start webhook HTTP server
          await startWebhookServer(WEBHOOK_PORT, async (msg: InboundMessage) => {
            await handleInbound(msg, cfg, ctx.runtime, core, statusSink);
          });

          return { stop: stopWebhookServer };
        },
        stop: async (monitor) => {
          await monitor.stop();
        },
      });
    },
  },
};

async function handleInbound(
  msg: InboundMessage,
  cfg: OpenClawConfig,
  runtime: RuntimeEnv,
  core: ReturnType<typeof getClawChatRuntime>,
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void,
) {
  const timestamp = msg.timestamp || Date.now();

  statusSink?.({ lastInboundAt: timestamp });

  core.channel.activity.record({
    channel: CHANNEL_ID,
    accountId: DEFAULT_ACCOUNT_ID,
    direction: "inbound",
    at: timestamp,
  });

  const peerId = msg.conversationId;

  const route = core.channel.routing.resolveAgentRoute({
    cfg,
    channel: CHANNEL_ID,
    accountId: DEFAULT_ACCOUNT_ID,
    peer: {
      kind: "direct",
      id: peerId,
    },
  });

  const storePath = core.channel.session.resolveStorePath(cfg.session?.store, {
    agentId: route.agentId,
  });

  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(cfg);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });

  const body = core.channel.reply.formatAgentEnvelope({
    channel: "ClawChat",
    from: msg.senderName,
    timestamp,
    previousTimestamp,
    envelope: envelopeOptions,
    body: msg.content,
  });

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    RawBody: msg.content,
    CommandBody: msg.content,
    From: `clawchat:${msg.senderId}`,
    To: `clawchat:${peerId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: "direct",
    ConversationLabel: msg.senderName,
    SenderName: msg.senderName,
    SenderId: msg.senderId,
    Provider: CHANNEL_ID,
    Surface: CHANNEL_ID,
    MessageSid: msg.messageId,
    Timestamp: timestamp,
    OriginatingChannel: CHANNEL_ID,
    OriginatingTo: `clawchat:${peerId}`,
    CommandAuthorized: true,
    GroupSystemPrompt: SYSTEM_PROMPT,
  });

  await dispatchInboundReplyWithBase({
    cfg,
    channel: CHANNEL_ID,
    accountId: DEFAULT_ACCOUNT_ID,
    route,
    storePath,
    ctxPayload,
    core,
    deliver: async (payload: OutboundReplyPayload) => {
      const text = payload.text;
      if (!text) return;

      const agentAccountId = process.env["CLAWCHAT_AGENT_ACCOUNT_ID"] || "";
      await sendReplyToImServer(peerId, agentAccountId, text);

      statusSink?.({ lastOutboundAt: Date.now() });
      core.channel.activity.record({
        channel: CHANNEL_ID,
        accountId: DEFAULT_ACCOUNT_ID,
        direction: "outbound",
      });
    },
    onRecordError: (err) => {
      runtime.error?.(`clawchat: failed updating session meta: ${String(err)}`);
    },
    onDispatchError: (err, info) => {
      runtime.error?.(`clawchat ${info.kind} reply failed: ${String(err)}`);
    },
  });
}
