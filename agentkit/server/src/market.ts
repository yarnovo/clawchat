import { Hono } from 'hono';

export const market = new Hono();

// Agent 市场
market.get('/', (c) => {
  // TODO: 列出公开 Agent（从 registry 查询）
  return c.json({ agents: [] });
});

market.get('/search', (c) => {
  const q = c.req.query('q') || '';
  // TODO: 搜索 Agent
  return c.json({ query: q, results: [] });
});

market.post('/publish', async (c) => {
  // TODO: 上架 Agent（审核 + 去重检查）
  const { agentId } = await c.req.json();
  return c.json({ published: agentId, status: 'pending_review' });
});

market.get('/:id', (c) => {
  // TODO: Agent 详情（评分、使用次数、技能列表）
  return c.json({ agent: c.req.param('id') });
});
