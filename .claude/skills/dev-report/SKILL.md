---
name: dev-report
description: 迭代报告 — 每 30 分钟自动 commit + 发送迭代报告邮件
user-invocable: true
---

# 迭代报告

## 执行

```
/loop 30m cd /Users/yarnb/agent-projects/clawchat && git add -A && git commit（如有改动），然后 make report-dev
```

## 邮件模板（必须包含）

```
迭代报告 HH:MM

== 最新提交 ==
commit hash
commit message（完整内容）

== 最近 5 条提交 ==
git log --oneline -5

== 文件变更 ==
git diff --stat HEAD~1

== 当前 Skills 列表 ==
ls .claude/skills/

== 当前 Scripts 列表 ==
ls scripts/

== 报告系统状态 ==
当前活跃的报告类型、频率、负责人：

| 报告 | 频率 | 负责人 | 内容 |
|------|------|--------|------|
| KPI 心跳 | 每 1 分钟 | CEO | KPI 进度 + promote/止损 |
| 风控报告 | 每 10 分钟 | CEO→risk | 实盘P&L + 总资产 + 预警 |
| 策略报告 | 每 30 分钟 | CEO→trader | 策略排名 + 异常 |
| 资金报告 | 每 30 分钟 | CEO→desk | 余额 + 持仓 + 流动性 |
| 迭代报告 | 每 30 分钟 | CEO | commit + 代码变更 + 报告系统 |
| 市场报告 | 每小时 | CEO→analyst | 选币 + 机会推荐 |
| 复盘报告 | 每小时 | CEO→全员 | 经验教训 + 改进方案 |
| 运营日报 | 每日 20:00 | CEO→全员 | 完整日报 |
| 事件通知 | 实时 | CEO | promote/止损/bug |

== 定时任务列表 ==
当前活跃的 cron job 数量和状态
```
