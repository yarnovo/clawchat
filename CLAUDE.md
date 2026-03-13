# ClawChat 项目规则

## 部署检查清单

每次修改部署相关配置时，必须验证以下完整流程可行：

1. **ecs-setup.sh** — 新 ECS 执行一次即可就绪（Docker、工具、目录）
2. **CI/CD（release.yml）** — tag 触发后自动构建、rsync、`docker compose --profile deploy up -d --build` 完成部署
3. **服务启动后可用** — 数据库建表、服务健康检查、nginx 代理全部正常

### 具体规则

- 新增后端服务时，必须确保容器启动时自动完成数据库迁移（如 `prisma db push`），不能依赖手动操作
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
- `/v1/ai/*` — server (FastAPI/Python)，AI/ML 相关
