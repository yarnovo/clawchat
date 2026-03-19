# 账本对账与自动修复

**优先级**: P1
**来源**: 调研分析（存续安全）

## 问题

ledger.json 虚拟账户 equity $293 与 Binance 实际余额 $218 存在 $75 差额（2026-03-19 snapshot）。差额来源不明，可能是：
- 未实现持仓 PnL 计算偏差
- 宕机恢复后状态不一致
- 费用/费率未正确记入

当前虽有 crash recovery 和 reconcile 逻辑，但：
- 对账仅在宕机恢复时执行，不定期运行
- 差额不记录、不告警、不自动修复
- 如果 1 万年运营中累积多次宕机，账本误差会不断放大

## 需求

### 1. 定期对账机制

- 每 4 小时（与费率结算同步）执行一次对账：
  - 拉取 Binance 账户余额 + 所有持仓市值
  - 计算 ledger equity vs 交易所实际 equity
  - 差额 > 1% 时写入告警

### 2. 对账记录

- 对账结果写入 `records/reconciliation.jsonl`：
  ```json
  {
    "timestamp": "2026-03-19T12:00:00Z",
    "ledger_equity": 293.0,
    "exchange_equity": 218.15,
    "diff_pct": 25.5,
    "positions_match": false,
    "details": "..."
  }
  ```

### 3. 自动修复规则

- 差额 < 1%：记录但不干预（正常浮动）
- 差额 1-5%：记录 + 黄色告警
- 差额 > 5%：记录 + 红色告警 + 以交易所数据为准重置 ledger

### 4. ops reconcile 命令

新增 `cargo run -p clawchat-ops -- reconcile`：
- 手动触发对账
- 显示最近 10 次对账记录
- 显示当前差额状态

## 涉及文件

- `engine/src/ledger.rs` — 对账逻辑
- `engine/src/state.rs` — 状态持久化
- `shared/src/exchange.rs` — 账户余额查询接口
- `ops/src/` — reconcile 命令

## 验收标准

- [ ] 每 4 小时自动执行对账
- [ ] 对账记录写入 reconciliation.jsonl
- [ ] 差额 > 5% 时自动修复并告警
- [ ] ops reconcile 命令可查询对账状态
