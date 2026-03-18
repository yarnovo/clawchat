---
name: dev-report
description: 迭代报告 — 每 30 分钟自动 commit + 发送迭代报告邮件
user-invocable: true
---

# 迭代报告

每 30 分钟自动提交代码改动 + 发送迭代报告邮件。

## 用法

- `/dev-report` — 启动定时迭代报告

## 执行

```
/loop 30m 迭代报告：cd /Users/yarnb/agent-projects/clawchat，先 git add -A && git commit（如有改动），然后 make report-dev 发送迭代报告邮件
```
