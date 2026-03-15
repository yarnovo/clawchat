import { Hono } from 'hono';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

/** Get current usage stats */
app.get('/usage', (c) => {
  // TODO: aggregate usage_records for current user
  return c.json({ usage: { chats: 0, tokens: 0 } });
});

/** Get current plan info */
app.get('/plan', (c) => {
  // TODO: look up user's subscription plan
  return c.json({ plan: 'free', limit: 100 });
});

export { app as billingRoutes };
