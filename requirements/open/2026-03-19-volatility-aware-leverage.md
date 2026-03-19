# 波动率感知杠杆

## 优先级：P1

## 背景

当前所有策略使用固定杠杆（2-5x），不考虑市场波动率。问题：
- 高波动期固定杠杆 → 放大亏损、触发止损
- 低波动期杠杆不足 → 浪费资本效率
- 极端行情（闪崩）无自动降杠杆保护

## 需求

实现基于近期波动率的动态杠杆调整：

1. **波动率计算模块** `shared/src/volatility.rs`：
   - 30 分钟滚动波动率（标准差 / 均价）
   - EWMA 加权（衰减因子 0.94）
   - 输出：`current_vol`, `vol_percentile`（相对 30 天历史）

2. **动态杠杆映射**（可配置）：
   - vol_percentile < 25%（低波动）→ leverage × 1.3
   - vol_percentile 25-75%（正常）→ leverage × 1.0
   - vol_percentile 75-90%（高波动）→ leverage × 0.7
   - vol_percentile > 90%（极端）→ leverage × 0.3

3. **risk.json 新增配置**：
   ```json
   {
     "dynamic_leverage": true,
     "vol_lookback_minutes": 30,
     "vol_multipliers": [1.3, 1.0, 0.7, 0.3]
   }
   ```

4. **约束**：
   - 动态杠杆不超过 risk.json 中 max_leverage
   - 仅在开仓时计算，持仓中不调整
   - 可按策略开关（`dynamic_leverage: false` 关闭）

## 涉及文件

- 新增 `shared/src/volatility.rs` — 波动率计算
- `engine/src/strategy.rs` — 开仓前查询动态杠杆
- `shared/src/risk.rs` — 新增配置字段
- `engine/src/order_router.rs` — 用动态杠杆下单

## 验收标准

- 低波动期自动加杠杆，高波动期自动减杠杆
- 极端行情杠杆降至基准的 30%
- 固定杠杆模式不受影响
