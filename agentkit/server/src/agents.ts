import { Hono } from 'hono';

export const agents = new Hono();

// Agent CRUD（对应 Docker 镜像）
agents.get('/', (c) => c.json({ agents: [] }));                    // 列出我的 Agent
agents.get('/:id', (c) => c.json({ agent: c.req.param('id') }));   // 查看详情
agents.post('/', (c) => c.json({ created: true }));                 // 创建（build 镜像）
agents.delete('/:id', (c) => c.json({ deleted: true }));            // 删除
