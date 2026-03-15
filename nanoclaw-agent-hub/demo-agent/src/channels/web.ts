/**
 * Web Channel for NanoClaw
 * Provides a simple HTTP + SSE chat interface in the browser.
 *
 * - POST /api/message  → send a message
 * - GET  /api/events   → SSE stream for responses
 * - GET  /              → chat UI
 */
import { createServer, Server } from 'http';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { registerChannel, ChannelOpts } from './registry.js';
import { Channel, NewMessage } from '../types.js';
import { logger } from '../logger.js';
import { getRegisteredGroup, setRegisteredGroup } from '../db.js';
import { GROUPS_DIR } from '../config.js';

const WEB_PORT = parseInt(process.env.WEB_CHANNEL_PORT || '4000', 10);
const WEB_JID = 'web_main';
const WEB_USER = 'web-user';

class WebChannel implements Channel {
  name = 'web';
  private server: Server | null = null;
  private opts: ChannelOpts;
  private sseClients: Set<import('http').ServerResponse> = new Set();
  private connected = false;

  constructor(opts: ChannelOpts) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.server = createServer((req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      const url = new URL(req.url || '/', `http://localhost:${WEB_PORT}`);

      // SSE endpoint
      if (url.pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write('data: {"type":"connected"}\n\n');
        this.sseClients.add(res);
        req.on('close', () => this.sseClients.delete(res));
        return;
      }

      // Send message endpoint
      if (url.pathname === '/api/message' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const text = body.text?.trim();
            if (!text) { res.writeHead(400); res.end('{"error":"empty message"}'); return; }

            const msg: NewMessage = {
              id: randomUUID(),
              chat_jid: WEB_JID,
              sender: WEB_USER,
              sender_name: 'You',
              content: text,
              timestamp: new Date().toISOString(),
              is_from_me: false,
            };

            this.opts.onChatMetadata(WEB_JID, msg.timestamp, 'Web Chat', 'web', false);
            this.opts.onMessage(WEB_JID, msg);

            // Also push user message to SSE so UI shows it
            this.broadcast({ type: 'user', text });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: msg.id }));
          } catch {
            res.writeHead(400);
            res.end('{"error":"invalid json"}');
          }
        });
        return;
      }

      // Chat UI
      if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(chatHtml());
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(WEB_PORT, () => {
        this.connected = true;
        logger.info({ port: WEB_PORT }, 'Web channel started');
        resolve();
      });
    });

    // Auto-register as main group so it works immediately
    this.opts.onChatMetadata(WEB_JID, new Date().toISOString(), 'Web Chat', 'web', false);

    // Ensure web_main group is registered
    const existing = getRegisteredGroup(WEB_JID);
    if (!existing) {
      const group = {
        name: 'Web Chat',
        folder: 'web_main',
        trigger: '@Andy',
        added_at: new Date().toISOString(),
        isMain: true,
        requiresTrigger: false,
      };
      setRegisteredGroup(WEB_JID, group);
      const groupDir = path.join(GROUPS_DIR, 'web_main');
      fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });
      if (!fs.existsSync(path.join(groupDir, 'CLAUDE.md'))) {
        fs.writeFileSync(path.join(groupDir, 'CLAUDE.md'), '# Web Chat Agent\n\nYou are a helpful assistant.\n');
      }
      logger.info('Auto-registered web_main group');
    }
  }

  async sendMessage(_jid: string, text: string): Promise<void> {
    this.broadcast({ type: 'assistant', text });
  }

  isConnected(): boolean { return this.connected; }
  ownsJid(jid: string): boolean { return jid === WEB_JID; }

  async setTyping(_jid: string, isTyping: boolean): Promise<void> {
    this.broadcast({ type: 'typing', isTyping });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    for (const client of this.sseClients) client.end();
    this.sseClients.clear();
    this.server?.close();
  }

  private broadcast(data: object): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }
}

function chatHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NanoClaw Agent</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; background: #FAF9F6; height: 100vh; display: flex; flex-direction: column; }
  #header { padding: 16px 24px; border-bottom: 1px solid #E8E0D8; background: #fff; }
  #header h1 { font-size: 20px; color: #1A1A1A; font-weight: 600; }
  #header p { font-size: 14px; color: #8B7E74; }
  #messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 70%; padding: 12px 16px; border-radius: 16px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
  .msg.user { align-self: flex-end; background: #DA7756; color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant { align-self: flex-start; background: #fff; color: #1A1A1A; border: 1px solid #E8E0D8; border-bottom-left-radius: 4px; }
  .msg.typing { align-self: flex-start; background: #fff; color: #8B7E74; border: 1px solid #E8E0D8; font-style: italic; }
  #input-area { padding: 16px 24px; border-top: 1px solid #E8E0D8; background: #fff; display: flex; gap: 12px; }
  #input { flex: 1; padding: 12px 16px; border: 1px solid #E8E0D8; border-radius: 24px; font-size: 15px; outline: none; }
  #input:focus { border-color: #DA7756; }
  #send { padding: 12px 24px; background: #DA7756; color: #fff; border: none; border-radius: 24px; font-size: 15px; cursor: pointer; }
  #send:hover { background: #c4654a; }
  #status { font-size: 12px; color: #8B7E74; padding: 4px 24px; }
</style>
</head>
<body>
  <div id="header">
    <h1>NanoClaw Agent</h1>
    <p>Demo Agent</p>
  </div>
  <div id="status">Connecting...</div>
  <div id="messages"></div>
  <div id="input-area">
    <input id="input" placeholder="Say something..." autocomplete="off" />
    <button id="send">Send</button>
  </div>
<script>
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const status = document.getElementById('status');
let typingEl = null;

const evtSource = new EventSource('/api/events');
evtSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'connected') { status.textContent = 'Connected'; return; }
  if (data.type === 'typing') {
    if (data.isTyping && !typingEl) {
      typingEl = addMsg('Thinking...', 'typing');
    } else if (!data.isTyping && typingEl) {
      typingEl.remove();
      typingEl = null;
    }
    return;
  }
  if (data.type === 'assistant') {
    if (typingEl) { typingEl.remove(); typingEl = null; }
    addMsg(data.text, 'assistant');
  }
};
evtSource.onerror = () => { status.textContent = 'Disconnected. Retrying...'; };

function addMsg(text, cls) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg(text, 'user');
  await fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

sendBtn.onclick = send;
input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
input.focus();
</script>
</body>
</html>`;
}

// Self-register
registerChannel('web', (opts: ChannelOpts) => {
  return new WebChannel(opts);
});
