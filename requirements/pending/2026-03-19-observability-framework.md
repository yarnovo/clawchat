# 可观测性框架

**优先级**: P1
**来源**: 架构调研（4/5 调研员标记）

## 问题

### Metrics 空白
- `engine/src/metrics.rs` 文件存在但内容为空（387 字节）
- 无性能指标：订单延迟、信号计算时间、风控触发率均不可见
- 无 Prometheus/OpenMetrics 导出

### 事件流分散
- 交易记录：`records/trades.jsonl`
- 风控事件：`records/risk_events.jsonl`
- PnL 数据：`records/pnl_by_strategy.jsonl`
- 告警事件：`alerts/` 目录
- 无统一 schema，难以做事后分析和事件重放

### 决策不可追踪
- autopilot 的每个 Decision（暂停/缩仓/停机）执行后只有最终结果，无决策链路
- 宕机后难以追踪故障原因链

## 需求

### 1. Metrics 模块

充实 `engine/src/metrics.rs`，收集关键指标：

**延迟指标**：
- 信号延迟：K 线到达 → 信号产生（ms）
- 订单延迟：信号产生 → 下单确认（ms）
- 成交延迟：下单 → 成交回报（ms）

**业务指标**：
- 每策略信号频率（signals/hour）
- 风控触发率（blocks/total_signals）
- Ledger 对账差异百分比

**系统指标**：
- WS 连接状态和重连次数
- 消息队列深度
- 内存使用

### 2. 统一事件流

新增 `shared/src/event_stream.rs`：
```rust
enum EventType {
    TradeExecution,
    RiskEvent,
    Alert,
    StateChange,
    ConfigUpdate,
    AutopilotDecision,
    Reconciliation,
    Error,
}

struct SystemEvent {
    timestamp: u64,
    event_type: EventType,
    source: String,       // engine | autopilot | discovery
    strategy: Option<String>,
    data: serde_json::Value,
}
```

所有模块通过 `EventWriter` 输出事件到 `records/events.jsonl`。

### 3. 事件查询命令

新增 `ops events` 子命令：
```bash
# 查最近 1 小时的风控事件
cargo run -p clawchat-ops -- events --type RiskEvent --hours 1

# 查某策略的完整事件链
cargo run -p clawchat-ops -- events --strategy ntrn-trend-v2-5m --hours 24

# autopilot 决策追踪
cargo run -p clawchat-ops -- events --type AutopilotDecision --hours 24
```

### 4. Metrics 输出

- 本地：定期写入 `records/metrics.jsonl`（每 60 秒一个快照）
- 可选：Prometheus `/metrics` endpoint（未来扩展）

## 涉及文件

- `engine/src/metrics.rs` — 填充指标收集逻辑
- 新增 `shared/src/event_stream.rs` — 统一事件定义
- `engine/src/order_router.rs` — 延迟打点
- `engine/src/event_loop.rs` — 系统指标采集
- `autopilot/src/engine.rs` — Decision 事件输出
- 新增 `ops/src/cmd/events.rs` — 事件查询命令

## 验收标准

- [ ] metrics.rs 输出订单延迟、信号频率、风控触发率
- [ ] 所有模块通过 EventWriter 输出统一格式事件
- [ ] `ops events` 命令可按类型、策略、时间范围查询
- [ ] metrics.jsonl 每 60 秒更新一次
