# REST API 设计

## 1. 基本规范

| 规范 | 说明 |
|------|------|
| Base URL | /api |
| 认证方式 | httpOnly cookie (JWT)，cookie 名 `token` |
| 内容类型 | application/json |
| 消息传输 | POST 发送 + SSE 流式接收 |

## 2. API 端点总览

### 认证 /api/auth

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册（username + name），自动设置 cookie | 否 |
| POST | /api/auth/login | 登录（username），自动设置 cookie | 否 |
| POST | /api/auth/logout | 登出，清除 cookie | 否 |
| GET | /api/auth/me | 获取当前用户信息 | 是 |

### Agent /api/agents

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 获取我的 Agent 列表 |
| POST | /api/agents | 创建 Agent（name, description, avatar, category） |
| GET | /api/agents/:id | 获取 Agent 详情 |
| DELETE | /api/agents/:id | 删除 Agent |
| POST | /api/agents/:id/start | 启动 Agent 容器 |
| POST | /api/agents/:id/stop | 停止 Agent 容器 |

### 消息 /api/agents/:agentId/messages

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/agents/:agentId/messages | 发送消息到 Agent（代理到容器 /api/chat） |
| GET | /api/agents/:agentId/messages/stream | SSE 事件流（代理到容器 /api/events） |
| POST | /api/agents/:agentId/sessions/new | 新建会话（递增 currentSessionId） |
| GET | /api/agents/:agentId/info | 获取 Agent 运行信息（代理到容器 /api/info） |

### 技能 /api/skills

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/skills | 列出可用内置技能 |
| GET | /api/skills/:name | 获取技能详情（SKILL.md 内容 + 文件列表） |
| POST | /api/skills/:name/install | 安装技能到 Agent workspace |
| DELETE | /api/skills/:name/uninstall | 从 Agent workspace 卸载技能 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
