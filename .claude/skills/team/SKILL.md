---
name: team
description: 启动运营 — 1 个团队 3 人（策略+风控+技术），Rust 引擎自动交易，心跳驱动
user-invocable: true
---

# 启动运营团队

`/team` 创建 1 个团队、3 个成员，交易总监以 1 分钟心跳驱动。Rust 引擎自动交易，无需交易员。

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
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 strategist    risk     engineer
  策略研发     风控监控   系统+引擎
     │                     │
     └── strategies/ ──→ Rust 引擎（自动交易）
```

> **引擎自动交易：** Rust HFT 引擎接收行情 → 计算信号 → 自动下单，无需人工干预。

## 成员

| 成员 | 职责 |
|------|------|
| **strategist** | 扫描市场、回测验证、优化参数、撰写策略文件 |
| **risk** | 实时风控、止损监控、仓位检查、审核策略合规 |
| **engineer** | 编译引擎、启停引擎、系统监控、故障排查 |

## 研发流程

1. `make scan` 扫描高波动币种
2. `make backtest` 批量回测（币种 × 策略 × 周期 × 杠杆）
3. 筛选：净利润 > 0、夏普 > 1、回撤 < 20%、交易 ≥ 3 笔
4. 通过的写入 `strategies/approved/{symbol}-{strategy}-{timeframe}.md`

### 策略文件格式

每个 approved 文件包含：
- 基本信息（交易对/策略/周期/杠杆）
- 信号模型（入场/出场条件）
- 参数设置
- 资金管理（仓位 ≤ 30%、止损规则）
- 回测结果

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat")
```

用 Agent 工具并行创建 3 个成员（bypassPermissions, run_in_background）：

- strategist → 检查已有策略 + 扫描市场
- risk → `make check` 风控检查
- engineer → `make build` 编译引擎 + 系统检查

### Step 2: 策略上报即启动引擎

strategist 上报策略后：
1. risk 快速审核（合规即放行）
2. engineer 启动 Rust 引擎：`make hft`（或 nohup 后台运行）
3. 引擎自动接收行情、计算信号、下单

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

- 无策略 → strategist 扫描 + 回测
- 有策略无引擎 → engineer 启动 Rust 引擎
- 引擎运行中 → risk 监控风控，strategist 寻找更优策略
- engineer 保障系统稳定

### 3. 事件处理

| 事件 | 处理 |
|------|------|
| 新策略产出 | strategist → `strategies/approved/` → engineer 启动引擎 |
| 止损触发 | risk 通知 engineer 停引擎 + 通知 CEO |
| 系统故障 | engineer 重启引擎 + 通知全团队 |

### 4. 报告

- 每 10 轮：运营快报（`make notify`）
- 事件（止损/开仓/平仓）：实时通知
- 报告存档到 `reports/`

## 沟通规则

- team-lead 通过 `SendMessage` 给成员下发指令
- 成员完成任务后汇报给 team-lead，**等待下一轮心跳指令**
- 重要事件通过 `make notify` 邮件通知 CEO
