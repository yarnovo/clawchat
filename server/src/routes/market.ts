import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

/** List published agents on the market */
app.get('/', (c) => {
  // TODO: query market_listings with status = 'published'
  return c.json({ agents: [] });
});

/** Search market */
app.get('/search', (c) => {
  const q = c.req.query('q') || '';
  // TODO: full-text search on market_listings
  return c.json({ query: q, results: [] });
});

/** Publish an agent to the market */
app.post('/publish', async (c) => {
  const { agentId } = await c.req.json();
  // TODO: create market_listing, set status = 'pending'
  return c.json({ published: agentId, status: 'pending_review' });
});

/** Get market listing details */
app.get('/:id', (c) => {
  // TODO: join market_listings + agents for full details
  return c.json({ listing: c.req.param('id') });
});

export { app as marketRoutes };
