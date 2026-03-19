# 策略类型多样化

## 优先级：P2

## 背景

当前 32 个策略全是趋势跟踪类（trend/breakout/rsi/ema），收益来源高度集中。问题：
- 趋势策略在震荡市全军覆没
- 相关性高，一个亏全部亏
- 缺少 3 大策略类别：均值回归、做市、ML 预测

## 需求

### 1. 均值回归策略支持

- **Bollinger Band 策略**：
  - 价格 > 上轨 → 做空
  - 价格 < 下轨 → 做多
  - 参数：period(10-30), std_mult(1.5-3.0)
- 在发现引擎中新增 Bollinger 参数生成器
- 在 engine 中新增对应的策略执行逻辑

### 2. 网格交易策略增强

- 当前有 grid 策略但数量少
- 扩展网格参数空间：grid_count(5-20), range_pct(2-10%)
- 适合震荡市场

### 3. 做市策略（长期）

- 在 bid-ask 两侧挂单赚 spread
- 高频（5-30 秒），高胜率（>65%）
- 需要 orderbook 数据支持

### 4. 发现引擎适配

- generator.rs 新增各类型的参数空间定义
- evaluator.rs 按策略类型使用不同的评估标准
  - 趋势策略：Sharpe > 5, win_rate > 45%
  - 均值回归：Sharpe > 4, win_rate > 55%（要求更高胜率）
  - 网格：Sharpe > 3, profit_factor > 2.0

## 涉及文件

- `discovery/src/generator.rs` — 新增参数空间
- `discovery/src/evaluator.rs` — 分类评估
- `engine/src/strategy.rs` — 新策略类型执行
- `shared/src/strategy.rs` — 策略类型枚举扩展

## 验收标准

- 发现引擎能搜索均值回归和网格策略
- 不同策略类型有不同准入标准
- 组合中策略类型占比可查询
