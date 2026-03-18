---
name: report
description: 统一报告 — 收集数据生成运营报告并发送邮件
user-invocable: true
---

# Report — 统一报告

合并所有报告类型为一个入口。

## 用法

- `/report` — 完整运营报告
- `/report quick` — 快报（P&L + 仓位）

## 执行

### 1. 收集数据

```bash
cd /Users/yarnb/agent-projects/clawchat
make account    # 余额
make pnl        # 真实 P&L
make check      # 风控状态
make watch      # 行情
```

### 2. 生成报告

```markdown
## 运营报告 YYYY-MM-DD HH:MM

### 资金
- 账户余额 / 可用 / 占用
- 今日 P&L / 累计 P&L

### 持仓
- 当前持仓详情（币种/方向/数量/盈亏）

### 风控
- 止损状态 / 仓位风险 / 爆仓距离

### 策略
- 运行中的策略表现
- 信号统计

### 市场
- 主要币种行情
- 波动率变化
```

### 3. 发送 + 存档

```bash
make notify SUBJECT="运营报告" BODY="..."
```

报告存档到 `reports/daily/YYYY-MM-DD_HH-MM.md`。
