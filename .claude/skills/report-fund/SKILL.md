---
name: report-fund
description: 资金报告 — 每 30 分钟向 desk 收集资金报告发邮件
user-invocable: true
---

# 资金报告

## 用法
- `/report-fund` — 启动定时资金报告

## 执行
```
/loop 30m 向 desk 发 SendMessage 要求提交资金报告（make account + 余额变化 + 持仓市值），收到回复后用 make notify SUBJECT="资金报告" 发邮件
```
