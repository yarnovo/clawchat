# 多交易所抽象层

**优先级**: P2
**来源**: 调研分析（基础设施 + 市场覆盖 + 策略Alpha + 增长路径）

## 问题

当前系统完全绑定 Binance FAPI，`shared/src/exchange.rs` 硬编码了 Binance 的 API 签名、endpoint、参数格式。4/5 调研员标记此为最大架构债务：

- 单交易所宕机 → 全系统停摆
- 无法跨所套利（依赖此项的套利需求被阻塞）
- 资金增长后单所流动性不足，大额下单滑点恶化
- 新币可能在 OKX/Bybit 首发，错过打新机会

## 需求

### 1. Exchange trait 抽象

```rust
#[async_trait]
pub trait ExchangeClient: Send + Sync {
    async fn market_order(&self, symbol: &str, side: Side, qty: f64) -> Result<Order>;
    async fn limit_order(&self, symbol: &str, side: Side, qty: f64, price: f64) -> Result<Order>;
    async fn cancel_order(&self, symbol: &str, order_id: &str) -> Result<()>;
    async fn get_position(&self, symbol: &str) -> Result<Position>;
    async fn get_all_positions(&self) -> Result<Vec<Position>>;
    async fn get_funding_rate(&self, symbol: &str) -> Result<f64>;
    async fn set_leverage(&self, symbol: &str, leverage: u32) -> Result<()>;
}
```

### 2. Binance 实现重构

将现有 `Exchange` struct 重构为 `BinanceClient`，实现 `ExchangeClient` trait。功能不变，只是接口抽象化。

### 3. account.json 支持多交易所

```json
{
  "exchanges": {
    "binance": { "base_url": "https://fapi.binance.com", "api_key_env": "BINANCE_KEY" },
    "okx": { "base_url": "https://www.okx.com", "api_key_env": "OKX_KEY" }
  },
  "default_exchange": "binance"
}
```

策略的 signal.json 可指定 `"exchange": "okx"` 或默认使用 account 级别的。

### 4. OKX 客户端（第二优先）

实现 `OKXClient`，支持基本的下单、查仓、费率查询。不需要一次做完所有接口，优先：
- market_order / get_position / get_funding_rate

## 涉及文件

- `shared/src/exchange.rs` — 抽象为 trait + BinanceClient
- `engine/src/order_router.rs` — 使用 `dyn ExchangeClient`
- `engine/src/main.rs` — 根据配置初始化多个 exchange client
- `accounts/*/account.json` — 配置格式升级

## 验收标准

- [ ] ExchangeClient trait 定义完成
- [ ] 现有 Binance 功能通过 BinanceClient 实现不变
- [ ] engine 通过 trait object 调用，不直接依赖 Binance
- [ ] account.json 支持多交易所配置（即使暂时只有 Binance）
