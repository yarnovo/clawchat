---
name: report-strategy
description: 策略报告 — 每 30 分钟向 trader 收集策略运行报告发邮件
user-invocable: true
---

# 策略报告

## 用法
- `/report-strategy` — 启动定时策略报告

## 执行
```
/loop 30m 向 trader-btc 和 trader-eth 发 SendMessage 要求提交策略运行报告（make status + 交易分析），收到回复后汇总用 make notify SUBJECT="策略报告" 发邮件
```
