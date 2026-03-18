---
name: report-market
description: 市场报告 — 每小时向 analyst 收集市场分析报告发邮件
user-invocable: true
---

# 市场报告

## 执行

```
/loop 1h 向 analyst 发 SendMessage 要求提交市场报告，收到回复后发邮件
```

## 邮件模板（必须包含）

```
市场分析报告 HH:MM

== 高波动币种 Top 10 ==
（make scan 结果）

== 已部署策略的币种表现 ==
各币种当前价格 vs 网格区间
有没有跑出区间的？

== 新机会推荐 ==
推荐币种 + 参数建议

== analyst 汇报 ==
（analyst 成员的原文摘要）
```
