---
name: ref-engine-config
description: 引擎配置规范 — accounts/ 目录结构、signal.json / risk.json / trade.json / autopilot.json 编写指南
user-invocable: true
---

# 引擎配置规范

`accounts/` 是引擎的对外接口，所有引擎行为由此目录下的文件驱动。

## 目录结构

```
accounts/
  {account-name}/                    # 虚拟账户（对应一个物理交易所账户）
    account.json                     # → ref: account
    portfolios/
      {portfolio-name}/              # 投资组合
        portfolio.json               # → ref: portfolio
        risk.json                    # → 组合级风控默认值
        trade.json                   # → 组合级交易控制（优先级最高）
        strategies/
          {strategy-name}/           # 策略目录
            signal.json              # → ref: signal
            risk.json                # → ref: risk（只写覆盖项）
            trade.json               # → ref: trade
            autopilot.json           # → ref: autopilot（可选）
            state.json               # 引擎写入，只读
```

默认路径：`accounts/binance-main/portfolios/main/strategies/`

---

## ref: account

`account.json` — 交易所账户配置。

```json
{
  "name": "binance-main",
  "exchange": "binance",
  "base_url": "https://fapi.binance.com",
  "total_capital": 222,
  "api_key_env": "BINANCE_API_KEY",
  "api_secret_env": "BINANCE_API_SECRET"
}
```

| 字段 | 说明 |
|------|------|
| name | 账户唯一标识 |
| exchange | 交易所名称 |
| base_url | API 地址 |
| total_capital | 物理账户总资金（USDT） |
| api_key_env | API key 的环境变量名（不存明文） |
| api_secret_env | API secret 的环境变量名 |

---

## ref: portfolio

`portfolio.json` — 组合级风险预算和敞口限制。

```json
{
  "name": "main",
  "allocated_capital": 203,
  "reserve": 19,
  "risk": {
    "max_drawdown_pct": 10,
    "max_daily_loss_pct": 5,
    "max_total_exposure": 2.0,
    "max_per_coin_exposure_pct": 50
  }
}
```

| 字段 | 说明 |
|------|------|
| allocated_capital | 分配给策略的总资金 |
| reserve | 安全垫（不分配给策略） |
| risk.max_drawdown_pct | 总回撤红线（%），触发全部暂停 |
| risk.max_daily_loss_pct | 当日最大亏损（%） |
| risk.max_total_exposure | 总敞口上限（倍数，2.0 = 200%） |
| risk.max_per_coin_exposure_pct | 单币种敞口上限（%） |

约束：所有策略 capital 之和 <= allocated_capital

---

## ref: signal

`signal.json` — 信号参数。引擎读取，控制什么时候买卖。

```json
{
  "name": "ntrn-trend-v2-5m",
  "engine_strategy": "default",
  "symbol": "NTRNUSDT",
  "timeframe": "5m",
  "timeframe_ms": 300000,
  "leverage": 3,
  "position_size": 0.3,
  "capital": 18,
  "params": {
    "ema_fast": 21,
    "ema_slow": 55,
    "atr_period": 14,
    "atr_sl_mult": 1.5,
    "atr_tp_mult": 2.5
  },
  "backtest": {
    "return_pct": 47.29,
    "sharpe": 6.31,
    "max_drawdown_pct": 12.71,
    "trades": 23,
    "win_rate": 47.8,
    "profit_factor": 2.4
  },
  "status": "approved"
}
```

### 关键字段

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 是 | 策略唯一标识，与目录名一致 |
| engine_strategy | 是 | 信号类型：default/breakout/rsi/scalping/bollinger/macd/mean_reversion/grid |
| symbol | 是 | 交易对（NTRNUSDT） |
| timeframe | 是 | K 线周期：1m/5m/15m/1h |
| leverage | 是 | 杠杆 1-20 |
| position_size | 是 | 仓位占虚拟权益百分比（0.3 = 30%） |
| capital | 是 | 虚拟账户配额（USDT） |
| params | 是 | 信号参数，不同策略不同 |
| backtest | 是 | 回测指标，必须真实可复现 |
| status | 是 | pending → approved → suspended |

### status 规则

- **pending**：策略发现引擎产出，等待审批
- **approved**：交易引擎加载运行
- **suspended**：暂停运行
- **只有 team-lead 可以改为 approved**

### 准入标准

见 `shared/src/criteria.rs`（唯一源头）：
- min_days: 14, min_return_pct: 15%, min_sharpe: 5.0
- max_drawdown_pct: 20%, min_trades: 20, min_win_rate: 45%, min_profit_factor: 1.8

---

## ref: risk

`risk.json` — 风控规则。采用**组合默认 + 策略覆盖**的层级机制。

### 层级关系

1. **组合级** `portfolios/main/risk.json` — 所有策略的默认风控参数
2. **策略级** `strategies/{name}/risk.json` — 只写与组合默认**不同**的字段（覆盖项）
3. 引擎启动时自动合并：先加载组合默认，再用策略级覆盖

