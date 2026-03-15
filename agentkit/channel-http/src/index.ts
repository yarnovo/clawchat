/**
 * plugin-http — HTTP API + SSE → EventLoop 事件
 *
 * POST /api/chat     → push message 事件
 * GET  /api/events   → SSE 推送回复
 * GET  /api/info     → Agent 信息（收集所有插件 info）
 */
import { createServer, Server, ServerResponse } from 'http';
import type { Channel, AgenticContext } from '@agentkit/agentic';
import { createEvent } from '@agentkit/event-loop';
import type { EventLoop } from '@agentkit/event-loop';

export interface HttpPluginOptions {
  port?: number;
}

export function httpChannel(opts: HttpPluginOptions = {}): Channel {
  const port = opts.port || 4000;
  let server: Server | null = null;
  let sseClients = new Set<ServerResponse>();
  let loop: EventLoop;

  function broadcast(data: object): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const c of sseClients) c.write(payload);
  }

  return {
    name: 'http',

    setup: async (ctx: AgenticContext) => {
      loop = ctx.eventLoop;

      server = createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        const url = new URL(req.url || '/', `http://localhost:${port}`);

        // SSE
        if (url.pathname === '/api/events' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          res.write('data: {"type":"connected"}\n\n');
          sseClients.add(res);
          req.on('close', () => sseClients.delete(res));
          return;
        }

        // Chat
        if (url.pathname === '/api/chat' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', c => chunks.push(c));
          req.on('end', async () => {
            try {
              const { text } = JSON.parse(Buffer.concat(chunks).toString());
              if (!text?.trim()) { res.writeHead(400); res.end('{"error":"empty"}'); return; }

              broadcast({ type: 'typing', isTyping: true });
              const reply = await loop.push(createEvent('message', 'http', { text: text.trim() }));
              broadcast({ type: 'typing', isTyping: false });
              broadcast({ type: 'assistant', text: reply });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, reply }));
            } catch {
              res.writeHead(400); res.end('{"error":"invalid request"}');
            }
          });
          return;
        }

        // Info
        if (url.pathname === '/api/info' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        res.writeHead(404); res.end('{"error":"not found"}');
      });

      await new Promise<void>(resolve => server!.listen(port, resolve));
      console.log(`   HTTP: http://localhost:${port}`);
      console.log(`     POST /api/chat  GET /api/events  GET /api/info`);
    },

    teardown: async () => {
      for (const c of sseClients) c.end();
      sseClients.clear();
      server?.close();
    },

    info: () => ({ port, sseClients: sseClients.size }),
  };
}

/**
 * 给 httpPlugin 设置 getInfo 回调（AgentRunner 调用）
 * 暂时通过 info() 方法自己暴露信息
 */
