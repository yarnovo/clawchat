# Relay 消息协议

## 1. 架构说明

Relay 是纯消息转发服务，不存储任何数据。

```
Chat App  ──WebSocket──→  Relay  ──→  OpenClaw 插件 / 实例
                          ↕
              消息配对 + 转发 + 在线状态管理
```

## 2. 连接生命周期

1. Client 建立 WebSocket 连接
2. 发送 auth 消息（携带 JWT token）
3. Relay 验证 JWT → 返回 auth.ok
4. 正常收发消息
5. 断线 → 自动重连 → 重新 auth

## 3. 消息类型总览

| type | 方向 | 说明 |
|------|------|------|
| auth | Client → Relay | 连接后鉴权 |
| auth.ok | Relay → Client | 鉴权成功 |
| auth.fail | Relay → Client | 鉴权失败 |
| message.send | Client → Relay | 发送消息 |
| message.new | Relay → Client | 收到新消息 |
| message.delivered | Relay → Client | 消息已送达 |
| message.deleted | Relay → Client | 消息已撤回 |
| message.read | Relay → Client | Agent 已读回执 |
| typing.start | Client → Relay | 开始输入 |
| typing.stop | Client → Relay | 停止输入 |
| typing | Relay → Client | 对方正在输入 |
| agent.thinking | Relay → Client | Agent 思考中 |
| agent.done | Relay → Client | Agent 回复完成 |
| presence.online | Relay → Client | 好友上线 |
| presence.offline | Relay → Client | 好友离线 |
| heartbeat | Agent → Relay | OpenClaw 心跳透传 |

## 4. 消息示例

**发送消息：**
```json
{
  "type": "message.send",
  "conversationId": "uuid",
  "conversationType": "dm",
  "content": "帮我查一下明天的天气",
  "messageType": "text",
  "mentions": []
}
```

**群聊 @Agent：**
```json
{
  "type": "message.send",
  "conversationId": "uuid",
  "conversationType": "group",
  "content": "@研究员 帮我分析这份报告",
  "messageType": "text",
  "mentions": ["agent-uuid"]
}
```
