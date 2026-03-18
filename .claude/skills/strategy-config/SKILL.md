---
name: strategy-config
description: 策略配置编写规范 — strategy.json + risk.json 格式和字段说明
user-invocable: true
---

# 策略配置编写规范

strategist 产出策略时需要写 2 个配置文件。

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
| lifecycle | 否 | 生命周期时间戳（见下表），引擎忽略此字段 |
| status | 是 | **只能写 pending**，team-lead 审核后改 approved |

### lifecycle 字段

| 字段 | 说明 |
|------|------|
| created | 策略创建日期 |
| approved | 审批通过日期 |
| probation_end | 试运行结束日期（approved 后 7 天自动升级 active 时写入） |
| last_review | 上次 `clawchat review` 评估日期 |
| next_review | 下次评估日期 |
| degraded_since | 首次进入 degraded 状态日期（恢复后自动清除） |

### status 状态流转

```
pending → approved → active → degraded → suspended
                ↑                  ↓
                └──── 恢复 ────────┘
```

| 状态 | 说明 | 引擎是否运行 |
|------|------|-------------|
| pending | 等待 team-lead 审核 | 否 |
| approved | 审核通过，试运行期（7 天） | 是 |
| active | 试运行达标，正式运行 | 是 |
| suspended | 暂停（手动或自动降级） | 否 |

自动转换（`clawchat review` 执行）：
- **approved → active**：7 天后实盘达标（ROI>0%、WR>=回测80%、DD<回测1.5x、>=10笔）
- **degraded → suspended**：degraded 持续 7 天未恢复

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
├── strategy.json    ← 引擎读（含 lifecycle）
├── risk.json        ← 风控读
├── trade.json       ← 交易员写（见 /trade skill）
├── state.json       ← 引擎写（运行时状态）
├── performance.json ← clawchat review 写（实盘评估结果）
└── backtest.md      ← 回测报告
```

## performance.json

`clawchat review` 自动生成，记录实盘评估结果。

```json
{
  "strategy": "ntrn-trend-fast-5m",
  "reviewed_at": "2026-03-19T10:00:00Z",
  "health": "healthy",
  "live": { "roi": 5.2, "win_rate": 57.1, "profit_factor": 2.15, "max_drawdown_pct": 8.3, "sharpe": 3.42 },
  "backtest": { "return_pct": 10.0, "win_rate": 0.5, "profit_factor": 2.0, "max_drawdown_pct": 15.0 }
}
```

health 值：`healthy` / `warning` / `degraded` / `no_data` / `no_backtest`
