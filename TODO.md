# TODO

## 进行中

- [ ] engineer: 文件监听热更新（notify crate，strategy.json + risk.json）
- [ ] engineer: sizing_mode 支持（percent/fixed）
- [ ] engineer: backtest.py 支持 --params 自定义参数

## 待做

- [ ] state.json 在 make status 中展示策略运行状态
- [ ] risk-engine state.json 持久化（daily_loss/consecutive_losses）
- [ ] 删除 Python risk_guard（Rust 已替代）
- [ ] 策略表现栏等交易日志产生数据后验证

## 已完成

- [x] 分页拉取（backtest.py 突破 1000 根限制）
- [x] 均值回归策略（backtest.py + Rust 引擎）
- [x] 87 个测试全通过（71 lib + 16 risk-engine）
- [x] 双 Rust binary（hft-engine + risk-engine）
- [x] strategy.json 验证（config.rs validate）
- [x] pre-trade check 集成
- [x] risk-engine WebSocket 实时风控
- [x] 高水位利润保护
- [x] 交易日志（trades.jsonl）
- [x] 策略 P&L 聚合（strategy_pnl.py）
- [x] hft-engine state.json 持久化（71→87 tests）
- [x] 注册表 key 改策略名
- [x] status.py 检测 Rust risk-engine
- [x] 止盈线差异化（strategist 自定义）
- [x] 胜率标准改 ≥50%
- [x] engine/SCHEMA.md 格式规范
- [x] make status 全局面板
- [x] make transfer 划转
