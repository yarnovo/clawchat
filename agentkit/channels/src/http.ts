/**
 * HttpChannel — 纯 API 服务，给外部 App 调用
 *
 * POST /api/chat     ← 发消息
 * GET  /api/events   ← SSE 推送回复
 * GET  /api/info     ← Agent 信息
 */
import { createServer, Server, ServerResponse } from 'http';
import type { Channel } from './types.js';

export interface HttpChannelOptions {
  port?: number;
}

export class HttpChannel implements Channel {
  name = 'http';
  private server: Server | null = null;
  private sseClients: Set<ServerResponse> = new Set();
  private handler: ((input: string) => Promise<string>) | null = null;
  private infoHandler: (() => object) | null = null;
  private port: number;

  constructor(opts: HttpChannelOptions = {}) {
    this.port = opts.port || 4000;
  }

  onMessage(handler: (input: string) => Promise<string>): void {
    this.handler = handler;
  }

  /** 注册 info 回调（返回 Agent 信息） */
  onInfo(handler: () => object): void {
    this.infoHandler = handler;
  }

  async connect(): Promise<void> {
    this.server = createServer((req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      const url = new URL(req.url || '/', `http://localhost:${this.port}`);

      // SSE 推送
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

      // 发消息
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
          try {
            const { text } = JSON.parse(Buffer.concat(chunks).toString());
            if (!text?.trim()) { res.writeHead(400); res.end('{"error":"empty message"}'); return; }

            this.broadcast({ type: 'typing', isTyping: true });
            const reply = this.handler ? await this.handler(text.trim()) : 'No handler registered';
            this.broadcast({ type: 'typing', isTyping: false });
            this.broadcast({ type: 'assistant', text: reply });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, reply }));
          } catch {
            res.writeHead(400); res.end('{"error":"invalid request"}');
          }
        });
        return;
      }

      // Agent 信息
      if (url.pathname === '/api/info' && req.method === 'GET') {
        const info = this.infoHandler ? this.infoHandler() : {};
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(info));
        return;
      }

      res.writeHead(404); res.end('{"error":"not found"}');
    });

    await new Promise<void>(resolve => {
      this.server!.listen(this.port, () => resolve());
    });
  }

  async sendMessage(text: string): Promise<void> {
    this.broadcast({ type: 'assistant', text });
  }

  async disconnect(): Promise<void> {
    for (const c of this.sseClients) c.end();
    this.sseClients.clear();
    this.server?.close();
  }

  private broadcast(data: object): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const c of this.sseClients) c.write(payload);
  }
}
