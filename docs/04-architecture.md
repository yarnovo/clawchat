# 技术架构

## 1. 整体架构

```
Flutter App (iOS / Android / Web / macOS / Windows / Linux)
       │
       ├── REST API (im-server)     ← 账号、好友、群组、消息记录
       └── WebSocket (relay)        ← 实时消息转发
                  │
                  ├── OpenClaw 插件 (用户自部署)
                  └── OpenClaw 实例 (你托管)
                             │
                        agent-manager
```

## 2. 技术栈

| 模块 | 技术 | 理由 |
|------|------|------|
| 客户端 | Flutter | 跨平台，iOS / Android / Web / macOS / Windows / Linux 一套代码 |
| 后端框架 | NestJS + Fastify 适配器 | 结构化 + 高性能 |
| ORM | Prisma 7 | 最佳 DX，TypeScript 原生 |
| 数据库 | PostgreSQL | 稳定可靠，关系型首选 |
| 缓存 | Redis | 在线状态、会话缓存 |
| 文件存储 | MinIO | 自托管 S3 兼容 |
| 身份验证 | JWT | 无状态，适合多服务 |
| 推送通知 | FCM + APNs | 覆盖 Android + iOS |
| 语言 | TypeScript | 全栈统一，类型安全 |

## 3. Docker Compose 服务

| 服务 | 职责 | 端口 |
|------|------|------|
| im-server | HTTP REST API | 3000 |
| relay | WebSocket 实时消息转发 | 3001 |
| agent-manager | OpenClaw 实例编排 | 3002 |
| postgres | 主数据库 | 5432 |
| redis | 缓存，在线状态 | 6379 |
| minio | 文件存储 | 9000 |

## 4. Monorepo 项目结构

```
clawchat/
  ├── apps/
  │     ├── im-server          NestJS + Fastify
  │     ├── relay              NestJS + ws
  │     ├── agent-manager      NestJS + Fastify
  │     └── app                Flutter (全端)
  ├── packages/
  │     ├── types              共享类型定义
  │     ├── prisma             共享数据库 Schema
  │     └── utils              共享工具函数
  └── docker-compose.yml
```
