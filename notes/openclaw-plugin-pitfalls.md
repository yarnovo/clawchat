# OpenClaw Channel Plugin 踩坑记录

## 1. 插件加载条件

**问题**: 插件代码放入 `extensions/clawchat/` 后容器内无任何加载日志。

**原因**: OpenClaw 要求 openclaw.json 配置中**同时**启用两项：
```json
{
  "channels": { "clawchat": { "enabled": true } },
  "plugins": { "enabled": true }
}
```
缺少任一项，插件都不会被加载。

**修复**: 在 `openclaw-server/src/instance.ts` 的 `buildConfig()` 中添加这两个配置。

---

## 2. 插件 manifest 必须包含 configSchema

**问题**: 容器报错 `plugin manifest requires configSchema`。

**原因**: `openclaw.plugin.json` 初始版本缺少 `configSchema` 字段。

**修复**:
```json
{
  "id": "clawchat",
  "channels": ["clawchat"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

---

## 3. agents.defaults 不支持 systemPrompt

**问题**: 容器报错 `Unrecognized key: "systemPrompt"` under `agents.defaults`。

**原因**: OpenClaw 的 config schema 校验不允许在 `agents.defaults` 下放自定义字段。

**修复**: 改为通过环境变量 `CLAWCHAT_SYSTEM_PROMPT` 注入，在 channel plugin 内部通过 `GroupSystemPrompt` 传入 context payload。

---

## 4. formatAllowFrom 必须返回字符串数组

**问题**: 消息到达容器后报错 `entry.trim is not a function` in `resolveCommandAuthorization`。

**原因**: `formatAllowFrom` 返回了 `[{ raw: "*", normalized: "*" }]`（对象数组），但框架内部在做 `entry.trim()` 调用，期望是字符串数组。

**修复**:
```typescript
// 错误
formatAllowFrom: () => [{ raw: "*", normalized: "*" }],
// 正确
formatAllowFrom: ({ allowFrom }: { allowFrom: string[] }) => allowFrom,
```

**定位方法**: `docker exec` 进容器查看编译后代码 `sed -n '107065,107100p' /app/dist/auth-profiles-*.js`，找到 `formatAllowFromList` 函数确认返回值直接被用于 `.trim()` 调用。

---

## 5. 宿主机无法通过 Docker 内部网络名访问容器

**问题**: openclaw-server 在宿主机运行，`instance.chat()` 使用 `http://openclaw-${agentId}:18790/webhook/message` 报 `fetch failed`。

**原因**: Docker 内部 DNS 名（容器名）只能在同一 Docker 网络内解析。宿主机上的进程无法解析 `openclaw-xxx` 这个主机名。

**修复**: 通过 container-server API 查询容器的端口映射，使用 `http://127.0.0.1:${hostPort}` 访问：
```typescript
const info = await containerClient.getContainer(name);
const hostPort = info?.ports?.find((p) => p.container === WEBHOOK_PORT)?.host;
const webhookUrl = hostPort
  ? `http://127.0.0.1:${hostPort}/webhook/message`
  : `http://${name}:${WEBHOOK_PORT}/webhook/message`;
```

**注意**: 线上部署时 openclaw-server 在 Docker 内部运行，可以直接用容器名。本地开发才需要 fallback 到映射端口。

---

## 6. Dockerfile 分层策略

**问题**: 初始方案从源码全量构建 OpenClaw 镜像，构建时间很长。

**修复**: 使用分层构建，`openclaw:local` 作为基础镜像（预构建好），只在上层添加 clawchat 扩展：
```dockerfile
FROM openclaw:local
COPY openclaw/extensions/clawchat/ /app/extensions/clawchat/
```
这样每次修改插件代码只需重新构建很薄的一层。

---

## 7. Gateway WebSocket vs Channel Plugin

**问题**: 最初尝试通过 Gateway WebSocket 对接 OpenClaw，但协议不兼容（Gateway 期望 JSON-RPC，有认证握手和 session 管理）。

**修复**: 改用 Channel Plugin 架构 — 写一个 OpenClaw extension，实现 `ChannelPlugin` 接口，通过 HTTP webhook 接收消息，通过 HTTP callback 回复。这是 OpenClaw 官方推荐的第三方集成方式。

---

## 完整消息流

```
用户 → im-server (存消息)
         ↓ (检测对方是 agent)
    agent-server (查 agent 配置)
         ↓
    openclaw-server (查容器端口映射)
         ↓ POST /webhook/message
    Docker 容器 (clawchat plugin → AI 模型)
         ↓ POST /v1/im/internal/agent-reply (callback)
    im-server (存 agent 回复)
```
