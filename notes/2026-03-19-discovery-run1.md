# 策略发现记录 — 2026-03-19 第 1 轮

## 分析

当前组合（24 个策略目录，10 个 approved 在 ledger 中运行）：
- NTRN：4 个 approved（trend-v2, breakout, ema2050, trend-fast），1 suspended → 不搜
- BARD：3 个 approved（trend, breakout, rsi），4 suspended → 不搜
- FET：1 个 approved（trend-15m）→ 重点搜
- LYN：1 个 approved（trend-15m）→ 重点搜
- SUI：1 个 approved（trend-15m）→ 重点搜
- PIPPIN/BAN/BTC/ETH/FLOKI：无蜡烛数据，无法搜

KPI：今天是起始日（$222），不存在增长差距。策略储备不足是首要问题。

## 搜索执行

### Breakout（FET/LYN/SUI × 5m+15m）
- 4608 组合 × 6 个 symbol-timeframe 对
- 结果：**全部 0 通过准入**。breakout 在 30 天窗口对这三个币表现不佳。

### RSI（FET/LYN/SUI × 5m+15m）
- 100800 组合（搜索空间偏大，rsi_period 扩展到 8-20）
- FET 5m：0 通过
- LYN 5m：516 通过准入，selector 运行中（耗时长）
- 其余：等待

### Trend（FET/LYN/SUI × 5m+15m）
- 28680 组合（扩大了 EMA 范围和 TP 范围）
- FET 5m：138 通过 → selector 后 0（验证集不过）
- LYN 5m：0 通过
- SUI 5m：324 通过 → **10 个策略**
- FET 15m：241 通过 → **3 个策略**
- LYN 15m：82 通过 → **10 个策略**
- SUI 15m：1063 通过 → **10 个策略**

## 经验

1. breakout 策略在 FET/LYN/SUI 上 30 天内不达标，可能需要更长回测期或这些币不适合突破策略
2. RSI 100800 组合 selector 太慢（每个 candidate 需 ~15 次 backtest），未来控制在 500 以内通过
3. SUI 是 trend 策略的富矿（1063 通过准入），FET 和 LYN 相对较少
4. 5m trend 在 FET/LYN 上全军覆没，15m 有收获 — 这些币在更长周期上趋势更明显
5. 扩大 atr_tp_mult 到 5.0 有帮助（发现了高 TP 倍数的好策略）
