# 修复引擎无信号无成交问题

**优先级**: P0（阻断性 — 当前零收入）
**来源**: 生产环境排查

## 问题

16 个 approved 策略在线运行，但零信号、零成交、零收入。排查发现两个根因：

### 根因 1：预热数据加载不足（代码 Bug）

`engine/src/main.rs` 第 239-253 行 `max_indicator_period()` 函数的 `period_keys` 列表缺少关键参数：

```rust
// 当前代码 — 缺少 trend_ema、std_period
let period_keys = [
    "ema_fast", "ema_slow", "atr_period", "lookback",
    "rsi_period", "bb_period", "macd_fast", "macd_slow",
    "signal_period", "ma_period", "period",
];
```

**影响**：
- RSI 策略（如 lyn-rsi-rsi20os0-5m）需要 `max(rsi_period+1, trend_ema+1) = 101` 根 K 线预热
- 但 `trend_ema` 不在 period_keys 中，实际只加载约 40 根
- 策略永远无法完成预热 → 永远返回 `Signal::None`
- 所有使用 `trend_ema` 或 `std_period` 参数的策略均受影响

### 根因 2：全局 trade.json 设为 hold

- `accounts/binance-main/portfolios/main/trade.json` 设为 `"action": "hold"`
- 所有策略级 trade.json 也是 `"action": "hold"`
- 即使信号产生也不会执行交易

## 需求

### 1. 修复 max_indicator_period()

在 `period_keys` 列表中补充缺失的参数键：
```rust
let period_keys = [
    "ema_fast", "ema_slow", "atr_period", "lookback",
    "rsi_period", "bb_period", "macd_fast", "macd_slow",
    "signal_period", "ma_period", "period",
    "trend_ema", "std_period",  // ← 新增
];
```

### 2. 解除 trade.json hold 状态

- Portfolio 级 trade.json 改为 `"action": "none"`（不干预，让策略自主交易）
- 各策略级 trade.json 清除 hold 状态

### 3. 预热完整性校验

在策略启动后增加预热完整性日志：
- 记录每个策略需要的预热根数 vs 实际加载的根数
- 如果 `实际 < 需要` 则写警告日志
- 便于后续快速发现类似问题

### 4. 信号产生监控

引擎运行后应记录信号产生情况：
- 每根 K 线闭合后记录策略返回的信号类型（None/Long/Short/Close）
- 如果某策略连续 100 根 K 线都返回 None → 写警告日志"策略可能异常"

## 涉及文件

- `engine/src/main.rs` — 修复 `max_indicator_period()` 的 period_keys
- `accounts/binance-main/portfolios/main/trade.json` — 解除 hold
- `accounts/binance-main/portfolios/main/strategies/*/trade.json` — 解除 hold
- `engine/src/worker.rs` — 信号监控日志

## 验收标准

- [ ] `max_indicator_period()` 返回值覆盖所有策略参数中的最大周期
- [ ] 策略预热完成后能正常产生信号（日志可见 Long/Short 信号）
- [ ] trade.json 不再阻止信号执行
- [ ] 有实际成交记录产生
