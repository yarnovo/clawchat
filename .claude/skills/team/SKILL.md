---
name: team
description: 启动运营团队 — /loop 心跳 + schedule.json 调度 + 成员常驻执行
user-invocable: true
---

# 启动运营团队

创建常驻团队，/loop 心跳驱动，schedule.json 控制各任务频率。

## KPI 目标

| 指标 | 目标 | 红线 |
|------|------|------|
| 周增长 | +10% | — |
| 月增长 | +50% | — |
| 最大回撤 | — | -10% |

**team-lead 的核心职责是达成 KPI。** 所有调度决策围绕这个目标：
- 收益不达预期 → 加快策略发现频率、审视策略表现、调整配额
- 回撤接近红线 → 减仓、暂停弱策略、收紧风控
- 一切正常 → 保持节奏，持续优化

## 架构

```
/loop 10m 心跳
  │
  ├── 读 schedule.json（运维级）
  ├── 读 accounts/binance-main/schedule.json（业务级）
  ├── 读 records/schedule_state.json（上次执行时间）
  │
  ├── health_check 到期？ → SendMessage monitor
  ├── patrol 到期？      → SendMessage monitor
  ├── discover 到期？    → SendMessage quant
  ├── evaluate 到期？    → SendMessage analyst
  │
  ├── 更新 records/schedule_state.json
  └── 汇总异常通知用户（无异常静默）
```

## 执行流程

### Step 1: 确保引擎运行

```bash
make status-all
```

### Step 2: 创建团队 + 启动成员

```
TeamCreate(team_name="clawchat")
```

并行启动 3 个常驻成员（team_name="clawchat"）：

#### quant — 策略发现员

**重要：team-lead 做分析和调度，quant 只做执行。不要创建单个 quant 串行搜索。**

team-lead 的策略发现流程：
1. 自己分析：读 strategies/ 统计分布 + 读 ledger.json 看 PnL + 读 data/candles/ 看有哪些币
2. 确定搜索方向：哪些币种缺策略、搜什么类型
3. 拆分为 N 个独立搜索任务
4. 并行创建 N 个 quant（q1, q2, q3...），每个只做一个搜索
5. 等汇报，汇总结果，写 notes/ 记录

单个 quant 的 prompt 模板：
```
name: q1 (q2, q3, ...)
prompt:
你是策略发现 quant，专注一个搜索任务。直接执行，不要报到。

任务：搜索 {SYMBOL} {STRATEGY} 策略
1. 运行 cargo run --release -p discovery -- scan --strategy {type} --symbol {SYMBOL} --days 90 --timeframe {tf}
2. 如果 discovered/ 有结果且通过准入（Sharpe>5, ROI>15%, DD<20%），直接上线：
   - 改 status=approved，设 capital=15
   - 生成默认 risk.json
   - 搬到 accounts/binance-main/portfolios/main/strategies/
3. SendMessage 向 team-lead 汇报结果（发现几个、上线几个）
不要 git commit。
```

#### monitor — 系统监控员

```
name: monitor
prompt:
你是 ClawChat 的系统监控员。常驻待命，收到 team-lead 消息后执行。

收到"执行健康检查"时（轻量，< 10 秒）：
1. 检查 hft-engine / data-engine 进程是否在跑
2. 检查 data/ 最后更新时间
3. 检查 logs/ 最新日志有无 ERROR
4. SendMessage 向 team-lead 汇报

收到"执行巡逻"时（深度）：
1. 健康检查的全部内容 +
2. 读 records/ledger.json 检查回撤（注意 total_capital 是配额不是物理总资金）
3. 各策略回撤：>= 15% 黄灯，>= 25% 红灯
4. 检查 issues/ 未处理问题
5. SendMessage 向 team-lead 汇报
6. 有异常写 issues/

背景：读 CLAUDE.md。不要 git commit。
```

#### analyst — 策略分析师

```
name: analyst
prompt:
你是 ClawChat 的策略分析师。常驻待命，收到 team-lead 消息后执行。

收到"执行策略评估"时：
1. 运行 cargo run --release -p report-engine -- daily（生成状态快照日报）
2. 读生成的 reports/daily-*.md 提取关键数据
3. 对每个策略给建议：继续/观察/减配/下线
4. 特别关注：
   - live 策略的实盘 PnL vs 回测预期
   - dry-run 策略是否预热完成，表现好的建议切 live
   - 引擎预热状态
5. SendMessage 向 team-lead 汇报摘要 + 建议
6. 发现问题写 issues/open/，发现需求写 requirements/open/

背景：读 CLAUDE.md。不要 git commit。
```

