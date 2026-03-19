# ClawChat 量化基金

## 架构

完整系统架构见 **[ARCHITECTURE.md](ARCHITECTURE.md)**，包含：目录结构、引擎架构、风控分层、虚拟账户模型、策略生命周期、配置规范。

## 工具

**CLI 工具集** `ops/`：Agent 和人共用的命令行工具，回测、状态查询、风控检查等。
```bash
cargo run -p clawchat-ops -- --help
```

**交易引擎** `engine/`：配置驱动的执行引擎，加载 approved 策略，收行情、算信号、过风控、下单。
**数据引擎** `data-engine/`：采集存储 K 线行情数据。
**策略发现引擎** `discovery/`：自动搜索参数空间，发现新策略。
**报告引擎** `report-engine/`：从 records/ 生成日报周报到 reports/。
**自动调控引擎** `autopilot/`：监控策略状态，通过写 trade.json 自动暂停/缩仓/停机。
**Makefile**：运维命令入口，`make help` 查看完整列表。

## 配置

`accounts/` 目录是引擎的对外接口，所有配置规范见 → `/ref-engine-config`

策略目录位置：`accounts/binance-main/portfolios/main/strategies/`

## 信息载体

整个系统的通信协议是文件。引擎读文件做事写文件，Agent 读文件判断写文件。

**config/** — 引擎级配置（agent 写，引擎读）。
- `symbols.json` — 币种注册表（data-engine / discovery 读）
- `schedule.json` — 运维级调度（心跳读）

**issues/** — 问题上报，用文件夹管理状态。
- `issues/pending/` — 成员上报，等 team-lead 评审
- `issues/open/` — team-lead 确认，待修复
- `issues/closed/` — 已解决
- 格式：`{日期}-{简述}.md`
- 成员写到 `pending/`，team-lead 评审后移到 `open/`，修复后移到 `closed/`

**notes/** — 经验记录。已发生的事实、踩过的坑、API 用法、调试经验等，供未来参考。
- 格式：`notes/{日期}-{主题}.md`
- 内容：经验、发现、观察（不是待办，待办放 issues/）
- 例：`notes/2026-03-19-agentmail-api.md` — AgentMail 发送 endpoint 和参数格式

**requirements/** — 需求文档，用文件夹管理状态。
- `requirements/pending/` — 成员提出，等 team-lead 评审
- `requirements/open/` — team-lead 确认，待实现
- `requirements/closed/` — 已实现
- 格式：`{日期}-{功能名}.md`
- 成员写到 `pending/`，team-lead 评审后移到 `open/`，实现后移到 `closed/`

**discovered/** — 待审批策略（发现引擎产出）
**records/** — 交易/风控/PnL 记录（引擎写入）
**reports/** — 日报/周报（报告引擎生成）
**logs/** — 运行日志（tracing 自动写）

## KPI

| 指标 | 目标 | 红线 | 保障机制 |
|------|------|------|----------|
| 周增长 | +10% | — | 策略发现持续补位 |
| 月增长 | +50% | — | 多策略组合分散 |
| 最大回撤 | — | -10% | GlobalRiskGuard → CloseAll |

起始资产：$222（2026-03-19）

## 规则

- **架构设计见 ARCHITECTURE.md**，改架构前先读
- **配置/标准只在一处定义，其他地方引用，不重复写。** 准入标准源头：`shared/src/criteria.rs`，配置规范见 `/ref-engine-config`
- **TODO.md 只有 team-lead 维护**，成员不能修改
- **git commit 只有 team-lead 做**，成员完成后汇报等验收
- **策略 status 只有 team-lead 能改为 approved**，成员产出写 `status=pending`
- **回测数据必须真实可复现**，team-lead 会亲自验证
- **代码改动必须经 team-lead review**：工程师完成修复/实现后通知 team-lead，team-lead 验证 build + test 通过后移 issues/requirements 到 closed/ 并提交
- **需要全团队看到的规则写在这里（CLAUDE.md）**，不要散落在其他文件
