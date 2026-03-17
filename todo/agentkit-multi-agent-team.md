---
priority: P3
status: pending
tags: [agentkit, team]
worktree:
---
# 实现多 Agent 团队协作机制

当前每个 Agent 是独立容器，无法互相通信。learn-claude-code s09-s11 展示了完整的团队模式：JSONL 邮箱通信、shutdown/plan-approval 协议、自治认领任务。ClawChat 场景下可以基于 HTTP Channel 实现跨容器消息传递，或引入共享消息总线。

> Anchor: `server/src/routes/messages.ts` — 当前消息路由只支持用户↔Agent，需要扩展 Agent↔Agent
