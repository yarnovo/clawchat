---
priority: P1
status: pending
tags: [agentkit, context]
worktree:
---
# 实现三层上下文压缩机制

Agent 长对话会撑爆上下文窗口。learn-claude-code s06 的三层压缩策略：Layer 1 静默替换旧 tool_result → Layer 2 自动 LLM 摘要 → Layer 3 Agent 主动触发。对于常驻 Agent（Scheduler Channel 持续运行）尤其关键。

> Anchor: `agentkit/core/src/agent.ts` — run() 循环中需要在每轮 LLM 调用前检查 token 用量
