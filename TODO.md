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

- [ ] quant: 报告引擎业务需求（需要哪些报告 + 频率 + 指标）
- [ ] strategist: SUI trend 15m 策略创建（已达标）+ floki 优化
- [ ] engineer2: 报告引擎（Report Engine）实现
- [ ] engineer: risk.json max_unrealized_loss 实现（architect 设计完成）

## 待做（P0）

### records/
- [ ] funding_rate_history.csv — 资金费率记录

### CLI
- [ ] `clawchat funding` — 资金费率查看

### 配置扩展
- [ ] risk.json: max_correlation_exposure（相关策略合并敞口）
- [ ] risk.json: max_unrealized_loss（未实现亏损上限）

### 业务扩展（quant 建议）
- [ ] P0: 闲置资金活期理财（Earn API，$113 闲钱）
- [ ] P0: Funding Rate 策略（结算前反向开仓收费率）
- [ ] P1: 期现套利（需接入现货 API）

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
- [x] clawchat risk-log 风控事件查询
- [x] trade.json expires_at + condition 条件触发
- [x] floki-trend-15m risk.json 审核（不达标：胜率50%/盈亏比1.82）
- [x] bard-ema2050-15m / bard-trend-v2-15m 审核（均因胜率不达标 suspended）
- [x] 报告引擎技术方案设计（architect 完成，Python 调度器方案）
- [x] BARD/LYN 引擎超时排查（devops 确认正常，15m K线收盘间隔导致显示延迟）
- [x] risk.json 扩展方案设计（architect 完成：max_unrealized_loss + max_correlation_exposure）
- [x] SUI trend 15m 策略发现、验证、批准上架（第 7 个运行策略）
- [x] clawchat funding CLI + funding_rate_history.csv 引擎记录（engineer2 完成，413 tests）
