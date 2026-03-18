---
name: self-improve
description: 自我更新 — 定期审视架构、清理废弃、优化流程
user-invocable: true
---

# 自我更新

定期审视系统架构，自动执行清理和优化。

## 用法

- `/self-improve` — 手动触发一次自我更新
- 心跳中每 30 轮（约 1 小时）自动触发

## 执行

### Step 1: 审视

检查以下项目：
- 有没有 0 交易的策略？→ 调参或替换
- 有没有价格跑出区间的策略？→ 调整区间
- 有没有废弃/重复的 skill？→ 删除
- 有没有未提交的代码改动？→ commit
- strategies.json 是否健康？→ 备份
- 团队成员是否都在响应？→ 不响应的重启

### Step 2: 优化

按 `kpi/PLAN-architecture-cleanup.md` 中的待办项逐个执行：
- 每次只做 1-2 个小改动，不大改
- 改完立即 commit + 发迭代报告

### Step 3: 更新提示词

如果流程有变化，同步更新相关 skill 的 SKILL.md：
- `/heartbeat` 的工作流
- `/create-team` 的团队列表
- `CLAUDE.md` 的架构文档
- `kpi/` 目录下的 KPI 和计划文档

### Step 4: 记录

写入 `notes/YYYY-MM-DD-self-improve.md`：
- 做了什么优化
- 为什么做
- 效果如何
