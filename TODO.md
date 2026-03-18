# TODO

## 进行中

- [ ] engineer: 生命周期 Phase 2（自动 degradation 检测 + 状态升降级）
- [ ] strategist: 继续找 14 天达标新策略

## 待做（策略生命周期）

### Phase 3：资金分配
- [ ] `clawchat rebalance` 三池模型（储备30%/运营50%/研发20%）
- [ ] 运营池按 sharpe 加权分配
- [ ] probation 策略用研发池资金

## 待做（技术）

- [ ] 开仓时同时挂 STOP_MARKET 条件单
- [ ] 全局 portfolio 检查通过读 state.json
- [ ] suspended 策略 trade.json 执行方案

## 已完成

- [x] **生命周期 Phase 1** — lifecycle 字段 + clawchat review + 77 pytest
- [x] **架构重构 Phase 1/2/3** — 统一决策管道 + 风控合并 + 清理
- [x] **CLI 重构** — scripts→cli 独立 Python 项目
- [x] **3 个配置 skill** — strategy-config / trade-config / risk-config
- [x] **211 测试**（77 Python + 134 Rust）+ lefthook pre-commit
- [x] **6 个 approved 策略** + ETH 减仓锁利
- [x] 删除 SCHEMA.md（skill 替代）