### 组合级 risk.json（默认值）

路径：`accounts/binance-main/portfolios/main/risk.json`

```json
{
  "max_loss_per_trade": 0.05,
  "max_daily_loss": 0.15,
  "max_leverage": 5,
  "max_drawdown_warning": 0.20,
  "max_drawdown_stop": 0.30,
  "max_portfolio_exposure": 0.80,
  "funding_rate_limit": 0.001
}
```

### 策略级 risk.json（只写覆盖项）

```json
{
  "max_profit_per_trade": 0.35,
  "max_daily_loss": 0.10,
  "max_leverage": 10
}
```

策略级文件不存在 = 完全使用组合默认。

### 全部字段

| 字段 | 组合默认 | 说明 |
|------|----------|------|
| max_loss_per_trade | 0.05 | 单笔止损（占权益 5%） |
| max_profit_per_trade | 0.10 | 单笔止盈 |
| max_daily_loss | 0.15 | 当日总亏损上限 |
| max_drawdown_warning | 0.20 | 回撤警告线 |
| max_drawdown_stop | 0.30 | 回撤止损线 |
| max_leverage | 5 | 杠杆上限 |
| trailing_stop | 0.02 | 移动止损百分比 |
| max_portfolio_exposure | 0.80 | 组合敞口上限 |
| funding_rate_limit | 0.001 | 资金费率过滤阈值 |

### 止盈止损原则

| 策略类型 | 止盈 | 止损 | 理由 |
|---------|------|------|------|
| scalping | 15% | 5% | 快进快出 |
| trend | 35-40% | 5% | 让利润跑 |
| breakout | 30% | 5% | 突破后可能反转 |

热更新：组合级或策略级 risk.json 变化都会触发重新加载合并。

---

## ref: trade

`trade.json` — 执行控制指令。采用**组合优先**的层级机制。

### 层级关系

1. **组合级** `portfolios/main/trade.json` — 全局控制，优先级最高
2. **策略级** `strategies/{name}/trade.json` — 单策略控制

**优先级：组合级 trade.json > 策略级 trade.json > risk.json > signal.json**

- 组合级 `pause`/`stop` → 所有策略信号被拦截
- 组合级 `hold` → 检查策略级 trade.json
- 组合级一次性指令（close_all 等）→ 对所有策略执行

### 组合级 trade.json

路径：`accounts/binance-main/portfolios/main/trade.json`

```json
{
  "action": "hold",
  "params": {},
  "note": "全局默认",
  "updated_at": "2026-03-19T00:00:00Z"
}
```

### 策略级 trade.json

```json
{
  "action": "hold",
  "params": {},
  "note": "",
  "updated_at": "2026-03-19T10:00:00Z"
}
```

文件不存在 = hold（放行信号）。

### action 枚举

| action | 类型 | params | 说明 |
|--------|------|--------|------|
| hold | 持续 | — | 默认，放行信号 |
| pause | 持续 | — | 阻止开新仓 |
| resume | 持续 | — | 取消 pause |
| stop | 一次性 | — | 平所有仓 + 进入 pause |
| close_all | 一次性 | — | 平所有仓 |
| close_long | 一次性 | — | 平多仓 |
| close_short | 一次性 | — | 平空仓 |
| add | 一次性 | `{"percent":30,"direction":"long"}` | 加仓 |
| reduce | 一次性 | `{"percent":50}` | 减仓 |

---

## ref: autopilot

`autopilot.json` — 自动调控规则（可选）。autopilot 引擎读取。

```json
{
  "enabled": true,
  "scaling": {
    "position_size_min": 0.10,
    "position_size_max": 0.50,
    "scale_up_after_wins": 3,
    "scale_down_after_losses": 2,
    "scale_up_factor": 1.2,
    "scale_down_factor": 0.7,
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
    "auto_suspend": true
  }
}
```

autopilot 根据这些规则监控 state.json，自动写 trade.json 控制引擎。

---

## 读写权限矩阵

| 文件 | 谁写 | 谁读 | 热更新 |
|------|------|------|--------|
| account.json | 你 | 交易引擎 | 需重启 |
| portfolio.json | 你 | 交易引擎、全局风控 | 需重启 |
| 组合 risk.json | 你 | 交易引擎 | ✓ 热更新（触发所有策略重载） |
| 组合 trade.json | autopilot/Agent/你 | 交易引擎 | ✓ 热更新（全局优先） |
| signal.json | 策略发现引擎/你 | 交易引擎 | ✓ 热更新 |
| 策略 risk.json | Agent/你 | 交易引擎 | ✓ 热更新（与组合合并） |
| 策略 trade.json | autopilot/Agent/你 | 交易引擎 | ✓ 热更新 |
| autopilot.json | Agent/你 | autopilot 引擎 | ✓ 热更新 |
| state.json | 交易引擎 | autopilot/报告引擎 | 只读 |
