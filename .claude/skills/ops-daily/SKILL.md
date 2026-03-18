---
name: ops-daily
description: 运营日报 — 每日 20:00 发送完整运营报告邮件
user-invocable: true
---

# 运营日报

每日 20:00 发送完整运营日报邮件（P&L + 策略归因 + 持仓 + 风控）。

## 用法

- `/ops-daily` — 启动定时运营日报

## 执行

```
/loop 24h make report-daily
```

注：由于 /loop 精度限制，实际用 cron 表达式 `57 11 * * *`（UTC，约北京时间 20:00）。
