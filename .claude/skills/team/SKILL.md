---
name: team
description: 启动运营 — 3 人团队 + 全自动交易链路（策略发现→引擎→风控）
user-invocable: true
---

# 启动运营团队

`/team` 一键启动全自动量化交易系统：3 人团队 + 4 个守护进程。

## 全自动链路

```
strategist 回测发现策略 → strategies/{name}/strategy.json (status=approved)
                                    ↓ 自动
strategy_watcher 检测到 → 启动 Rust 引擎 (--config strategy.json)
                                    ↓ 自动
Rust HFT 引擎接收行情 → 计算信号 → 自动下单
                                    ↓ 自动
risk_guard 读 risk.json → 按策略独立止损止盈 → 控制台输出
```

## 架构

```
         ┌─────────────┐
         │  交易总监     │
         │ (team-lead)  │
         └──────┬──────┘
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 strategist    risk     engineer
  策略研发     风控规则   代码实现
```

> **team-lead = 交易总监 + 交易员**：启停守护进程、划转资金、`make status` 监控、协调团队。

## 成员

| 成员 | 产出 | 消费者 |
|------|------|--------|
| **strategist** | strategy.json + risk.json + backtest.md | watcher 自动启动引擎 |
| **risk** | 风控规则（risk.json） | risk_guard 自动执行 |
| **engineer** | Rust 策略代码 + Python 守护代码 | 引擎/守护进程 |

## 策略目录结构

```
strategies/
└── pippin-macd-5m/
    ├── strategy.json    ← 引擎读（engine_strategy/symbol/params/order_qty）
    ├── risk.json        ← 守护读（止损/止盈/仓位/回撤阈值）
    └── backtest.md      ← 回测报告（人看）
```

## 策略准入标准

全部满足才能 status=approved：
- 收益率 > 20%
- 夏普比率 > 5
- 最大回撤 < 15%
- 交易笔数 ≥ 8
- 胜率 > 50%
- 盈亏比 > 2

## 引擎支持的策略

```bash
hft-engine --config strategies/{name}/strategy.json
# engine_strategy: mm / default / scalping / breakout / rsi / bollinger / macd
```

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat")
```

用 Agent 工具并行创建 3 个成员（bypassPermissions, run_in_background）：

- **strategist** → 检查 strategies/ 已有策略 + `make scan` 扫描市场
- **risk** → `make check` 风控检查 + 确认 risk.json 就位
- **engineer** → `make build` 编译引擎 + 检查系统

### Step 2: 启动 4 个守护进程

```bash
# 1. 策略监听（自动上架/下架引擎）
nohup make watcher > /tmp/strategy-watcher.log 2>&1 &

# 2. 风控守护（每 30 秒检查，按策略独立止损止盈）
nohup make guard > /tmp/risk-guard.log 2>&1 &

# 3+4. 引擎由 watcher 自动启动（读 strategies/*/strategy.json status=approved）
```

watcher 会自动扫描 approved 策略并启动引擎，无需手动。

### Step 3: 确认资金

```bash
make account                          # 查余额
make transfer AMOUNT=197              # 现货→合约划转（如需）
```

### Step 4: 验证全局状态

```bash
make status   # 一屏看：引擎/账户/持仓/风控/watcher/策略
```

确认：
- 引擎 [RUNNING] 且匹配 approved 策略
- 风控守护 [RUNNING]
- watcher [RUNNING]
- 账户有余额

### Step 5: 启动心跳循环

```
/loop 1m 心跳：策略管理
```

## 心跳 — 交易总监的策略管理循环

心跳是 team-lead 的核心工作，每 1 分钟一轮。本质是**读数据、判断、做决策**。

### 每轮做什么

```
1. make status — 全局状态
2. 评估策略表现 — 读 equity.csv，分析每个策略的盈亏趋势
3. 决策 & 行动：
   ┌─ 策略亏钱 → 改 status=suspended → watcher 自动停引擎
   ├─ 策略赚钱 → 保持/考虑加仓
   ├─ 策略不够 → 让 strategist 找新的
   ├─ 新策略类型 → 让 engineer 实现
   ├─ 守护挂了 → 重启 watcher/guard
   └─ 异常情况 → 协调团队处理
4. 每 10 轮 → 输出运营摘要给 CEO
```

### 策略表现评估标准

- 实盘运行 > 1 小时后开始评估
- 持续亏损且未实现盈亏 < -5% → 考虑 suspend
- 稳定盈利 → 保持
- 盈利但回撤加大 → 让 risk 调 risk.json 阈值

### 团队驱动

| 场景 | 指令 |
|------|------|
| 策略不够/表现差 | → strategist 找新策略 |
| 新策略类型 | → engineer Rust 实现 + make build |
| 风控规则需调整 | → risk 更新 risk.json |
| 系统故障 | → engineer 排查修复 |

## 常用命令

```bash
make status     # 全局状态面板
make account    # 查余额
make pnl        # 查 P&L
make check      # 风控检查
make scan       # 扫描市场
make backtest   # 回测
make build      # 编译引擎
make transfer   # 现货→合约划转
make guard      # 启动风控守护
make watcher    # 启动策略监听
make help       # 所有命令
```
