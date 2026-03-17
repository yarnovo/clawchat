/**
 * plugin-http — HTTP API + SSE → EventLoop 事件
 *
 * POST /api/chat     → push message 事件
 * GET  /api/events   → SSE 推送回复
 * GET  /api/info     → Agent 信息（收集所有插件 info）
 */
import { createServer, Server, ServerResponse } from 'http';
import crypto from 'crypto';
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

        // Chat (fire-and-forget: return 202 immediately, response via SSE)
        if (url.pathname === '/api/chat' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', c => chunks.push(c));
          req.on('end', () => {
            try {
              const { text, requestId } = JSON.parse(Buffer.concat(chunks).toString());
              if (!text?.trim()) { res.writeHead(400); res.end('{"error":"empty"}'); return; }

              const rid = requestId || crypto.randomUUID();

              // 立即返回 202
              res.writeHead(202, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, requestId: rid }));

              // 异步处理：broadcast typing → run → broadcast result
              const event = createEvent('message', 'http', { text: text.trim(), requestId: rid });
              broadcast({ type: 'typing', isTyping: true, requestId: rid });

              loop.push(event).then(reply => {
                broadcast({ type: 'typing', isTyping: false, requestId: rid });
                broadcast({ type: 'assistant', text: reply, requestId: rid });
              }).catch(err => {
                broadcast({ type: 'typing', isTyping: false, requestId: rid });
                broadcast({ type: 'error', message: (err as Error).message, requestId: rid });
              });
            } catch {
              res.writeHead(400); res.end('{"error":"invalid request"}');
            }
          });
          return;
        }

        // Abort current processing
        if (url.pathname === '/api/abort' && req.method === 'POST') {
          loop.abort();
          broadcast({ type: 'aborted' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // Health (for Docker health check)
        if (url.pathname === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
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
      console.log(`     POST /api/chat  POST /api/abort  GET /api/events  GET /api/info`);
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
