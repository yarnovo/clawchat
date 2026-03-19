---
name: evaluate
description: 策略评估 — 分析各策略表现，生成日报，建议加配/减配/下线。定时用法：/loop 24h /evaluate
user-invocable: true
---

# 策略评估

分析所有运行中策略的表现，生成日报，给出加配/减配/下线建议。

## 流程

### 1. 生成日报

```bash
cargo run --release -p report-engine -- daily
```

### 2. 读取数据

- `records/ledger.json` — 虚拟账户快照
- `records/trades.jsonl` — 交易记录
- `records/pnl_by_strategy.jsonl` — 策略级 PnL
- `records/risk_events.jsonl` — 风控事件
- 各策略的 `signal.json` — 配额和参数

### 3. 评估每个策略

对每个 approved 策略计算：

| 指标 | 计算方式 |
|------|---------|
| 累计 PnL | ledger 的 realized_pnl |
| 虚拟权益 | allocated_capital + realized_pnl + unrealized_pnl - fees |
| 回撤 | (peak_equity - current_equity) / peak_equity |
| 最近 7 天 PnL | 从 pnl_by_strategy.jsonl 过滤 |
| 交易频率 | 最近 7 天交易次数 |
| 胜率 | wins / total trades |

### 4. 分级建议

**加配候选**（满足全部）：
- 累计 PnL > 配额的 20%
- 回撤 < 10%
- 最近 7 天 PnL > 0
- 运行 >= 7 天

**观察**（满足任一）：
- 最近 7 天 PnL < 0 但累计仍为正
- 回撤在 15%-25% 之间
- 交易频率突然下降

**减配/下线候选**（满足任一）：
- 连续 14 天负收益
- 回撤 >= 25% 配额
- 累计 PnL < -配额的 20%
- 连续 10 笔交易亏损

### 5. 输出评估报告

```
=== 策略评估报告 ===

📈 加配建议:
  ntrn-trend-v2-5m  PnL=+$5.20(+28%)  DD=3%  建议: $18→$25

👀 观察:
  bard-trend-15m  PnL=+$0.80(+4%)  DD=8%  最近 7 天 -$0.30

📉 减配/下线建议:
  bard-rsi-5m  PnL=-$2.10(-12%)  DD=18%  建议: 暂停观察
  ntrn-trend-fast-5m  PnL=-$1.50(-8%)  连续 8 笔亏损  建议: 下线

是否执行建议？
- 输入 "加配 ntrn-trend-v2-5m 25" → 修改 signal.json capital
- 输入 "暂停 bard-rsi-5m" → 写 trade.json action=pause
- 输入 "下线 ntrn-trend-fast-5m" → 写 signal.json status=suspended
```

### 6. 执行（用户确认后）

- **加配**：修改策略的 signal.json `capital` 字段
- **暂停**：写 trade.json `{"action": "pause"}`
- **下线**：修改 signal.json `status` 为 `suspended`

### 7. 记录到 notes/

```
notes/2026-03-19-evaluation.md
- 评估 10 个策略
- 加配建议: 1 个
- 下线建议: 1 个
- 全局回撤: 3.2%
```

## 定时使用

```
/loop 24h /evaluate
```
