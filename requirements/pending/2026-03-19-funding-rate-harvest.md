# Funding Rate 收割策略

**优先级**: P1
**来源**: 调研分析（收益多元化 + TODO P0 标注）

## 问题

当前所有策略都是方向性策略（趋势/突破/RSI），收益完全依赖价格波动方向。Funding Rate 收割是与方向无关的确定性收益来源：

- Binance 永续合约每 8 小时结算一次 Funding Rate
- 当 funding rate > 0 时，多头付给空头；反之亦然
- 策略：在结算前开反向仓位收费率，结算后平仓
- 年化收益稳定 5-15%，与趋势策略低相关
- **不需要多交易所**，单 Binance 即可执行（区别于 arbitrage-scanner）

TODO.md 已标注为 P0，但无正式需求文档。当前 $113 reserve 闲置，Funding Rate 策略可以利用这些闲置资金。

## 需求

### 1. Funding Rate 监控模块

在 `shared/src/` 新增 funding rate 监控：
- 每 4 小时查询各币种当前 funding rate
- 记录到 `records/funding_rates.jsonl`
- 标记 funding rate 异常偏高的币种（> 0.03%/8h）

### 2. 收割策略逻辑

新增 `FundingHarvester` 策略类型：
- 在结算前 30 分钟开仓（方向与费率收取方一致）
- 结算后 5 分钟内平仓
- 仓位大小：reserve 的 30%（保守起步）
- 止损：0.5%（防止结算前极端波动）

### 3. 风控

- 单次最大仓位：portfolio 的 10%
- 每日最多执行 3 次（每 8 小时一次）
- funding rate < 0.01% 时不执行（收益不覆盖手续费）
- 结算前波动率 > 2% 时跳过（风险大于收益）

### 4. 配置

signal.json 格式：
```json
{
  "engine_strategy": "funding_harvest",
  "symbol": "ETHUSDT",
  "params": {
    "entry_minutes_before": 30,
    "exit_minutes_after": 5,
    "min_funding_rate": 0.0001,
    "max_volatility_pct": 2.0
  }
}
```

## 涉及文件

- `engine/src/strategy.rs` — 新增 FundingHarvester 策略
- `shared/src/exchange.rs` — funding rate 查询接口（已有 get_funding_rate）
- `discovery/src/` — funding rate 策略自动发现（扫描高费率币种）

## 验收标准

- [ ] 能查询并记录各币种 funding rate
- [ ] 在结算前自动开仓，结算后自动平仓
- [ ] funding rate < 阈值时不执行
- [ ] PnL 独立统计到 ledger
