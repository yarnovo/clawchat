---
name: team
description: 启动运营 — 3 人团队 + 双 Rust 引擎（交易+风控）+ 全自动链路
user-invocable: true
---

# 启动运营团队

`/team` 一键启动全自动量化交易系统。

## 全自动链路

```
strategist 回测 → strategies/{name}/ (strategy.json + risk.json + backtest.md)
    ↓ status=approved
watcher 自动启动 hft-engine --config strategy.json
    ↓
hft-engine 行情 → 信号 → pre-trade check → 下单
    ↓
risk-engine WebSocket 实时监控 → 止损/止盈/高水位保护
```

引擎监听 strategy.json/risk.json 文件变化，改了立即热更新。

## 双 Rust 引擎

```
engine/src/main.rs           ← hft-engine（交易）
engine/src/bin/risk_engine.rs ← risk-engine（风控）
```

两个独立进程，共享代码。交易崩了风控还在。

## 团队

```
team-lead（交易总监 + 交易员）
├── strategist — 回测、产出策略、定义风控参数
├── risk — 审核 risk.json、监控状态
└── engineer — 实现代码、维护引擎
```

### 职责细节

**strategist 负责：**
- 扫描市场（make scan）+ 回测（make backtest）
- 产出 strategy.json + risk.json + backtest.md
- **止盈止损由 strategist 决定**（不同策略不同值，写在 risk.json）
- **sizing_mode 由 strategist 决定**（percent 或 fixed，写在 strategy.json）
- 达标直接 approved，watcher 自动上架
- 需要工具/脚本告诉 team-lead

**risk 负责：**
- 审核新策略 risk.json 是否合理
- 监控实盘风控状态
- 需要工具告诉 team-lead

**engineer 负责：**
- 实现新策略类型到 Rust 引擎
- 系统维护、bug 修复
- 响应 strategist/risk 的技术需求

## 策略配置

格式规范见 [engine/SCHEMA.md](engine/SCHEMA.md)。

```
strategies/{name}/
├── strategy.json  ← hft-engine 读（engine_strategy/symbol/params/sizing_mode）
├── risk.json      ← risk-engine 读（止损/止盈/高水位/仓位）
├── state.json     ← 引擎写（运行时状态，重启恢复）
└── backtest.md    ← 回测报告
```

### 准入标准

| 指标 | 要求 |
|------|------|
| 收益率 | > 20% |
| 夏普比率 | > 5 |
| 最大回撤 | < 15% |
| 交易笔数 | ≥ 8 |
| 胜率 | ≥ 50% |
| 盈亏比 | > 2 |

### sizing_mode

strategy.json 支持两种下单模式，由 strategist 选择：

```json
{"sizing_mode": "percent", "position_size": 0.3}   // 权益的 30%
{"sizing_mode": "fixed", "order_qty": 100}          // 固定 100 个
```

## 风控

三层：hft-engine pre-trade check → risk-engine 实时 → 交易所强平

risk-engine 功能：
- 止损/止盈（strategist 在 risk.json 定义，每策略不同）
- 高水位保护（利润从峰值回撤超阈值 → 平仓锁利）
- 仓位/强平距离检查
- 文件监听 risk.json 变化，立即热更新

## 执行步骤

### 1. 创建团队

```
TeamCreate(team_name="clawchat")
```

并行创建 3 个成员（bypassPermissions, run_in_background），spawn prompt 包含：
- 各自职责 + 格式规范见 engine/SCHEMA.md
- 需要技术支持告诉 team-lead
- strategist：risk.json 和 sizing_mode 由你决定

### 2. 启动守护进程

```bash
nohup make watcher > /tmp/strategy-watcher.log 2>&1 &    # 自动上架引擎
nohup make risk-engine > /tmp/risk-engine.log 2>&1 &      # Rust 实时风控
```

watcher 自动启动 approved 策略的 hft-engine。

### 3. 确认资金

```bash
make account && make transfer AMOUNT=197   # 如需划转
```

### 4. 验证

```bash
make status   # 确认引擎/风控/watcher 全部 RUNNING
```

### 5. 启动心跳

```
/loop 1m 心跳：策略管理
```

## 心跳 — 策略管理循环

每 1 分钟，team-lead 读数据、判断、决策：

```
1. make status
2. 评估策略表现（make strategy-pnl）
3. 决策：
   - 亏钱 → suspend → watcher 自动停
   - 赚钱 → 保持
   - 空闲资金 → 让 strategist 找新策略
   - 需要新策略类型 → 让 engineer 实现
   - 风控调整 → 让 strategist 改 risk.json
   - 技术需求 → 派 engineer
   - 守护挂了 → 重启
4. 每 10 轮输出运营摘要
```

## TODO 管理

team-lead 维护 `TODO.md`，派发任务写入，完成打 [x]。多线程任务必须记录。

## 常用命令

`make help` 查看全部。关键命令：

```bash
make status        # 全局面板
make strategy-pnl  # 按策略 P&L
make build         # 编译双引擎
make transfer      # 划转
make watcher       # 策略监听
make risk-engine   # 风控引擎
```
