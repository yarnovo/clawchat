# 策略生命周期自动评估

**优先级**: P2
**来源**: 调研分析（运营效率）

## 问题

当前策略生命周期管理不完整，流程是：发现 → 审批 → 运行 → 手动下线。缺少：
- **定期自动评估**：无 2 周强制评审，失效策略可能长期占用配额
- **自动下线标准**：何时认定策略失效没有量化标准
- **暂停策略复活**：当前有 ~8 个 suspended 策略（BARD 3 个、FLOKI 等），无复活评估机制
- **Alpha 衰减检测**：策略表现随时间衰减但无感知

## 需求

### 1. 定期评估机制

autopilot 每 14 天对所有 approved 策略执行评估：

**自动下线标准**（改 status → suspended）：
- 14 天累计 ROI < -5%
- 14 天 Sharpe < 0.3
- 14 天最大回撤 > 8%
- 连续 14 天无交易（信号枯竭）

**黄牌警告**（记录但不下线）：
- 14 天 ROI 在 -2% ~ 0%
- Sharpe 下降 > 50%（与上线时回测 Sharpe 对比）

### 2. Alpha 衰减检测

- 计算策略的滚动 Sharpe（7 天窗口）
- 当滚动 Sharpe 连续 3 个窗口低于回测 Sharpe 的 50% → 标记为"alpha 衰减"
- 写入 `records/alpha_decay.jsonl`

### 3. 暂停策略复活评估

每 30 天对 suspended 策略评估：
- 重新跑近 30 天回测
- 如果新回测 Sharpe > 准入标准（2.0）且 ROI > 准入标准 → 标记为 `status=pending`，等 team-lead 审批
- 写入 `discovered/` 目录（复用发现流程）

### 4. 评估报告

- 每次评估结果写入 `records/lifecycle_eval.jsonl`
- report-engine 日报中展示策略健康度

## 涉及文件

- `autopilot/src/engine.rs` — 定期评估逻辑
- `shared/src/criteria.rs` — 引用准入标准做对比
- `ops/src/` — lifecycle 查询命令

## 验收标准

- [ ] 每 14 天自动评估所有策略
- [ ] 触发下线标准的策略自动 suspended
- [ ] alpha 衰减有记录和告警
- [ ] 暂停策略每 30 天有复活评估
