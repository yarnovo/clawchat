---
name: team
description: 启动完整运营团队 — 交易总监心跳驱动 4 人协作（策略+交易+风控+技术）
user-invocable: true
---

# 启动运营团队

`/team` 创建 4 人团队，交易总监（team-lead）以 1 分钟心跳驱动全员工作。

## 团队架构

```
           ┌─────────────┐
           │  交易总监     │
           │ (team-lead)  │
           │  心跳驱动     │
           └──────┬──────┘
      ┌───────┬───┴───┬────────┐
      ▼       ▼       ▼        ▼
 strategist  risk   trader  engineer
  策略研发   风控审核  交易执行  系统保障
```

## 上下游关系

```
strategist ──策略文件──→ risk ──批准──→ trader ──交易结果──→ strategist（闭环）
engineer = 基础设施层，支撑以上三个角色
```

| 角色 | 上游 | 下游 |
|------|------|------|
| **strategist** | trader 交易结果（复盘） | risk（策略待审核） |
| **risk** | strategist（策略）、trader（持仓） | trader（批准执行） |
| **trader** | risk 批准的策略 | strategist（结果反馈） |
| **engineer** | 无 | 全员（系统支撑） |

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat-ops")
```

用 Agent 工具并行创建 4 个成员（bypassPermissions, run_in_background）：

| 成员 | 初始任务 |
|------|----------|
| **strategist** | 读取 `strategies/approved/` 已有策略，`make scan` 扫描市场，回测搜索新策略 |
| **trader** | `make account` 查余额，`make pnl` 查盈亏，检查持仓 |
| **risk** | `make check` 风控检查，确认止损规则，检查仓位风险 |
| **engineer** | `make build` 编译引擎，检查连接状态，确认监控正常 |

### Step 2: 等待初始化完成

等 4 人全部汇报初始状态。

### Step 3: 启动心跳循环

```
/loop 1m 心跳循环
```

## 心跳工作流（每轮 1 分钟）

交易总监每轮执行以下流程：

### 1. 收集状态

```bash
cd /Users/yarnb/agent-projects/clawchat
make account    # 余额
make pnl        # P&L
make check      # 风控
```

### 2. 判断阶段 & 下发指令

根据当前状态决定给谁派活：

**阶段 A：无策略**
- → strategist：扫描 + 回测，产出策略
- → 其他人：待命

**阶段 B：有策略未执行**
- → risk：审核策略（回撤/杠杆/仓位是否合规）
- → trader：等 risk 批准后执行 dry-run → 实盘

**阶段 C：运行中**
- → risk：检查持仓风控，止损告警
- → trader：汇报持仓状态、盈亏
- → strategist：持续优化，寻找更优策略
- → engineer：系统监控

### 3. 事件处理

| 事件 | 处理 |
|------|------|
| 止损触发 | risk 通知 trader 平仓 + 通知 CEO |
| 新策略通过 | strategist 通知 risk 审核 |
| 策略批准 | risk 通知 trader 执行 |
| 系统故障 | engineer 通知全团队 |

### 4. 报告

- 每 10 轮：发运营快报（`make notify`）
- 每 60 轮：发详细报告 + 复盘
- 事件（止损/开仓/平仓）：实时通知

报告存档到 `reports/`。

## 沟通规则

- team-lead 通过 `SendMessage` 给成员下发指令
- 成员完成任务后汇报给 team-lead，**等待下一轮心跳指令**
- 成员之间不直接通信，一切经过 team-lead 调度
- 重要事件通过 `make notify` 邮件通知 CEO
