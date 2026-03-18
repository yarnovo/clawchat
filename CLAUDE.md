# ClawChat — AI 量化交易工作站

## 架构

```
clawchat/
├── .env                    # 密钥（BINANCE / BINANCE_TESTNET / AGENTMAIL）
├── pyproject.toml          # uv 管理 Python 依赖
├── package.json            # npm 管理 Node.js 依赖
├── Makefile                # 统一命令入口
├── scripts/                # 公共脚本（Python/JS/Go/Rust 均可）
│   ├── exchange.py         # 共享交易所连接（支持 testnet/mainnet 切换）
│   ├── market.py           # 行情监控 + 选币扫描
│   ├── grid.py             # 网格交易策略
│   ├── rsi.py              # RSI 策略
│   ├── projects.py         # 项目/子账户管理（含 promote）
│   └── notify.py           # 邮件通知
├── data/                   # 运行数据（gitignore）
├── kpi/                    # KPI 记录（按日期）
└── .claude/skills/         # Claude Code 技能（调用 make 命令）
```

## 设计原则

- **scripts/ 是公共脚本**，任何语言都可以（Python/JS/Go/Rust），按需接入生态
- **skill 内可以有自己的 scripts/**，只有公共的才放根 scripts/
- **uv 管 Python，npm 管 Node.js，Makefile 统一入口**
- **项目隔离**：每个 project = 虚拟子账户 + 独立资金 + 策略配置
- **skills 和 scripts 维护由 main（CEO）负责**，teammates 只调用 make 命令

## 策略上线流程

```
测试网 (testnet)    →    dry-run    →    实盘 (live)
验证代码没 bug          验证策略能赚钱       promote 上线赚钱
模拟行情 + 真实下单     真实行情 + 不下单     真实行情 + 真实下单
```

- `BINANCE_TESTNET=true` 切换到测试网（验证程序正确性）
- 默认用主网行情 + `--dry-run`（验证策略盈利能力）
- `make promote NAME=xxx` 切换到实盘

## 常用命令

```bash
make install        # 安装依赖
make watch          # 查行情
make account        # 查余额
make status         # 策略状态
make scan           # 扫描高波动币种
make start          # 启动策略 (dry-run)
make stop           # 停止策略
make projects       # 列出项目
make project-create NAME=xxx FUND=100  # 创建项目
make promote NAME=xxx                  # 项目 promote 到实盘
make report         # 发送运营报告邮件
make notify SUBJECT="xx" BODY="xx"     # 发邮件
```

## 技能

- `/create-team` — 创建量化基金团队
- `/heartbeat` — 激活公司（核心入口，启动所有定时任务）
- `/start-trading` — 启动后台策略 + 定时监控
- `/monitor` — 查行情/持仓/策略
- `/scan` — 扫描高波动币种
- `/report` — 发送运营报告邮件
- `/notify` — 发邮件通知
- `/cron` — 创建定时任务
- `/transfer` — 账户间资金划转
- `/create-sub-account` — 创建币安子账户
- `/create-email` — 创建 AgentMail 邮箱

## 团队（/run-company）

| 角色 | 名称 | 职责 |
|------|------|------|
| CEO | main（team-lead） | 维护 skills/scripts、审批决策、发报告 |
| 分析师 | analyst | make scan 扫描选币、推荐策略 |
| 交易员 | trader | make status 管理策略、评估调整 |
| 风控 | risk | make account 监控风险、make report 发报告 |

## KPI

KPI 体系见 [kpi/framework.md](kpi/framework.md)，涵盖 6 大维度：收益、交易、策略组合、资金、风控、系统。

报告体系见 [kpi/report-framework.md](kpi/report-framework.md)，7 种报告类型。

每日 KPI 记录在 `kpi/` 目录，按日期命名：

- [2026-03-18](kpi/2026-03-18.md) — 首日运营

## 维护规则

- **/run-company 是唯一入口**：用户每次开新会话只需 `/run-company`，所有定时任务、团队、策略都要自动启动
- **及时更新 skill 提示词**：每次用户提出新需求或变更流程，必须同步更新 `/run-company` 等相关 skill 的 SKILL.md
- **报告存本地**：所有邮件报告同时存档到 `data/reports/YYYY-MM-DD/HH-MM-SS.md`
- **KPI 按 framework.md 体系跟踪**，每日记录到 `kpi/YYYY-MM-DD.md`
- **提交自己做**：不要问用户，有改动就自己 commit
- **迭代报告 = commit + 邮件**：先提交所有改动，再发迭代报告邮件，合成一个动作

## 通知

- 发件: `trader-bot-1@agentmail.to`
- 收件: `yarnb@qq.com`
