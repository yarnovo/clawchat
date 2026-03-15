import { Hono } from 'hono';

export const auth = new Hono();

// TODO: 实现 JWT 认证
auth.post('/login', (c) => c.json({ token: 'todo' }));
auth.get('/me', (c) => c.json({ user: 'todo' }));
