/**
 * AgentKit Server — 容器编排 + 市场
 * 管资源，不管对话
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { auth } from './auth.js';
import { agents } from './agents.js';
import { containers } from './containers.js';
import { market } from './market.js';
import { skills } from './skills.js';
import { toolsMarket } from './tools-market.js';
import { billing } from './billing.js';

const app = new Hono();

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok' }));

// 路由
app.route('/api/auth', auth);
app.route('/api/agents', agents);
app.route('/api/containers', containers);
app.route('/api/market', market);
app.route('/api/skills', skills);
app.route('/api/tools', toolsMarket);
app.route('/api/billing', billing);

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 AgentKit Server on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
