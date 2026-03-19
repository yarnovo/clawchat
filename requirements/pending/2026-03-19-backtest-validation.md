# 回测验证增强

**优先级**: P2
**来源**: 调研分析（策略质量）

## 问题

当前回测框架存在多项局限，导致回测结果与实盘偏差巨大（snapshot 显示所有策略实盘 $+0.00，但回测 ROI 高达 24-224%）：

1. **无 Out-of-Sample 验证**：全量数据用于拟合，无法检测过拟合
2. **回测窗口仅 30 天**：样本太小，幸存者偏差严重
3. **滑点模型不精确**：硬编码 0.02%，实际大单滑点可能 0.5%+
4. **无 Paper Trading 阶段**：策略直接从回测跳到实盘，无中间验证

## 需求

### 1. Out-of-Sample 验证

修改发现引擎的评估流程：
- 将回测数据分为 In-Sample（前 70%）和 Out-of-Sample（后 30%）
- IS 用于参数优化，OOS 用于验证
- OOS Sharpe < IS Sharpe × 0.5 → 标记为"过拟合嫌疑"，不推荐

### 2. 回测窗口扩展

- 最低回测窗口从 30 天提升到 60 天
- 推荐窗口 90 天（如果数据足够）
- 数据不足 60 天的币种在评估报告中标记"短窗口风险"

### 3. 动态滑点模型

在回测中使用更真实的滑点模型：
```
slippage = base_slippage + (order_size / adv_24h) * impact_factor
```
- `base_slippage`: 0.02%（小单基础滑点）
- `impact_factor`: 0.5（经验系数）
- 需要 ADV 数据支持（与容量追踪需求协同）

### 4. Paper Trading 阶段（可选，二期）

- 新策略上线后前 7 天强制 dry-run 模式
- dry-run 期间记录虚拟 PnL
- 7 天 dry-run ROI > 0 且 Sharpe > 1.0 → 自动切换为 live
- 否则 → 回退为 suspended

## 涉及文件

- `discovery/src/evaluator.rs` — OOS 分割和验证
- `ops/src/backtest/mod.rs` — 滑点模型增强
- `shared/src/criteria.rs` — 最低回测窗口调整
- `engine/src/main.rs` — paper trading 模式（二期）

## 验收标准

- [ ] 发现引擎使用 IS/OOS 分割验证
- [ ] 过拟合候选被自动过滤
- [ ] 回测窗口最低 60 天
- [ ] 滑点模型考虑订单大小和流动性
