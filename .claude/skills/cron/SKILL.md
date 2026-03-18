---
name: cron
description: 创建定时任务 — 定时执行 make 命令
user-invocable: true
---

# 定时任务

创建定时执行的 make 命令。

## 用法

- `/cron` — 默认每 1 分钟执行 `make report`
- `/cron 5m make status` — 每 5 分钟执行 `make status`
- `/cron 1h make report` — 每小时执行 `make report`

## 执行

解析参数，使用 `/loop` 创建定时任务。

如果没有参数，默认执行：

```
/loop 1m make report
```
