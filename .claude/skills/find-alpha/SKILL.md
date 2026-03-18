---
name: find-alpha
description: 搜索盈利策略 — 创建团队并行回测 → 筛选 → 验证 → 上实盘
user-invocable: true
---

# Find Alpha — 搜索盈利策略

一个命令全流程：扫描币种 → 并行回测 → 筛选 Top 3 → dry-run 验证 → 上实盘。

## 用法

- `/find-alpha` — 全流程搜索
- `/find-alpha BTC/USDT ETH/USDT` — 指定币种

## 执行

### Phase 1: 扫描 + 创建搜索团队

先扫描高波动币种：
```bash
cd /Users/yarnb/agent-projects/clawchat && make scan
```

创建搜索团队：
```
TeamCreate(team_name="alpha-search")
```

招聘 3 人并行：
- **searcher-small** — 小币种 + 短周期（1m/5m）
- **searcher-large** — 大币种 + 长周期（15m/1h/4h）
- **strategy-dev** — 新策略设计 + 参数优化

### Phase 2: 并行回测

每个成员跑：
```bash
cd /Users/yarnb/agent-projects/clawchat && make backtest SYMBOL=XXX STRATEGY=XXX DAYS=14 LEVERAGE=X TIMEFRAME=Xh
```

搜索矩阵：
- **币种**：BTC/ETH/SOL/XRP/BNB/DOGE + scan 结果
- **策略**：trend, rsi, breakout, ema2050, vwap, scalping, bollinger, grid
- **周期**：1m, 5m, 15m, 1h, 4h
- **杠杆**：3x, 5x, 10x

通过标准（扣手续费 0.04% + 滑点 0.05%）：
- 净利润 > 0
- 夏普 > 1
- 最大回撤 < 20%
- 交易 >= 3 笔

### Phase 3: 筛选 Top 3

按收益率排序，排除：
- 100% 胜率但 < 3 笔（样本不足）
- 回撤 > 15%

### Phase 4: dry-run 验证

```bash
cd /Users/yarnb/agent-projects/clawchat/scripts && uv run python hft_engine.py --symbol XXX --strategy XXX --leverage X --dry-run
```

### Phase 5: 上实盘

```bash
cd /Users/yarnb/agent-projects/clawchat/scripts && uv run python hft_engine.py --symbol XXX --strategy XXX --leverage X
```

资金分配：Top1 50% / Top2 30% / Top3 20%

### Phase 6: 启动心跳

回到 `/heartbeat` 循环监控。
