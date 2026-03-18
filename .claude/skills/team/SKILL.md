---
name: team
description: 启动运营 — 3 人团队 + 双 Rust 引擎（交易+风控）+ 全自动链路
user-invocable: true
---

# 启动运营团队

`/team` 一键启动全自动量化交易系统：3 人团队 + 守护进程 + 心跳策略管理。

## 全自动链路

```
quant 回测发现策略 → strategies/{name}/ (strategy.json + risk.json)
                                ↓ status=approved 自动
strategy_watcher → 启动 hft-engine --config strategy.json
                                ↓ 自动
hft-engine 统一管道：策略信号 → trade override → risk gate → 执行下单
```

## 引擎架构

单进程统一管道（每策略一个 hft-engine 实例）：

```
strategy.json 信号 → SignalFilter → DecisionGate(trade.json) → RiskGate(risk.json) → Executor → 币安 API
```

WebSocket 实时接收行情（aggTrade + depth + markPrice），30 秒超时自动重连。

## 团队架构

```
         ┌─────────────┐
         │  交易总监     │
         │ (team-lead)  │
         │ 心跳策略管理  │
         └──────┬──────┘
                │
     ┌──────┬───┼───┬─────────┐
     ▼      ▼   ▼   ▼         ▼
   quant  trader risk engineer  qa
   量化    交易  风控  开发     质量
```

> **team-lead = 交易总监 + 交易员**：启停引擎、划转资金、`make status` 监控、心跳策略管理、协调团队。

## 成员职责

| 成员 | 产出 | 消费者 |
|------|------|--------|
| **quant** | 量化分析师：**首要任务找策略信号**（跑回测+grid-search），其次数据分析+报告 | 核心产出角色 |
| **trader** | 交易员：通过 trade.json 控制引擎（加仓/减仓/暂停/平仓） | 引擎文件监听执行 |
| **risk** | 风控：审核 risk.json、监控风控状态 | 风控引擎执行 |
| **engineer** | 开发：Rust 引擎 + Python CLI 代码实现 | 引擎/CLI |
| **architect** | 架构师：技术方案设计（只设计不实现） | team-lead 讨论后派 engineer |
| **qa** | 质量保障：测试验证、回归检查 | team-lead review 前先过 qa |

> **技术支持**：quant 和 risk 如需新脚本/工具/数据支持，告诉 team-lead，team-lead 派 engineer 实现。
> **架构讨论**：技术方案先找 architect 讨论设计，确认后派 engineer 实现。
> **同类角色默认多个**：quant、engineer、architect 等角色按需创建多个并行工作（如 quant + quant2），name 用纯字母数字。

## 策略配置

格式规范见 [engine/SCHEMA.md](engine/SCHEMA.md)。

### 目录结构

```
strategies/
└── {name}/
    ├── strategy.json    ← hft-engine 读（含 sizing_mode/params）
    ├── risk.json        ← hft-engine RiskGate 读（止盈止损由 quant 定义）
    ├── state.json       ← 引擎写（运行时状态，重启恢复指标/K线/统计）
    └── backtest.md      ← 回测报告
```

### 状态流转

```
quant 产出 → status=pending → team-lead review → status=approved → watcher 启动引擎
```

**quant 只能写 status=pending，不能直接写 approved。** team-lead review 达标后才改 approved。

### 准入标准

定义在 `scripts/criteria.py`（唯一源头），文档见 `engine/SCHEMA.md`。**不要在其他地方重复定义标准数字，引用这两个文件。**

## 风控体系

### 三层防护

```
第 1 层：hft-engine SignalFilter（信号过滤）
第 2 层：hft-engine RiskGate（风控检查 + 高水位保护）
第 3 层：交易所 STOP_MARKET 条件单（安全网）
第 4 层：交易所强平（最后防线）
```

### 风控功能（hft-engine 内置）

| 功能 | 说明 |
|------|------|
| 止损 | 由 quant 在 risk.json 定义（每个策略不同） |
| 止盈 | 由 quant 在 risk.json 定义（scalping 紧、趋势策略宽） |
| 高水位保护 | 利润从峰值回撤超 max_drawdown_stop → 自动平仓锁利 |
| 复利 | order_qty = base_qty × (equity/capital)，赚了加仓亏了缩仓 |
| 仓位检查 | 单币种占比 ≤ 30% |
| 强平距离 | ≥ 10% |

### 高水位保护示例

```
高水位 = +$20 → 保护线 = $20 × (1 - 0.30) = $14
盈利降到 +$14 → 自动平仓，保住 $14（70% 利润）
```

### sizing_mode（下单模式）

strategy.json 支持两种，由 quant 选择：

```json
{"sizing_mode": "percent", "position_size": 0.3}   // 权益的 30%
{"sizing_mode": "fixed", "order_qty": 100}          // 固定量
```

percent 模式计算：`order_qty = (equity × position_size × leverage) / price`

### 文件监听热更新

