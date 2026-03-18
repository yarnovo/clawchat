# TODO

## 进行中

- [ ] engineer: 策略生命周期 Phase 1（lifecycle 字段 + clawchat review 命令）
- [ ] strategist: 继续找 14 天达标新策略 + grid-search 调参

## 待做（策略生命周期）

### Phase 2：自动检测
- [ ] degradation 自动检测（滚动 7 天窗口）
- [ ] probation → active 自动升级
- [ ] degraded → suspended 自动降级

### Phase 3：资金分配
- [ ] `clawchat rebalance` 三池模型（储备30%/运营50%/研发20%）
- [ ] 运营池按 sharpe 加权分配
- [ ] probation 策略用研发池资金

## 待做（技术）

- [ ] 开仓时同时挂 STOP_MARKET 条件单（交易所侧安全网）
- [ ] 全局 portfolio 检查通过读 state.json
- [ ] suspended 策略 trade.json 执行方案

## 已完成

- [x] **架构重构 Phase 1/2/3** — 统一决策管道 + 风控合并 + 清理
- [x] **CLI 重构** — scripts→cli 独立 Python 项目
- [x] **3 个配置 skill** — strategy-config / trade-config / risk-config
- [x] **pytest 57 测试 + lefthook pre-commit**
- [x] **trade.json params fix + risk.json 热更新**（QA1 验证）
- [x] **6 个 approved 策略**（PIPPIN/NTRN/BARD/LYN × 4 币种分散）
- [x] ETH 减仓 50% 锁利
- [x] 批量回测 + 参数网格搜索 + 实盘对比工具
- [x] 准入标准统一到 criteria.py
- [x] Makefile 精简（CLI + Rust 分离）
- [x] records/ 目录 + .gitignore
