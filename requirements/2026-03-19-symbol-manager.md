# SymbolManager — 币种全链路生命周期管理

**提出来源**: 架构讨论
**优先级**: 中

## 背景
当前币种的添加/移除分散在各引擎中，没有统一管理。币种下线时无处理。

## 需求

SymbolManager 统一管理币种的全链路生命周期：

### add_symbol(symbol)
- Gateway: 建 WS 连接（独立连接或 SUBSCRIBE）
- DataStore: 开始采集 K 线
- Ledger: 允许该 symbol 的策略分配
- 风控: 注册敞口监控

### remove_symbol(symbol)
- 风控: 平掉该 symbol 所有持仓
- Worker: 停止所有该 symbol 的策略
- Ledger: 冻结该 symbol 的策略配额
- Gateway: 断开 WS
- DataStore: 停止采集（保留历史数据）
- 通知: 邮件告知

### health_check(symbol)
- WS 是否有数据
- 交易所 API 是否可下单
- 持仓是否正常

### list_symbols()
- 当前活跃的所有 symbol + 状态

## 涉及模块
- engine/src/gateway.rs — WS 连接管理
- engine/src/main.rs — 协调层
- data-engine/ — 数据采集
- shared/src/exchange.rs — 交易所 API
- 新增 engine/src/symbol_manager.rs

## 验收标准
- [ ] 新 symbol 策略上线无需重启引擎
- [ ] 币种下线自动平仓 + 停止策略 + 告警
- [ ] patrol 定时检查 symbol 健康状态
