---
name: start-trading
description: 一键启动交易系统 — 后台进程 + 定时监控 + 邮件报告
user-invocable: true
---

# 启动交易系统

## 执行

```bash
make start
make status
make report
```

然后用 `/loop 30m /report` 设置定时邮件报告。
