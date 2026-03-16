# 消息协议

> 注意：原 Relay WebSocket 独立服务已废弃。当前消息通过 HTTP 代理 + SSE 实现。

## 当前架构

```
React SPA ── POST /api/agents/:id/messages ──→ server ──→ Agent 容器 /api/chat
React SPA ── GET  /api/agents/:id/messages/stream ──→ server ──→ Agent 容器 /api/events (SSE)
```

## 消息流

1. **发送消息**：前端 POST 到 server，server 代理到 Agent 容器的 `/api/chat`
2. **接收回复**：前端通过 SSE 连接 server，server 代理 Agent 容器的 `/api/events` 事件流
3. **会话管理**：`currentSessionId` 存在 agents 表，POST `/sessions/new` 递增

## 未来规划

- WebSocket 实时双向通信（typing 状态、在线状态）
- 群聊消息路由
