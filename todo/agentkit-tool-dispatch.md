---
priority: P1
status: pending
tags: [agentkit, tool]
worktree:
---
# 给 agentkit Agent 添加通用 Tool 注册机制

当前 Agent 内核只有内置 bash 工具，无法扩展。learn-claude-code s02 展示了 dispatch map 模式：Tool 定义与 handler 分离，新工具只需注册进 map，循环不用改。agentkit 需要同样的可扩展 Tool 系统（read/write/edit/glob/grep 等内置工具 + Extension 可注册自定义工具）。

> Anchor: `agentkit/core/src/agent.ts` — 当前 bash 工具硬编码在 Agent 类中
