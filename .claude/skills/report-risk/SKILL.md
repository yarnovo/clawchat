---
name: report-risk
description: 风控报告 — 每 10 分钟向 risk 收集风控报告发邮件
user-invocable: true
---

# 风控报告

## 执行

```
/loop 10m 向 risk 发 SendMessage 要求提交风控报告，收到回复后发邮件
```

## 邮件模板（必须包含）

```
风控报告 HH:MM

== 实盘真实 P&L ==
（从交易所拉真实买入/卖出数据，不是 dry-run）
各币种: 买入$X 卖出$X 利润$X (N笔)
总计: 买入$X 卖出$X 实盘利润$X

== 总资产 ==
USDT: $X
持仓市值: $X
总资产: $X (初始$200)

== 风控状态 ==
总浮亏: $X / 红线 $20
异常预警: （有则列出）

== risk 汇报 ==
（risk 成员的原文摘要）
```
