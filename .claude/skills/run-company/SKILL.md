---
name: run-company
description: 启动量化交易公司 — 创建 Team 自动管理投资组合
user-invocable: true
---

# 启动量化交易公司

用户执行 `/run-company` 后，一键启动整个量化基金运营。

## 团队

| 角色 | 名称 | 职责 |
|------|------|------|
| CEO | main（team-lead） | 维护 skills/scripts、审批决策、发报告 |
| 分析师 | analyst | make scan 扫描选币、推荐策略 |
| 交易员 | trader | make status 管理策略、评估调整 |
| 风控 | risk | make account 监控风险、make report-brief 发报告 |

## 启动流程

### 1. 创建团队 + 启动策略

```
TeamCreate(team_name="clawchat-fund")
make start
```

### 2. 分配任务与报告责任

| 成员 | 职责 | 负责的报告 |
|------|------|-----------|
| **CEO（main）** | 维护 skills/scripts、KPI 推进 | KPI 推进报告（心跳输出） |
| **analyst** | make scan 选币 → 推荐 trader | 市场分析报告（按需） |
| **trader** | make status 检查 → 评估调整 | 策略运行报告（按需） |
| **risk** | make account + make check 风控 | 运营快报邮件（每 10 分钟） |

### 3. 设置定时任务

调用以下技能启动定时任务：

1. `/heartbeat` — 每 1 分钟 KPI 心跳（promote + 止损 + 选币 + 驱动团队 + 推进报告）
2. `/ops-brief` — 每 10 分钟运营快报邮件（由 risk 发送）
3. `/dev-report` — 每 30 分钟自动 commit + 迭代报告邮件
4. `/ops-daily` — 每日 20:00 运营日报邮件
```

### 4. 报告体系

| 报告 | 频率 | 命令 | 内容 |
|------|------|------|------|
| 运营快报 | 每 30 分钟 | make report-brief | 实盘 P&L + KPI 进度 + promote/风控 |
| 运营日报 | 每日 20:00 | make report-daily | 完整：P&L + 策略归因 + 持仓 + 风控 |
| 迭代报告 | 每次 commit | make report-dev | git log + skills/scripts 变更 |
| 风控预警 | 异常时 | 自动 | 止损触发 / promote 通知 |

所有报告同时发邮件 + 存本地 data/reports/。

### 5. 策略上线流程

```
dryrun（主网行情模拟）→ 利润达标 → 自动 promote → 实盘
```

- 动态 promote 阈值：amount * 2% + 至少 5 笔交易
- 达标自动 promote，无需用户审批
- make promote SYMBOL=xxx 手动 promote
- make demote SYMBOL=xxx 降回模拟

### 6. 三层止损

- **策略级**：亏损 > amount*10% → 自动 demote
- **标的级**：价格跌出网格下限 5% → 预警
- **全局级**：总浮亏 > $20（总资金 10%）→ 全部停机

### 7. 团队报告（每 30 分钟）

向 analyst/trader/risk 要工作报告，汇总后通知用户。

### 8. KPI

用 `/kpi` 管理目标，心跳自动检查进度。运营快报里包含 KPI 完成进度。

## 维护规则

- **/run-company 是唯一入口**：新会话只需执行这一个命令
- **及时更新此 skill**：每次流程变更必须同步更新这个文件
- **提交自己做**：有改动就 commit，不用问用户
- **迭代报告 = commit + 邮件**
- **报告存本地**：data/reports/YYYY-MM-DD/HH-MM-SS.md
