# ClawChat 量化基金

## 架构

完整系统架构见 **[ARCHITECTURE.md](ARCHITECTURE.md)**，包含：目录结构、引擎架构、风控分层、虚拟账户模型、策略生命周期、配置规范。

## 工具

**交易引擎**（Rust 单进程 Gateway）：加载所有 approved 策略，接收行情、计算信号、执行交易。
**数据引擎**（Rust）：采集存储 K 线行情数据。
**策略发现引擎**（Rust）：自动搜索参数空间，发现新策略。
**自动调控引擎** autopilot（Rust）：监控策略状态，自动暂停/缩仓/停机。
**Makefile**：运维命令入口，`make help` 查看完整列表。

## 配置

每个策略目录下三个 JSON 配置，格式规范用技能查看：
- `signal.json` — 信号参数（什么时候买卖）→ `/strategy-config`
- `risk.json` — 风控规则（亏了怎么办）→ `/risk-config`
- `trade.json` — 执行控制（暂停/恢复/手动指令）→ `/trade-config`

策略目录位置：`accounts/binance-main/portfolios/main/strategies/`

## KPI

| 指标 | 目标 | 红线 | 保障机制 |
|------|------|------|----------|
| 周增长 | +10% | — | 策略发现持续补位 |
| 月增长 | +50% | — | 多策略组合分散 |
| 最大回撤 | — | -10% | GlobalRiskGuard → CloseAll |

起始资产：$222（2026-03-19）

## 规则

- **架构设计见 ARCHITECTURE.md**，改架构前先读
- **配置/标准只在一处定义，其他地方引用，不重复写。** 准入标准源头：`shared/src/criteria.rs`，配置规范见 skill（`/strategy-config` `/trade-config` `/risk-config`）
- **TODO.md 只有 team-lead 维护**，成员不能修改
- **git commit 只有 team-lead 做**，成员完成后汇报等验收
- **策略 status 只有 team-lead 能改为 approved**，成员产出写 `status=pending`
- **回测数据必须真实可复现**，team-lead 会亲自验证
- **需要全团队看到的规则写在这里（CLAUDE.md）**，不要散落在其他文件
