# 跨策略相关性风控

**优先级**: P1
**来源**: 调研分析（风控/系统性风险）

## 问题

当前 16 个在线策略全是趋势跟踪类（trend/breakout/RSI），收益高度相关：
- 同一币种（如 NTRN）有多个策略，方向一致时敞口叠加
- 不同币种的趋势策略在市场体制转换时同时失效
- risk.json 有 `max_correlation_exposure` 字段标记为 TODO，尚未实现
- 缺少 `max_consecutive_losses` 熔断机制

当所有策略同向亏损时，全局回撤会快速逼近 -10% 红线。

## 需求

### 1. 相关性计算模块

新增 `shared/src/correlation.rs`：
- 计算近 14 天各策略收益的 Pearson 相关系数矩阵
- 输出 correlation matrix 到 `records/correlation_latest.json`

### 2. 风控规则

在 `engine/src/global_risk.rs` 新增：
- **相关性敞口限制**：同方向（同为多头）且相关性 > 0.7 的策略组，合计敞口不超过 portfolio 的 40%
- **连续亏损熔断**：单策略连续 5 笔亏损 → 暂停 24 小时冷却
- **组合级连续亏损**：portfolio 连续 3 天净亏损 → 所有策略仓位缩半

### 3. risk.json 配置

```json
{
  "max_correlation_exposure": 0.4,
  "max_consecutive_losses": 5,
  "portfolio_loss_streak_days": 3
}
```

### 4. ops correlation 命令

新增 `cargo run -p clawchat-ops -- correlation`：
- 显示当前策略间的相关性矩阵
- 标记高相关性策略组
- 显示各组合计敞口是否超限

## 涉及文件

- `shared/src/correlation.rs` — 新模块
- `shared/src/risk.rs` — 新增 RiskConfig 字段
- `engine/src/global_risk.rs` — 相关性风控规则
- `ops/src/` — correlation 命令

## 验收标准

- [ ] 能计算策略间收益相关性矩阵
- [ ] 高相关性策略组合计敞口受限
- [ ] 连续亏损触发自动熔断
- [ ] ops correlation 命令输出正确
