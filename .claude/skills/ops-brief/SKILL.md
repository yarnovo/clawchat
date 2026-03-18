---
name: ops-brief
description: 运营快报 — 每 10 分钟发送实盘盈亏 + KPI 进度邮件
user-invocable: true
---

# 运营快报

每 10 分钟发送一封运营快报邮件。由 risk 成员负责发送。

## 用法

- `/ops-brief` — 启动定时运营快报

## 执行

```
/loop 10m cd /Users/yarnb/agent-projects/clawchat && make report-brief
```
