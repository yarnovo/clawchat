---
name: team
description: 启动运营 — 3 人团队，Rust 引擎自动交易 + 风控守护，心跳驱动
user-invocable: true
---

# 启动运营团队

`/team` 创建 3 人团队，交易总监（team-lead）心跳驱动。代码自动交易和止损，人负责研究和实现。

## 核心闭环

```
strategist 发现策略（Python 回测）
       ↓
engineer 实现策略（Rust 代码）
       ↓
Rust 引擎自动交易
       ↓
risk 定义风控规则 → engineer 实现守护代码
       ↓
risk_guard.py 自动止损
```

## 架构

```
         ┌─────────────┐
         │  交易总监     │
         │ (team-lead)  │
         │ 心跳+交易员   │
         └──────┬──────┘
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 strategist    risk     engineer
  策略研发     风控规则   代码实现
     │          │          │
     │  Python  │  规则    │  Rust/Python
     │  回测    │  定义    │  实现
     ▼          ▼          ▼
 strategies/  check.py  engine/
 approved/    风控守护   strategy.rs
```

> **team-lead = 交易总监 + 交易员**：启停引擎、划转资金、收集状态、协调团队、汇报 CEO。

## 成员职责

| 成员 | 产出 | 消费者 |
|------|------|--------|
| **strategist** | 策略参数（Python 回测验证） | engineer 实现到 Rust |
| **risk** | 风控规则（止损阈值等） | engineer 实现到守护代码 |
| **engineer** | Rust 策略代码 + 风控守护代码 | 引擎/守护进程自动执行 |

## 引擎支持的策略

```bash
# Rust 引擎 (engine/target/release/hft-engine)
--strategy mm          # MarketMaker 做市
--strategy default     # TrendFollower EMA 交叉
--strategy scalping    # EMA + RSI + 放量
--strategy breakout    # N 周期高低点突破
--strategy rsi         # RSI 超买超卖
--strategy bollinger   # 布林带均值回归
```

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
2. team-lead 启动 Rust 引擎（nohup 后台运行）
3. 引擎自动交易

```bash
# 启动引擎示例
source .env && nohup engine/target/release/hft-engine \
  --symbol PIPPINUSDT --strategy scalping --leverage 5 \
  > /tmp/rust-pippin.log 2>&1 &
```

### Step 3: 启动风控守护

```bash
make guard   # 后台运行，每 30 秒自动风控检查 + 止损 + 记录权益曲线
```

风控守护进程（risk_guard.py）：
- 每 30 秒运行风控检查
- 触发止损 → 自动平仓 + 邮件通知
- 记录权益曲线到 `reports/equity.csv`

### Step 4: 启动心跳循环

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
- 有策略未实现 → engineer 在 Rust 实现
- 有策略无引擎 → team-lead 启动引擎
- 引擎运行中 → risk 监控，strategist 继续优化
- 新策略发现 → engineer 实现 → 重新编译 → team-lead 重启引擎

### 3. 事件处理

| 事件 | 处理 |
|------|------|
| 新策略产出 | strategist → engineer Rust 实现 → team-lead 启动引擎 |
| 止损触发 | 风控守护自动平仓 + 邮件通知 |
| 系统故障 | engineer 排查 + 重启 |

### 4. 报告

- 每 10 轮：运营快报（`make notify`）
- 事件（止损/开仓/平仓）：实时通知
- 报告存档到 `reports/`

## 沟通规则

- team-lead 通过 `SendMessage` 给成员下发指令
- 成员完成任务后汇报给 team-lead，**等待下一轮心跳指令**
- 重要事件通过 `make notify` 邮件通知 CEO
