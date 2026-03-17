---
priority: P1
status: pending
tags: [agentkit, security]
worktree:
---
# 在 Agent 内核添加危险命令基础防护

当前只有 onBeforeBash hook 但无默认防护，未配置 pre-tool hook 的 Agent 完全裸奔。应在内核加一层最小安全网（rm -rf /、mkfs、fork bomb 等），不依赖 Extension。

> Anchor: `agentkit/core/src/agent.ts:120` — bash 执行前加 BLOCKED_COMMANDS 检查
