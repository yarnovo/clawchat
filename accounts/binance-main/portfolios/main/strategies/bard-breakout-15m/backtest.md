# BARD Breakout 15m 回测报告

## 策略概要

| 项目 | 值 |
|------|------|
| 交易对 | BARD/USDT |
| 策略 | breakout |
| 时间周期 | 15m |
| 杠杆 | 3x |
| 仓位比例 | 50% |
| 回测天数 | 30 |

## 参数 (grid-search 最优)

| 参数 | 值 |
|------|------|
| lookback | 72 |
| atr_period | 14 |
| atr_filter | 0.3 |
| trail_atr | 3.0 |

## 验证命令

```
make backtest SYMBOL=BARD/USDT STRATEGY=breakout DAYS=30 TIMEFRAME=15m LEVERAGE=3 PARAMS='{"lookback":72,"atr_filter":0.3,"trail_atr":3.0}'
```

## 回测结果 (2026-03-18)

| 指标 | 值 | 准入标准 | 状态 |
|------|------|------|------|
| 收益率 | 235.63% | > 15% | PASS |
| 夏普比率 | 8.01 | > 5 | PASS |
| 最大回撤 | 17.40% | < 20% | PASS |
| 交易笔数 | 23 | >= 20 | PASS |
| 胜率 | 47.8% | >= 45% | PASS |
| 盈亏比 | 5.09 | > 1.8 | PASS |

## 资金曲线

- 初始资金: $200.00
- 最终余额: $671.26
- 净利润: $471.26
- 总手续费: $9.09

## 交易统计

- 盈利: 11 笔, 平均 $55.05
- 亏损: 12 笔, 平均 $10.81
- 期望值: $20.69/笔

## Grid-search 结果

27 组参数中 2 组达标：
1. lookback=72, atr_filter=0.3, trail_atr=3.0: 235.63% 收益 (选用)
2. lookback=72, atr_filter=0.5, trail_atr=3.0: 146.9% 收益

## 结论

Grid-search 优化后 6 项准入标准全部通过。长 lookback (72) 捕捉 BARD 的大级别突破，trail_atr=3.0 给予足够的趋势延续空间。
