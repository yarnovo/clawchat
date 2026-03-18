---
name: backtest
description: 回测验证 — 指定策略+币种+参数跑回测
user-invocable: true
---

# Backtest — 回测验证

## 用法

- `/backtest` — 使用默认参数回测
- `/backtest BTC/USDT trend 1h 5x 14d` — 指定参数

## 执行

```bash
cd /Users/yarnb/agent-projects/clawchat && make backtest SYMBOL=${SYMBOL:-BTC/USDT} STRATEGY=${STRATEGY:-trend} TIMEFRAME=${TIMEFRAME:-1h} LEVERAGE=${LEVERAGE:-5} DAYS=${DAYS:-14}
```

### 评估标准

所有结果必须扣手续费 0.04% + 滑点 0.05%：
- 净利润 > 0
- 夏普 > 1
- 最大回撤 < 20%
- 交易 >= 3 笔

### 输出

汇总回测结果：收益率、夏普、回撤、交易笔数、胜率。给出是否通过的结论。
