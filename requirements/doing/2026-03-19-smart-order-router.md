# 智能订单路由（SOR）

## 优先级：P2

## 背景

当前 OrderRouter 仅支持市价单，滑点硬编码 0.02%。随着资金增长：
- 大额市价单滑点可能 > 0.5%（严重侵蚀利润）
- 无订单分片能力（一次性吃掉多层深度）
- 无限价单、冰山单等高级订单类型

## 需求

### 1. 订单类型扩展

- **市价单**（现有）
- **限价单**：指定价格挂单，降低滑点
- **TWAP**：时间加权，大单分 N 分钟执行
- **冰山单**：隐藏真实数量，分批挂单

### 2. 自动选择逻辑

```
if order_size < orderbook_depth_top3 * 0.1:
    use 市价单（小单直接吃）
elif order_size < orderbook_depth_top10 * 0.3:
    use 限价单（挂在 best bid/ask）
else:
    use TWAP（分 5 分钟执行）
```

### 3. 滑点预测

- 实时获取 orderbook 前 20 档深度
- 根据订单大小预测滑点
- 预测滑点 > 0.5% 时自动切换为 TWAP

### 4. signal.json 可配置

```json
{
  "order_type": "auto",
  "max_slippage_pct": 0.1,
  "twap_duration_minutes": 5
}
```

## 涉及文件

- `engine/src/order_router.rs` — 订单类型选择
- 新增 `engine/src/smart_order_router.rs` — SOR 逻辑
- `shared/src/exchange.rs` — 限价单/TWAP API

## 验收标准

- 小单用市价单，大单自动切 TWAP
- 实际滑点统计并记录
- 默认 `order_type: "auto"` 无需手动配置
