# 策略容量追踪与自动缩仓

## 优先级：P1

## 背景

策略收益会随投入资金增加而衰减（参数容量衰减）。当资金增长到一定规模后，小币种流动性不足会导致：
- 滑点急剧上升（投入占 ADV > 1% 时）
- 策略 Sharpe 指数级下降
- 实际 ROI 可能变为负数

当前系统无任何容量监测，资金增长后会"无声地"亏损。

## 需求

1. **容量计算模块** `shared/src/capacity.rs`：
   ```rust
   pub struct StrategyCapacity {
       pub symbol: String,
       pub daily_avg_volume_usd: f64,  // 24h 日均成交额
       pub max_position_ratio: f64,    // 最大占 ADV 比例（默认 0.5%）
       pub current_notional: f64,      // 当前敞口 USD
       pub capacity_usd: f64,          // 计算容量 = ADV × ratio
       pub utilization: f64,           // 当前敞口 / 容量
   }
   ```

2. **ADV 数据获取**：
   - 定时拉取 Binance 24h ticker（/fapi/v1/ticker/24hr）
   - 缓存到内存，每小时更新

3. **autopilot 自动缩仓**：
   - utilization > 80% → 警告日志
   - utilization > 100% → 阻止加仓
   - utilization > 150% → 自动缩仓至 80%
   - 写入 trade.json 执行

4. **ops 查询**：
   - `ops capacity` — 显示每个策略的容量利用率
   - 按 utilization 降序排列

5. **发现引擎集成**：
   - 新策略生成时计算容量上限
   - 容量 < $1000 的策略自动跳过（不值得部署）

## 涉及文件

- 新增 `shared/src/capacity.rs` — 容量计算
- `autopilot/src/engine.rs` — 容量缩仓规则
- `discovery/src/evaluator.rs` — 容量过滤
- `ops/src/main.rs` — 新增 capacity 子命令

## 验收标准

- 每个策略有容量利用率指标
- 超容量自动缩仓
- 发现引擎过滤低容量策略
