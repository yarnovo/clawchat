---
priority: P3
status: pending
tags: [agentkit, isolation]
worktree:
---
# 实现 Worktree 隔离执行通道

Agent 在同一个 workspace 目录内并行操作文件会冲突。learn-claude-code s12 的模式：git worktree 创建隔离目录，任务绑定到 worktree，完成后合并/清理。对于 coding Agent 执行并行任务（多个 PR 同时进行）尤其有价值。

> Anchor: `server/src/orchestrator/workspace.ts` — 当前 workspace 管理可扩展 worktree 支持
