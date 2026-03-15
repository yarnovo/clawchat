import { Hono } from 'hono';

export const toolsMarket = new Hono();

// 工具市场
toolsMarket.get('/', (c) => {
  // TODO: 列出所有可用工具
  return c.json({ tools: [] });
});

toolsMarket.get('/search', (c) => {
  const q = c.req.query('q') || '';
  return c.json({ query: q, results: [] });
});

toolsMarket.get('/:name', (c) => {
  // TODO: 工具详情
  return c.json({ tool: c.req.param('name') });
});
