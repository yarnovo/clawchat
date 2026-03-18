---
name: heartbeat
description: 核心入口 — 激活公司，启动所有定时任务 + 每分钟驱动团队
user-invocable: true
---

# 心跳 — 公司核心引擎

`/heartbeat` 是激活公司的核心入口。启动后自动创建所有定时任务，驱动团队工作。

前置条件：先执行 `/create-team` 创建团队。

## 用法

```
/create-team    → 创建团队成员
/heartbeat      → 激活公司（启动所有定时）
```

## 执行

### Step 1: 启动策略

```bash
cd /Users/yarnb/agent-projects/clawchat && make start
```

### Step 2: 创建所有定时任务

```
/loop 2m KPI 心跳推进报告（按下面的心跳工作流执行）
```

同时启动以下定时报告技能：
- `/report-risk` — 每 10 分钟风控报告
- `/report-strategy` — 每 30 分钟策略报告
- `/report-fund` — 每 30 分钟资金报告
- `/report-market` — 每小时市场报告
- `/dev-report` — 每 30 分钟迭代报告
- `/retro` — 每小时团队复盘
- `/ops-daily` — 每日 20:00 运营日报

### Step 3: 确认启动

执行 `make status` + `make pnl` 确认策略运行中，输出首份 KPI 推进报告。

## 心跳工作流（每分钟）

### 1. 收集数据
```bash
cd /Users/yarnb/agent-projects/clawchat
make check    # promote + 止损
make pnl      # 实盘盈亏
```
promote/止损触发时 `make notify` 发邮件。

### 2. 驱动团队
- analyst 每 10 轮、trader 每 5 轮、risk 每 10 轮
- 市场停滞时触发 `make scan` 选币

### 2.5 自我更新（每 30 轮，约 1 小时）
按 `/self-improve` 技能执行：审视架构、清理废弃、优化流程、更新提示词。

### 3. 输出 KPI 推进报告
```
## KPI 推进报告 HH:MM

### 1. KPI 目标与进度
### 2. 本轮变化（vs 上一轮）
### 3. 本轮做了什么
### 4. 对上一轮的 review
### 5. 下一步计划
```

### 4. KPI 达标时
发邮件庆祝 + 更新 kpi/YYYY-MM-DD.md
