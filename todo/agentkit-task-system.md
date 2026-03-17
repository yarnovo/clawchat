---
priority: P2
status: pending
tags: [agentkit, task]
worktree:
---
# 实现文件持久化的任务系统

TodoWrite 是会话内的进度追踪，任务系统是跨会话的持久化状态。learn-claude-code s07 的模式：每个任务一个 JSON 文件，支持 blockedBy/blocks 依赖图。任务状态独立于上下文压缩存活，是多 Agent 协作的基础。

> Anchor: `agentkit/core/src/` — 新建 task-manager.ts，任务文件存到 workspace/.tasks/
