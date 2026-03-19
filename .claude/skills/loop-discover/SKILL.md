---
name: loop-discover
description: 策略发现+预审 — 扫描参数空间、发现新策略、自动预审。定时用法：/loop 24h /discover-and-review
user-invocable: true
---

# 策略发现 + 预审

自动执行策略发现引擎，然后对结果做预审，生成审批建议。

## 流程

### 1. 运行策略发现

```bash
cargo run --release -p discovery -- scan --strategy all --symbol all --days 90 --timeframe all
```

等待完成，观察输出。

### 2. 检查 discovered/ 目录

扫描 `discovered/*/signal.json`，列出所有新发现的 pending 策略。

如果没有新发现 → 输出"本轮未发现新策略"并结束。

### 3. 自动预审

对每个候选策略检查：

**回测质量**：
- Sharpe >= 5（准入标准）
- 样本外验证是否通过（看 signal.json 里的 backtest 数据）
- Stability score >= 0.5

**冲突检查**：
- 读取 `accounts/binance-main/portfolios/main/strategies/*/signal.json`
- 同币种已有多少个策略（上限 4 个）
- 与已有策略参数是否太相似

**配额检查**：
- 读取 `accounts/binance-main/portfolios/main/portfolio.json` 获取总配额
- 计算已分配总额 → 剩余可用配额
- 每个新策略至少需要 $15

### 4. 生成审批建议

```
=== 策略发现 + 预审报告 ===

本轮发现 5 个候选策略，建议上线 2 个：

✅ bard-breakout-lb24-15m
   Sharpe=8.2 ROI=45% DD=12% Stability=0.85
   建议配额: $18
   理由: BARD 只有 3 个策略，配额充足

✅ lyn-rsi-rsi14os30-5m
   Sharpe=7.3 ROI=52% DD=5% Stability=0.67
   建议配额: $20
   理由: LYN 只有 1 个策略，应该多样化

❌ ntrn-trend-ema20122-5m（跳过）
   理由: NTRN 已有 4 个策略

❌ bard-trend-ema3286-15m（跳过）
   理由: 与 bard-trend-15m 参数相似（ema_slow 差 < 10%）

❌ lyn-trend-ema1074-15m（跳过）
   理由: DD=19.3% 接近准入红线，风险偏高

是否执行上线？
```

### 5. 等待确认

向用户展示报告，等待确认。

### 6. 执行上线（确认后）

对每个被批准的策略：
1. 将 signal.json 的 status 改为 `approved`
2. 设置 capital 为分配的配额
3. 生成默认 risk.json（复制同币种已有策略的 risk.json，或使用默认模板）：
```json
{
  "max_loss_per_trade": 0.05,
  "max_daily_loss": 0.15,
  "max_leverage": 5,
  "hwm_drawdown_limit": 0.25,
  "funding_rate_limit": 0.001
}
```
4. 生成默认 trade.json: `{"action": "none"}`
5. 将整个策略目录从 `discovered/{name}/` 移动到 `accounts/binance-main/portfolios/main/strategies/{name}/`
6. 删除 discovered/ 中被跳过的策略目录

### 7. 报告结果

```
已上线 1 个策略:
  ✅ bard-breakout-lb24-15m → accounts/.../strategies/
     capital=$18, status=approved

已跳过 1 个策略:
  ❌ ntrn-trend-ema20122-5m（已清理）

交易引擎将在下次启动时自动加载新策略。
```

## 在 notes/ 记录

每次运行后写一条到 `notes/`：
```
notes/2026-03-19-discovery-run.md
- 扫描范围：3 策略类型 × 5 币种 × 2 周期
- 总组合：~59000
- 发现：5 个候选
- 建议上线：2 个
```

## 定时使用

```
/loop 24h /discover-and-review
```
