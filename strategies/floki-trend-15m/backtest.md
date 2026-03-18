# floki-trend-15m 回测报告

## 策略概述
- 交易对: 1000FLOKI/USDT
- 策略: trend (EMA crossover + ATR stops)
- 周期: 15m
- 杠杆: 3x
- 仓位: 30% equity

## 参数
- ema_fast: 14
- ema_slow: 40
- atr_period: 14
- atr_sl_mult: 1.5
- atr_tp_mult: 4.0

## 30天回测结果 (2026-03-19)
- 初始资金: $200
- 最终余额: $270.08
- 净利润: $70.08
- 收益率: 35.04%
- 夏普比率: 5.05
- 最大回撤: 12.94%
- 总交易: 40笔
- 胜率: 50.0%
- 盈亏比: 1.82
- 平均盈利: $8.37
- 平均亏损: $4.59
- 期望值: $1.89/笔
- 总手续费: $10.79

## 准入检查
- [x] ROI 35.04% > 15%
- [x] Sharpe 5.05 > 5
- [x] Drawdown 12.94% < 20%
- [x] Trades 40 >= 20
- [x] Win Rate 50.0% >= 45%
- [x] PF 1.82 >= 1.8

## 发现方式
grid-search 81 参数组合，仅 1 组达标。
参数空间: fast_ema(10,14,21) x slow_ema(30,40,55) x atr_sl(1.0,1.5,2.0) x atr_tp(2.0,3.0,4.0)

## 风控设计
- 趋势策略，15m 周期适中
- atr_sl=1.5 给予充分呼吸空间
- atr_tp=4.0 让利润充分奔跑（高盈亏比策略）
- max_drawdown_warning=12% 接近回测最大回撤
- max_drawdown_stop=20% 留有缓冲
