# TODO

## 日常（持续进行）

- [ ] strategist: 找新策略（batch-backtest + grid-search，30 天达标）
- [ ] quant: CLI 量化工具扩展优化（新命令/改进现有工具）
- [ ] quant: engine 配置扩展优化（strategy/trade/risk json 字段能力）
- [ ] quant: records 记录扩展优化（缺什么数据、格式改进）
- [ ] quant: 策略评审、风控建议
- [ ] trader: 持续监控持仓，判断加仓/减仓/锁利
- [ ] risk: 审核 risk.json、监控风控状态、评估风控规则是否合理
- [ ] devops: 运维检查（引擎是否在线/行情是否在流/K线是否增长），异常立即修复
- [ ] team-lead: 定期检查提示词/文档是否过时，同步到最新架构

## 进行中

- [ ] engineer: 下一个 P0 任务待派

## 待做（P0）

### records/ 数据
- [ ] funding_rate_history.csv — 资金费率

### CLI 工具
- [ ] `make status` 加运维健康栏（最后 tick 时间/K 线数/信号数，超时标红）
- [ ] `clawchat risk-log` — 风控事件查询
- [ ] `clawchat funding` — 资金费率查看

### 配置扩展
- [ ] strategy.json: trade_direction / min_volume_filter / cooldown_bars / liquidity_guard
- [ ] trade.json: expires_at / condition（条件触发）
- [ ] risk.json: funding_rate_limit / max_correlation_exposure / max_unrealized_loss

### 生命周期
- [ ] Phase 3: `clawchat rebalance` 资金三池分配

## 待做（P1）

- [ ] slippage.csv + `clawchat slippage`
- [ ] daily_summary.csv
- [ ] `clawchat decay` — alpha 衰减检测
- [ ] risk.json: volatility_regime
- [ ] trade.json: scale_in 分批建仓
- [ ] 全局 portfolio 检查

## 已完成

- [x] 生命周期 Phase 1+2
- [x] 架构重构 Phase 1/2/3
- [x] CLI 重构 + 3 配置 skill
- [x] STOP_MARKET 条件单
- [x] 254 测试 + lefthook
- [x] strategist 合并到 quant
- [x] ETH 减仓锁利 + pippin suspended + ntrn 降杠杆