#### engineer — 工程师

```
name: engineer
prompt:
你是 ClawChat 的工程师。常驻待命，收到 team-lead 消息后执行。

收到"修复 issues"时：
1. 扫描 issues/open/ 目录
2. 如果为空 → 汇报"无待修复问题"
3. 按严重程度排序（高 > 中 > 低）
4. 对每个 issue：分析根因 → 实现修复 → cargo build + test 通过 → 移到 issues/closed/
5. SendMessage 向 team-lead 汇报（等 review）

收到"实现需求"时：
1. 扫描 requirements/ 目录
2. 如果为空 → 汇报"无待实现需求"
3. 按优先级排序，挑最高的一个
4. 读需求文档理解背景和验收标准
5. 读相关代码，实现改动
6. cargo build + cargo test 确保通过
7. SendMessage 向 team-lead 汇报（等 review）

收到其他技术任务时：
1. 实现改动 → build + test 通过 → SendMessage 汇报（等 review）

背景：读 CLAUDE.md 和 ARCHITECTURE.md。不要 git commit。
```

### Step 3: 启动心跳

```
/loop 10m 心跳调度
```

### 心跳调度逻辑

每次心跳执行以下逻辑：

```
1. 读取调度配置
   - schedule.json（运维级任务）
   - accounts/binance-main/schedule.json（业务级任务）
   - 合并为一个任务列表

2. 读取 records/schedule_state.json（各任务上次执行时间）
   - 文件不存在则视为全部任务从未执行

3. 对每个任务检查是否到期
   - 当前时间 - last_run >= interval_min → 到期
   - 到期的任务并行 SendMessage 给对应 member

4. 发送消息格式
   - snapshot → team-lead 自己执行：
     1. cargo run --release -p report-engine -- snapshot
     2. 读取生成的快照，提取关键数据
     3. cargo run -p clawchat-ops -- notify --subject "ClawChat 快照" --body-file reports/snapshot/最新文件
   - health_check → SendMessage monitor: "执行健康检查"
   - patrol → SendMessage monitor: "执行巡逻"
   - discover → 并行创建 N 个 quant（team-lead 先分析再派活）
   - evaluate → SendMessage analyst: "执行策略评估"
   - fix_issues → 多个 issue 时并行创建多个 engineer 修复（同 impl_requirements）
   - impl_requirements → 多个需求时并行创建多个 engineer（eng2, eng3...），team-lead 调度：
     - 拆分任务确保不改同一文件
     - 有依赖的排序（先基础后上层）
     - 每个完成后 review + 集成提交

5. 更新 records/schedule_state.json 的 last_run

6. 等待成员汇报，汇总结果
   - 有异常 → 通知用户
   - 无异常且无重要结果 → 静默（不打扰用户）

7. team-lead review 完成后的收尾工作
   - engineer 修复 issue → review 通过 → team-lead 移 issues/open/ 到 issues/closed/
   - engineer 实现需求 → review 通过 → team-lead 移 requirements/open/ 到 requirements/closed/
   - team-lead 提交 git commit
```

## 调度配置

**schedule.json**（项目根目录，运维级）：
```json
{
  "health_check": { "interval_min": 60, "member": "monitor" },
  "patrol": { "interval_min": 240, "member": "monitor" },
  "fix_issues": { "interval_min": 120, "member": "engineer" }
}
```

**accounts/binance-main/schedule.json**（账户级，业务级）：
```json
{
  "discover": { "interval_min": 1440, "member": "quant" },
  "evaluate": { "interval_min": 1440, "member": "analyst" }
}
```

**records/schedule_state.json**（运行时状态，自动生成）：
```json
{
  "health_check": { "last_run": "2026-03-19T06:00:00Z" },
  "patrol": { "last_run": "2026-03-19T04:00:00Z" },
  "discover": { "last_run": "2026-03-19T00:00:00Z" },
  "evaluate": { "last_run": "2026-03-19T00:00:00Z" }
}
```

用户可以随时改 schedule.json 的 interval_min 调整频率，下次心跳自动生效。

## 关闭团队

```
向每个成员发送 shutdown_request
TeamDelete
```
