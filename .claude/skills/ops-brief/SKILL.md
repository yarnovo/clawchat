---
name: ops-brief
description: 运营快报 — 每 10 分钟通知团队发报告，CEO 汇总发邮件
user-invocable: true
---

# 运营快报

每 10 分钟触发一次，CEO 通知团队成员各自发工作报告，收集回复后汇总发邮件。

## 用法

- `/ops-brief` — 启动定时运营快报

## 执行

```
/loop 10m 运营快报
```

## 工作流

### Step 1: 通知团队发报告

向所有成员发 SendMessage 要求提交工作报告：
- **analyst**: 当前市场状况、选币建议
- **trader-btc**: 负责策略的运行状态、交易情况
- **trader-eth**: 负责策略的运行状态、交易情况
- **risk**: 风控检查结果、异常预警
- **desk**: 资金状况、余额变化

### Step 2: 收集回复

等待团队成员回复（最多等 2 分钟）。

### Step 3: 汇总发邮件

CEO 把所有成员的报告汇总成一封运营快报，通过 `make notify` 发送到用户邮箱。

格式：
```
运营快报 HH:MM

== KPI 进度 ==
实盘利润: $X.XX / $10 (XX%)

== 团队报告 ==
[analyst] ...
[trader-btc] ...
[trader-eth] ...
[risk] ...
[desk] ...

== CEO 总结 ==
...
```
