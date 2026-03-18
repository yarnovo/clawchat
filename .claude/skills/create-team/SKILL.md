---
name: create-team
description: 创建量化基金团队 — 招聘团队成员
user-invocable: true
---

# 创建团队

创建量化基金团队，招聘所有成员。团队创建后用 `/heartbeat` 激活公司。

## 用法

- `/create-team` — 创建团队 + 招聘成员
- `/heartbeat` — 激活公司（启动所有定时任务）

## 执行

### 1. 创建团队 + 启动策略

```
TeamCreate(team_name="clawchat-fund")
make start
```

### 2. 招聘成员

| 成员 | 角色 | 职责 |
|------|------|------|
| desk | 交易台 | 资金划转、预算分配 |
| analyst | 分析师 | make scan 选币、市场分析 |
| trader-btc | 交易员1 | btcgrid 子账户策略管理 |
| trader-eth | 交易员2 | ethgrid 子账户策略管理 |
| risk | 风控 | make check 风控检查、异常预警 |

团队成员可动态增减。

### 3. 激活公司

创建完团队后，执行 `/heartbeat` 启动心跳，激活所有定时任务。
