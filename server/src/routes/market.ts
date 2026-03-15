import { Hono } from 'hono';
import { eq, and, or, desc, asc, sql, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { marketListings, agents, marketReviews } from '../db/schema.js';
import { forkAgent } from '../services/agent-lifecycle.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

// ---------- Validation ----------

const publishSchema = z.object({
  agentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

const updateListingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// ---------- Routes ----------

/** Browse published agents (pagination + filter + sort) */
app.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;
  const category = c.req.query('category');
  const sort = c.req.query('sort') || 'newest';

  const conditions = [eq(marketListings.status, 'published')];
  if (category) {
    conditions.push(eq(marketListings.category, category));
  }

  const orderBy =
    sort === 'downloads'
      ? desc(marketListings.downloads)
      : sort === 'rating'
        ? desc(marketListings.rating)
        : desc(marketListings.publishedAt);

  const rows = await db
    .select({
      id: marketListings.id,
      agentId: marketListings.agentId,
      title: marketListings.title,
      description: marketListings.description,
      category: marketListings.category,
      tags: marketListings.tags,
      price: marketListings.price,
      downloads: marketListings.downloads,
      rating: marketListings.rating,
      publishedAt: marketListings.publishedAt,
      agentName: agents.name,
      agentDescription: agents.description,
    })
    .from(marketListings)
    .innerJoin(agents, eq(marketListings.agentId, agents.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(marketListings)
    .where(and(...conditions));

  return c.json({ listings: rows, page, limit, total: count });
});

/** Full text search on title + description */
app.get('/search', async (c) => {
  const q = c.req.query('q') || '';
  if (!q.trim()) {
    return c.json({ query: q, results: [] });
  }

  const pattern = `%${q}%`;
  const rows = await db
    .select({
      id: marketListings.id,
      agentId: marketListings.agentId,
      title: marketListings.title,
      description: marketListings.description,
      category: marketListings.category,
      tags: marketListings.tags,
      price: marketListings.price,
      downloads: marketListings.downloads,
      rating: marketListings.rating,
      publishedAt: marketListings.publishedAt,
    })
    .from(marketListings)
    .where(
      and(
        eq(marketListings.status, 'published'),
        or(ilike(marketListings.title, pattern), ilike(marketListings.description, pattern)),
      ),
    )
    .orderBy(desc(marketListings.downloads))
    .limit(50);

  return c.json({ query: q, results: rows });
});

/** Publish own agent to marketplace */
app.post('/publish', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { agentId, title, description, category, tags, price } = parsed.data;

  // Verify ownership
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));
  if (!agent) {
    return c.json({ error: 'Agent not found or not owned by you' }, 404);
  }

  const [listing] = await db
    .insert(marketListings)
    .values({
      agentId,
      ownerId: userId,
      title,
      description: description ?? '',
      category: category ?? 'general',
      tags: tags ?? [],
      price: price ?? '0.00',
      status: 'published',
      publishedAt: new Date(),
    })
    .returning();

  return c.json({ listing }, 201);
});

/** Update listing */
app.patch('/publish/:id', async (c) => {
  const userId = c.get('userId');
  const listingId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const [existing] = await db
    .select()
    .from(marketListings)
    .where(and(eq(marketListings.id, listingId), eq(marketListings.ownerId, userId)));
  if (!existing) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;

  if (Object.keys(updates).length === 0) {
    return c.json({ listing: existing });
  }

  const [updated] = await db
    .update(marketListings)
    .set(updates)
    .where(eq(marketListings.id, listingId))
    .returning();

  return c.json({ listing: updated });
});

/** Unpublish (delete listing, agent stays) */
app.delete('/publish/:id', async (c) => {
  const userId = c.get('userId');
  const listingId = c.req.param('id');

  const [existing] = await db
    .select()
    .from(marketListings)
    .where(and(eq(marketListings.id, listingId), eq(marketListings.ownerId, userId)));
  if (!existing) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  await db.delete(marketReviews).where(eq(marketReviews.listingId, listingId));
  await db.delete(marketListings).where(eq(marketListings.id, listingId));

  return c.json({ deleted: true });
});

/** Listing detail (join with agents table) */
app.get('/:id', async (c) => {
  const listingId = c.req.param('id');

  const [row] = await db
    .select({
      id: marketListings.id,
      agentId: marketListings.agentId,
      ownerId: marketListings.ownerId,
      title: marketListings.title,
      description: marketListings.description,
      category: marketListings.category,
      tags: marketListings.tags,
      price: marketListings.price,
      status: marketListings.status,
      downloads: marketListings.downloads,
      rating: marketListings.rating,
      publishedAt: marketListings.publishedAt,
      createdAt: marketListings.createdAt,
      agentName: agents.name,
      agentDescription: agents.description,
      agentStatus: agents.status,
    })
    .from(marketListings)
    .innerJoin(agents, eq(marketListings.agentId, agents.id))
    .where(eq(marketListings.id, listingId));

  if (!row) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  return c.json({ listing: row });
});

/** Fork an agent from listing */
app.post('/:id/fork', async (c) => {
  const userId = c.get('userId');
  const listingId = c.req.param('id');

  const [listing] = await db
    .select()
    .from(marketListings)
    .where(and(eq(marketListings.id, listingId), eq(marketListings.status, 'published')));
  if (!listing) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  // Increment download count
  await db
    .update(marketListings)
    .set({ downloads: sql`${marketListings.downloads} + 1` })
    .where(eq(marketListings.id, listingId));

  const result = await forkAgent(listing.agentId, {
    userId,
    name: `${listing.title} (fork)`,
    description: listing.description ?? undefined,
  });

  return c.json({ agentId: result.agentId, channelUrl: result.channelUrl }, 201);
});

/** List reviews for a listing */
app.get('/:id/reviews', async (c) => {
  const listingId = c.req.param('id');

  const rows = await db
    .select()
    .from(marketReviews)
    .where(eq(marketReviews.listingId, listingId))
    .orderBy(desc(marketReviews.createdAt));

  return c.json({ reviews: rows });
});

/** Submit review */
app.post('/:id/reviews', async (c) => {
  const userId = c.get('userId');
  const listingId = c.req.param('id');
  const body = await c.req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  // Verify listing exists
  const [listing] = await db
    .select()
    .from(marketListings)
    .where(eq(marketListings.id, listingId));
  if (!listing) {
    return c.json({ error: 'Listing not found' }, 404);
  }

  // Prevent reviewing own listing
  if (listing.ownerId === userId) {
    return c.json({ error: 'Cannot review your own listing' }, 400);
  }

  const [review] = await db
    .insert(marketReviews)
    .values({
      listingId,
      userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? '',
    })
    .returning();

  // Recalculate average rating
  const [{ avg }] = await db
    .select({ avg: sql<number>`round(avg(${marketReviews.rating})::numeric, 2)::real` })
    .from(marketReviews)
    .where(eq(marketReviews.listingId, listingId));

  await db
    .update(marketListings)
    .set({ rating: avg })
    .where(eq(marketListings.id, listingId));

  return c.json({ review }, 201);
});

export { app as marketRoutes };
