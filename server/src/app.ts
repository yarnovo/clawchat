/**
 * AgentKit Server — 容器编排
 * 管资源，不管对话
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { sign } from 'hono/utils/jwt/jwt';
import { setCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { authMiddleware, type AuthEnv } from './middleware/auth.js';
import { db } from './db/index.js';
import { accounts, agents } from './db/schema.js';
import { agentsRoutes } from './routes/agents.js';
import { messagesRoutes } from './routes/messages.js';
import { skillsRoutes } from './routes/skills.js';

const app = new Hono<AuthEnv>();

const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const isDev = process.env.NODE_ENV !== 'production';

// ---------- Global middleware ----------
app.use('*', cors({
  origin: isDev ? 'http://localhost:5173' : '',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ---------- Auth ----------

function setTokenCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'Lax' : 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function signToken(accountId: string, name: string) {
  return sign({ accountId, type: 'human', name }, jwtSecret, 'HS256');
}

app.post('/api/auth/register', async (c) => {
  const { username, password, name, avatar } = await c.req.json<{
    username: string; password: string; name?: string; avatar?: string;
  }>();
  if (!username) return c.json({ error: 'username required' }, 400);
  if (!password) return c.json({ error: 'password required' }, 400);

  // Check if username already exists
  const existing = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'username already taken' }, 409);
  }

  const passwordHash = await hash(password, 10);
  const [account] = await db.insert(accounts).values({
    username,
    passwordHash,
    name: name ?? username,
    avatar: avatar ?? null,
  }).returning();

  // Create default agent for the new user
  await db.insert(agents).values({
    ownerId: account.id,
    name: account.name,
    description: '',
    isDefault: true,
  });

  const token = await signToken(account.id, account.name);
  setTokenCookie(c, token);
  return c.json({ user: { id: account.id, name: account.name, username: account.username } });
});

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (!username) return c.json({ error: 'username required' }, 400);
  if (!password) return c.json({ error: 'password required' }, 400);

  const [account] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
  if (!account) {
    return c.json({ error: 'user not found' }, 404);
  }

  const valid = await compare(password, account.passwordHash);
  if (!valid) {
    return c.json({ error: 'invalid password' }, 401);
  }

  const token = await signToken(account.id, account.name);
  setTokenCookie(c, token);
  return c.json({ user: { id: account.id, name: account.name, username: account.username } });
});

app.post('/api/auth/logout', (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'Lax' : 'Strict',
    path: '/',
    maxAge: 0,
  });
  return c.json({ ok: true });
});

// JWT auth
app.use('*', authMiddleware());

// Auth: get current user
app.get('/api/auth/me', async (c) => {
  const userId = c.get('userId');
  const [account] = await db.select().from(accounts).where(eq(accounts.id, userId)).limit(1);
  if (!account) return c.json({ error: 'not found' }, 404);

  const [defaultAgent] = await db.select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.ownerId, userId), eq(agents.isDefault, true)))
    .limit(1);

  return c.json({
    user: {
      id: account.id,
      name: account.name,
      username: account.username,
      avatar: account.avatar,
      defaultAgentId: defaultAgent?.id ?? null,
    },
  });
});

// ---------- Routes ----------
app.route('/api/agents', agentsRoutes);
app.route('/api/agents', messagesRoutes);
app.route('/api/skills', skillsRoutes);

// ---------- Start ----------
const port = parseInt(process.env.PORT || '3000');
console.log(`AgentKit Server on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
