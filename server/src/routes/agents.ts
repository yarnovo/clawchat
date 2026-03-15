import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { agents } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

// ---------- Validation ----------

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  persona: z.string().max(5000).optional(),
  skills: z.array(z.string()).optional(),
});

// ---------- Routes ----------

/** List current user's agents */
app.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.ownerId, userId), isNull(agents.deletedAt)));
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

  const { name, description, persona, skills: skillList } = parsed.data;

  const [agent] = await db
    .insert(agents)
    .values({
      ownerId: userId,
      name,
      description: description ?? '',
      config: { persona: persona ?? '', skills: skillList ?? [] },
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
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId), isNull(agents.deletedAt)));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ agent });
});

/** Soft delete an agent */
app.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [updated] = await db
    .update(agents)
    .set({ deletedAt: new Date(), status: 'deleted' })
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId), isNull(agents.deletedAt)))
    .returning();

  if (!updated) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json({ deleted: true, agent: updated });
});

/** Start agent container (stub) */
app.post('/:id/start', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId), isNull(agents.deletedAt)));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  if (agent.status === 'running') {
    return c.json({ error: 'Agent is already running' }, 400);
  }

  // TODO: Actually start the container via container-server
  const [updated] = await db
    .update(agents)
    .set({ status: 'starting', updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();

  return c.json({ agent: updated });
});

/** Stop agent container (stub) */
app.post('/:id/stop', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId), isNull(agents.deletedAt)));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  if (agent.status !== 'running' && agent.status !== 'starting') {
    return c.json({ error: 'Agent is not running' }, 400);
  }

  // TODO: Actually stop the container via container-server
  const [updated] = await db
    .update(agents)
    .set({ status: 'stopped', updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();

  return c.json({ agent: updated });
});

export { app as agentsRoutes };
