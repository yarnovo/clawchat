# 交易引擎支持多 Portfolio

**提出来源**: 打新组合创建后发现
**优先级**: 高

## 背景
当前引擎只加载 main 组合的策略。新建了 new-coins 组合但引擎不会扫描它。

## 需求
引擎启动时扫描 accounts/{account}/portfolios/ 下**所有**组合的策略，不只是 main。

## 涉及模块
- engine/src/main.rs — scan_approved_strategies() 改为遍历所有 portfolios
- engine/src/ledger.rs — Ledger 支持多 Portfolio（已有数据模型）

## 验收标准
- [ ] 引擎加载 main + new-coins 两个组合的策略
- [ ] 每个组合独立的风控红线（GlobalRiskGuard 按 portfolio）
- [ ] Ledger 区分不同组合的策略
