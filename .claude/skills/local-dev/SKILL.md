---
name: local-dev
description: 本地开发流程调试。当需要启动、重启、调试本地开发环境时调用，包含服务启动顺序、端口映射、常见故障排查。
allowed-tools: Bash, Read, Glob, Grep
---

ClawChat 本地开发环境调试技能——全 Docker 化开发，源码挂载 + 热重载。

## 核心命令

```bash
make dev          # 一键启动所有服务（Docker build + up）
make dev-stop     # 停止所有服务
make reload       # 重构建前端 + 重启 nginx
make logs         # 查看所有服务日志
make logs-im      # 查看 im-server 日志
make restart-im   # 重启 im-server
```

## 架构

所有服务都跑在 Docker 容器里，源码通过 volume 挂载实现热重载。

```
docker compose up -d
  ├── postgres (5432)
  ├── redis (6379)
  ├── im-server (3000)        ← ./im-server/src 挂载, tsx watch
  ├── agent-server (3004)     ← ./agent-server/src 挂载, tsx watch
  ├── container-server (3002) ← ./container-server/src 挂载, tsx watch + docker.sock
  ├── openclaw-server (3003)  ← ./openclaw-server/src 挂载, tsx watch
  ├── mcp-server (8000)       ← ./mcp-server/app 挂载, uvicorn --reload
  └── nginx (8080)            ← Flutter web 静态文件 + API 反代
```

## 服务间通信

全部使用 Docker 网络服务名（不再用 host.docker.internal）：
- nginx → `http://im-server:3000`
- agent-server → `http://im-server:3000`, `http://openclaw-server:3003`
- openclaw-server → `http://container-server:3002`
- openclaw 容器 callback → `http://im-server:3000/v1/im/internal/agent-reply`

## 开发工作流

### 改后端代码
直接改 `src/` 目录下的文件，tsx watch 自动重启容器内进程。无需手动操作。

### 改前端代码
```bash
make reload   # flutter build web + docker compose restart nginx
```

### 改 package.json（加依赖）
```bash
docker compose up -d --build im-server   # 重新构建镜像
```

### 改 Prisma schema
```bash
make db-push   # 在容器内执行 prisma db push
```

## 常见故障排查

### 容器启动失败
```bash
docker compose logs im-server   # 查看具体错误
docker compose up -d --build im-server   # 重新构建
```

### Prisma 连接失败
- 容器内使用 `postgres:5432`（Docker 服务名），不是 `localhost`
- 确认 postgres 容器 healthy：`docker compose ps`

### WebSocket 不通
- nginx dev.conf 有 `/v1/im/ws` WebSocket 代理配置
- 确认 im-server 容器正常运行

### OpenClaw 容器通信失败
- 所有服务和 openclaw 容器都在 `clawchat_default` 网络
- webhook URL 使用容器名直接通信，不需要 host port mapping

## 线上部署 vs 本地开发

| | 本地 (docker-compose.yml) | 线上 (docker-compose.deploy.yml) |
|--|--|--|
| 镜像 | 本地 build | ACR 预构建 |
| 源码 | volume 挂载 | 打包进镜像 |
| 热重载 | tsx watch / uvicorn --reload | 无 |
| 启动 | `make dev` | `make deploy-up` |
