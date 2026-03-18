# TODO

## 进行中

- [ ] strategist: 继续找 14 天达标新策略

## 待做（策略生命周期）

- [ ] 实盘表现差时 team-lead 决策 suspend（risk-engine 只负责风控，不改 strategy status）
- [ ] 实盘评估机制：自动对比实盘表现 vs 回测表现
- [ ] 自动淘汰规则：实盘连续 3 天低于回测 30% → suspend
- [ ] 生命周期状态：discovery → backtest → approved → live → degraded → suspended → archived
- [ ] 策略归档：suspended 超期 → 移入 strategies/archived/

## 待做（交易员）

- [ ] risk.json 新增 override 字段（action: hold/close_all/pause/resume/stop/reduce + params）
- [ ] risk-engine 读取 override 执行人工干预指令
- [ ] 优先级：override > risk rules > strategy signals

## 待做（技术）

- [ ] 策略表现栏等交易日志产生数据后验证

## 已完成

- [x] sizing_mode 支持（percent/fixed）— 78 lib 测试通过，review 通过
- [x] risk-engine state.json 持久化 — daily_loss/consecutive_losses，94 测试通过
- [x] 删除 Python risk_guard — Rust risk-engine 已替代
- [x] state.json 在 make status 中展示 — 策略运行状态 + 风控状态
- [x] risk-engine 编译错误修复
- [x] ntrn-trend-fast-5m 上架（14 天严格达标 +38%）
- [x] ntrn-trend-5m suspended（被 fast 版替代）
- [x] suspend 4 个旧策略（14 天不达标）
- [x] backtest.py 支持 --params 自定义参数
- [x] NTRN trend 5m 3x 上架
- [x] 分页拉取（backtest.py 突破 1000 根限制）
- [x] 均值回归策略（backtest.py + Rust 引擎）
- [x] risk-engine 文件监听热更新（notify crate）
- [x] hft-engine 文件监听 strategy.json 热更新
- [x] 百分比下单（position_size），移除复利/dynamic_qty
- [x] 双 Rust binary（hft-engine + risk-engine）
- [x] strategy.json 验证（config.rs validate）
- [x] pre-trade check 集成
- [x] risk-engine WebSocket 实时风控
- [x] 高水位利润保护
- [x] 交易日志（trades.jsonl）
- [x] 策略 P&L 聚合（strategy_pnl.py）
- [x] hft-engine state.json 持久化
- [x] 注册表 key 改策略名
- [x] status.py 检测 Rust risk-engine
- [x] 止盈线差异化（strategist 自定义）
- [x] 准入标准改为 14 天回测
- [x] engine/SCHEMA.md 格式规范
- [x] make status 全局面板
- [x] make transfer 划转
