import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents, messages } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

/**
 * Resolve agent and verify it's running.
 * Returns the agent row or a JSON error response.
 */
async function getRunningAgent(agentId: string, userId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return { error: 'Agent not found', status: 404 as const };
  if (agent.status !== 'running') return { error: 'Agent is not running', status: 400 as const };
  if (!agent.channelUrl) return { error: 'Agent has no channel URL', status: 400 as const };

  return { agent };
}

/** Send message to agent container (pure proxy, no DB persistence) */
app.post('/:agentId/messages', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const result = await getRunningAgent(agentId, userId);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }

  const body = await c.req.json();
  const upstream = await fetch(`${result.agent.channelUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return c.json(data, upstream.status as any);
});

/** SSE stream proxy — pipe agent's event stream to client */
app.get('/:agentId/messages/stream', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const result = await getRunningAgent(agentId, userId);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }

  return streamSSE(c, async (stream) => {
    const upstream = await fetch(`${result.agent.channelUrl}/api/events`);

    if (!upstream.ok || !upstream.body) {
      await stream.writeSSE({ data: JSON.stringify({ error: 'upstream connection failed' }), event: 'error' });
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            await stream.writeSSE({ data: line.slice(6) });
          }
        }
      }
    } catch {
      // Stream closed or upstream error
    } finally {
      reader.releaseLock();
    }
  });
});

/** Start new session — increment currentSessionId */
app.post('/:agentId/sessions/new', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const newSessionId = (agent.currentSessionId ?? 1) + 1;

  await db
    .update(agents)
    .set({ currentSessionId: newSessionId, updatedAt: new Date() })
    .where(eq(agents.id, agentId));

  return c.json({ sessionId: newSessionId });
});

/** Forward info request to agent's channel */
app.get('/:agentId/info', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const result = await getRunningAgent(agentId, userId);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }

  const upstream = await fetch(`${result.agent.channelUrl}/api/info`);
  const data = await upstream.json();
  return c.json(data, upstream.status as any);
});

/** Get chat sessions summary for an agent */
app.get('/:agentId/history', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.agentId, agentId))
    .orderBy(asc(messages.createdAt));

  // Group by sessionId
  const sessionMap = new Map<number, typeof rows>();
  for (const row of rows) {
    if (!sessionMap.has(row.sessionId)) sessionMap.set(row.sessionId, []);
    sessionMap.get(row.sessionId)!.push(row);
  }

  const sessions = [...sessionMap.entries()].map(([sessionId, msgs]) => {
    const last = msgs[msgs.length - 1];
    const firstUser = msgs.find((m) => m.role === 'user');
    const title = firstUser ? firstUser.content.slice(0, 50) : `会话 ${sessionId}`;
    const tag = msgs[0].tag || null;
    return {
      sessionId,
      title,
      tag,
      messageCount: msgs.length,
      lastMessage: last.content,
      lastTimestamp: new Date(last.createdAt).getTime(),
    };
  }).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  return c.json({ sessions });
});

/** Get messages for a specific session */
app.get('/:agentId/history/:sessionId', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const sessionId = parseInt(c.req.param('sessionId'));

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.agentId, agentId), eq(messages.sessionId, sessionId)))
    .orderBy(asc(messages.createdAt));

  return c.json({
    messages: rows.map((m) => ({
      id: m.id,
      agentId: m.agentId,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      status: 'complete',
      timestamp: new Date(m.createdAt).getTime(),
    })),
  });
});

export { app as messagesRoutes };
