---
name: run-company
description: 启动量化交易公司 — 创建 Team 自动管理投资组合
user-invocable: true
---

# 启动量化交易公司

创建一个 Team，分工协作自动管理投资组合。

## 团队成员

| 角色 | 名称 | 职责 |
|------|------|------|
| CEO | team-lead（你） | 维护 skills/scripts、审批决策、汇报用户 |
| 分析师 | analyst | make scan 扫描选币、推荐策略 |
| 交易员 | trader | make status 管理策略、评估调整 |
| 风控 | risk | make account 监控风险、make report 发报告 |

## 执行步骤

### 1. 创建团队 + 启动策略

```
TeamCreate(team_name="clawchat-fund")
make start
```

### 2. 创建任务分配给团队

- **analyst**: `make scan` 扫描选币，发现机会通知 trader
- **trader**: `make status` 检查策略，根据 analyst 建议调整，通知 risk
- **risk**: `make account` + `make status` 监控风险，`make report` 发报告

### 3. 设置三份定时报告

**报告 1 — 运营报告（每 30 分钟）：**
CEO 汇总策略状态、团队进展、KPI 进度，通过 `make report` 发邮件。

**报告 2 — 迭代报告（每 1 小时）：**
git 提交记录、skills/scripts 变更，通过 `make notify` 发邮件。

**报告 3 — 团队工作报告（每 30 分钟）：**
CEO 向三个 teammates 要报告，汇总后发给用户：
- 向 analyst 要市场分析报告
- 向 trader 要策略运行报告
- 向 risk 要风控报告 + 发 make report 邮件

```
/loop 30m 运营报告 + 团队报告：向 analyst/trader/risk 要报告，汇总后 make report
/loop 1h 迭代报告：git log + skills 变更，make notify 发邮件
```

### 4. KPI 心跳（每 1 分钟）

CEO 每分钟检查利润进度。规则：
- 执行 `make check` 自动检查 promote 条件（动态阈值：amount * 2% + 至少 5 笔交易）
- 达标自动 promote + `make notify` 通知用户
- 更新 `kpi/` 目录下的当日 KPI 文件

### 5. 定时选币（每 1 小时）

- 执行 `make scan` 扫描高波动币种
- 对比当前策略，替换无效策略（如 0 交易的）
- 更新 `data/strategies.json` 并 `make start` 重启

```
/loop 1m make check（KPI 心跳 + 自动 promote）
/loop 30m 运营报告 + 团队报告
/loop 1h 迭代报告 + 定时选币
```

### 5. 汇报用户

团队启动后立即发送三份报告，之后定时自动发送。

## 策略上线流程

```
测试网 (testnet)    →    dry-run    →    实盘 (live)
验证代码没 bug          验证策略能赚钱       promote 上线赚钱
```

- 新策略先在 testnet 跑一遍确认代码无 bug
- 然后用主网行情 dry-run 验证盈利能力
- 单策略 dry-run 利润达 $1 → 自动 promote 到实盘
- `make promote SYMBOL=xxx` 手动 promote
- `make demote SYMBOL=xxx` 降回模拟

## 注意

- 团队仅在当前会话存活，关闭 Claude 后需重新启动
- dry-run 利润达标后自动 promote，无需用户审批
- skills/scripts 维护由 CEO（main）负责，teammates 只调用 make 命令
