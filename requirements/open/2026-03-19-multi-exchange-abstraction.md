# 多交易所抽象层

## 优先级：P2

## 背景

当前系统仅支持 Binance FAPI，存在：
- 单点故障风险（Binance 宕机 = 全停）
- 仓位上限 100 个（$100K+ 时撞限）
- 无法跨交易所套利
- 流动性来源单一

## 需求

### 1. Exchange Adapter Trait

```rust
pub trait ExchangeAdapter: Send + Sync {
    async fn place_order(&self, req: OrderRequest) -> Result<OrderResponse>;
    async fn cancel_order(&self, symbol: &str, order_id: &str) -> Result<()>;
    async fn get_positions(&self) -> Result<Vec<Position>>;
    async fn get_balances(&self) -> Result<Vec<Balance>>;
    async fn get_funding_rate(&self, symbol: &str) -> Result<f64>;
    async fn subscribe_trades(&self, symbol: &str) -> Result<Receiver<TradeEvent>>;
    async fn subscribe_klines(&self, symbol: &str, interval: &str) -> Result<Receiver<Kline>>;
}
```

### 2. 交易所实现（按优先级）

1. **Binance FAPI**（已有，重构为 trait 实现）
2. **OKX USDT Swap**（第二优先）
3. **Bybit Linear**（第三优先）

### 3. 账户配置扩展

```
accounts/
  binance-main/   （现有）
  okx-main/       （新增）
  bybit-main/     （新增）
```

每个账户独立的 portfolio 和 risk 配置。

### 4. 智能路由（后续）

- 同一币种选择最优交易所（最低滑点/手续费）
- 单交易所敞口限制 < 50%

## 涉及文件

- 新增 `shared/src/exchange_adapter.rs` — trait 定义
- 重构 `shared/src/exchange.rs` — Binance 实现 trait
- 新增 `shared/src/exchanges/okx.rs`
- 新增 `shared/src/exchanges/bybit.rs`
- `engine/src/order_router.rs` — 支持多 adapter
- `engine/src/main.rs` — 初始化多交易所

## 验收标准

- 现有 Binance 功能不受影响（重构透明）
- 新增一个交易所可运行基本策略
- 账户配置支持多交易所
