---
priority: P1
status: pending
tags: [agentkit, subagent]
worktree:
---
# 实现子 Agent 派生能力

当前 Agent 无法将子任务委托给独立上下文的子 Agent。learn-claude-code s04 的模式：子 Agent 用全新 messages[]，跑完只返回摘要文本，避免中间结果污染主对话。agentkit 可以作为内置工具 `task` 实现，复用同一个 LLM provider 但隔离上下文。

> Anchor: `agentkit/core/src/agent.ts` — Agent 类需要支持 spawn 子实例
