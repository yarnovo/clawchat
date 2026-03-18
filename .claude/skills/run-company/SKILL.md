---
name: run-company
description: 启动量化交易公司 — 创建 Team 自动管理投资组合
user-invocable: true
---

# 启动量化交易公司

用户执行 `/run-company` 后，一键启动整个量化基金运营。

## 团队架构

```
CEO (main / team-lead)
├── 维护 skills/scripts、KPI 管理、审批决策
│
├── desk (交易台) — 资金管理
│   ├── 管理主账户和子账户的资金划转
│   ├── 分配预算给 trader
│   ├── 确保实盘下单前有足够余额
│   └── 用 /transfer 技能操作
│
├── analyst — 市场分析
│   ├── make scan 选币
│   ├── 推荐策略给 trader
│   └── 发送市场分析报告
│
├── trader-btc — 交易员1（btcgrid 子账户 100U）
│   ├── 管理分配的策略
│   ├── make status 检查
│   └── 发送策略运行报告
│
├── trader-eth — 交易员2（ethgrid 子账户 100U）
│   ├── 管理分配的策略
│   ├── make status 检查
│   └── 发送策略运行报告
│
└── risk — 风控
    ├── make account + make check 风控检查
    ├── 发送运营快报邮件（每 10 分钟）
    └── 发送风控预警
```

## 启动流程

### 1. 创建团队 + 启动策略

```
TeamCreate(team_name="clawchat-fund")
make start
```

### 2. 招聘团队成员

spawn 以下 teammates：
- **desk** — 交易台，负责资金划转和预算分配
- **analyst** — 分析师，负责选币和市场分析
- **trader-btc** — 交易员1，btcgrid 子账户（100U）
- **trader-eth** — 交易员2，ethgrid 子账户（100U）
- **risk** — 风控，负责监控和报告

团队成员可动态增减，需要时招聘新成员。

### 3. 分配任务与报告责任

| 成员 | 职责 | 负责的报告 |
|------|------|-----------|
| CEO（main） | KPI 管理、审批、维护代码 | KPI 推进报告（心跳输出） |
| desk | 资金划转、预算分配 | 资金报告（按需） |
| analyst | make scan 选币、推荐策略 | 市场分析报告（心跳驱动） |
| trader-btc | btcgrid 策略管理 | 策略运行报告（心跳驱动） |
| trader-eth | ethgrid 策略管理 | 策略运行报告（心跳驱动） |
| risk | make check 风控 | 运营快报邮件（每 10 分钟） |

### 4. 设置定时任务

调用以下技能启动定时任务：

**核心引擎：**
1. `/heartbeat` — 每 1 分钟 KPI 心跳（promote + 止损 + 驱动团队 + 选币 + 推进报告）

**团队报告（CEO 驱动收集 → 汇总发邮件）：**
2. `/report-risk` — 每 10 分钟，问 risk → 风控报告邮件
3. `/report-strategy` — 每 30 分钟，问 trader-btc/trader-eth → 策略报告邮件
4. `/report-fund` — 每 30 分钟，问 desk → 资金报告邮件
5. `/report-market` — 每小时，问 analyst → 市场分析报告邮件

**CEO 自有报告：**
6. `/dev-report` — 每 30 分钟自动 commit + 迭代报告邮件
7. `/retro` — 每小时团队经验复盘（收集 → 记录 notes/ → 消化方案）
8. `/ops-daily` — 每日 20:00 运营日报（汇总全员 → 完整日报邮件）

### 5. 策略上线流程

```
dryrun（主网行情模拟）→ 利润达标 → desk 确认资金 → 自动 promote → 实盘
```

- 动态 promote 阈值：amount * 2% + 至少 5 笔交易
- promote 前 desk 检查子账户余额是否充足
- 单笔金额必须 >= $5（币安 NOTIONAL 最低限制）
- make promote / make demote 手动切换

### 6. 三层止损

- **策略级**：亏损 > amount*10% → 自动 demote
- **标的级**：价格跌出网格下限 5% → 预警
- **全局级**：总浮亏 > $20（总资金 10%）→ 全部停机

### 7. KPI

用 `/kpi` 管理目标，心跳自动检查进度。运营快报包含 KPI 完成进度。

## 维护规则

- **/run-company 是唯一入口**：新会话只需执行这一个命令
- **及时更新此 skill**：每次流程变更必须同步更新这个文件
- **提交自己做**：有改动就 commit，不用问用户
- **迭代报告 = commit + 邮件**
- **报告存本地**：data/reports/YYYY-MM-DD/HH-MM-SS.md
- **团队可动态增减**：需要新角色就招聘，不需要就关闭
