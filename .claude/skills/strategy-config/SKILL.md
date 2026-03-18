---
name: strategy-config
description: 策略配置编写规范 — strategy.json + risk.json 格式和字段说明
user-invocable: true
---

# 策略配置编写规范

strategist 产出策略时需要写 2 个配置文件。完整格式见 [engine/SCHEMA.md](engine/SCHEMA.md)。

## strategy.json

引擎读取，控制交易信号逻辑。

```json
{
  "name": "ntrn-trend-fast-5m",
  "engine_strategy": "default",
  "symbol": "NTRNUSDT",
  "timeframe": "5m",
  "timeframe_ms": 300000,
  "leverage": 3,
  "order_qty": 10,
  "position_size": 0.3,
  "sizing_mode": "percent",
  "capital": 200,
  "params": {
    "ema_fast": 14,
    "ema_slow": 40
  },
  "backtest": {
    "days": 14,
    "return_pct": 38.23,
    "sharpe": 10.62,
    "max_drawdown_pct": 6.56,
    "trades": 45,
    "win_rate": 0.533,
    "profit_factor": 2.04
  },
  "status": "pending"
}
```

### 关键字段

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 策略唯一标识，与目录名一致 |
| engine_strategy | 是 | 引擎策略：default/scalping/breakout/rsi/bollinger/macd/mean_reversion/grid/mm |
| symbol | 是 | 交易对（PIPPINUSDT 或 PIPPIN/USDT 自动转换） |
| timeframe | 是 | K 线周期：1m/5m/15m/1h/4h |
| leverage | 是 | 杠杆 1-20 |
| position_size | 是 | 仓位占权益百分比（0.3 = 30%） |
| sizing_mode | 否 | percent（百分比）或 fixed（固定量），默认 fixed |
| params | 是 | 策略参数，不同策略不同，见 SCHEMA.md |
| backtest | 是 | 回测指标，必须真实可复现 |
| status | 是 | **只能写 pending**，team-lead 审核后改 approved |

### 准入标准

见 `cli/src/clawchat/criteria.py`（唯一源头）。回测必须 ≥ 14 天。

## risk.json

风控引擎读取，控制止损止盈阈值。由 strategist 根据策略特性定义。

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
  "max_portfolio_exposure": 0.8
}
```

### 止盈止损原则

| 策略类型 | 止盈 | 止损 | 理由 |
|---------|------|------|------|
| scalping（剥头皮） | 15% 紧 | 5% | 快进快出 |
| trend（趋势） | 35-40% 宽 | 5% | 让利润跑 |
| breakout（突破） | 30% 中 | 5% | 突破后可能反转 |

## 目录结构

```
strategies/{name}/
├── strategy.json  ← 引擎读
├── risk.json      ← 风控读
├── trade.json     ← 交易员写（见 /trade skill）
├── state.json     ← 引擎写（运行时状态）
└── backtest.md    ← 回测报告
```
