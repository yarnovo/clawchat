# 策略参数自适应系统

## 优先级：P2

## 背景

加密市场每 2-3 个月切换一次主题（趋势→震荡→暴涨→回调），固定参数的策略 Sharpe 会衰减 50-70%。当前系统无法感知市场体制变化，策略参数一旦设定不会改变。

## 需求

### 1. 市场体制检测 `shared/src/regime.rs`

- 基于近 7 天数据判断当前市场体制：
  - **Trending**：高自相关 + 高波动 → 趋势策略加权
  - **Ranging**：低自相关 + 低波动 → 均值回归加权
  - **Choppy**：低自相关 + 高波动 → 所有策略减仓
- 指标：自相关系数(ACF)、波动率(VOL)、ADX

### 2. 参数缩放规则

- Trending 体制：
  - 止损放宽 (ATR mult × 1.3)
  - 止盈放宽 (ATR mult × 1.5)
  - 仓位不变
- Ranging 体制：
  - 止损收紧 (ATR mult × 0.7)
  - 止盈收紧 (ATR mult × 0.8)
  - 仓位不变
- Choppy 体制：
  - 仓位缩半
  - 或暂停交易（可配置）

### 3. 配置方式

signal.json 新增：
```json
{
  "adaptive": true,
  "regime_lookback_days": 7
}
```

### 4. 日志与监控

- 体制变化时写日志和 records/regime/
- 报告引擎显示当前体制和参数调整幅度

## 涉及文件

- 新增 `shared/src/regime.rs` — 体制检测
- `engine/src/strategy.rs` — 参数缩放
- `shared/src/strategy.rs` — adaptive 配置字段

## 验收标准

- 能正确检测 Trending/Ranging/Choppy 三种体制
- 参数自动调整，无需手动干预
- 体制变化有日志记录
