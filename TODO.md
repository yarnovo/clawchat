# TODO

## 进行中

- [ ] engineer: CLI 重构（scripts→cli，进行中）
- [x] trader: ETH 减仓 50%（手动执行成功 orderId=8389766132631757231）
- [ ] strategist: 继续找 14 天达标新策略 + grid-search 调参

## 待做（新）

- [ ] 创建 3 个 skill（strategy.json / trade.json / risk.json 编写规范）
- [ ] CLI pytest 测试（P0: criteria + exchange 签名 + 回测指标计算）
- [ ] GitHub Actions CI（.github/workflows/ci.yml）
- [ ] Makefile 加 `make test`（cargo test + uv run pytest）
- [x] 修复 trade.json params percent + direction（QA1 验证通过）
- [x] risk.json 热更新 start_risk_watcher（QA1 验证通过）
- [ ] suspended 策略的 trade.json 怎么执行？（没引擎监听）

## 待做（策略生命周期 — architect+strategist+trader 讨论通过）

### Phase 1：基础（先做）
- [ ] strategy.json 加 lifecycle 字段（created/approved/probation_end/last_review）
- [ ] `clawchat review` 命令：生成 performance.json（实盘指标 + vs 回测偏离度）
- [ ] 状态扩展：candidate → approved → probation → active → degraded → suspended

### Phase 2：自动检测
- [ ] degradation 自动检测（滚动 7 天窗口：收益<-5% / 胜率<回测60% / 连亏>=5）
- [ ] probation → active 自动升级（7 天实盘达标）
- [ ] degraded → suspended 自动降级（7 天未恢复）

### Phase 3：资金分配
- [ ] `clawchat rebalance` 命令：三池模型（储备30%/运营50%/研发20%）
- [ ] 运营池按 sharpe 加权分配
- [ ] probation 策略用研发池资金（position_size 减半）

## 待做（技术）

- [ ] 策略表现栏等交易日志产生数据后验证
- [ ] 开仓时同时挂 STOP_MARKET 条件单（交易所侧安全网）
- [ ] 全局 portfolio 检查通过读 state.json

## 已完成

- [x] **架构重构 Phase 1/2/3 全部完成**
  - Phase 1: trade.json + DecisionGate + RiskGate（130 tests）
  - Phase 2: 风控合并到主进程（148 tests）
  - Phase 3: 删除 risk-engine（132 tests）
- [x] PIPPIN scalping vol_mult 1.2→1.0（team-lead 验证）
- [x] SCHEMA.md 补 trade.json 文档
- [x] 准入标准统一到 criteria.py
- [x] 批量回测 + 参数网格搜索
- [x] 实盘 vs 回测对比工具
- [x] LYN trend + BARD breakout 验证上架
- [x] sizing_mode 支持（percent/fixed）
- [x] risk-engine state.json 持久化
- [x] 删除 Python risk_guard
- [x] state.json 在 make status 中展示
- [x] 分页拉取 + 均值回归 + grid 策略
- [x] 文件监听热更新（notify crate）
- [x] 百分比下单（position_size）
- [x] strategy.json 验证 + pre-trade check
- [x] WebSocket 实时风控 + 高水位利润保护
- [x] 交易日志 + 策略 P&L 聚合
- [x] hft-engine state.json 持久化
- [x] make status 全局面板 + make transfer