两个引擎都用 notify crate 监听配置文件变化：
- hft-engine 监听 strategy.json → 参数改了立即热更新策略
- hft-engine 监听 risk.json → 阈值改了立即生效

## 执行

### Step 1: 创建团队

```
TeamCreate(team_name="clawchat")
```

用 Agent 工具并行创建 3 个成员（bypassPermissions, run_in_background）：

**quant spawn prompt 要点：**
- 检查 strategies/ 已有策略 + `make scan` 扫描市场
- 格式规范见 engine/SCHEMA.md
- 产出策略写 **status=pending**（不能写 approved，由 team-lead review 后批准）
- **risk.json 由你决定**：止盈止损阈值根据策略特性设不同值（scalping 紧、趋势宽）
- 需要技术支持告诉 team-lead，engineer 会实现

- **spawn prompt 不要重复写准入标准**，指向 criteria.py 和 SCHEMA.md

**risk spawn prompt 要点：**
- `make check` 风控检查 + 确认 risk.json 就位
- 审核新策略的 risk.json 是否合理
- 需要技术支持告诉 team-lead，engineer 会实现

**engineer spawn prompt 要点：**
- `make build` 编译引擎 + 检查系统
- 等待 team-lead 派发技术任务
- **不要修改 TODO.md**，完成任务向 team-lead 汇报，由 team-lead review 后更新
- 代码改动必须同步更新 engine/SCHEMA.md 文档

- 代码改动必须同步更新 engine/SCHEMA.md 文档

**所有成员 spawn prompt 通用规则：**
- 不要修改 TODO.md（只有 team-lead 维护）
- 不要 git commit（只有 team-lead review 后提交）
- 不要修改其他成员的文件
- 完成任务向 team-lead 汇报，等待验收
- **配置/标准/规则只在一处定义，其他地方引用，不重复写**（如准入标准只在 criteria.py + SCHEMA.md）

### Step 2: 启动守护进程

```bash
# 策略监听（自动上架/下架引擎）
nohup make watcher > /tmp/strategy-watcher.log 2>&1 &

# Rust 风控引擎（WebSocket 实时）
# 引擎由 watcher 自动启动（每策略一个 hft-engine）

# 引擎由 watcher 自动启动
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

确认引擎、风控、watcher 全部 [RUNNING]，账户有余额。

### Step 5: 启动心跳循环

```
/loop 1m 心跳：策略管理
```

## TODO 管理

**TODO.md 只有 team-lead 维护**，成员不能直接修改：
- team-lead 派发任务时写入
- 成员完成后向 team-lead 汇报
- team-lead review + 验证后才打 [x]
- 心跳时检查进度，避免遗漏
- 多线程并行任务必须记录，不能靠记忆

## Code Review

engineer 提交代码后的验收流程：
1. **qa 先测**：跑 `cargo test --lib && cargo test --bin hft-engine`、手动验证功能、检查边界情况
2. **team-lead review**：`git diff` 看实际改动、确认逻辑正确
3. **team-lead 提交**：统一 git commit
- 不能只听汇报，qa 和 team-lead 都要验证

quant 提交策略后，team-lead 必须验证：
- `make backtest` 亲自跑一遍确认回测数据真实
- 对比 strategy.json 的 backtest 字段和实际输出是否一致
- **不能信 backtest 字段的数据，必须自己验证**

## 心跳 — 交易总监的策略管理循环

心跳是 team-lead 的核心工作，每 1 分钟一轮。本质是**读数据、判断、做决策**。

### 每轮做什么

```
1. make status — 全局状态
2. 评估策略表现 — 分析盈亏
3. 读 TODO.md — 检查待办，空闲成员派活：
   ├─ engineer 空闲 → 派 TODO 里下一个 P0 技术任务
   ├─ quant 空闲 → 派找策略/review/报告
   ├─ trader 空闲 → 派检查持仓/加仓评估
   ├─ architect 空闲 → 派设计待做方案
   └─ qa 空闲 → 派验证最新改动
4. 决策 & 行动：
   ├─ 策略亏钱 → suspend
   ├─ 策略赚钱 → trader 评估加仓
   ├─ 空闲资金 → quant 找新策略
   └─ 引擎异常 → engineer 修 / watcher 重启
```

### 策略表现评估

- 实盘运行 > 1 小时后开始评估
- 持续亏损且未实现盈亏 < -5% → 考虑 suspend
- 利润从高点回撤 > 50% → 考虑 suspend
- 稳定盈利 → 保持
- 盈利但回撤加大 → 让 risk 调阈值

## 常用命令

```bash
# CLI 量化分析工具（cd cli && uv run clawchat xxx）
clawchat status         # 全局状态面板
clawchat account        # 查余额
clawchat pnl            # 查 P&L
clawchat check          # 风控检查
clawchat scan           # 扫描市场
clawchat backtest       # 回测
clawchat transfer       # 划转

# Makefile（Rust 运维）
make build              # 编译引擎
make hft                # 运行引擎
make watcher            # 策略监听
```
