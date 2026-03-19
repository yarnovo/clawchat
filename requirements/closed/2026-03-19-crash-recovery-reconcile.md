# 宕机恢复与交易所对账

**优先级**: P1
**来源**: 调研分析（基础设施 + 增长路径）

## 问题

当前引擎异常退出后：
1. ledger.json 可能比实际持仓滞后 60 秒（每分钟保存一次）
2. 重启时不会与 Binance 实际持仓对账
3. 若下单后网络中断，本地认为已下单但交易所未收到
4. 无 pending 订单管理，信号变化后无法撤销未成交订单

随着资金增长，任何一次不一致都可能造成严重损失。

## 需求

### 1. 启动对账（Reconciliation）

引擎启动时自动执行：
1. 从 Binance `GET /fapi/v2/positionRisk` 拉取所有实际持仓
2. 与本地 ledger.json 对比
3. 差异处理：
   - 本地有、交易所无 → 标记为"幽灵持仓"，清除本地记录
   - 交易所有、本地无 → 标记为"未记录持仓"，补录到 ledger
   - 数量不一致 → 以交易所为准，调整本地
4. 差异写入 `records/reconcile_events.jsonl`

### 2. 订单确认与重试

下单后增加确认流程：
1. 市价单：REST 返回后，查询订单状态确认已成交
2. 若 3 秒内未确认 → 重试一次
3. 若仍未确认 → 写入 `records/failed_orders.jsonl`，告警

### 3. Ledger 保存频率提升

- 当前：每 60 秒保存一次
- 改为：每次成交后立即保存（或每 10 秒）
- 减少宕机时的数据丢失窗口

### 4. 优雅关闭（Graceful Shutdown）

收到 SIGTERM/SIGINT 时：
1. 停止接收新信号
2. 等待所有 pending 订单完成（最多 10 秒）
3. 保存 ledger.json
4. 退出

## 涉及文件

- `engine/src/main.rs` — 启动时对账、优雅关闭
- `engine/src/order_router.rs` — 订单确认与重试
- `engine/src/ledger.rs` — 保存频率
- `shared/src/exchange.rs` — 新增 positionRisk 查询接口

## 验收标准

- [ ] 引擎启动时自动对账，差异记录到文件
- [ ] 市价单有确认和重试机制
- [ ] ledger 保存频率 <= 10 秒
- [ ] SIGTERM 优雅关闭，不丢失数据
