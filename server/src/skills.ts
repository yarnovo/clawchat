import { Hono } from 'hono';

export const skills = new Hono();

// 技能市场
skills.get('/', (c) => {
  // TODO: 列出所有可用技能
  return c.json({ skills: [] });
});

skills.get('/search', (c) => {
  const q = c.req.query('q') || '';
  return c.json({ query: q, results: [] });
});

skills.get('/:name', (c) => {
  // TODO: 技能详情（SKILL.md 内容、使用次数）
  return c.json({ skill: c.req.param('name') });
});

skills.post('/:name/install', async (c) => {
  // TODO: 把技能 zip 推送到容器的 skills/ 目录
  return c.json({ installed: c.req.param('name') });
});
