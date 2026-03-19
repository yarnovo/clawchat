---
name: strategy-config
description: 策略配置编写规范 — signal.json + risk.json 格式和字段说明
user-invocable: true
---

# 策略配置编写规范

quant 产出策略时需要写 2 个配置文件。

## signal.json

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
| trade_direction | 否 | long_only / short_only / both，默认 both |
| cooldown_bars | 否 | 信号冷却期（K 线根数），默认 0（不冷却） |
| min_volume | 否 | K 线最低成交量门槛，默认 0（不过滤） |
| min_spread_bps | 否 | 盘口最大价差（基点），默认 0（不过滤） |
| min_depth_usd | 否 | 盘口最小深度（USD），默认 0（不过滤） |
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

风控引擎读取，控制止损止盈阈值。由 quant 根据策略特性定义。

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
├── signal.json      ← 引擎读（含 lifecycle）
├── risk.json        ← 风控读
├── autopilot.json   ← autopilot 读（自动调控规则，quant 写）
├── trade.json       ← autopilot 写（自动调控指令）
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

## autopilot.json

autopilot 自动调控引擎读取，由 quant 根据策略特性设计参数。

```json
{
  "name": "ntrn-trend-fast-5m",
  "enabled": true,
  "scaling": {
    "position_size_min": 0.10,
    "position_size_max": 0.50,
    "scale_up_factor": 1.2,
    "scale_down_factor": 0.7,
    "scale_up_after_wins": 3,
    "scale_down_after_losses": 2,
    "cooldown_secs": 300
  },
  "pause_rules": {
    "consecutive_losses": 3,
    "daily_loss_pct": 0.10,
    "auto_resume_minutes": 30
  },
  "suspend_rules": {
    "max_total_loss_pct": 0.20,
    "negative_pnl_hours": 48,
    "auto_suspend": true,
    "auto_resume": false
  },
  "risk_tuning": {
    "trailing_stop_min": 0.01,
    "trailing_stop_max": 0.05,
    "tighten_on_profit": true,
    "widen_on_loss": false
  }
}
```

### 字段说明

| 分组 | 字段 | 默认值 | 说明 |
|------|------|--------|------|
| scaling | position_size_min | 0.10 | 仓位下限 |
| scaling | position_size_max | 0.50 | 仓位上限 |
| scaling | scale_up_factor | 1.2 | 连胜扩仓倍数 |
| scaling | scale_down_factor | 0.7 | 连亏缩仓倍数 |
| scaling | scale_up_after_wins | 3 | 连赢 N 笔后扩仓 |
| scaling | scale_down_after_losses | 2 | 连亏 N 笔后缩仓 |
| scaling | cooldown_secs | 300 | 缩放冷却期（秒）|
| pause | consecutive_losses | 3 | 连续亏 N 笔暂停 |
| pause | daily_loss_pct | 0.10 | 日亏损占 capital 比例暂停 |
| pause | auto_resume_minutes | 0 | 暂停后自动恢复（分钟），0=不恢复 |
| suspend | max_total_loss_pct | 0.20 | 总亏损超限停机 |
| suspend | negative_pnl_hours | 48 | 持续亏损超时停机 |
| suspend | auto_suspend | true | 是否允许自动停机 |
| suspend | auto_resume | false | 是否允许自动恢复 |
| risk | trailing_stop_min | 0.01 | trailing_stop 最紧 |
| risk | trailing_stop_max | 0.05 | trailing_stop 最宽 |
| risk | tighten_on_profit | true | 盈利时收紧 trailing |
| risk | widen_on_loss | false | 亏损时放宽 trailing |

### 调控原则

| 策略类型 | 建议 |
|---------|------|
| scalping | 紧缩放（连赢2扩、连亏1缩）、短暂停（10分钟自动恢复）|
| trend | 宽缩放（连赢4扩、连亏3缩）、长暂停（30分钟恢复）|
| breakout | 中等缩放、连亏2暂停、放宽 trailing |

### 热更新

autopilot 监听 autopilot.json 变化，改了立即生效。

### 运行

```bash
make autopilot                                    # 启动
make autopilot ARGS="--dry-run"                   # 只看决策不执行
nohup make autopilot > /tmp/autopilot.log 2>&1 &  # 后台运行
```
