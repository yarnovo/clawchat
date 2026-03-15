import { Hono } from 'hono';

export const billing = new Hono();

// 计费
billing.get('/usage', (c) => {
  // TODO: 当前用量（对话次数、token 消耗）
  return c.json({ usage: { chats: 0, tokens: 0 } });
});

billing.get('/plan', (c) => {
  // TODO: 当前套餐
  return c.json({ plan: 'free', limit: 100 });
});
