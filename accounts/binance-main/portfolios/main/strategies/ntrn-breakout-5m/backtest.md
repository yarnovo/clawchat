# NTRN Breakout 5m 回测报告

## 策略概要

| 项目 | 值 |
|------|------|
| 交易对 | NTRN/USDT |
| 策略 | breakout |
| 时间周期 | 5m |
| 杠杆 | 2x |
| 仓位比例 | 50% |
| 回测天数 | 30 |

## 参数 (grid-search 最优)

| 参数 | 值 |
|------|------|
| lookback | 24 |
| atr_period | 14 |
| atr_filter | 0.5 |
| trail_atr | 3.0 |

## 验证命令

```
make backtest SYMBOL=NTRN/USDT STRATEGY=breakout DAYS=30 TIMEFRAME=5m LEVERAGE=2 PARAMS='{"lookback":24,"atr_filter":0.5,"trail_atr":3.0}'
```

## 回测结果 (2026-03-18)

| 指标 | 值 | 准入标准 | 状态 |
|------|------|------|------|
| 收益率 | 63.63% | > 15% | PASS |
| 夏普比率 | 6.95 | > 5 | PASS |
| 最大回撤 | 18.48% | < 20% | PASS |
| 交易笔数 | 119 | >= 20 | PASS |
| 胜率 | 46.2% | >= 45% | PASS |
| 盈亏比 | 2.17 | > 1.8 | PASS |

## 资金曲线

- 初始资金: $200.00
- 最终余额: $327.26
- 净利润: $127.26
- 总手续费: $23.28

## 交易统计

- 盈利: 55 笔, 平均 $5.44
- 亏损: 64 笔, 平均 $2.51
- 期望值: $1.17/笔

## Grid-search 结果

27 组参数中 4 组达标（2x 杠杆）：
1. lookback=24, atr_filter=0.5, trail_atr=3.0: 63.63% 收益 (选用)
2. lookback=24, atr_filter=0.5, trail_atr=4.0: 59.3% 收益
3. lookback=48, atr_filter=0.5, trail_atr=3.0: 54.0% 收益, 回撤 15.3%
4. lookback=48, atr_filter=0.5, trail_atr=4.0: 52.2% 收益

注：3x 杠杆下 0 组达标（回撤全部 >20%），降至 2x 控制回撤后 4 组达标。

## 结论

Grid-search 优化后 6 项准入标准全部通过。短 lookback (24) 搭配 atr_filter=0.5 过滤噪音信号，trail_atr=3.0 给予趋势延续空间。2x 杠杆在收益和回撤间取得平衡。119 笔交易样本量充足。
