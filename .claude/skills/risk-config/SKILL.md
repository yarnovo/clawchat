---
name: risk-config
description: 风控配置编写规范 — risk.json 格式和字段说明
user-invocable: true
---

# 风控配置编写规范

risk.json 控制风控引擎的止损止盈阈值。由 strategist 根据策略特性定义，risk 审核。

## risk.json

```json
{
  "name": "ntrn-trend-fast-5m",
  "max_loss_per_trade": 0.05,
  "max_profit_per_trade": 0.35,
  "max_daily_loss": 0.15,
  "max_drawdown_warning": 0.10,
  "max_drawdown_stop": 0.20,
  "max_concurrent_positions": 3,
  "max_hold_time_hours": 24,
  "trailing_stop": 0.02,
  "max_portfolio_exposure": 0.8,
  "max_unrealized_loss": 0.05
}
```

## 字段说明

| 字段 | 默认值 | 说明 |
|------|--------|------|
| max_loss_per_trade | 0.05 | 单笔止损（占权益 5%）|
| max_profit_per_trade | 0.10 | 单笔止盈（占权益 10%）|
| max_daily_loss | 0.15 | 当日总亏损上限 |
| max_drawdown_warning | 0.20 | 回撤预警线 |
| max_drawdown_stop | 0.30 | 回撤止损线（也用于高水位保护）|
| max_concurrent_positions | 3 | 最大同时持仓数 |
| max_hold_time_hours | 24 | 持仓超时强制平仓 |
| trailing_stop | 0.02 | 移动止损百分比 |
| max_portfolio_exposure | 0.80 | 所有策略总仓位不超过权益的 80% |
| max_unrealized_loss | None | 未实现亏损上限（占权益比例），如 0.05 = 5%。浮亏达阈值时平仓。None = 不检查 |

缺失字段用默认值，旧 risk.json 不用改。

## 高水位保护

利润从峰值回撤超过 `max_drawdown_stop` → 自动平仓锁利。

```
高水位 = +$20 → 保护线 = $20 × (1 - 0.30) = $14
盈利降到 +$14 → 自动平仓，保住 $14（70% 利润）
```

## 止盈止损原则

| 策略类型 | 止盈 | 回撤止损 | 理由 |
|---------|------|---------|------|
| scalping | 15% | 30% | 快进快出，紧止盈 |
| trend/macd | 35-40% | 20-25% | 让利润跑 |
| breakout | 30% | 25% | 突破后可能反转 |
| grid | 25% | 25% | 区间交易 |

## 热更新

引擎文件监听 risk.json，改了立即生效。不需要重启。

## 优先级

```
trade.json override > risk.json 风控规则 > strategy.json 策略信号
```
