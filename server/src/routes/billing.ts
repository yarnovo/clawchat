import { Hono } from 'hono';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { usageRecords } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

// ---------- Validation ----------

const recordSchema = z.object({
  agentId: z.string().uuid(),
  type: z.enum(['chat', 'token', 'skill_install']),
  amount: z.number().int().min(1),
});

// ---------- Routes ----------

/** Current month usage summary grouped by type */
app.get('/usage', async (c) => {
  const userId = c.get('userId');

  // First day of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db
    .select({
      type: usageRecords.type,
      total: sql<number>`sum(${usageRecords.amount})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(usageRecords)
    .where(and(eq(usageRecords.userId, userId), gte(usageRecords.recordedAt, monthStart)))
    .groupBy(usageRecords.type);

  // Build summary object
  const summary: Record<string, { total: number; count: number }> = {};
  for (const row of rows) {
    summary[row.type] = { total: row.total, count: row.count };
  }

  return c.json({
    usage: summary,
    period: { start: monthStart.toISOString(), end: now.toISOString() },
  });
});

/** Usage history with pagination and date range filter */
app.get('/usage/history', async (c) => {
  const userId = c.get('userId');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
  const offset = (page - 1) * limit;
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions = [eq(usageRecords.userId, userId)];
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(usageRecords.recordedAt, fromDate));
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      conditions.push(lte(usageRecords.recordedAt, toDate));
    }
  }

  const rows = await db
    .select()
    .from(usageRecords)
    .where(and(...conditions))
    .orderBy(desc(usageRecords.recordedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageRecords)
    .where(and(...conditions));

  return c.json({ records: rows, page, limit, total: count });
});

/** Record a usage event (internal endpoint, called by proxy after each chat) */
app.post('/record', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { agentId, type, amount } = parsed.data;

  const [record] = await db
    .insert(usageRecords)
    .values({
      userId,
      agentId,
      type,
      amount,
    })
    .returning();

  return c.json({ record }, 201);
});

export { app as billingRoutes };
