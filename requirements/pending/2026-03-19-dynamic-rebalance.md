# 动态资金再平衡

**优先级**: P1
**来源**: 调研分析（资金管理效率）

## 问题

当前 autopilot 能暂停/缩仓策略，但缺少正向的资金再平衡：
- 赚钱策略的 equity 增长后，配额不会自动增加（钱在账户里闲着）
- 亏钱策略的配额不会自动缩减释放给表现好的策略
- 无 rebalance 触发机制，配额分配一旦确定就不变
- NTRN 占 portfolio 54%，但如果表现衰退，配额不会自动流向表现好的币种

## 需求

### 1. Rebalance 评估规则

在 autopilot 中新增定期（每 24 小时）评估：

**扩仓条件**（配额增加）：
- 策略近 7 天 ROI > 3% 且 Sharpe > 2.0
- 容量利用率 < 60%（有空间扩仓）
- 扩仓幅度：当前配额 × 1.2（每次最多加 20%）

**缩仓条件**（配额减少）：
- 策略近 7 天 ROI < -2% 或 Sharpe < 0.5
- 缩仓幅度：当前配额 × 0.7（每次最多减 30%）

**释放配额**：
- 缩仓释放的配额进入 reserve pool
- reserve pool 的资金优先分配给满足扩仓条件的策略

### 2. Rebalance 执行

- autopilot 写 `trade.json` 调整配额（复用已有机制）
- 调整后写日志到 `records/rebalance.jsonl`
- 单次 rebalance 总配额变动不超过 portfolio 的 10%

### 3. ops rebalance 命令

新增 `cargo run -p clawchat-ops -- rebalance`：
- 显示各策略当前配额和建议调整
- `--dry-run` 模式只计算不执行
- 显示近 7 天 rebalance 历史

## 涉及文件

- `autopilot/src/engine.rs` — rebalance 评估和执行
- `ops/src/` — rebalance 命令

## 验收标准

- [ ] 每 24 小时自动评估 rebalance
- [ ] 赚钱策略自动扩仓，亏钱策略自动缩仓
- [ ] rebalance 记录写入 rebalance.jsonl
- [ ] ops rebalance 命令可查询和 dry-run
