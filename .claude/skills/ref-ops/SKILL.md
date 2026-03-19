---
name: ref-ops
description: Ops CLI 工具集使用指南 — 全部子命令速查、参数说明、使用示例、副作用标注
user-invocable: true
---

# Ops CLI 工具集（clawchat）

人和 Agent 共用的命令行操作工具。Binary 名 `clawchat`，包名 `clawchat-ops`。

```bash
cargo run -p clawchat-ops -- <command> [options]
```

## 全局参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--strategies-dir <PATH>` | 策略目录 | `shared::paths::strategies_dir()` |
| `--records-dir <PATH>` | 记录目录 | `shared::paths::records_dir()` |
| `--json` | JSON 格式输出（适合 Agent 解析） | false |

---

## 查询（只读，无副作用）

### status — 总览面板

账户余额 + 策略状态 + 风控指标，一览全局。

```bash
clawchat status                        # 全部策略
clawchat status --strategy ntrn-trend-v2-5m  # 单策略
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--strategy` | 否 | 筛选单策略 |

### ledger — 虚拟账户详情

各策略虚拟账户余额、已用保证金、权益。

```bash
clawchat ledger
clawchat ledger --strategy ntrn-trend-v2-5m
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--strategy` | 否 | 筛选单策略 |

### pnl — 盈亏查询

历史盈亏，按策略/币种/天数筛选。

```bash
clawchat pnl                           # 全部，最近 7 天
clawchat pnl --strategy ntrn-trend-v2-5m --days 30
clawchat pnl --symbol NTRNUSDT
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--strategy` | 否 | 全部 | 筛选策略 |
| `--symbol` | 否 | 全部 | 筛选币种 |
| `--days` | 否 | 7 | 回溯天数 |

### positions — 当前持仓

查询交易所真实持仓（调用 Binance API）。

```bash
clawchat positions
clawchat positions --symbol NTRNUSDT
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--symbol` | 否 | 筛选币种 |

### risk-log — 风控事件日志

查看历史风控触发记录。

```bash
clawchat risk-log
clawchat risk-log --strategy ntrn-trend-v2-5m --days 14
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--strategy` | 否 | 全部 | 筛选策略 |
| `--days` | 否 | 7 | 回溯天数 |

### funding — 资金费率

查询当前资金费率（调用 Binance API）。

```bash
clawchat funding
clawchat funding --symbol NTRNUSDT
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--symbol` | 否 | 筛选币种 |

### data-status — 数据引擎状态

查看数据引擎采集的币种、时间范围、数据完整度。

```bash
clawchat data-status
```

无参数。

---

## 分析（只读，无副作用）

### backtest — 单策略回测

拉取历史 K 线，运行策略信号，计算收益指标。

```bash
clawchat backtest --symbol NTRNUSDT --strategy trend --days 90 --timeframe 5m
clawchat backtest --symbol NTRNUSDT --strategy trend --days 90 --timeframe 5m \
  --leverage 3 --capital 200 --position-size 0.3 \
  --params '{"ema_fast":21,"ema_slow":55,"atr_period":14,"atr_sl_mult":1.5,"atr_tp_mult":2.5}'
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--symbol` | 是 | — | 交易对 |
| `--strategy` | 是 | — | 策略类型（trend/breakout/rsi/scalping/bollinger/macd/mean_reversion/grid/ema2050/trend_fast/vwap/macd_fast） |
| `--days` | 否 | 14 | 回测天数 |
| `--timeframe` | 否 | 1h | K 线周期（1m/5m/15m/1h） |
| `--leverage` | 否 | 1 | 杠杆倍数 |
| `--capital` | 否 | 200 | 模拟资金 |
| `--position-size` | 否 | 0.5 | 仓位比例（0.3 = 30%） |
| `--params` | 否 | 策略默认 | JSON 格式自定义参数 |

### compare — 实盘 vs 回测对比

对比策略实盘表现与回测预期。

```bash
clawchat compare
clawchat compare --strategy ntrn-trend-v2-5m
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--strategy` | 否 | 筛选策略 |

### correlation — 策略相关性矩阵

计算策略间收益相关性，帮助判断分散度。

```bash
clawchat correlation
clawchat correlation --days 60
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--days` | 否 | 30 | 计算窗口天数 |

### evaluate — 策略健康评估

纯计算输出策略健康状况，不写任何文件。

```bash
clawchat evaluate
clawchat evaluate --strategy ntrn-trend-v2-5m
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--strategy` | 否 | 筛选策略 |

---

## 操作（有副作用）

### trade — 写 trade.json 控制引擎

写入策略的 trade.json，引擎热更新响应。

