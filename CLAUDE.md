# ClawChat 项目规则

## 架构总览

```
Flutter App ── REST/WebSocket ──→ nginx ──┬── im-server (3000)     ── PostgreSQL (clawchat)
                                          ├── agent-server (3004)  ── PostgreSQL (clawchat_agent)
                                          └── mcp-server (8000)

agent-server ──→ openclaw-server (3003) ──→ container-server (3002) ──→ Docker
                                                                         │
                                                                   openclaw-agent 容器
                                                                         │
                                                            callback ──→ im-server → Redis queue → Worker
```

| 服务 | 职责 |
|------|------|
| im-server | IM 核心：账号、好友、会话、消息、WebSocket 推送 |
| agent-server | Agent CRUD + 生命周期（start/stop/chat），JWT 认证，Saga 编排 |
| openclaw-server | OpenClaw 实例配置生成 + 编排（create/start/stop） |
| container-server | Docker 容器管理（thin wrapper，未来可接入其他 runtime） |
| mcp-server | MCP 工具服务（FastAPI/Python） |

**关键数据流：**
1. 创建 Agent → Saga: 注册 IM 账号 → 建 DB 记录 → 加好友关系 → 启动容器
2. 用户发消息给 Agent → im-server → agent-server /chat → openclaw 容器
3. Agent 回复 → openclaw 容器 callback → im-server Redis queue → Worker 存消息 + WebSocket 推送

## 本地开发流程

- `make dev` — 启动所有服务（Docker Compose + nginx），Web UI 在 http://localhost:8080
- `make reload` — 前端改动后重新构建 Flutter Web + 重启 nginx，刷新即可看到效果
- `make dev-stop` — 停止所有服务
- **禁止用 `flutter run -d chrome` 做本地开发**，前端通过 nginx 代理访问（与后端 API 同域）
- Playwright MCP 调试目标地址：http://localhost:8080

## 部署检查清单

每次修改部署相关配置时，必须验证以下完整流程可行：

1. **ecs-setup.sh** — 新 ECS 执行一次即可就绪（Docker、工具、目录）
2. **CI/CD（release.yml）** — tag 触发后自动构建、rsync、`docker compose --profile deploy up -d --build` 完成部署
3. **服务启动后可用** — 数据库建表、服务健康检查、nginx 代理全部正常

### 具体规则

- 新增后端服务时，必须确保容器启动时自动完成数据库迁移（如 `prisma migrate deploy`），不能依赖手动操作
- Docker 服务必须加 `.dockerignore`，排除 `node_modules`、`dist`、`.env` 等，避免 rsync 和 build 变慢
- rsync 部署时必须 `--exclude=node_modules`，Dockerfile 内 `npm ci` 重新安装
- `docker-compose.yml` 使用 profiles 区分本地开发（db only）和线上部署（全部服务）
- 线上所有服务都跑在 Docker 内，不在宿主机直接安装运行时（如 Node.js、Python）
- 新增服务必须同步更新：Dockerfile、docker-compose.yml、nginx 配置、release.yml deploy 步骤、Makefile 快捷指令、CI workflow

## 测试规则

### 测试分层

- **L1 单元/Widget**：mock HTTP，CI 每次 push 跑。Flutter widget + im-server JWT 单元测试
- **L2 API e2e**：真实 DB，CI 每次 push 跑。im-server 用 app.request() 直连测试数据库
- **L3 全链路集成**：Flutter + 真实 im-server + 真实 DB，覆盖注册→登录→加好友→私聊。本地/CD 前跑

### 具体规则

- 每次新增功能必须同步编写测试：每个新 API 补 L2 测试，每个新页面补 L1 widget 测试
- Flutter 测试中使用 `InMemoryTokenStore` 注入 `AuthService`，不依赖真实 SharedPreferences
- im-server 测试使用 `vitest`，e2e 测试通过 Hono `app.request()` 直连测试数据库
- 提交前 lefthook 自动检查：Flutter analyze + TypeScript typecheck

## API 路由

- `/v1/im/*` — im-server (Hono/TypeScript)，IM 核心业务
- `/v1/agents/*` — agent-server (Hono/TypeScript)，Agent CRUD + 生命周期
- `/v1/containers/*` — container-server (Hono/TypeScript)，Docker 容器管理
- `/v1/openclaw/*` — openclaw-server (Hono/TypeScript)，OpenClaw 实例编排
- `/v1/mcp/*` — mcp-server (FastAPI/Python)，MCP 服务

## 文档导航

产品设计文档位于 `docs/`（注意：部分文档可能与实际实现有偏差，以代码为准）：

| 文件 | 内容 |
|------|------|
| 01-product-overview.md | 产品概述、愿景 |
| 02-account-system.md | 账号体系设计 |
| 03-feature-design.md | 功能设计 |
| 04-architecture.md | 系统架构 |
| 05-database-schema.md | 数据库表设计 |
| 06-relay-protocol.md | Relay WebSocket 协议 |
| 07-rest-api.md | REST API 规范 |
| 08-offline-sync.md | 离线同步 |
| 09-infrastructure.md | 基础设施与部署 |
| 10-openclaw-plugin.md | OpenClaw Channel 插件 |
| 11-agent-hosting.md | Agent 容器托管 |
| 12-business-model.md | 商业模式 |
| 13-launch-strategy.md | 上线策略 |
| 14-blockchain.md | 区块链相关 |
| 15-error-handling.md | 错误处理 |

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
