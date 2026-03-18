---
name: find-alpha
description: 一键寻找盈利策略 — 创建团队并行搜索 → 验证 → 上实盘
user-invocable: true
---

# 寻找 Alpha

一个命令启动全流程：创建团队 → 并行回测搜索 → 找到盈利策略 → dry-run 验证 → 上实盘。

## 用法

- `/find-alpha` — 启动全流程
- `/find-alpha BTC/USDT ETH/USDT` — 指定币种搜索

## 全流程

### Phase 1: 创建搜索团队

```
TeamCreate(team_name="alpha-search")
```

招聘 3 个成员并行搜索：
- **searcher-small** — 小币种 + 短周期（1m/5m）
- **searcher-large** — 大币种 + 长周期（15m/1h/4h）
- **strategy-dev** — 设计新策略 + 优化参数

### Phase 2: 并行回测搜索

每个成员用 `backtest.py` 跑大量组合：

```bash
cd /Users/yarnb/agent-projects/clawchat && source .env && cd scripts
uv run python backtest.py --symbol XXX --strategy XXX --days 14 --leverage X --timeframe Xh --capital 200
```

搜索矩阵：
- **币种**：BTC/ETH/SOL/XRP/BNB/DOGE/ANKR/ENJ/OPN + make scan 高波动币
- **策略**：trend, rsi, breakout, ema2050, vwap, scalping, bollinger, grid
- **周期**：1m, 5m, 15m, 1h, 4h
- **杠杆**：3x, 5x, 10x
- **天数**：7, 14, 30

通过标准（全部扣手续费 0.04% + 滑点 0.05%）：
- 净利润 > 0
- 夏普比率 > 1
- 最大回撤 < 20%
- 交易笔数 >= 3

### Phase 3: 汇总筛选

收集所有通过的组合，按收益率排序，选 Top 3。

排除条件：
- 100% 胜率但只有 1-2 笔交易（样本太少）
- 回撤 > 15%（风险太高）

### Phase 4: dry-run 验证

用 hft_engine.py 跑 Top 3：

```bash
cd scripts && uv run python hft_engine.py --symbol XXX --strategy XXX --leverage X --dry-run
```

验证通过标准：
- 实时行情下策略能产生信号
- 信号方向与回测一致
- 无代码 bug

### Phase 5: 上实盘

验证通过后启动实盘：

```bash
cd scripts && uv run python hft_engine.py --symbol XXX --strategy XXX --leverage X
```

资金分配：
- Top 1 策略：50% 资金
- Top 2 策略：30% 资金
- Top 3 策略：20% 资金

### Phase 6: 启动心跳监控

`/heartbeat` 启动定时监控：
- 每分钟检查实盘 P&L
- 风控止损
- 定期报告

## 核心规则

- **回测必须扣手续费和滑点**（来自 CLAUDE.md 核心规则）
- **KPI 以实盘真实利润为准**
- **报告从交易所拉真实数据**
- **先验证再上实盘，绝不跳过回测**
