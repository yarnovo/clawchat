# 实时监控告警系统

**优先级**: P2
**来源**: 调研分析（基础设施 + 风控/资金管理）

## 问题

当前所有监控都是离线的（读文件 → 计算 → 输出文件）。若策略爆仓、风控触发、引擎宕机，无法秒级通知，需要人 24/7 盯屏。

具体缺失：
- 无实时推送（邮件/Webhook）
- 告警阈值不清晰，散落在不同模块
- 报告系统需手动触发（make report-daily）
- PnL 追踪仅本地，无法远程查看

## 需求

### 1. 告警事件定义

在 `shared/src/alerts.rs` 中统一定义告警级别和事件：

**红色（立即通知）：**
- 全局回撤触发 CloseAll
- 单日亏损超过阈值
- 引擎进程异常退出
- 交易所 API 连续失败 > 5 次

**黄色（定时汇总）：**
- 策略被 autopilot 暂停/缩仓
- 资金费率异常（年化 > 50%）
- 策略容量利用率 > 80%
- 连续 3 笔亏损

### 2. 通知渠道

优先实现文件 + Webhook 两种渠道：

**文件渠道**（最简单）：
- 告警写入 `records/alerts.jsonl`
- patrol/health-check 读取并汇报

**Webhook 渠道**（需配置）：
- `config/alerts.json` 配置 webhook URL
- 红色告警立即 POST
- 黄色告警每小时汇总 POST

### 3. 报告自动化

report-engine 集成到引擎主循环或 autopilot：
- 每日 UTC 00:00 自动生成日报到 `reports/`
- 日报包含：总 PnL、分策略表现、风控事件、费率成本
- 告警事件附在日报末尾

### 4. ops alerts 命令

新增 `cargo run -p clawchat-ops -- alerts` 命令：
- 显示最近 24h 的告警事件
- 按级别过滤：`--level red`

## 涉及文件

- `shared/src/alerts.rs` — 新模块，告警定义
- `engine/src/global_risk.rs` — 风控触发时写告警
- `autopilot/src/engine.rs` — 决策执行时写告警
- `report-engine/src/` — 自动化生成
- `config/alerts.json` — 通知配置
- `ops/src/` — alerts 命令

## 验收标准

- [ ] 红色告警事件实时写入 alerts.jsonl
- [ ] Webhook 可选配置，POST 告警内容
- [ ] 日报每日自动生成
- [ ] ops alerts 命令可查询历史告警
