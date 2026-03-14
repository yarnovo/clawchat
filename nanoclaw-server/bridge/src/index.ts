/**
 * NanoClaw Bridge — HTTP webhook ↔ agent-runner stdin/IPC
 *
 * Runs as the container ENTRYPOINT. Exposes an HTTP server on port 18790
 * that receives messages from nanoclaw-server and routes them to the
 * agent-runner process via stdin (first message) or IPC files (subsequent).
 *
 * Agent-runner output is parsed from stdout markers and delivered to
 * im-server via callback URL.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ---- Environment ----
const WEBHOOK_PORT = parseInt(process.env["CLAWCHAT_WEBHOOK_PORT"] || "18790");
const CALLBACK_URL = process.env["CLAWCHAT_CALLBACK_URL"] || "";
const AGENT_ACCOUNT_ID = process.env["CLAWCHAT_AGENT_ACCOUNT_ID"] || "";
const AGENT_ID = process.env["CLAWCHAT_AGENT_ID"] || "";
const SYSTEM_PROMPT = process.env["CLAWCHAT_SYSTEM_PROMPT"];

const IPC_INPUT_DIR = "/workspace/ipc/input";
const OUTPUT_START_MARKER = "---NANOCLAW_OUTPUT_START---";
const OUTPUT_END_MARKER = "---NANOCLAW_OUTPUT_END---";
const MAX_CALLBACK_RETRIES = 5;

// ---- State ----
const conversationSessions = new Map<string, string>(); // conversationId → sessionId
let agentProcess: ChildProcess | null = null;
let agentRunning = false;
let firstMessageSent = false;

// ---- Logging ----
function log(msg: string): void {
  console.error(`[bridge] ${msg}`);
}

// ---- HTTP helpers ----
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function jsonResponse(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// ---- Callback with retry + exponential backoff ----
async function sendCallback(conversationId: string, content: string): Promise<void> {
  if (!CALLBACK_URL) {
    log("CLAWCHAT_CALLBACK_URL not configured, cannot deliver reply");
    return;
  }

  const body = JSON.stringify({
    conversationId,
    senderId: AGENT_ACCOUNT_ID,
    content,
    type: "text",
  });

  for (let attempt = 0; attempt < MAX_CALLBACK_RETRIES; attempt++) {
    try {
      const res = await fetch(CALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok || res.status === 202) return;

      const errText = await res.text();
      if (res.status >= 400 && res.status < 500) {
        log(`Callback rejected (${res.status}): ${errText}`);
        return;
      }
      log(`Callback failed (${res.status}), attempt ${attempt + 1}/${MAX_CALLBACK_RETRIES}`);
    } catch (err) {
      log(`Callback error, attempt ${attempt + 1}/${MAX_CALLBACK_RETRIES}: ${err}`);
    }

    if (attempt < MAX_CALLBACK_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  log(`Callback failed after ${MAX_CALLBACK_RETRIES} attempts, message dropped`);
}

// ---- Agent-runner stdout parser ----
// Parses OUTPUT_START_MARKER / OUTPUT_END_MARKER from stdout stream
function setupOutputParser(proc: ChildProcess, currentConversationId: () => string): void {
  let buffer = "";
  let capturing = false;
  let captured = "";

  proc.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);

      if (line === OUTPUT_START_MARKER) {
        capturing = true;
        captured = "";
        continue;
      }

      if (line === OUTPUT_END_MARKER) {
        capturing = false;
        handleOutput(captured.trim(), currentConversationId());
        captured = "";
        continue;
      }

      if (capturing) {
        captured += line + "\n";
      }
    }
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    // Forward agent-runner logs
    process.stderr.write(chunk);
  });
}

function handleOutput(json: string, conversationId: string): void {
  try {
    const output = JSON.parse(json) as {
      status: string;
      result: string | null;
      newSessionId?: string;
      error?: string;
    };

    // Update session mapping
    if (output.newSessionId && conversationId) {
      conversationSessions.set(conversationId, output.newSessionId);
      log(`Session updated: ${conversationId} → ${output.newSessionId}`);
    }

    // Deliver result to im-server
    if (output.result && conversationId) {
      sendCallback(conversationId, output.result).catch((err) => {
        log(`sendCallback error: ${err}`);
      });
    }

    if (output.error) {
      log(`Agent error: ${output.error}`);
    }
  } catch (err) {
    log(`Failed to parse output: ${err}`);
  }
}

// ---- Agent-runner lifecycle ----
let lastConversationId = "";

function spawnAgentRunner(conversationId: string, prompt: string): void {
  lastConversationId = conversationId;

  const containerInput = {
    prompt,
    sessionId: conversationSessions.get(conversationId),
    groupFolder: `clawchat-${AGENT_ID}`,
    chatJid: conversationId,
    isMain: false,
  };

  log(`Spawning agent-runner for conversation ${conversationId}`);
  const proc = spawn("node", ["/tmp/dist/index.js"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  agentProcess = proc;
  agentRunning = true;
  firstMessageSent = true;

  // Write ContainerInput to stdin and close it
  proc.stdin!.write(JSON.stringify(containerInput));
  proc.stdin!.end();

  setupOutputParser(proc, () => lastConversationId);

  proc.on("exit", (code) => {
    log(`Agent-runner exited with code ${code}`);
    agentRunning = false;
    agentProcess = null;
    firstMessageSent = false;
  });

  proc.on("error", (err) => {
    log(`Agent-runner spawn error: ${err.message}`);
    agentRunning = false;
    agentProcess = null;
    firstMessageSent = false;
  });
}

function sendViaIpc(conversationId: string, content: string): void {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  const filename = `${ts}-${rand}.json`;
  const tmpPath = path.join(IPC_INPUT_DIR, `.${filename}.tmp`);
  const finalPath = path.join(IPC_INPUT_DIR, filename);

  // Atomic write: write to temp file, then rename
  fs.writeFileSync(tmpPath, JSON.stringify({ type: "message", text: content }));
  fs.renameSync(tmpPath, finalPath);

  lastConversationId = conversationId;
  log(`IPC message written: ${filename} (${content.length} chars)`);
}

// ---- HTTP server ----
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    jsonResponse(res, 200, { status: "ok", agentRunning });
    return;
  }

  // Inbound message webhook
  if (req.method === "POST" && req.url === "/webhook/message") {
    try {
      const body = JSON.parse(await readBody(req));
      const { conversationId, senderId, senderName, content } = body;

      if (!conversationId || !content) {
        jsonResponse(res, 400, { error: "conversationId and content required" });
        return;
      }

      const prompt = senderName
        ? `[Message from ${senderName}]: ${content}`
        : content;

      if (!agentRunning || !firstMessageSent) {
        // First message or agent crashed: spawn new agent-runner
        spawnAgentRunner(conversationId, prompt);
      } else {
        // Subsequent messages: write to IPC input
        sendViaIpc(conversationId, prompt);
      }

      jsonResponse(res, 202, { ok: true });
    } catch {
      jsonResponse(res, 400, { error: "invalid JSON" });
    }
    return;
  }

  jsonResponse(res, 404, { error: "not found" });
}

// ---- Main ----
function main(): void {
  // Ensure IPC directory exists
  fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });

  const server = createServer(handleRequest);
  server.listen(WEBHOOK_PORT, "0.0.0.0", () => {
    log(`Bridge listening on port ${WEBHOOK_PORT}`);
    log(`Callback URL: ${CALLBACK_URL}`);
    log(`Agent Account ID: ${AGENT_ACCOUNT_ID}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down");
    if (agentProcess) {
      // Write _close sentinel to signal agent-runner to exit
      try {
        fs.writeFileSync(path.join(IPC_INPUT_DIR, "_close"), "");
      } catch { /* ignore */ }
    }
    server.close();
    process.exit(0);
  });
}

main();
