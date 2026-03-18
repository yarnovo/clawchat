# TODO

## 进行中

- [ ] engineer: 生命周期 Phase 3 资金分配（clawchat rebalance）
- [ ] strategist: 找新的 30 天达标策略

## 待做（P0 — quant+quant2 评审）

### records/ 数据补全
- [ ] risk_events.jsonl — 风控触发日志（当前只有 tracing log）
- [ ] signals.jsonl — 策略信号日志（信号 vs 成交对比）
- [ ] funding_rate_history.csv — 资金费率（永续合约隐性成本）

### CLI 工具
- [ ] `clawchat report daily/weekly` — 报告生成（quant 负责分析）
- [ ] `clawchat risk-log` — 风控事件查询
- [ ] `clawchat correlation` — 策略相关性分析
- [ ] `clawchat funding` — 资金费率查看
- [ ] `clawchat emergency-close` — 紧急全平

### 配置扩展
- [ ] strategy.json: trade_direction（long_only/short_only/both）
- [ ] strategy.json: min_volume_filter（成交量门槛）
- [ ] strategy.json: cooldown_bars（信号冷却期）
- [ ] strategy.json: liquidity_guard（流动性门槛）
- [ ] trade.json: expires_at（指令过期）
- [ ] trade.json: condition（条件触发）
- [ ] risk.json: funding_rate_limit（资金费率风控）
- [ ] risk.json: max_correlation_exposure（相关策略合并敞口）
- [ ] risk.json: max_unrealized_loss（未实现亏损上限）

## 待做（P1）

- [ ] slippage.csv + `clawchat slippage`
- [ ] daily_summary.csv
- [ ] `clawchat decay` — alpha 衰减检测
- [ ] risk.json: volatility_regime（高波动降仓）
- [ ] trade.json: scale_in（分批建仓）
- [ ] 全局 portfolio 检查通过读 state.json

## 已完成

- [x] **生命周期 Phase 1+2** — lifecycle + review + 自动检测
- [x] **架构重构 Phase 1/2/3** — 统一决策管道
- [x] **CLI 重构** — scripts→cli
- [x] **STOP_MARKET 条件单** — 交易所侧安全网
- [x] **3 个配置 skill** + **quant 角色**
- [x] **235 测试**（101 Python + 134 Rust）+ lefthook
- [x] **6→5 approved 策略**（pippin suspended，ntrn 降杠杆）
- [x] ETH 减仓 50% 锁利
- [x] 删除 SCHEMA.md（skill 替代）
