---
name: diagnose
description: Bug 诊断。当用户说"诊断一下"、"这有个 bug"、"帮我查这个问题"、"diagnose"、"排查一下"等时调用。通过主动复现和代码调研定位 bug，输出缺陷报告。
allowed-tools: Bash, Read, Glob, Grep, Agent, WebFetch
---

# ClawChat 系统诊断技能

你是 ClawChat 项目的运维诊断助手。你的目标是**主动发现问题、定位根因、提出修复方案**。

## 诊断流程

### Step 1: 跑诊断脚本获取全景

```bash
make diagnose 2>/dev/null
```

这会输出 JSON 报告，包含：
- `health` — 5 个服务的健康检查（DB/Redis/Docker 依赖状态）
- `redis` — 队列深度 + DLQ 消息内容
- `prometheus` — 错误率、请求率、WebSocket 连接数
- `loki_recent_errors` — 最近 15 分钟的错误日志
- `summary` — 自动判定 healthy / issues_found + 问题列表

### Step 2: 分析报告，按优先级处理

**P0 — 服务不可用：**
- `health` 中有 `degraded` 或 `unreachable` → 查容器日志 `docker compose logs <service> --tail 50`
- DB/Redis 依赖 error → 检查基础设施容器 `docker compose ps`

**P1 — 数据丢失风险：**
- `redis.dlq_depth > 0` → Agent 回复消息处理失败，查 `dlq_messages` 内容定位原因
- 常见根因：conversation 被删除、Prisma 写入失败、WebSocket 推送异常

**P2 — 性能/异常：**
- `prometheus.error_rate_5m` 非空 → 有 5xx 错误，用 Loki 查具体路由
- `ws_connections` 异常（0 或过高）→ WebSocket 连接泄漏或服务重启

**P3 — 基础设施噪音（通常可忽略）：**
- Grafana 的 `plugin provisioning` 错误 → Grafana 内部，不影响业务
- Loki 的 `empty ring` → Loki 启动过程中的瞬时错误

### Step 3: 深入排查

当诊断脚本发现问题后，按需使用以下手段深挖：

**按 requestId 追踪跨服务调用链：**
```bash
curl -s 'http://localhost:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service=~".+"} |~ "TARGET_REQUEST_ID"' \
  --data-urlencode 'start=START_TIMESTAMP' \
  --data-urlencode 'end=END_TIMESTAMP' \
  --data-urlencode 'limit=50'
```

**查特定服务最近错误：**
```bash
curl -s 'http://localhost:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="im-server"} | json | level = `50`' \
  --data-urlencode 'limit=20' \
  --data-urlencode 'start=EPOCH_NS' --data-urlencode 'end=EPOCH_NS'
```

**查 Prometheus 指标趋势：**
```bash
# 过去 1 小时的 5xx 错误率
curl -s 'http://localhost:9090/api/v1/query_range' \
  --data-urlencode 'query=sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))' \
  --data-urlencode 'start=1h' --data-urlencode 'step=60s'
```

**查 DLQ 消息详情：**
```bash
docker exec clawchat-redis redis-cli LRANGE clawchat:agent-reply:dlq 0 -1
```

**查容器日志：**
```bash
docker compose logs im-server --tail 100 --no-log-prefix
```

### Step 4: 代码调研定位根因

根据错误日志中的信息，在代码中定位问题：
- 错误消息 → Grep 搜索代码中的对应字符串
- 涉及文件 → Read 查看上下文
- 调用链 → 按 im-server → agent-server → openclaw-server → container-server 追踪

### Step 5: 输出诊断报告

以结构化格式输出：

```
## 诊断结果

**状态**: healthy / issues_found
**时间**: YYYY-MM-DD HH:MM

### 发现的问题

1. **[P0/P1/P2] 问题标题**
   - 现象: 具体错误
   - 根因: 代码/配置/基础设施原因
   - 影响: 对用户的影响
   - 建议: 修复方案

### 系统概况
- 服务健康: X/5 正常
- 错误率: X req/s
- DLQ: X 条
- WebSocket: X 连接
```

## 关键知识

### 服务架构
- im-server (3000): IM 核心，WebSocket，Redis 队列
- agent-server (3004): Agent CRUD，Saga 模式
- openclaw-server (3003): 容器编排
- container-server (3002): Docker 管理
- mcp-server (8000): MCP 工具

### 数据流（消息发送给 Agent）
```
用户 → im-server → agent-server → openclaw-server → openclaw 容器
                                                          ↓ callback
用户 ← WebSocket ← im-server ← Redis queue ← agent-reply-worker
```

### 常见故障模式
| 现象 | 可能原因 |
|------|---------|
| DLQ 堆积 | conversation 已删除、DB 写入失败 |
| Agent 无回复 | 容器未运行、webhook URL 不通 |
| WebSocket 断连 | im-server 重启、nginx 超时 |
| Saga 失败 | im-server 不可达、Docker 镜像缺失 |
| 5xx 激增 | DB 连接池满、Redis 超时 |
