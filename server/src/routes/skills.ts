import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

/** List all available skills */
app.get('/', (c) => {
  // TODO: query skill registry
  return c.json({ skills: [] });
});

/** Search skills */
app.get('/search', (c) => {
  const q = c.req.query('q') || '';
  // TODO: search skill registry
  return c.json({ query: q, results: [] });
});

/** Get skill details */
app.get('/:name', (c) => {
  // TODO: fetch skill metadata from registry
  return c.json({ skill: c.req.param('name') });
});

/** Install skill to an agent */
app.post('/:name/install', async (c) => {
  // TODO: install skill to agent's container
  return c.json({ installed: c.req.param('name') });
});

export { app as skillsRoutes };
