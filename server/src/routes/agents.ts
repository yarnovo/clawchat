import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { agents } from '../db/schema.js';
import { startAgent, stopAgent } from '../services/agent-lifecycle.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  avatar: z.string().optional(),
  category: z.string().max(100).optional(),
});

/** List current user's agents */
app.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, userId));
  return c.json({ agents: rows });
});

/** Create a new agent */
app.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const [agent] = await db
    .insert(agents)
    .values({
      ownerId: userId,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      avatar: parsed.data.avatar ?? null,
      category: parsed.data.category ?? null,
    })
    .returning();

  return c.json({ agent }, 201);
});

/** Get single agent */
app.get('/:id', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  return c.json({ agent });
});

/** Delete an agent */
app.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [deleted] = await db
    .delete(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)))
    .returning();

  if (!deleted) return c.json({ error: 'Agent not found' }, 404);
  return c.json({ deleted: true });
});

/** Start agent container */
app.post('/:id/start', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  if (agent.status === 'running') return c.json({ error: 'Already running' }, 400);

  try {
    const { channelUrl } = await startAgent(agentId);
    const [updated] = await db.select().from(agents).where(eq(agents.id, agentId));
    return c.json({ agent: updated, channelUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Failed to start: ${message}` }, 500);
  }
});

/** Stop agent container */
app.post('/:id/stop', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);
  if (agent.status !== 'running' && agent.status !== 'starting') {
    return c.json({ error: 'Not running' }, 400);
  }

  try {
    await stopAgent(agentId);
    const [updated] = await db.select().from(agents).where(eq(agents.id, agentId));
    return c.json({ agent: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Failed to stop: ${message}` }, 500);
  }
});

export { app as agentsRoutes };
