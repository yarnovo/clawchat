# API 路由

所有 API 由统一的 server (Hono) 提供，前缀 `/api`：

- `/api/auth/*` — 认证：register、login、logout、me（cookie-based JWT，无密码）
- `/api/agents` — Agent CRUD：list、create、get、delete
- `/api/agents/:id/start` `/api/agents/:id/stop` — Agent 容器生命周期
- `/api/agents/:agentId/messages` — 消息代理（POST 发送 + GET SSE 流）
- `/api/agents/:agentId/sessions/new` — 新建会话
- `/api/agents/:agentId/info` — Agent 信息（代理到容器）
- `/api/skills` — 内置技能列表、详情、安装/卸载
