---
name: report-market
description: 市场报告 — 每小时向 analyst 收集市场分析报告发邮件
user-invocable: true
---

# 市场报告

## 用法
- `/report-market` — 启动定时市场报告

## 执行
```
/loop 1h 向 analyst 发 SendMessage 要求提交市场分析报告（make scan + 选币推荐 + 现有策略表现），收到回复后用 make notify SUBJECT="市场分析报告" 发邮件
```
