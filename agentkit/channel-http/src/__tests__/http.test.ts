import { describe, it, expect, afterEach } from 'vitest';
import http from 'http';
import { httpChannel } from '../index.js';
import type { Channel, AgenticContext } from '@agentkit/agentic';
import { EventLoop } from '@agentkit/event-loop';

// ---- helpers ----

/** Create a mock EventLoop whose push() resolves to a fixed reply. */
function mockEventLoop(reply = 'mock-reply'): EventLoop {
  const loop = new EventLoop();
  loop.bind({
    run: async () => reply,
    inject: () => {},
  });
  return loop;
}

function makeCtx(loop: EventLoop): AgenticContext {
  return { workDir: '/tmp/test', eventLoop: loop };
}

/** Convenience: fetch against localhost:port, returns { status, headers, body }. */
async function request(
  port: number,
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, method, path, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Open an SSE connection and collect events until `count` data lines are received or timeout. */
function collectSSE(
  port: number,
  count: number,
  timeoutMs = 3000,
): Promise<{ events: object[]; res: http.IncomingMessage }> {
  return new Promise((resolve, reject) => {
    const events: object[] = [];
    const req = http.get(`http://127.0.0.1:${port}/api/events`, (res) => {
      let buf = '';
      res.on('data', (chunk: Buffer) => {
        buf += chunk.toString();
        // Each SSE message: "data: {...}\n\n"
        const parts = buf.split('\n\n');
        buf = parts.pop()!; // keep incomplete tail
        for (const part of parts) {
          const match = part.match(/^data: (.+)$/m);
          if (match) {
            events.push(JSON.parse(match[1]));
            if (events.length >= count) {
              resolve({ events, res });
            }
          }
        }
      });
    });
    req.on('error', reject);
    setTimeout(() => {
      req.destroy();
      resolve({ events, res: null as unknown as http.IncomingMessage });
    }, timeoutMs);
  });
}

// ---- tests ----

describe('httpChannel', () => {
  let channel: Channel;
  let loop: EventLoop;

  afterEach(async () => {
    await channel?.teardown?.();
  });

  // -- basic --

  it('returns a Channel with name "http"', () => {
    channel = httpChannel();
    loop = mockEventLoop();
    expect(channel.name).toBe('http');
  });

  // -- setup & port --

  it('setup: starts HTTP server on the specified port', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14321 });
    await channel.setup(makeCtx(loop));

    const res = await request(14321, 'GET', '/api/info');
    expect(res.status).toBe(200);
  });

  it('setup: default port is 4000', async () => {
    loop = mockEventLoop();
    channel = httpChannel(); // no options → port 4000
    await channel.setup(makeCtx(loop));

    const res = await request(4000, 'GET', '/api/info');
    expect(res.status).toBe(200);
  });

  // -- POST /api/chat --

  it('POST /api/chat: pushes event to EventLoop and returns reply', async () => {
    loop = mockEventLoop('hello from agent');
    channel = httpChannel({ port: 14322 });
    await channel.setup(makeCtx(loop));

    const res = await request(14322, 'POST', '/api/chat', JSON.stringify({ text: 'hi' }));
    expect(res.status).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.ok).toBe(true);
    expect(json.reply).toBe('hello from agent');
  });

  it('POST /api/chat: returns 400 for empty message', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14323 });
    await channel.setup(makeCtx(loop));

    const res = await request(14323, 'POST', '/api/chat', JSON.stringify({ text: '' }));
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error).toBe('empty');
  });

  it('POST /api/chat: returns 400 for whitespace-only message', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14324 });
    await channel.setup(makeCtx(loop));

    const res = await request(14324, 'POST', '/api/chat', JSON.stringify({ text: '   ' }));
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error).toBe('empty');
  });

  it('POST /api/chat: returns 400 for invalid JSON', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14325 });
    await channel.setup(makeCtx(loop));

    const res = await request(14325, 'POST', '/api/chat', 'not json');
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error).toBe('invalid request');
  });

  // -- GET /api/events (SSE) --

  it('GET /api/events: returns SSE stream with connected event', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14326 });
    await channel.setup(makeCtx(loop));

    const { events, res } = await collectSSE(14326, 1);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'connected' });
    // Clean up SSE connection
    res.destroy();
  });

  // -- GET /api/info --

  it('GET /api/info: returns JSON with ok:true', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14327 });
    await channel.setup(makeCtx(loop));

    const res = await request(14327, 'GET', '/api/info');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  // -- 404 --

  it('returns 404 for unknown routes', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14328 });
    await channel.setup(makeCtx(loop));

    const res = await request(14328, 'GET', '/unknown');
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body).error).toBe('not found');
  });

  // -- CORS --

  it('CORS headers are present on responses', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14329 });
    await channel.setup(makeCtx(loop));

    const res = await request(14329, 'GET', '/api/info');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type');
  });

  it('OPTIONS returns 204 with CORS headers', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14330 });
    await channel.setup(makeCtx(loop));

    const res = await request(14330, 'OPTIONS', '/api/chat');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  // -- teardown --

  it('teardown: closes server and SSE clients', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14331 });
    await channel.setup(makeCtx(loop));

    // Open an SSE connection
    const ssePromise = collectSSE(14331, 1);
    await ssePromise; // wait for "connected" event

    // Before teardown, info shows 1 SSE client
    expect(channel.info!().sseClients).toBe(1);

    await channel.teardown!();

    // After teardown, connecting should fail
    await expect(
      request(14331, 'GET', '/api/info'),
    ).rejects.toThrow();

    // Prevent afterEach from calling teardown again
    channel = { name: 'http' } as Channel;
  });

  // -- info --

  it('info: returns port and sseClients count', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14332 });
    await channel.setup(makeCtx(loop));

    const info = channel.info!();
    expect(info.port).toBe(14332);
    expect(info.sseClients).toBe(0);
  });

  it('info: sseClients count increments with connected clients', async () => {
    loop = mockEventLoop();
    channel = httpChannel({ port: 14333 });
    await channel.setup(makeCtx(loop));

    expect(channel.info!().sseClients).toBe(0);

    // Open SSE connection
    const { res } = await collectSSE(14333, 1);
    expect(channel.info!().sseClients).toBe(1);

    // Close it
    res.destroy();
    // Wait a tick for the close event to propagate
    await new Promise((r) => setTimeout(r, 50));
    expect(channel.info!().sseClients).toBe(0);
  });

  // -- broadcast: SSE clients receive typing and assistant events --

  it('broadcast: SSE clients receive typing and assistant events on chat', async () => {
    loop = mockEventLoop('agent says hi');
    channel = httpChannel({ port: 14334 });
    await channel.setup(makeCtx(loop));

    // We expect: connected + typing(true) + typing(false) + assistant = 4 events
    const ssePromise = collectSSE(14334, 4, 5000);

    // Wait a bit for SSE to be connected before sending chat
    await new Promise((r) => setTimeout(r, 100));

    // Send a chat message (triggers typing + reply broadcast)
    await request(14334, 'POST', '/api/chat', JSON.stringify({ text: 'hello' }));

    const { events } = await ssePromise;
    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ type: 'connected' });
    expect(events[1]).toEqual({ type: 'typing', isTyping: true });
    expect(events[2]).toEqual({ type: 'typing', isTyping: false });
    expect(events[3]).toEqual({ type: 'assistant', text: 'agent says hi' });
  });
});
