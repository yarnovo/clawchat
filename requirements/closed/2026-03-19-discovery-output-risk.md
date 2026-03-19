# 策略发现引擎同时输出 risk.json

**提出来源**: 架构讨论
**优先级**: 中

## 背景
发现引擎回测时已经在用止损止盈参数（atr_sl_mult/atr_tp_mult），但输出只有 signal.json，risk.json 靠模板生成。最优风控参数和信号参数是绑定的，应该一起输出。

## 需求

发现引擎 output.rs 在写 signal.json 的同时，从回测参数中提取风控参数，生成配套的 risk.json。

### 提取逻辑

从 signal.json 的 params 中提取：
- `atr_sl_mult` → `max_loss_per_trade`（按 ATR 倍数换算为百分比）
- `atr_tp_mult` → `max_profit_per_trade`（同上）
- 回测最大回撤 → `hwm_drawdown_limit`（设为回测回撤 × 1.5 留余量）

### 输出格式

```
discovered/{name}/
├── signal.json    ← 信号参数（现有）
└── risk.json      ← 风控参数（从回测提取，新增）
```

### 好处
- 信号和风控参数配对，不会出现"好信号配差风控"
- quant 上线时不需要手动配 risk.json
- 每个策略的风控是数据驱动的，不是固定模板

## 涉及模块
- discovery/src/output.rs — write_strategy_files 同时生成 risk.json
- discovery/src/evaluator.rs — 回测结果携带风控相关指标
- discovery/src/selector.rs — CandidateResult 携带原始参数

## 验收标准
- [ ] 发现引擎输出 discovered/{name}/ 同时包含 signal.json 和 risk.json
- [ ] risk.json 的止损止盈参数从回测参数提取
- [ ] hwm_drawdown_limit 基于回测实际回撤动态计算
