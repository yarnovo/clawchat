/**
 * AgentKit Server — 容器编排
 * 管资源，不管对话
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { authMiddleware, type AuthEnv } from './middleware/auth.js';
import { agentsRoutes } from './routes/agents.js';
import { messagesRoutes } from './routes/messages.js';
import { skillsRoutes } from './routes/skills.js';

const app = new Hono<AuthEnv>();

// ---------- Global middleware ----------
app.use('*', cors());

// Health check (before auth)
app.get('/health', (c) => c.json({ status: 'ok' }));

// JWT auth (skips /health internally)
app.use('*', authMiddleware());

// ---------- Routes ----------
app.route('/api/agents', agentsRoutes);
app.route('/api/agents', messagesRoutes);  // :agentId/messages, :agentId/sessions, :agentId/info
app.route('/api/skills', skillsRoutes);

// ---------- Start ----------
const port = parseInt(process.env.PORT || '3000');
console.log(`AgentKit Server on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
