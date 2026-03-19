---
name: team
description: 启动运营 — quant 团队 + 双 Rust 引擎（交易+调控）+ 全自动链路
user-invocable: true
---

# 启动运营团队

`/team` 一键启动全自动量化交易系统：quant 团队 + autopilot 调控 + 守护进程。

## 全自动链路

```
quant × N 回测找策略 → strategies/{name}/ (signal.json + risk.json + autopilot.json)
                                ↓ status=approved 自动
strategy_watcher → 启动 hft-engine --config signal.json
                                ↓ 自动
hft-engine 统一管道：策略信号 → trade override → risk gate → 执行下单
                                ↑ autopilot 算法自动写
autopilot 监听 state.json → 评估规则 → 写 trade.json / 调 risk.json / 调 position_size
```

## 引擎架构

### hft-engine（交易引擎，每策略一个实例）

```
signal.json 信号 → SignalFilter → DecisionGate(trade.json) → RiskGate(risk.json) → Executor → 币安 API
```

### autopilot（调控引擎，全局一个实例）

```
state.json 变化 → 规则评估(autopilot.json) → 写 trade.json / 改 risk.json / 改 signal.json
```

两个引擎都用 notify crate 监听文件变化，毫秒级响应。

## 团队架构

```
         ┌─────────────┐
         │  交易总监     │
         │ (team-lead)  │
         │ 管理 + 运维   │
         └──────┬──────┘
                │
     ┌──────┬───┴───┬──────┐
     ▼      ▼       ▼      ▼
   quant  quant2  engineer  devops
   量化    量化    开发      运维
```

> **team-lead = 总监**：review 策略、approve、管理 quant 团队、运维引擎代码。
> **autopilot 取代了** trader（手动 trade.json）和 risk（手动 risk.json）。

## 成员职责

| 成员 | 产出 | 说明 |
|------|------|------|
| **quant** × N | 策略研发：跑回测找策略 + 写 signal.json + risk.json + **autopilot.json** | 核心产出角色，按需多个并行 |
| **engineer** | Rust 引擎 + Python CLI 代码实现 | 等 team-lead 派技术任务 |
| **devops** | 引擎监控、异常修复、日志排查、重启 | 引擎稳定运行 |

> **同类角色默认多个**：quant 按需创建多个并行工作（quant、quant2、quant3...），name 用纯字母数字。

## 策略配置

格式规范见 [/strategy-config skill](/strategy-config skill)。

### 目录结构

```
strategies/
└── {name}/
    ├── signal.json      ← hft-engine 读
    ├── risk.json        ← hft-engine RiskGate 读
    ├── autopilot.json   ← autopilot 读（quant 设计调控参数）
    ├── trade.json       ← autopilot 写（自动调控指令）
    ├── state.json       ← 引擎写（运行时状态）
    └── backtest.md      ← 回测报告
```

### 状态流转

```
quant 产出 signal.json + risk.json + autopilot.json (status=pending)
  → team-lead review 回测数据
  → team-lead 改 status=approved
  → watcher 自动启动引擎
  → autopilot 自动监控 + 调控
```

**quant 只能写 status=pending，不能直接写 approved。** team-lead review 达标后才改 approved。

### 准入标准

定义在 `cli/src/clawchat/criteria.py`（唯一源头），文档见 `/strategy-config skill`。**不要在其他地方重复定义标准数字。**

## 风控体系

### 五层防护

```
第 1 层：hft-engine SignalFilter（信号过滤）
第 2 层：hft-engine RiskGate（风控检查 + 高水位保护）
第 3 层：autopilot 算法调控（暂停/缩仓/停机）
第 4 层：交易所 STOP_MARKET 条件单（安全网）
第 5 层：交易所强平（最后防线）
```

### autopilot 调控能力

