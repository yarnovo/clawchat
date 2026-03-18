# 策略配置格式规范

引擎和风控引擎的配置契约。strategist 按此格式输出，引擎自动读取运行。

## strategy.json

引擎通过 `--config strategy.json` 读取。

```json
{
  "name": "pippin-macd-5m",
  "engine_strategy": "macd",
  "symbol": "PIPPINUSDT",
  "timeframe": "5m",
  "leverage": 5,
  "order_qty": 100,
  "position_size": 0.3,
  "capital": 200,
  "params": {
    "fast_period": 12,
    "slow_period": 26,
    "signal_period": 9
  },
  "backtest": {
    "days": 14,
    "return_pct": 104.33,
    "sharpe": 23.70,
    "max_drawdown_pct": 13.32,
    "trades": 27,
    "win_rate": 0.519,
    "profit_factor": 4.49
  },
  "status": "approved"
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 策略唯一标识，与目录名一致 |
| `engine_strategy` | 是 | 引擎策略类型：`mm` / `default` / `scalping` / `breakout` / `rsi` / `bollinger` / `macd` / `mean_reversion` / `grid` |
| `symbol` | 是 | 交易对，引擎格式如 `PIPPINUSDT`（也接受 `PIPPIN/USDT` 自动转换） |
| `timeframe` | 是 | K 线周期：`1m` / `5m` / `15m` / `1h` / `4h`（也可用 `timeframe_ms` 毫秒） |
| `leverage` | 是 | 杠杆倍数 |
| `position_size` | 推荐 | 权益百分比下单（如 0.3 = 30%），设置后 order_qty 由引擎自动计算 |
| `order_qty` | 否 | 固定下单量（向后兼容），设了 position_size 则忽略 |
| `params` | 是 | 策略参数，传给 Rust `from_params()`，见下表 |
| `backtest` | 否 | 回测指标汇总 |
| `status` | 是 | `approved` = 自动上架 / `suspended` = 不启动 |

### params — 各策略支持的参数

| engine_strategy | 参数 | 默认值 |
|----------------|------|--------|
| `mm` | fee_rate | 0.0004 |
| `default` | ema_fast, ema_slow, atr_period, atr_sl_mult, atr_tp_mult | 21, 55, 14, 1.5, 2.5 |
| `scalping` | ema_fast, ema_slow, volume_multiplier, atr_period, atr_sl_mult, atr_tp_mult, rsi_buy_low, rsi_buy_high, rsi_sell_low, rsi_sell_high | 12, 50, 1.2, 14, 1.5, 3.0, 45, 70, 30, 55 |
| `breakout` | lookback, atr_period, atr_filter, trail_atr | 48, 14, 0.3, 3.0 |
| `rsi` | rsi_period, rsi_oversold, rsi_overbought, trend_ema, atr_period, atr_sl_mult, atr_tp_mult | 14, 25, 75, 50, 14, 2.0, 4.0 |
| `bollinger` | bb_period, num_std, trend_ema, atr_period, atr_sl_mult | 20, 2.5, 50, 14, 2.0 |
| `macd` | fast_period, slow_period, signal_period, trend_ema, atr_period, atr_sl | 12, 26, 9, 200, 14, 2.0 |
| `mean_reversion` | ema_period, std_period, entry_std, atr_period, atr_sl | 50, 50, 2.0, 14, 2.0 |
| `grid` | grids, lookback | 5, 50 |

### 策略准入标准

全部满足才能 `status: "approved"`（代码定义见 `scripts/criteria.py`）：

| 指标 | 要求 |
|------|------|
| 回测天数 | ≥ 14 天 |
| 收益率 | > 15% |
| 夏普比率 | > 5 |
| 最大回撤 | < 20% |
| 交易笔数 | ≥ 20 |
| 胜率 | ≥ 45% |
| 盈亏比 | > 1.8 |

## risk.json

风控引擎（risk-engine）按策略独立读取。

```json
{
  "name": "pippin-macd-5m",
  "max_loss_per_trade": 0.05,
  "max_profit_per_trade": 0.10,
  "max_daily_loss": 0.15,
  "max_drawdown_warning": 0.20,
  "max_drawdown_stop": 0.30,
  "max_position_ratio": 0.30,
  "min_liquidation_distance": 0.10,
  "max_leverage": 20,
  "max_concurrent_positions": 3,
  "max_hold_time_hours": 24.0,
  "trailing_stop": 0.02,
  "max_portfolio_exposure": 0.80
}
```

### 字段说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `max_loss_per_trade` | 单笔止损（占权益比例） | 0.05 (-5%) |
| `max_profit_per_trade` | 单笔止盈 | 0.10 (+10%) |
| `max_daily_loss` | 总亏损止损 | 0.15 (-15%) |
| `max_drawdown_warning` | 回撤预警线 | 0.20 |
| `max_drawdown_stop` | 回撤止损线（也用于高水位利润保护） | 0.30 |
| `max_position_ratio` | 单币种仓位占比上限 | 0.30 |
| `min_liquidation_distance` | 最小强平距离 | 0.10 |
| `max_leverage` | 最大杠杆 | 20 |
| `max_concurrent_positions` | 最大同时持仓数 | 3 |
| `max_hold_time_hours` | 持仓超时强制平仓（小时） | 24.0 |
| `trailing_stop` | 移动止损（价格新高后回撤此比例平仓） | 0.02 (2%) |
| `max_portfolio_exposure` | 所有策略总仓位不超过权益百分比 | 0.80 (80%) |

### 高水位利润保护

当持仓盈利达到峰值后回撤超过 `max_drawdown_stop`，自动平仓保住利润。

```
高水位 = +$20 → 保护线 = $20 × (1 - 0.30) = $14
盈利降到 +$14 → 自动平仓，保住 $14
```

## 目录结构

```
strategies/
└── {name}/
    ├── strategy.json    ← 引擎读
    ├── risk.json        ← 风控读
    ├── state.json       ← 引擎写（运行时状态，重启恢复）
    └── backtest.md      ← 回测报告（人看）
```
