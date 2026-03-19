# 策略容量追踪

**优先级**: P1
**来源**: 调研分析（市场覆盖 + 基础设施 + 增长路径）

## 问题

当前无策略容量概念。随着资金增长，策略下单量增大，但：
- 无法评估策略能承载多少资金（与币种流动性相关）
- PIPPIN 已占 portfolio 54%、敞口接近限制，滑点 2-3% 吃掉利润
- 发现引擎不考虑容量，可能推荐流动性不足的币种
- 资金从 $222 增长到 $10K+ 后，小盘币策略会无声亏损

## 需求

### 1. 容量计算模块

新增 `shared/src/capacity.rs`：

```rust
/// 计算策略最大可承载资金
/// 规则：策略单笔下单量 < 币种 24h ADV 的 0.1%
pub fn max_capacity(adv_24h: f64, leverage: f64) -> f64 {
    adv_24h * 0.001 / leverage
}

/// 计算当前利用率
pub fn utilization(allocated: f64, max_capacity: f64) -> f64 {
    allocated / max_capacity
}
```

### 2. 发现引擎容量过滤

在 `discovery/src/evaluator.rs` 的筛选管道中新增：
- 拉取候选币种的 24h 成交量
- 过滤 max_capacity < $500 的候选（当前阶段）
- 随着 AUM 增长，动态提高过滤阈值

### 3. autopilot 容量监控

autopilot 定期检查所有在线策略的容量利用率：
- 利用率 > 80% → 标记警告
- 利用率 > 120% → 自动缩仓至 80%
- 利用率 < 30% → 标记为"可扩仓"

### 4. ops capacity 命令

新增 `cargo run -p clawchat-ops -- capacity` 命令：
- 显示每个在线策略的 ADV、max_capacity、当前利用率
- 标记超容量的策略

## 涉及文件

- `shared/src/capacity.rs` — 新模块
- `discovery/src/evaluator.rs` — 容量过滤
- `autopilot/src/engine.rs` — 容量监控规则
- `ops/src/` — 新增 capacity 命令

## 验收标准

- [ ] 能计算每个策略的最大容量和当前利用率
- [ ] 发现引擎自动过滤低容量候选
- [ ] autopilot 对超容量策略自动缩仓
- [ ] ops capacity 命令输出正确
