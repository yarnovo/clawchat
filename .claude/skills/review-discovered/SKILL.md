---
name: review-discovered
description: 审批策略发现引擎产出的 pending 策略 — 检查冲突、分配配额、上线到组合
user-invocable: true
---

# 审批已发现策略

巡检 `discovered/` 目录，审批策略发现引擎产出的 pending 策略。

## 流程

### 1. 扫描 discovered/ 目录

读取 `discovered/*/signal.json`，列出所有待审批策略。如果目录为空，报告"无待审批策略"并结束。

### 2. 加载当前组合状态

- 读取 `accounts/binance-main/portfolios/main/portfolio.json` 获取配额和风险预算
- 扫描 `accounts/binance-main/portfolios/main/strategies/*/signal.json` 获取已有策略列表
- 计算：已分配配额总和、剩余可用配额、各币种策略数量

### 3. 逐个评估

对每个 pending 策略检查：

**准入检查**：
- [ ] 回测指标是否满足 `shared/src/criteria.rs` 的 CRITERIA 标准
- [ ] status 是否为 pending

**冲突检查**：
- [ ] 同名策略是否已存在于 accounts/.../strategies/ 中
- [ ] 同币种已有多少个策略（建议 <= 4 个）
- [ ] 与已有策略参数是否太相似（同类型同币种，核心参数差异 < 10%）

**配额检查**：
- [ ] 当前剩余可用配额是否足够（建议每策略最低 $15）
- [ ] 分配建议：参考同币种其他策略的配额

### 4. 生成审批报告

对每个策略给出建议：

```
=== 策略审批报告 ===

✅ 建议上线:
  bard-breakout-lb24-15m
    回测: Sharpe=8.2 ROI=45% DD=12% Trades=35
    建议配额: $18
    理由: BARD 当前只有 3 个策略，配额充足

❌ 建议跳过:
  ntrn-trend-ema20122-5m
    理由: NTRN 已有 4 个策略，且与 ntrn-trend-v2-5m 参数相似

剩余可用配额: $19 → 上线后: $1
```

### 5. 等待确认

向用户展示报告，等待确认。

### 6. 执行上线（确认后）

对每个被批准的策略：
1. 将 signal.json 的 status 改为 `approved`
2. 设置 capital 为分配的配额
3. 生成默认 risk.json（复制同币种已有策略的 risk.json，或使用默认模板）
4. 生成默认 trade.json: `{"action": "none"}`
5. 将整个策略目录从 `discovered/{name}/` 移动到 `accounts/binance-main/portfolios/main/strategies/{name}/`
6. 删除 discovered/ 中已处理的目录

### 7. 报告结果

```
已上线 1 个策略:
  ✅ bard-breakout-lb24-15m → accounts/.../strategies/bard-breakout-lb24-15m/
     capital=$18, status=approved

已跳过 1 个策略:
  ❌ ntrn-trend-ema20122-5m（已删除 discovered/ 中的文件）

交易引擎将在下次启动时自动加载新策略。
```

## 默认 risk.json 模板

```json
{
  "max_loss_per_trade": 0.05,
  "max_daily_loss": 0.15,
  "max_leverage": 5,
  "hwm_drawdown_limit": 0.25,
  "funding_rate_limit": 0.001
}
```

## 注意事项

- **只有 team-lead 可以改 status 为 approved**（CLAUDE.md 规则）
- 执行前必须等用户确认
- 不修改已有的 approved 策略
- 如果剩余配额不足，可以建议减配已有策略或跳过新策略