| 功能 | 触发条件 | 动作 |
|------|---------|------|
| 暂停 | 连续亏 N 笔 / 日亏损超限 | 写 trade.json pause |
| 自动恢复 | 暂停 N 分钟后 | 写 trade.json resume |
| 缩仓 | 连续亏 N 笔 | 改 signal.json position_size ↓ |
| 扩仓 | 连续赢 N 笔 | 改 signal.json position_size ↑ |
| 停机 | 总亏损超限 / 持续亏损超时 | 改 status=suspended |
| 风控调节 | 盈利时收紧 / 亏损时放宽 | 改 risk.json trailing_stop |

参数由 quant 在 autopilot.json 中设计（每个策略不同）。

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat")
```

用 Agent 工具并行创建成员（bypassPermissions, run_in_background）：

**quant spawn prompt 要点：**
- 检查 strategies/ 已有策略 + `make scan` 扫描市场
- 格式规范见 /strategy-config skill
- 产出策略写 **status=pending**（不能写 approved，由 team-lead review 后批准）
- **risk.json 由你决定**：止盈止损阈值根据策略特性设不同值（scalping 紧、趋势宽）
- **autopilot.json 由你设计**：调控参数根据策略特性设不同值，规范见 /strategy-config skill
- 需要技术支持告诉 team-lead，engineer 会实现
- **spawn prompt 不要重复写准入标准**，指向 criteria.py

**engineer spawn prompt 要点：**
- `make build` 编译引擎（含 autopilot）+ 检查系统
- 等待 team-lead 派发技术任务
- **不要修改 TODO.md**，完成任务向 team-lead 汇报
- 代码改动必须同步更新 /strategy-config skill 文档

**所有成员 spawn prompt 通用规则：**
- 不要修改 TODO.md（只有 team-lead 维护）
- 不要 git commit（只有 team-lead review 后提交）
- 不要修改其他成员的文件
- 完成任务向 team-lead 汇报，等待验收
- **配置/标准/规则只在一处定义，其他地方引用，不重复写**

### Step 2: 启动守护进程

```bash
# 策略监听（自动上架/下架引擎）
nohup make watcher > /tmp/strategy-watcher.log 2>&1 &

# autopilot 调控引擎（算法自动控制）
nohup make autopilot > /tmp/autopilot.log 2>&1 &

# hft-engine 由 watcher 自动启动（每策略一个实例）
```

### Step 3: 确认资金

```bash
make account                          # 查余额
make transfer AMOUNT=197              # 现货→合约划转（如需）
```

### Step 4: 验证全局状态

```bash
make status   # 一屏看全局
```

确认引擎、autopilot、watcher 全部运行，账户有余额。

### Step 5: 启动心跳循环

```
/loop 1m 心跳：团队管理
```

## 心跳 — 交易总监的团队管理循环

心跳是 team-lead 的核心工作，每 1 分钟一轮。重点是**管理 quant 团队 + 运维系统**。

### 每轮做什么

```
1. make status — 看全局状态（引擎/持仓/PnL/autopilot）
2. 读 TODO.md — 检查待办进度
3. 空闲 quant 派活：
   ├─ quant 空闲 → 派跑回测找新策略
   ├─ quant 产出 → review 回测数据 + approve
   ├─ engineer 空闲 → 派 TODO 里下一个技术任务
   └─ devops 空闲 → 派运维检查
4. 系统检查：
   ├─ autopilot 异常 → devops 排查
   ├─ 引擎异常 → devops 排查
   └─ 成员汇报完成 → review + 验收
```

**不再手动判断加减仓** — autopilot 自动处理。team-lead 专注于：找策略、review、运维。

## TODO 管理

**TODO.md 只有 team-lead 维护**，成员不能直接修改。

## Code Review

quant 提交策略后，team-lead 必须验证：
- `make backtest` 亲自跑一遍确认回测数据真实
- 对比 signal.json 的 backtest 字段和实际输出是否一致
- **不能信 backtest 字段的数据，必须自己验证**
- 检查 autopilot.json 参数是否合理

## 常用命令

```bash
# CLI 量化分析工具
make status                 # 全局状态面板
make scan                   # 扫描市场

# Rust 引擎
make build                  # 编译所有（hft-engine + autopilot）
make hft                    # 运行交易引擎
make autopilot              # 运行调控引擎
make watcher                # 策略监听
```
