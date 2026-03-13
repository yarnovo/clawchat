# ClawChat 项目规则

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

- 每次新增功能必须同步编写测试（单元测试 + Widget/API 测试）
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

产品设计文档位于 `/Users/yarnb/clawchat/docs/`：

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
