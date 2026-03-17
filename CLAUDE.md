# ClawChat — AI 影视工作室

## 默认行为

收到功能需求时，默认使用 **代理模式**（`.claude/skills/agent/SKILL.md`）：先澄清意图，再调研设计方案，派遣实现者写代码，最后 review。不要直接改代码。

## 项目定位

AI 影视内容订阅平台。用 AI 批量生产短剧/影视内容 → 用户订阅观看 → 持续收入。

- **内容生产**：Seed-2.0-pro（剧本）→ Seedream（分镜）→ Seedance（视频）
- **商业模式**：订阅制（参考 Netflix），¥9.9-29.9/月
- **飞轮**：内容 → 流量 → 订阅 → 收入 → 买 token → 更多内容
- **元技能**：`.claude/skills/claw-forge/` 是内容生产流水线
