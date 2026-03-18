---
name: heartbeat
description: 启动 KPI 驱动心跳 — 每分钟驱动团队 + 检查 + 输出推进报告
user-invocable: true
---

# KPI 驱动心跳

## 用法

- `/heartbeat` — 启动心跳

## 执行

```
/loop 1m KPI 心跳推进报告
```

## 心跳工作流

每次心跳触发，按顺序执行：

### Step 1: 收集数据

```bash
cd /Users/yarnb/agent-projects/clawchat
make check    # promote + 止损检查
make pnl      # 实盘盈亏
```

如果有 promote 或止损触发，用 `make notify` 发邮件通知。

### Step 2: 驱动团队

根据当前状况给团队成员派任务（通过 SendMessage）：

**analyst（每 10 轮驱动一次，或市场停滞时）：**
- 执行 `make scan` 扫描市场
- 分析哪些币值得加入/替换
- 推荐给 trader

**trader（每 5 轮驱动一次，或有 promote/异常时）：**
- 检查策略参数是否合理
- 评估 analyst 的推荐
- 建议调参/新增/替换策略

**risk（每 10 轮驱动一次，或风控异常时）：**
- 检查实盘策略风险
- 关注价格偏离区间的情况
- 发 `make report-brief` 运营快报

### Step 3: 选币判断

如果满足以下任一条件，执行选币：
- 距上次选币超过 1 小时
- 利润增速连续 3 轮为 0（市场停滞）
- 有策略连续 30 分钟 0 交易

选币后替换无效策略，`make start` 重启，`make notify` 通知。

### Step 4: 输出 KPI 推进报告

```
## KPI 推进报告 HH:MM

### 1. KPI 目标与进度
| KPI | 目标 | 当前 | 进度 |

### 2. 本轮变化（vs 上一轮）
- 利润变化、新增交易、promote/止损/选币

### 3. 本轮做了什么
- CEO 做了什么、团队做了什么

### 4. 对上一轮的 review
- 决策效果、学到了什么

### 5. 下一步计划
- 接下来要做什么、预计多久达成 KPI
```

### Step 5: 如果 KPI 达标

发邮件庆祝 + 更新 kpi/YYYY-MM-DD.md 的复盘部分。
