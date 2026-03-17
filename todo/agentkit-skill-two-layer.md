---
priority: P2
status: pending
tags: [agentkit, skill]
worktree:
---
# Skill 加载改为两层：metadata in system prompt + body on-demand

当前把每个 Skill 的完整 SKILL.md 塞进 system prompt，Skill 数量增长后会膨胀。learn-claude-code s05 的模式：system prompt 只放 name+description，Agent 需要时通过工具按需加载完整内容。

> Anchor: `agentkit/extension-skills/src/index.ts:164` — systemPrompt() 方法全量拼接 skill.prompt
