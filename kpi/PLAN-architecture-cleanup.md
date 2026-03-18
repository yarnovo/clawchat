# 架构优化计划

created: 2026-03-18 16:45
status: planning

## Phase 1: 清理（10 分钟）

### 1.1 删除废弃 skill
- [ ] 删 `start-trading/`
- [ ] 删 `report/`
- [ ] 删 `monitor/`
- [ ] 删 `ops-brief/`
- [ ] 删 `create-sub-account/`（子账户不能独立交易）
- [ ] 删 `create-email/`（没用过）

### 1.2 精简团队
- [ ] 关闭旧 `trader`
- [ ] 合并 `trader-btc` + `trader-eth` → 一个 `trader`
- [ ] 合并 `desk` 职责到 `risk`
- [ ] 最终团队：analyst / trader / risk + CEO

### 1.3 清理 cron
- [ ] 删除与废弃 skill 对应的 cron
- [ ] 合并重叠的 cron（策略+资金报告合并）

## Phase 2: 报告整合（15 分钟）

### 2.1 报告合并为 5 种
| 报告 | 频率 | 内容 | 技能 |
|------|------|------|------|
| 运营快报 | 每 10 分钟 | 风控+策略+资金 一封 | `/report-ops` |
| 市场+复盘 | 每小时 | analyst 市场分析 + 全员复盘 | `/report-market` + `/retro` |
| 迭代报告 | 每 30 分钟 | commit + 代码变更 | `/dev-report` |
| 运营日报 | 每日 20:00 | 完整日报 | `/ops-daily` |
| 事件通知 | 实时 | promote/止损/bug | `/notify`（自动触发） |

### 2.2 更新 skill
- [ ] 创建 `/report-ops` 合并 report-risk + report-strategy + report-fund
- [ ] 删除 `report-risk/`、`report-strategy/`、`report-fund/`
- [ ] 更新 `/heartbeat` 里的报告列表

## Phase 3: 代码修复（20 分钟）

### 3.1 promote 加资金检查
- [ ] runner.py `check_promote()` 加：查主账户 USDT 余额 >= amount
- [ ] 余额不足时不 promote，输出警告

### 3.2 strategies.json 备份
- [ ] runner.py 写入前先备份到 `strategies.json.bak`

### 3.3 状态文件分离
- [ ] `data/dryrun/` 放 dryrun 状态
- [ ] `data/live/` 放 live 状态
- [ ] 重启时只清 dryrun，live 保留

### 3.4 真实 P&L
- [ ] 新建 `scripts/pnl.py`，从交易所拉真实成交记录计算利润
- [ ] `make pnl` 改为调 pnl.py（显示真实利润 + dry-run 利润）

## Phase 4: 策略优化（30 分钟）

### 4.1 去掉布林带或调参
- [ ] 评估布林带 0 交易的原因
- [ ] 如果是参数问题就调参，如果是策略不适合就删除

### 4.2 策略脚本抽基类
- [ ] 创建 `scripts/strategy_base.py` 公共基类
- [ ] grid/rsi/bollinger 继承基类，减少重复代码

### 4.3 调整区间越界策略
- [ ] grid.py 加区间自动跟踪：价格持续在区间外 → 自动调整区间

## Phase 5: SDK 统一（1 小时，可延后）

### 5.1 替换 ccxt → binance-connector
- [ ] exchange.py 改用 binance-connector
- [ ] 所有脚本适配新 API
- [ ] 测试全部功能

## Phase 6: 文档更新

- [ ] CLAUDE.md 更新架构图
- [ ] 更新 heartbeat skill 反映新结构
- [ ] 更新 create-team skill 反映新团队
- [ ] 更新 kpi/framework.md

## 执行顺序

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6
Phase 5 延后（风险大，需要充分测试）
