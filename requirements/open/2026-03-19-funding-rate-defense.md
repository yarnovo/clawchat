# 资金费率防御与对冲

**优先级**: P1
**来源**: 调研分析（风控/资金管理 + 市场覆盖）

## 问题

永续合约每 8 小时结算资金费率。当前系统：
- 仅在开仓时检查 funding_rate_limit（risk.json 配置 0.001）
- 持仓期间费率上升不会触发任何动作
- 资金费率未计入 PnL 追踪（ledger 有字段但 autopilot 不看）
- 估计年利润的 5-15% 被费率侵蚀

实际数据：NTRN 年化费率 -28.6%（做多收钱），LYN +7.0%（做多付钱）。差异巨大，应主动利用。

## 需求

### 1. 资金费率实时监控

- 每 4 小时从 Binance `/fapi/v1/premiumIndex` 拉取所有持仓币种的当前费率
- 写入 `records/funding_rate_latest.json`
- autopilot 读取并纳入决策

### 2. autopilot 费率防御规则

在 autopilot 评估逻辑中新增：
- 年化费率 > 50% 且做多方向 → 缩仓 30%
- 年化费率 > 100% → 暂停该策略（极端市场）
- 年化费率 < -20% 且做空方向 → 标记为"费率有利"，允许扩仓

### 3. 费率成本纳入回测

`backtest/mod.rs` 中加入资金费率模型：
- 默认费率：0.01%/8h（年化 ~13%）
- 可选：加载历史费率数据进行精确回测
- 影响：部分低收益策略回测结果会从盈利变为亏损

### 4. ops funding 查询命令

新增 `cargo run -p clawchat-ops -- funding` 命令：
- 显示所有持仓币种的当前费率
- 计算近 7 天累计费率成本
- 标记费率异常的持仓

## 涉及文件

- `autopilot/src/engine.rs` — 新增费率评估规则
- `engine/src/` 或 `shared/src/exchange.rs` — 费率拉取接口
- `ops/src/backtest/mod.rs` — 回测加入费率模型
- `ops/src/` — 新增 funding 命令

## 验收标准

- [ ] 每 4 小时自动拉取并记录费率
- [ ] autopilot 能根据费率自动缩仓/暂停
- [ ] 回测结果包含资金费率成本
- [ ] ops funding 命令可查询当前费率状况
