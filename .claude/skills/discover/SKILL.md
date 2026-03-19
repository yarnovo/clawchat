---
name: discover
description: 策略发现+预审 — 先分析市场和组合，再定向搜索，自动上线。定时用法：/loop 24h /discover
user-invocable: true
---

# 策略发现 + 预审

先分析再搜索，不要盲扫。配置用法见 `/ref-discovery`。

## Phase 1: 分析（决定搜什么）

### 1.1 当前组合分析

读 `accounts/binance-main/portfolios/main/strategies/*/signal.json`：
- 各币种有几个策略？（上限 4 个）
- 各策略类型分布？（trend/breakout/rsi）
- 缺策略的币种是什么？

### 1.2 策略表现分析

读 `records/ledger.json`（如果存在）：
- 哪类策略在赚钱 → 多搜这类
- 哪类策略在亏 → 暂不搜这类
- 哪个币种的策略表现好 → 精细优化参数

### 1.3 市场状态分析

读 `data/candles/*/1m.parquet` 最近 7 天数据：
- 用 CLI 工具或直接读数据
- 哪个币在趋势 → 搜 trend 策略
- 哪个币在震荡 → 搜 rsi / mean_reversion
- 哪个币波动大 → 搜 breakout

### 1.4 KPI 差距

- 目标：周 +10%，月 +50%
- 当前进度如何？
- 需要更多策略还是优化现有？
- 回撤接近 10% 红线 → 搜保守策略（低回撤优先）

### 1.5 生成 search.json

基于以上分析，写一个 `search.json`：

```json
{
  "strategy": "trend",
  "symbols": ["LYNUSDT", "FETUSDT"],
  "days": 90,
  "timeframes": ["5m", "15m"],
  "params": {
    "ema_fast": { "min": 8, "max": 34, "step": 2 },
    "ema_slow": { "min": 34, "max": 120, "step": 4 },
    "atr_period": { "min": 10, "max": 20, "step": 5 },
    "atr_sl_mult": { "min": 1.0, "max": 3.0, "step": 0.5 },
    "atr_tp_mult": { "min": 1.5, "max": 4.0, "step": 0.5 }
  }
}
```

**控制组合数 < 50000**（估算：各参数取值数相乘）

## Phase 2: 执行搜索

```bash
# 清理旧候选
rm -rf discovered/*/

# 定向搜索
cargo run --release -p discovery -- scan --config search.json
```

如果没有 search.json（首次运行）：
```bash
cargo run --release -p discovery -- scan --strategy trend --symbol LYNUSDT --days 90 --timeframe 15m
```

## Phase 3: 预审上线

对 `discovered/*/signal.json` 每个候选检查：

**准入**：Sharpe >= 5, ROI > 15%, DD < 20%

**冲突**：
- 同名策略已存在 → 跳过
- 同币种已有 4 个策略 → 跳过
- 与已有策略参数差 < 10% → 跳过

**配额**：
- 读 portfolio.json 总配额
- 计算剩余可用（每策略至少 $15）

**通过的直接上线**：
1. signal.json 改 status=approved，设 capital
2. 生成默认 risk.json（从组合级继承或用模板）
3. 生成默认 trade.json: `{"action": "none"}`
4. 搬到 `accounts/binance-main/portfolios/main/strategies/`

**跳过的**：删除 discovered/ 中的文件

## Phase 4: 汇报 + 记录

向 team-lead 汇报：
```
=== 策略发现报告 ===

分析：LYN 只有 1 个策略，最近行情趋势明显 → 搜 LYN trend
搜索：5000 组合 × 8640 K线，耗时 8 秒
发现：3 个候选，上线 2 个

✅ lyn-trend-ema1850-15m (capital=$20, Sharpe=8.2)
✅ lyn-trend-ema2264-5m (capital=$20, Sharpe=7.1)
❌ lyn-trend-ema1446-15m（与 lyn-trend-15m 参数相似）
```

写 `notes/{date}-discovery-run.md` 记录经验。
