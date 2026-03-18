# TODO

## 进行中

- [ ] strategist: 继续找 14 天达标新策略

## 待做（架构重构 — 双 architect 评审通过）

### Phase 1：统一决策管道（~250 行改动）
- [ ] 新增 trade.json 格式（action: hold/close_all/pause/resume/stop/reduce/add + params）
- [ ] main.rs 加 DecisionGate：strategy 信号 → trade override → risk gate → executor
- [ ] risk.rs 新增 RiskGate（从 risk_engine.rs 提取核心检查逻辑）
- [ ] main.rs 加 user data stream（持仓/余额实时更新）
- [ ] 一次性指令执行后自动回 hold + 写 executed_at
- [ ] SCHEMA.md 更新 trade.json 格式
- [ ] 开仓时同时挂 STOP_MARKET 条件单（交易所侧安全网）

### Phase 2：合并风控到主进程
- [ ] hft-engine 内做止损/止盈/高水位保护
- [ ] risk-engine 降级为监控报警（只看不操作）
- [ ] 全局 portfolio 检查通过读 state.json

### Phase 3：清理
- [ ] 删除 risk_engine.rs 二进制
- [ ] 删除 /tmp/hft-engines.json
- [ ] Makefile 合并 target

## 待做（策略生命周期）

- [ ] 实盘表现差时 team-lead 决策 suspend
- [ ] 实盘评估机制：自动对比实盘表现 vs 回测表现
- [ ] 自动淘汰规则：实盘连续 3 天低于回测 30% → suspend
- [ ] 生命周期状态：discovery → backtest → approved → live → degraded → suspended → archived
- [ ] 策略归档：suspended 超期 → 移入 strategies/archived/

## 待做（技术）

- [ ] 策略表现栏等交易日志产生数据后验证

## 已完成

- [x] sizing_mode 支持（percent/fixed）
- [x] risk-engine state.json 持久化
- [x] 删除 Python risk_guard
- [x] state.json 在 make status 中展示
- [x] risk-engine 编译错误修复
- [x] ntrn-trend-fast-5m 上架（14 天严格达标）
- [x] suspend 旧策略 + BARD/LYN 验证上架
- [x] backtest.py 支持 --params 自定义参数
- [x] 分页拉取（14 天回测）
- [x] 均值回归 + grid 策略实现
- [x] risk-engine 文件监听热更新
- [x] hft-engine 文件监听热更新
- [x] 百分比下单（position_size）
- [x] 双 Rust binary（hft-engine + risk-engine）
- [x] strategy.json 验证
- [x] pre-trade check 集成
- [x] risk-engine WebSocket 实时风控
- [x] 高水位利润保护
- [x] 交易日志 + 策略 P&L 聚合
- [x] hft-engine state.json 持久化
- [x] 批量回测 + 参数网格搜索
- [x] 实盘 vs 回测对比工具
- [x] 准入标准统一到 criteria.py
- [x] make status 全局面板
- [x] make transfer 划转
