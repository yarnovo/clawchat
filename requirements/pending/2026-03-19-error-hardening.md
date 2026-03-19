# 错误处理硬化与优雅关闭

**优先级**: P0
**来源**: 架构调研（3/5 调研员标记为最关键）

## 问题

生产代码中存在 **337 处 unwrap/expect/panic!** 调用，任何异常输入或网络中断都可能导致引擎进程崩溃：

- engine/ 占大头：gateway.rs、order_router.rs、event_loop.rs 中大量裸 unwrap
- shared/ 有 165 处 panic 点 — 这是所有 7 个 crate 的共享依赖，风险放大
- 单进程架构下，一个策略的 panic 会杀死所有策略
- 无优雅关闭：SIGTERM 直接杀进程，可能丢失 pending 订单确认、ledger 未保存

1 万年运营中，这意味着每次异常网络波动、API 返回异常数据都可能导致全系统宕机。

## 需求

### 1. 错误类型统一

定义统一的错误类型层次（`shared/src/error.rs`）：
```rust
pub enum EngineError {
    Exchange(ExchangeError),    // API 调用失败
    Strategy(StrategyError),    // 策略计算异常
    Risk(RiskError),            // 风控检查失败
    Ledger(LedgerError),        // 账本操作失败
    Io(std::io::Error),         // 文件 IO
    Config(ConfigError),        // 配置解析
}
```

### 2. 消除关键路径 panic

- order_router、gateway、event_loop 中的 unwrap 全部替换为 `?` 或降级处理
- 关键路径（下单链路）panic 点必须为零
- 非关键路径（日志、报告）允许 warn + 跳过

### 3. 优雅关闭

注册 SIGTERM/SIGINT 处理器：
1. 暂停接收新信号
2. 等待 pending 订单确认（最多 30 秒）
3. 保存 ledger.json（带 fsync）
4. 写入关闭日志
5. 退出

### 4. Ledger WAL（Write-Ahead Log）

ledger.json 写入前先追加到 WAL 文件：
- 每次余额变更追加一行到 `records/ledger_wal.jsonl`
- 定期（10 秒）将 WAL 合并到 ledger.json 快照
- 宕机恢复时：最新快照 + WAL 重放 = 精确恢复

## 涉及文件

- 新增 `shared/src/error.rs` — 统一错误类型
- `engine/src/gateway.rs` — 替换 unwrap
- `engine/src/order_router.rs` — 替换 unwrap
- `engine/src/event_loop.rs` — 替换 unwrap + 优雅关闭
- `engine/src/ledger.rs` — WAL 机制
- `engine/src/main.rs` — SIGTERM 处理

## 验收标准

- [ ] 关键路径（order_router、gateway、event_loop）zero panic
- [ ] SIGTERM 后 30 秒内优雅退出，ledger 数据完整
- [ ] WAL 机制保证宕机不丢失最近 10 秒的余额变更
- [ ] `cargo test` 通过
