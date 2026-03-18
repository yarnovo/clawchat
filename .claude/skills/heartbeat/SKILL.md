---
name: heartbeat
description: 一个入口启动一切 — 创建团队、检查状态、驱动工作、输出报告
user-invocable: true
---

# 心跳 — 公司核心引擎

`/heartbeat` 是启动公司的唯一入口。一个命令创建团队、判断阶段、驱动工作。

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat-fund")
```

招聘 4 人：
- **engineer** — 技术团队：系统搭建、监控、部署
- **strategist** — 策略团队：找信号、回测、优化参数
- **trader** — 交易团队：执行交易计划、管理资金
- **risk** — 风控团队：止损、仓位管理、复盘审计

### Step 2: 检查当前状态

```bash
cd /Users/yarnb/agent-projects/clawchat
make account    # 余额
make pnl        # 真实 P&L
```

### Step 3: 判断阶段

根据当前状态决定行动：
- **无策略**：执行 `/find-alpha` 搜索盈利策略
- **有策略未执行**：执行 `/execute` 上实盘
- **运行中**：进入心跳循环

### Step 4: 心跳循环

```
/loop 1m 心跳循环（按下面的心跳工作流执行）
```

## 心跳工作流（每轮）

### 1. 收集数据
```bash
cd /Users/yarnb/agent-projects/clawchat
make account
make pnl
```

### 2. 风控检查（每轮）
```bash
make check
```
触发止损时立即 `make notify` 通知。

### 3. KPI 检查
对比当前 P&L 与 KPI 目标。达标时发邮件庆祝。

### 4. 驱动团队
- **risk** — 每 3 轮问一次（风控状态、仓位风险）
- **trader + strategist** — 每 5 轮问一次（策略表现、优化建议）
- **engineer** — 每 10 轮问一次（系统状态、监控告警）

### 5. 输出报告

每 10 轮发运营快报：
```
make notify SUBJECT="运营快报" BODY="P&L / 仓位 / 风控状态"
```

每 60 轮发详细报告 + 复盘：
```
make notify SUBJECT="详细报告" BODY="完整运营数据 + 团队复盘 + 优化建议"
```

事件（止损/开仓/平仓）实时通知。

报告同时存档到 `reports/heartbeat/`。

### 6. 自我优化（每 60 轮）
- 审视 skill 是否需要更新
- 清理废弃文件
- commit 所有改动
