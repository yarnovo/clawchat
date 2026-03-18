---
name: report-risk
description: 风控报告 — 每 10 分钟向 risk 收集风控报告发邮件
user-invocable: true
---

# 风控报告

## 用法
- `/report-risk` — 启动定时风控报告

## 执行
```
/loop 10m 向 risk 发 SendMessage 要求提交风控报告（make check + make account + 异常预警），收到回复后用 make notify SUBJECT="风控报告" 发邮件
```
