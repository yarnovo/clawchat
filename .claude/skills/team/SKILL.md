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

```
name: quant
prompt:
你是 ClawChat 的策略发现员。常驻待命，收到 team-lead 消息后执行。

收到"执行策略发现"时，先分析再搜索，不要盲扫：

**Phase 1: 分析（决定搜什么）**
1. 读 accounts/.../strategies/*/signal.json 统计当前组合：各币种几个策略、各策略类型分布
2. 读 records/ledger.json 看各策略 PnL：哪类策略在赚钱、哪类在亏
3. 读 data/*.parquet 最近 7 天行情：哪个币在趋势、哪个在震荡、哪个波动大
4. 看 KPI 差距：本周增长够不够 10%？需要激进还是保守？
5. 基于分析生成 search.json：
   - 缺策略的币种 → 重点搜
   - 已有 4 个策略的币种 → 不搜
   - 趋势行情 → 搜 trend，震荡行情 → 搜 rsi
   - 赚钱的策略类型 → 精细搜索（小 step），不赚的 → 跳过
   - 控制总组合数 < 50000

**Phase 2: 执行搜索**
6. 清理 discovered/ 旧文件
7. 运行 cargo run --release -p discovery -- scan --config search.json
8. 如果没有 search.json（首次），用默认: --strategy trend --symbol 缺策略的币 --days 90

**Phase 3: 预审上线**
9. 预审候选（冲突/配额/相似度）
10. 通过的直接自动上线（status=approved、分配 capital、生成 risk.json、搬到 accounts/.../strategies/）
11. SendMessage 向 team-lead 汇报：分析了什么、搜了什么、发现了什么、上线了什么

**Phase 4: 记录**
12. 写 notes/ 记录本次分析和发现经验

背景：读 CLAUDE.md 和 ARCHITECTURE.md。配置用法见 /ref-discovery。不要 git commit。
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
1. 运行 cargo run --release -p report-engine -- daily
2. 读 records/ledger.json 分析各策略 PnL 和回撤
3. 对每个策略给建议：继续/观察/减配/下线
4. SendMessage 向 team-lead 汇报
5. 发现问题写 issues/，发现需求写 requirements/

背景：读 CLAUDE.md。不要 git commit。
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
   - health_check → SendMessage monitor: "执行健康检查"
   - patrol → SendMessage monitor: "执行巡逻"
   - discover → SendMessage quant: "执行策略发现"
   - evaluate → SendMessage analyst: "执行策略评估"

5. 更新 records/schedule_state.json 的 last_run

6. 等待成员汇报，汇总结果
   - 有异常 → 通知用户
   - 无异常且无重要结果 → 静默（不打扰用户）
```

## 调度配置

**schedule.json**（项目根目录，运维级）：
```json
{
  "health_check": { "interval_min": 60, "member": "monitor" },
  "patrol": { "interval_min": 240, "member": "monitor" }
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
