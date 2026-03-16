# ClawChat 项目规则

## 架构总览

```
React SPA (Vite :5173) ── /api proxy ──→ server (Hono :3000) ── PostgreSQL (clawchat)
                                              │
                                         orchestrator (dockerode)
                                              │
                                        AgentKit 容器 ──→ /workspace (volume)
```

| 模块 | 技术 | 职责 |
|------|------|------|
| app/web | React 19 + Vite + TanStack Router/Query + Tailwind + shadcn + Zustand | Web 前端 SPA |
| server | Hono + Drizzle + PostgreSQL + dockerode | 统一后端：Auth、Agent CRUD、消息代理、容器编排 |
| agentkit | TypeScript | Agent 运行时框架（core + CLI + extension-skills） |
| ironclaw | Rust | 独立 AI 助手（单独数据库，Flyway 迁移） |
| openclaw | TypeScript | OpenClaw 源码，Agent 容器镜像基础 |

**关键数据流：**
1. 创建 Agent → DB 记录（agents 表）
2. 启动 Agent → 创建 workspace → Docker 容器启动 → 健康检查 → 状态更新为 running
3. 用户发消息 → server 代理到 Agent 容器的 `/api/chat` → SSE 流式返回

## 本地开发流程

- `make dev` — 启动 Docker DB + server (pnpm dev, :3000) + Vite 前端 (:5173)
- `make dev-stop` — 停止所有服务
- 前端通过 Vite proxy 将 `/api` 请求转发到 `localhost:3000`
- Playwright MCP 调试目标地址：http://localhost:5173

## 部署检查清单

每次修改部署相关配置时，必须验证以下完整流程可行：

1. **ecs-setup.sh** — 新 ECS 执行一次即可就绪（Docker、工具、目录）
2. **CI/CD（release.yml）** — tag 触发后自动构建、rsync、`docker compose --profile deploy up -d --build` 完成部署
3. **服务启动后可用** — 数据库建表、服务健康检查、nginx 代理全部正常

### 具体规则

- 数据库迁移通过 drizzle-kit 管理，容器启动时自动执行 `tsx src/db/migrate.ts`
- Docker 服务必须加 `.dockerignore`，排除 `node_modules`、`dist`、`.env` 等
- `docker-compose.yml` 使用 profiles 区分本地开发（db only）和线上部署（全部服务）
- 线上所有服务都跑在 Docker 内，不在宿主机直接安装运行时
- 新增功能必须同步更新：docker-compose.yml、Makefile 快捷指令、CI workflow

## 测试规则

### 测试分层

- **L1 单元测试**：mock HTTP，CI 每次 push 跑。server 用 vitest
- **L2 API e2e**：真实 DB，CI 每次 push 跑。server 用 Hono `app.request()` 直连测试数据库
- **L3 全链路 E2E**：React 前端 + 真实 server + 真实 DB，Playwright 覆盖注册→登录→创建 Agent→对话

### 具体规则

- 每次新增功能必须同步编写测试：每个新 API 补 L2 测试，每个新页面补 Playwright E2E 测试
- server 测试使用 `vitest`，e2e 测试通过 Hono `app.request()` 直连测试数据库
- 提交前 lefthook 自动检查：TypeScript typecheck

## API 路由

所有 API 由统一的 server (Hono) 提供，前缀 `/api`：

- `/api/auth/*` — 认证：register、login、logout、me（cookie-based JWT，无密码）
- `/api/agents` — Agent CRUD：list、create、get、delete
- `/api/agents/:id/start` `/api/agents/:id/stop` — Agent 容器生命周期
- `/api/agents/:agentId/messages` — 消息代理（POST 发送 + GET SSE 流）
- `/api/agents/:agentId/sessions/new` — 新建会话
- `/api/agents/:agentId/info` — Agent 信息（代理到容器）
- `/api/skills` — 内置技能列表、详情、安装/卸载

## 文档导航

产品设计文档位于 `docs/`。标注 ✅ 的与当前实现一致，⚠️ 为历史设计文档（仅供参考，以代码为准）：

| 文件 | 内容 | 状态 |
|------|------|------|
| 01-product-overview.md | 产品概述、愿景 | ✅ |
| 02-account-system.md | 账号体系设计 | ⚠️ 字段与当前 schema 有出入 |
| 03-feature-design.md | 功能设计 | ✅ |
| 04-architecture.md | 系统架构 | ✅ |
| 05-database-schema.md | 数据库表设计 | ✅ |
| 06-relay-protocol.md | 消息协议 | ✅ |
| 07-rest-api.md | REST API 规范 | ✅ |
| 08-offline-sync.md | 离线同步 | ⚠️ 历史设计 |
| 09-infrastructure.md | 基础设施与部署 | ⚠️ 部分过时 |
| 10-openclaw-plugin.md | OpenClaw Channel 插件 | ⚠️ 历史设计 |
| 11-agent-hosting.md | Agent 容器托管 | ⚠️ 架构已简化 |
| 12-business-model.md | 商业模式 | ✅ |
| 13-launch-strategy.md | 上线策略 | ✅ |
| 14-blockchain.md | 区块链相关 | ✅ |
| 15-error-handling.md | 错误处理 | ⚠️ 历史设计 |

项目路线图：`ROADMAP.md`

## 宣传视频（Remotion）

- 视频有全局字幕层（`Subtitle` 组件，固定在 `bottom: 80`），场景内容排版必须通过 `paddingBottom` 为字幕留出空间，避免场景内的文字与字幕重叠
- TTS 音频由 `edge-tts`（node-edge-tts）生成，字幕时间戳文件在 `src/words/`，音频文件在 `public/audio/`
- 每段旁白时长必须短于对应场景时长（减去 delayFrames 和淡出），修改文案后需重新运行 `npm run tts` 生成音频

## 踩坑笔记

开发过程中的踩坑记录位于 `notes/` 目录：

| 文件 | 内容 |
|------|------|
| openclaw-plugin-pitfalls.md | OpenClaw Channel Plugin 开发踩坑：插件加载条件、manifest 格式、config 校验、formatAllowFrom 类型、Docker 网络寻址、Dockerfile 分层等 |
