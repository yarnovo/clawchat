# TODO

## 进行中

- [ ] strategist: 继续找 14 天达标新策略 + grid-search 调参

## 待做（策略生命周期）

- [ ] 实盘表现差时 team-lead 决策 suspend
- [ ] 实盘评估机制：自动对比实盘表现 vs 回测表现
- [ ] 自动淘汰规则：实盘连续 3 天低于回测 30% → suspend
- [ ] 生命周期状态：discovery → backtest → approved → live → degraded → suspended → archived
- [ ] 策略归档：suspended 超期 → 移入 strategies/archived/

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
