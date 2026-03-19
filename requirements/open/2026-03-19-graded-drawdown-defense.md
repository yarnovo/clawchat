# 分级回撤防御机制

**优先级**: P1
**来源**: 调研分析（风控分层 + 存续安全）

## 问题

当前 portfolio 级风控只有一道红线：全局回撤 -10% → CloseAll（GlobalRiskGuard）。缺少中间层级的渐进式防御：
- 回撤从 0% 到 -10% 之间没有任何自动干预
- 一旦逼近红线，唯一的动作是全部平仓（损失已经很大）
- 没有"黄灯"阶段让系统（或人类）提前介入
- 全平仓后恢复困难：所有策略被清空，需要从零重建仓位

已有 `correlation-risk` 需求关注的是策略间相关性限制和连续亏损熔断，不覆盖 portfolio 级回撤百分比的分级响应。

## 需求

### 1. 三级回撤阈值

在 `engine/src/global_risk.rs` 中实现分级回撤响应：

| 回撤阈值 | 级别 | 动作 |
|----------|------|------|
| >= 3% | 黄灯 | 写告警日志 + 禁止新策略上线 + 新开仓杠杆上限降 50% |
| >= 6% | 橙灯 | 所有策略仓位缩半 + 暂停新开仓 + 写入 trade.json 限制 |
| >= 10% | 红灯 | CloseAll（现有逻辑不变） |

### 2. 回撤计算

- 基于 portfolio 高水位（peak equity）计算当前回撤百分比
- 高水位每日更新（取当日最高 equity）
- 回撤 = (peak - current) / peak × 100%
- 高水位和回撤记录写入 `records/drawdown.jsonl`

### 3. 恢复机制

- 从橙灯恢复到正常：回撤收窄到 < 2% 时，逐步恢复正常仓位
  - 先恢复到 75% 仓位，观察 24 小时
  - 24 小时无新回撤 → 恢复到 100%
- 从红灯恢复：需 team-lead 手动确认后才能恢复交易

### 4. risk.json 配置

```json
{
  "drawdown_yellow_pct": 3.0,
  "drawdown_orange_pct": 6.0,
  "drawdown_red_pct": 10.0,
  "recovery_threshold_pct": 2.0
}
```

## 涉及文件

- `engine/src/global_risk.rs` — 分级回撤逻辑
- `engine/src/ledger.rs` — 高水位追踪
- `shared/src/risk.rs` — 新增 DrawdownConfig 字段
- `accounts/*/portfolios/*/risk.json` — 阈值配置

## 验收标准

- [ ] 回撤达到各阈值时触发对应级别的自动响应
- [ ] 高水位和回撤百分比持续记录到 drawdown.jsonl
- [ ] 橙灯后回撤收窄能自动恢复正常仓位
- [ ] 各阈值可通过 risk.json 配置
