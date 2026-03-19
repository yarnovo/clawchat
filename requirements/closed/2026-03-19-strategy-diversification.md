# 策略多样化：新策略族群

**优先级**: P0
**来源**: 调研分析（策略Alpha + 市场覆盖 + 风控）

## 问题

当前 16 个在线策略中 98% 是 EMA 趋势跟踪，有效独立策略簇仅 2-3 个。同向相关性 >90%，市场从趋势转震荡时所有策略同步失效。

要实现指数增长，需要 5+ 个完全不相关的策略族群，当前严重不足。

## 需求

### 1. 均值回归策略（Bollinger Band）

在 discovery 引擎中新增 `BollingerReversion` 策略类型：

**核心逻辑**：价格触及布林带下轨做多、上轨做空，中轨止盈
**参数空间**：
- period: 10-30 (step 2)
- std_mult: 1.5-3.0 (step 0.25)
- ema_trend_filter: 50-200（趋势方向过滤）

**准入标准差异化**（与趋势策略不同）：
- win_rate >= 55%（均值回归要求更高胜率）
- sharpe >= 4.0（可略低于趋势的 5.0）
- max_drawdown <= 15%

### 2. 网格交易策略（Grid Trading）

新增 `GridTrader` 策略类型：

**核心逻辑**：在价格区间内均匀布网，低买高卖
**参数空间**：
- grid_count: 5-20
- range_pct: 2-10%
- position_per_grid: 动态计算

**适用场景**：震荡市，与趋势策略互补

### 3. 发现引擎扩展

`discovery/src/generator.rs` 新增参数空间：
- `generate_bollinger_params()` — Bollinger 均值回归
- `generate_grid_params()` — 网格交易

`engine/src/strategy.rs` 新增策略实现：
- `BollingerReversion::on_candle()` — 均值回归信号
- `GridTrader::on_candle()` — 网格交易信号

### 4. 策略相关性分析

新增 `ops correlation` 命令：
- 计算所有在线策略间的收益相关系数
- 输出相关性矩阵
- 标记相关性 >0.7 的策略对（建议减仓其一）

## 涉及文件

- `engine/src/strategy.rs` — 新增 BollingerReversion、GridTrader
- `discovery/src/generator.rs` — 新增参数空间
- `discovery/src/evaluator.rs` — 支持新策略类型回测
- `shared/src/criteria.rs` — 新增策略类型的差异化准入标准
- `ops/src/` — 新增 correlation 命令

## 验收标准

- [ ] Bollinger 均值回归策略可发现、可回测、可部署
- [ ] 网格交易策略可发现、可回测、可部署
- [ ] 发现引擎支持按策略类型分别搜索
- [ ] 新策略与现有趋势策略相关性 < 0.5
