---
name: team
description: 启动运营 — 1 个团队 2 个逻辑组（研发组+交易组），心跳驱动
user-invocable: true
---

# 启动运营团队

`/team` 创建 1 个团队、4 个成员、2 个逻辑组，交易总监以 1 分钟心跳驱动。

## 架构

```
            ┌─────────────┐
            │  交易总监     │
            │ (team-lead)  │
            │  心跳驱动     │
            └──────┬──────┘
                   │
         TeamCreate("clawchat")
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
   研发组                     交易组
  ┌───────────┐          ┌───────────┐
  │ strategist│          │  trader   │
  │ engineer  │          │  risk     │
  └───────────┘          └───────────┘
      │                         │
      └──── strategies/ ────────┘
              （交接点）
```

> **限制：** 一个 team-lead 只能管一个团队。4 人放在同一个团队下，按两个逻辑组运作。

## 研发组（strategist + engineer）

**目标：** 产出可执行的策略文件到 `strategies/approved/`

| 成员 | 职责 |
|------|------|
| **strategist** | 扫描市场、回测验证、优化参数、撰写策略文件 |
| **engineer** | 编译引擎、数据管道、回测环境保障 |

### 工作流

1. `make scan` 扫描高波动币种
2. `make backtest` 批量回测（币种 × 策略 × 周期 × 杠杆）
3. 筛选：净利润 > 0、夏普 > 1、回撤 < 20%、交易 ≥ 3 笔
4. 通过的写入 `strategies/approved/{symbol}-{strategy}-{timeframe}.md`
5. 未通过的写入 `strategies/rejected/`

### 策略文件格式

每个 approved 文件包含：
- 基本信息（交易对/策略/周期/杠杆）
- 信号模型（入场/出场条件）
- 参数设置
- 资金管理（仓位 ≤ 30%、止损规则）
- 回测结果
- 执行命令

## 交易组（trader + risk）

**目标：** 读取 `strategies/approved/` 策略，有信号直接实盘执行

| 成员 | 职责 |
|------|------|
| **trader** | 执行交易、管理仓位、盯盘 |
| **risk** | 实时风控、止损执行、仓位监控 |

### 工作流

1. 读取 `strategies/approved/` 策略文件
2. risk 快速审核（杠杆/仓位合规即放行）
3. **信号触发 → 直接实盘执行**，高频交易不等 dry-run
4. risk 实时监控持仓，触发止损立即平仓
5. 交易结果反馈给研发组（复盘优化）

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat")
```

用 Agent 工具并行创建 4 个成员（bypassPermissions, run_in_background）：

**研发组：**
- strategist → 检查已有策略 + 扫描市场
- engineer → 编译引擎 + 系统检查

**交易组：**
- trader → `make account` 查余额，`make pnl` 查盈亏
- risk → `make check` 风控检查

### Step 2: 策略上报即派发

不等所有人汇报完。**strategist 上报策略后，立即派 trader 执行。** 流程：
1. strategist 汇报已有/新策略 → team-lead 立即派 trader 实盘
2. risk 并行审核，有问题再叫停
3. 其余成员继续初始化

### Step 3: 启动心跳循环

```
/loop 1m 心跳循环
```

## 心跳工作流（每轮 1 分钟）

### 1. 收集状态

```bash
make account && make pnl && make check
```

### 2. 驱动团队

**驱动研发组：**
- 无策略 → strategist 扫描 + 回测
- 有策略运行中 → strategist 持续寻找更优策略
- engineer 保障系统

**驱动交易组：**
- `strategies/approved/` 有新策略 → risk 审核 → trader 执行
- 有持仓 → risk 监控风控，trader 汇报盈亏
- 信号触发 → trader 立即实盘

### 3. 事件处理

| 事件 | 处理 |
|------|------|
| 新策略产出 | 研发组 → `strategies/approved/` → 交易组读取 |
| 信号触发 | trader 直接实盘执行 |
| 止损触发 | risk 通知 trader 平仓 + 通知 CEO |
| 系统故障 | engineer 通知全团队 |

### 4. 报告

- 每 10 轮：运营快报（`make notify`）
- 事件（止损/开仓/平仓）：实时通知
- 报告存档到 `reports/`

## 沟通规则

- team-lead 通过 `SendMessage` 给成员下发指令
- 成员完成任务后汇报给 team-lead，**等待下一轮心跳指令**
- 两个组通过 `strategies/` 目录交接，不直接通信
- 重要事件通过 `make notify` 邮件通知 CEO
