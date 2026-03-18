---
name: audit
description: 复盘审计 — 收集经验、分析交易记录、输出改进建议
user-invocable: true
---

# Audit — 复盘审计

## 执行

### 1. 收集数据

```bash
cd /Users/yarnb/agent-projects/clawchat
make pnl        # 真实 P&L
make account    # 余额
```

查看最近报告：
```bash
ls -lt reports/heartbeat/ | head -10
ls -lt reports/daily/ | head -5
```

### 2. 分析

- **交易回顾**：每笔交易的进出场理由、盈亏
- **策略表现**：哪个策略赚钱/亏钱、为什么
- **风控复盘**：有没有该止损没止的、仓位是否合理
- **系统问题**：有没有宕机、延迟、信号丢失

### 3. 输出复盘报告

```markdown
## 复盘 YYYY-MM-DD HH:MM

### 交易回顾
### 做对了什么
### 做错了什么
### 改进计划
```

### 4. 存档 + 通知

报告存 `reports/event/audit-YYYY-MM-DD.md`，重要发现发邮件通知。

### 5. 更新

如果发现策略需要调整，更新 CLAUDE.md 策略表。
