# 策略插件化架构

**优先级**: P1
**来源**: 架构调研（5/5 调研员标记）

## 问题

当前新增策略类型需要修改 4-5 个文件：
1. `engine/src/strategy.rs` — 实现策略逻辑（2349 行单文件）
2. `engine/src/startup.rs` — match 语句硬编码策略实例化
3. `discovery/src/generator.rs` — 新增参数空间生成
4. `shared/src/criteria.rs` — 差异化准入标准（目前是全局常数）

添加第 N 种策略的成本线性增长，不遵守开闭原则。pending 需求 funding-rate-harvest 和 doing 中的 arbitrage-scanner 都无法独立实现。

## 需求

### 1. 策略模块化拆分

将 `engine/src/strategy.rs`（2349 行）拆分为独立模块：
```
engine/src/strategies/
  ├── mod.rs              // 策略工厂 + 注册逻辑
  ├── traits.rs           // Strategy trait + SignalContext
  ├── trend.rs            // TrendFollower
  ├── breakout.rs         // BreakoutDetector
  ├── rsi.rs              // RSIStrategy
  ├── bollinger.rs        // BollingerReversion
  ├── grid.rs             // GridTrader
  ├── mean_reversion.rs   // MeanReversion
  └── funding_harvest.rs  // FundingHarvester（新）
```

### 2. 策略注册表

新增 `shared/src/strategy_registry.rs`：
```rust
trait StrategyDescriptor {
    fn strategy_type(&self) -> &str;
    fn param_schema(&self) -> Vec<ParamDef>;    // 参数定义
    fn default_params(&self) -> HashMap<String, f64>;
    fn min_lookback(&self) -> usize;            // 最少 K 线数
    fn criteria(&self) -> &Criteria;            // 策略类型专属准入标准
}
```

- 从 signal.json 的 `engine_strategy` 字段动态创建对应策略实例
- 消除 startup.rs 中的 match 硬编码
- discovery generator 从 registry 读取参数空间定义

### 3. 准入标准配置化

将 `shared/src/criteria.rs` 从全局常数改为按策略类型配置：
- trend 类：Sharpe > 5.0, WR > 45%
- mean_reversion 类：Sharpe > 4.0, WR > 55%
- funding_harvest 类：无回测要求，按实际费率评估

## 涉及文件

- `engine/src/strategy.rs` → 拆分为 `engine/src/strategies/` 目录
- `engine/src/startup.rs` — 从 registry 动态创建策略
- `shared/src/criteria.rs` — 从常数重构为配置
- 新增 `shared/src/strategy_registry.rs`
- `discovery/src/generator.rs` — 从 registry 读参数空间

## 验收标准

- [ ] 新增策略类型仅需：(1) 实现 Strategy trait (2) 注册到 registry
- [ ] 不需要修改 startup.rs、generator.rs 等核心文件
- [ ] 现有策略行为不变
- [ ] `cargo test` 通过
