---
priority: P2
status: pending
tags: [agentkit, tool]
worktree:
---
# 添加 TodoWrite 内置工具让 Agent 自我追踪进度

Agent 执行多步任务时容易跑偏。learn-claude-code s03 的 TodoManager：Agent 维护一个待办列表，超过 3 轮未更新则注入提醒（nag）。作为内置工具比 Skill 更合适，因为它是通用的 harness 机制。

> Anchor: `agentkit/core/src/agent.ts` — 在 agent loop 中加入 rounds 计数 + nag 注入逻辑
