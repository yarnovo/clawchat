# 浮动配额制（自动复利）

## 优先级：P1

## 背景

当前每个策略的 capital 在创建时固定（$15-25），不随账户权益变化。这导致：
- 赚钱后资金闲置，无法自动复利
- 亏钱后配额不变，风险暴露不降
- 手动 rebalance 成本高、延迟大

## 需求

将策略配额从"固定金额"改为"账户权益百分比"模式：

1. **signal.json 新增字段** `capital_mode`：
   - `"fixed"` — 当前模式，固定金额（默认，向后兼容）
   - `"percent"` — 按 portfolio equity 的百分比动态计算

2. **percent 模式逻辑**：
   - `capital_pct: 2.0` 表示该策略配额 = portfolio_equity × 2%
   - 每次开仓前实时计算，不缓存
   - 例：equity $200 时配额 $4，equity $1000 时配额 $20

3. **Ledger 适配**：
   - `allocate_capital()` 方法需支持动态计算
   - portfolio 总配额校验：所有策略 pct 之和 ≤ 100%

4. **风控约束**：
   - 单策略 pct 上限 10%
   - 总分配 pct 上限 95%（保留 5% reserve）

## 涉及文件

- `engine/src/ledger.rs` — 动态配额计算
- `shared/src/account.rs` — SignalConfig 新增字段
- `engine/src/strategy.rs` — 开仓前获取动态配额

## 验收标准

- 设置 `capital_mode: "percent"` 的策略，配额随 equity 自动变化
- 固定模式策略不受影响
- 总配额不超 portfolio equity 的 95%
