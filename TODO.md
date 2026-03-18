# TODO

## 日常（持续进行）

- [ ] strategist: 找新策略（batch-backtest + grid-search，30 天达标）
- [ ] quant: CLI 工具/engine 配置/records 记录的扩展优化需求
- [ ] quant: 策略评审、风控建议
- [ ] trader: 持续监控持仓，判断加仓/减仓/锁利
- [ ] risk: 审核 risk.json、监控风控状态
- [ ] devops: 运维检查（引擎/行情/K线），异常修复
- [ ] team-lead: 定期检查提示词/文档是否过时

## 进行中

- [ ] engineer: `clawchat risk-log` 风控事件查询
- [ ] engineer2: trade.json expires_at + condition 条件触发

## 待做（P0）

### records/
- [ ] funding_rate_history.csv — 资金费率记录

### CLI
- [ ] `clawchat funding` — 资金费率查看

### 配置扩展
- [ ] risk.json: max_correlation_exposure（相关策略合并敞口）
- [ ] risk.json: max_unrealized_loss（未实现亏损上限）

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

- [x] make status 今日概览（PnL + 高水位 + 引擎健康）
- [x] make status 运维健康栏（tick/candles/signals/trades）
- [x] risk_events.jsonl + signals.jsonl 数据记录
- [x] clawchat emergency-close + correlation
- [x] clawchat report daily/weekly
- [x] filter.rs 信号过滤（trade_direction/cooldown/volume/liquidity）
- [x] funding_rate_limit
- [x] strategy.json 4 个过滤字段已实现
- [x] 生命周期 Phase 1+2
- [x] 架构重构 Phase 1/2/3
- [x] CLI 重构 + 3 配置 skill
- [x] STOP_MARKET 条件单
- [x] WS 超时重连修复
- [x] ETH 二次减仓锁利
