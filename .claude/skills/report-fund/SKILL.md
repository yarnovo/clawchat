---
name: report-fund
description: 资金报告 — 每 30 分钟向 desk 收集资金报告发邮件
user-invocable: true
---

# 资金报告

## 执行

```
/loop 30m 向 desk 发 SendMessage 要求提交资金报告，收到回复后发邮件
```

## 邮件模板（必须包含）

```
资金报告 HH:MM

== 账户余额 ==
USDT: $X（可用/冻结）

== 持仓明细 ==
币种    数量    当前价    市值
ANKR    XXXX    $X.XX    $XX.XX
...

== 总资产 ==
USDT: $X + 持仓: $X = 总计 $X
初始投入: $200
盈亏: $X

== 流动性评估 ==
USDT 够不够继续交易？
风险点？

== desk 汇报 ==
（desk 成员的原文摘要）
```