```bash
clawchat trade pause --strategy ntrn-trend-v2-5m --note "手动暂停观察"
clawchat trade resume --strategy ntrn-trend-v2-5m
clawchat trade stop --strategy ntrn-trend-v2-5m
clawchat trade close_all --strategy ntrn-trend-v2-5m
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `<action>` | 是 | pause / resume / stop / close_all / close_long / close_short |
| `--strategy` | 是 | 目标策略名 |
| `--note` | 否 | 操作备注 |

**副作用**：写入 `strategies/{name}/trade.json`，引擎立即响应。

### transfer — 资金划转

在交易所现货/合约账户之间转账（调用 Binance API）。

```bash
clawchat transfer --direction spot_to_futures --amount 50
clawchat transfer --direction futures_to_spot --amount 50 --asset USDT
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--direction` | 是 | — | spot_to_futures / futures_to_spot |
| `--amount` | 是 | — | 金额 |
| `--asset` | 否 | USDT | 币种 |

**副作用**：调用交易所 API 划转真实资金。

### emergency — 紧急全平

市价平掉所有仓位（调用 Binance API 下单）。

```bash
clawchat emergency                     # 全部策略
clawchat emergency --strategy ntrn-trend-v2-5m  # 单策略
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--strategy` | 否 | 限定策略（不指定 = 全部） |

**副作用**：调用交易所 API 市价平仓，不可撤销。

### exchange — 交易所直接操作

绕过引擎，直接在交易所下单/设杠杆/挂止盈止损。

```bash
clawchat exchange long --symbol NTRNUSDT --amount 10 --leverage 3
clawchat exchange short --symbol NTRNUSDT --amount 10 --price 0.45
clawchat exchange close-long --symbol NTRNUSDT --amount 10
clawchat exchange close-short --symbol NTRNUSDT --amount 10
clawchat exchange leverage --symbol NTRNUSDT --leverage 5
clawchat exchange stop-loss --symbol NTRNUSDT --side long --price 0.40
clawchat exchange take-profit --symbol NTRNUSDT --side long --price 0.60
clawchat exchange positions
clawchat exchange positions --symbol NTRNUSDT
```

**副作用**：直接调用交易所 API 下单，真金白银操作，不可撤销。

---

## 通知

### notify — 发送邮件通知

```bash
clawchat notify --subject "日报" --body "今日盈亏 +5%"
clawchat notify --subject "周报" --body-file reports/weekly-2026-03-17.md
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--subject` | 是 | — | 邮件主题 |
| `--body` | 否 | "" | 邮件正文 |
| `--body-file` | 否 | — | 从文件读取正文（与 --body 二选一） |

**副作用**：发送真实邮件。

---

## 市场

### watch — 行情监控

实时显示指定币种价格（WebSocket 连接）。

```bash
clawchat watch NTRNUSDT BARDUSDT
clawchat watch                         # 无参数 = 监控所有 approved 策略的币种
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `[symbols...]` | 否 | 币种列表（空 = 全部） |

### scan — 扫描高波动币种

按波动率排序，发现潜在交易机会。

```bash
clawchat scan
clawchat scan --top 50 --min-vol 5000000
```

| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--top` | 否 | 20 | 返回前 N 个 |
| `--min-vol` | 否 | 10,000,000 | 最低 24h 成交量（USDT） |

---

## 使用示例

### Agent 常用

```bash
# 例行巡检
clawchat status --json
clawchat pnl --json --days 1
clawchat risk-log --json --days 1

# 回测验证
clawchat backtest --symbol NTRNUSDT --strategy trend --days 90 --timeframe 5m \
  --params '{"ema_fast":21,"ema_slow":55}' --json

# 策略控制
clawchat trade pause --strategy ntrn-trend-v2-5m --note "回撤超限"
clawchat trade resume --strategy ntrn-trend-v2-5m --note "恢复正常"

# 发送报告
clawchat notify --subject "日报 2026-03-19" --body-file reports/daily-2026-03-19.md
```

### 人工常用

```bash
# 看总览
clawchat status
clawchat pnl --days 30

# 紧急操作
clawchat emergency
clawchat exchange close-long --symbol NTRNUSDT --amount 10

# 市场扫描
clawchat scan --top 50
clawchat watch NTRNUSDT SUIUSDT
```

---

## 注意事项

### 副作用分级

| 级别 | 命令 | 影响 |
|------|------|------|
| **无副作用** | status, ledger, pnl, positions, risk-log, funding, data-status, backtest, compare, correlation, evaluate, watch, scan | 纯读取，安全调用 |
| **写本地文件** | trade | 写 trade.json，引擎热更新响应 |
| **调用交易所** | transfer, emergency, exchange *, notify | 真实资金/订单操作，不可撤销 |

### 关键提醒

- `--json` 适合 Agent 解析输出，人工阅读建议不加
- `exchange` 子命令绕过引擎风控，直接操作交易所，谨慎使用
- `emergency` 是市价全平，极端情况使用
- `trade pause` 只阻止新开仓，不平现有仓位；`trade stop` 才会平仓 + 暂停
- suspended 策略的 trade.json 不被引擎监听，需手动通过 `exchange` 操作
