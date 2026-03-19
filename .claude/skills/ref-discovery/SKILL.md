---
name: ref-discovery
description: 策略发现引擎使用指南 — 搜索配置、CLI 参数、search.json 格式
---

# 策略发现引擎（Discovery）

## CLI 命令速查

```bash
# 传统方式（CLI 参数）
discovery scan --strategy trend --symbol NTRNUSDT --days 90 --timeframe 5m
discovery scan --strategy all --symbol all --timeframe all

# 配置文件方式（--config 与 --strategy/--symbol/--timeframe 互斥）
discovery scan --config search.json

# 查看发现结果
discovery status
```

### Scan 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--config` | 搜索配置文件路径（与其他参数互斥） | — |
| `--strategy` | 策略类型: `trend`, `breakout`, `rsi`, `all` | 必填（无 config 时） |
| `--symbol` | 交易对: `NTRNUSDT`, `all` | 必填（无 config 时） |
| `--days` | 回测天数 | 90 |
| `--timeframe` | K 线周期: `5m`, `15m`, `all` | 5m |

## search.json 格式

```json
{
  "strategy": "trend",
  "symbols": ["NTRNUSDT", "BARDUSDT"],
  "days": 90,
  "timeframes": ["5m", "15m"],
  "params": {
    "ema_fast": { "min": 5, "max": 50, "step": 2 },
    "ema_slow": { "min": 30, "max": 200, "step": 5 },
    "atr_period": { "min": 10, "max": 20, "step": 5 },
    "atr_sl_mult": { "min": 1.0, "max": 3.0, "step": 0.5 },
    "atr_tp_mult": { "min": 1.5, "max": 4.0, "step": 0.5 }
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `strategy` | string | 是 | 策略类型: `trend`, `breakout`, `rsi`, `all` |
| `symbols` | string[] | 是 | 交易对列表，支持 `["all"]` |
| `days` | number | 否 | 回测天数，默认 90 |
| `timeframes` | string[] | 否 | K 线周期列表，默认 `["5m"]` |
| `params` | object | 是 | 参数搜索范围（可为空 `{}`，使用默认值） |

每个参数范围：
- `min` — 最小值
- `max` — 最大值
- `step` — 步长

`params` 中只需写要覆盖的参数，未列出的参数使用策略默认值。

## 各策略参数列表

### trend（EMA 交叉趋势跟踪）

| 参数 | 默认范围 | 步长 | 说明 |
|------|----------|------|------|
| ema_fast | 8-34 | 2 | 快线 EMA 周期 |
| ema_slow | 34-120 | 4 | 慢线 EMA 周期 |
| atr_period | 10-20 | 5 | ATR 周期 |
| atr_sl_mult | 1.0-3.0 | 0.5 | 止损 ATR 倍数 |
| atr_tp_mult | 1.5-4.0 | 0.5 | 止盈 ATR 倍数 |

约束：`ema_fast < ema_slow` 且 `ema_slow - ema_fast >= 10`

### breakout（通道突破）

| 参数 | 默认范围 | 步长 | 说明 |
|------|----------|------|------|
| lookback | 10-40 | 2 | 回望周期 |
| atr_period | 10-20 | 2 | ATR 周期 |
| atr_filter | 0.3-1.0 | 0.1 | 突破过滤阈值（ATR 倍数） |
| trail_atr | 1.5-4.0 | 0.5 | 追踪止损 ATR 倍数 |

### rsi（RSI 反转）

| 参数 | 默认范围 | 步长 | 说明 |
|------|----------|------|------|
| rsi_period | 10-20 | 2 | RSI 周期 |
| rsi_oversold | 20-35 | 5 | 超卖阈值 |
| rsi_overbought | 65-80 | 5 | 超买阈值 |
| trend_ema | 100-200 | 50 | 趋势过滤 EMA |
| atr_period | 10-20 | 5 | ATR 周期 |
| atr_sl_mult | 1.0-3.0 | 0.5 | 止损 ATR 倍数 |
| atr_tp_mult | 1.5-4.0 | 0.5 | 止盈 ATR 倍数 |

约束：`rsi_oversold < rsi_overbought`

## 搜索规模估算

组合数 = 各参数取值数之积

每个参数的取值数 = `floor((max - min) / step) + 1`

实际组合数会因约束过滤而减少（如 trend 的 ema_fast < ema_slow）。

### 性能建议

| 组合数 | 预期 | 建议 |
|--------|------|------|
| < 10,000 | 快速 | 推荐 |
| 10,000-50,000 | 适中 | 正常使用 |
| 50,000-100,000 | 较慢 | 考虑缩小范围 |
| > 100,000 | 很慢 | 建议分批或缩小步长 |

## 示例

### 快速粗扫（大步长，小范围）

```json
{
  "strategy": "trend",
  "symbols": ["NTRNUSDT"],
  "days": 90,
  "timeframes": ["5m"],
  "params": {
    "ema_fast": { "min": 10, "max": 30, "step": 5 },
    "ema_slow": { "min": 40, "max": 100, "step": 10 }
  }
}
```

约 5 x 7 x 3 x 5 x 6 = 3,150 组合（过滤前）

### 精确细扫（小步长，聚焦范围）

```json
{
  "strategy": "trend",
  "symbols": ["NTRNUSDT"],
  "days": 90,
  "timeframes": ["5m"],
  "params": {
    "ema_fast": { "min": 14, "max": 24, "step": 1 },
    "ema_slow": { "min": 50, "max": 70, "step": 2 },
    "atr_sl_mult": { "min": 1.5, "max": 2.5, "step": 0.25 },
    "atr_tp_mult": { "min": 2.0, "max": 3.5, "step": 0.25 }
  }
}
```

约 11 x 11 x 3 x 5 x 7 = 12,705 组合（过滤前）
