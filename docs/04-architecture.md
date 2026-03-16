# 技术架构

## 1. 整体架构

```
React SPA (Vite :5173) ── /api proxy ──→ server (Hono :3000) ── PostgreSQL
                                              │
                                         orchestrator (dockerode)
                                              │
                                        AgentKit 容器 ──→ /workspace (volume)
```

## 2. 技术栈

| 模块 | 技术 | 理由 |
|------|------|------|
| 前端 | React 19 + Vite + TanStack Router/Query + Tailwind + shadcn | 现代 React 生态，类型安全，快速开发 |
| 状态管理 | Zustand | 轻量，无 boilerplate |
| 后端框架 | Hono | 轻量高性能，Web Standards API |
| ORM | Drizzle | TypeScript-first，零抽象开销 |
| 数据库 | PostgreSQL 17 | 稳定可靠 |
| 容器编排 | dockerode | Node.js Docker SDK，直接管理容器生命周期 |
| 身份验证 | JWT (httpOnly cookie) | 无密码登录（当前简化版） |
| 语言 | TypeScript | 全栈统一 |

## 3. Docker Compose 服务

| 服务 | 模式 | 职责 | 端口 |
|------|------|------|------|
| postgres | dev + deploy | 主数据库 | 5432 |
| redis | dev + deploy | 缓存 | 6379 |
| server 相关 | deploy only | 后端服务（Docker 镜像） | 3000+ |
| nginx | deploy only | 反向代理 + 静态文件 | 80 |
| grafana/loki/prometheus | deploy only | 监控 | 3001 |

本地开发只启动 postgres + redis，server 和前端在本地运行。

## 4. 项目结构

```
clawchat/
  ├── app/web/          React SPA (Vite)
  ├── server/           统一后端 (Hono + Drizzle + dockerode)
  │   ├── src/
  │   │   ├── app.ts              入口 + Auth 路由
  │   │   ├── routes/agents.ts    Agent CRUD
  │   │   ├── routes/messages.ts  消息代理 (proxy to container)
  │   │   ├── routes/skills.ts    技能管理
  │   │   ├── services/agent-lifecycle.ts  启停/Fork/删除编排
  │   │   ├── orchestrator/       Docker 容器管理 + Workspace
  │   │   ├── db/schema.ts        Drizzle schema
  │   │   └── middleware/auth.ts  JWT 认证
  │   └── drizzle/                SQL 迁移
  ├── agentkit/         Agent 运行时框架
  ├── ironclaw/         Rust AI 助手（独立 DB）
  ├── openclaw/         OpenClaw 源码
  ├── deploy/           部署配置 (nginx, monitoring)
  └── docker-compose.yml
```
