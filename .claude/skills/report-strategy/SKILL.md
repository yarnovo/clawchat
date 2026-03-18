---
name: report-strategy
description: 策略报告 — 每 30 分钟向 trader 收集策略运行报告发邮件
user-invocable: true
---

# 策略报告

## 执行

```
/loop 30m 向 trader-btc/trader-eth 发 SendMessage 要求提交策略报告，收到回复后发邮件
```

## 邮件模板（必须包含）

```
策略报告 HH:MM

== 实盘真实 P&L ==
（从交易所拉真实买入/卖出数据）
各币种: 买入$X 卖出$X 利润$X (N笔)

== 策略排名（按利润） ==
1. XXX $X.XX (N笔, 效率$X/笔)
2. XXX ...

== 异常策略 ==
- 0 交易的策略
- 价格跑出区间的策略
- 布林带/RSI 未触发的策略

== trader 汇报 ==
[trader-btc] （原文摘要）
[trader-eth] （原文摘要）
```
