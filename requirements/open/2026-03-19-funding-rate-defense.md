# 资金费率防御与对冲

## 优先级：P1

## 背景

永续合约每 8 小时收取资金费率（funding rate）。当前系统：
- risk_gate 有 1bp 的 funding rate 检查，但仅阻止开仓
- 无法对已持仓的高费率头寸自动缩仓
- 无法捕获资金费率为负时的加仓机会

## 需求

1. **资金费率监控模块** `shared/src/funding.rs`：
   - 定时拉取所有持仓币种的 funding rate（Binance API /fapi/v1/premiumIndex）
   - 计算年化费率：`annual = rate × 3 × 365`
   - 输出：当前费率、年化费率、下次结算时间

2. **autopilot 自动调控规则**：
   - 年化费率 > 50%（做多付费）→ 缩仓 20%
   - 年化费率 > 100% → 缩仓 50%
   - 年化费率 < -20%（做多收费）→ 允许加仓信号
   - 写入 trade.json 执行

3. **Ledger 记录**：
   - 每次 funding 结算后记录到 records/funding/
   - 累计 funding 支出/收入纳入 PnL 计算

4. **ops 查询命令**：
   - `ops funding` — 显示当前所有持仓的 funding rate 和年化费率

## 涉及文件

- 新增 `shared/src/funding.rs` — 费率计算
- `autopilot/src/engine.rs` — 新增 funding 调控规则
- `engine/src/ledger.rs` — funding 记录
- `ops/src/main.rs` — 新增 funding 子命令

## 验收标准

- 高费率自动缩仓，避免 funding 侵蚀利润
- funding 支出/收入纳入 PnL 报告
- `ops funding` 可查询实时费率
