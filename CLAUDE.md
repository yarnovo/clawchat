# ClawChat — AI 量化交易工作站

## 架构

```
clawchat/
├── .env                    # 密钥（BINANCE / AGENTMAIL / ARK）
├── pyproject.toml          # uv 管理 Python 依赖
├── package.json            # npm 管理 Node.js 依赖
├── Makefile                # 统一命令入口
├── scripts/                # 公共脚本（Python/JS/Go/Rust 均可）
│   ├── exchange.py         # 共享交易所连接
│   ├── market.py           # 行情监控
│   ├── grid.py             # 网格交易策略
│   └── projects.py         # 项目/子账户管理
├── data/                   # 运行数据（gitignore）
└── .claude/skills/         # Claude Code 技能
    ├── monitor/            # /monitor  — 行情监控
    ├── scan/               # /scan     — 高波动选币
    ├── start-trading/      # /start-trading — 一键启动
    ├── report/             # /report   — 发送邮件报告
    ├── notify/             # /notify   — 邮件通知
    ├── transfer/           # /transfer — 资金划转
    ├── create-sub-account/ # /create-sub-account — 创建子账户
    └── create-email/       # /create-email — 创建 AgentMail 邮箱
```

## 设计原则

- **scripts/ 是公共脚本**，任何语言都可以（Python/JS/Go/Rust），按需接入生态
- **skill 内可以有自己的 scripts/**，只有公共的才放根 scripts/
- **不用 monorepo**，uv 管 Python，npm 管 Node.js，Makefile 统一入口
- **项目隔离**：每个 project = 虚拟子账户 + 独立资金 + 策略配置

## 常用命令

```bash
make install     # 安装依赖
make watch       # 查行情
make account     # 查余额
make status      # 策略状态
make start       # 启动策略 (dry-run)
make stop        # 停止策略
make projects    # 列出项目
```

## 技能

- `/start-trading` — 启动后台策略 + 定时监控
- `/monitor` — 查行情/持仓/策略
- `/scan` — 扫描高波动币种
- `/report` — 发送状态报告邮件
- `/notify` — 发邮件通知
- `/transfer` — 账户间资金划转
- `/create-sub-account` — 创建币安子账户

## 通知

- 发件: `trader-bot-1@agentmail.to`
- 收件: `yarnb@qq.com`
