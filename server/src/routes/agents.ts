import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { agents, agentSkills, skills } from '../db/schema.js';
import { startAgent, stopAgent } from '../services/agent-lifecycle.js';
import { encryptCredentials } from '../services/crypto.js';
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

  // 创建后自动启动容器（fire-and-forget）
  startAgent(agent.id).catch((err) => {
    console.error(`[agents] auto-start failed for ${agent.id}:`, err);
  });

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

/** Get installed skills for an agent */
app.get('/:id/skills', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const rows = await db
    .select({
      skillName: agentSkills.skillName,
      installedAt: agentSkills.installedAt,
      displayName: skills.displayName,
      description: skills.description,
      version: skills.version,
    })
    .from(agentSkills)
    .leftJoin(skills, eq(agentSkills.skillName, skills.name))
    .where(eq(agentSkills.agentId, agentId));

  return c.json({
    skills: rows.map((r) => ({
      name: r.skillName,
      displayName: r.displayName || r.skillName,
      description: r.description || '',
      version: r.version || '',
      installedAt: r.installedAt,
    })),
  });
});

/** Set credentials for an agent */
app.put('/:id/credentials', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const { credentials } = await c.req.json<{ credentials: Record<string, string | null> }>();
  if (!credentials || typeof credentials !== 'object') {
    return c.json({ error: 'credentials object required' }, 400);
  }

  const config = (agent.config || {}) as Record<string, unknown>;
  const existing = (config.credentials || {}) as Record<string, string>;

  // 合并：null → 保留原加密值，string → 加密新值
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value === null) {
      // 保留原值
      if (existing[key]) merged[key] = existing[key];
    } else {
      merged[key] = value ? encryptCredentials({ [key]: value })[key] : '';
    }
  }

  await db
    .update(agents)
    .set({
      config: { ...config, credentials: merged, credentialOrder: Object.keys(merged) },
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));

  return c.json({ updated: true, keys: Object.keys(merged) });
});

/** Get credential keys for an agent (values hidden) */
app.get('/:id/credentials', async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));

  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const config = (agent.config || {}) as Record<string, unknown>;
  const credentials = (config.credentials || {}) as Record<string, string>;
  const order = (config.credentialOrder || Object.keys(credentials)) as string[];
  // Only return key names, not values — in saved order
  const keys = order
    .filter((key) => key in credentials)
    .map((key) => ({
      name: key,
      hasValue: Boolean(credentials[key]),
    }));

  return c.json({ credentials: keys });
});

export { app as agentsRoutes };
