---
priority: P0
status: pending
tags: [agentkit, bug]
worktree:
---
# 将 Agent bash 执行从 execSync 改为异步

execSync 阻塞整个 Node.js 事件循环，bash 运行期间 SSE 推不出去、定时事件进不来、abort() 无法响应。对于通过 HTTP 服务的容器化 Agent 是实际 bug。

> Anchor: `agentkit/core/src/agent.ts:140` — `execSync(command, ...)` 需改为 spawn/exec 异步版本
