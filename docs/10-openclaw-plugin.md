# OpenClaw Channel 插件

## 1. 插件职责

| 职责 | 说明 |
|------|------|
| 连接 Relay | 启动时主动连接，断线自动重连（指数退避） |
| 收消息 | Relay 转来的用户消息 → dispatch 给 Agent 处理 |
| 发消息 | Agent 回复 → 转发给 Relay → 推送到用户 App |
| 透传心跳 | OpenClaw 内置心跳事件 → 透传给 Relay |
| 已读回执 | 收到消息后发送 message.read 回执 |

## 2. 用户配置（openclaw.json）

```json
{
  "channels": {
    "clawchat": {
      "accounts": {
        "default": {
          "relayUrl": "wss://relay.clawchat.com",
          "roomId": "user-abc-123",
          "token": "jwt-token",
          "enabled": true
        }
      }
    }
  }
}
```

## 3. 安装方式（用户自部署）

```bash
openclaw plugins install @clawchat/openclaw-channel
```
