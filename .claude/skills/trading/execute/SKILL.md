---
name: execute
description: 执行交易计划 — 启动策略引擎实盘运行
user-invocable: true
---

# Execute — 执行交易计划

## 用法

- `/execute` — 执行当前最优策略
- `/execute BTC/USDT trend 5x` — 指定执行

## 执行

### 1. 确认策略

检查是否有验证通过的策略（回测+dry-run）。没有则提示先执行 `/find-alpha`。

### 2. 检查账户

```bash
cd /Users/yarnb/agent-projects/clawchat && make account
```

确认余额足够。

### 3. 启动实盘

```bash
cd /Users/yarnb/agent-projects/clawchat/scripts && uv run python hft_engine.py --symbol XXX --strategy XXX --leverage X
```

### 4. 确认运行

```bash
cd /Users/yarnb/agent-projects/clawchat && make pnl
```

### 5. 通知

```bash
cd /Users/yarnb/agent-projects/clawchat && make notify SUBJECT="策略已上线" BODY="XXX 策略 XXX 杠杆 XXx"
```
