# ClawChat — AI 量化交易工作站

## 架构

```
clawchat/
├── .env                    # 密钥（BINANCE / BINANCE_TESTNET / AGENTMAIL）
├── Makefile                # 统一命令入口（所有语言通过 make 调用）
├── pyproject.toml          # uv 管理 Python 依赖
├── package.json            # npm 管理 Node.js 依赖（以后加）
├── scripts/                # Python 层（回测 + 策略搜索 + 工具）
│   ├── backtest.py         # 回测框架（扣手续费+滑点，9 个策略）
│   ├── hft_engine.py       # Python 实时交易引擎
│   ├── ws_feed.py          # WebSocket 实时行情
│   ├── futures_exchange.py # 合约交易接口
│   ├── market.py           # 行情查询 + 选币扫描
│   └── notify.py           # 邮件通知
├── engine/                 # Rust 层（高频交易引擎）
│   ├── Cargo.toml          # cargo 管理 Rust 依赖
│   └── src/
│       ├── main.rs         # 入口
│       ├── ws_feed.rs      # 异步 WebSocket（tokio）
│       ├── exchange.rs     # 合约 API + HMAC 签名
│       ├── strategy.rs     # Strategy trait + 做市/趋势策略
│       ├── risk.rs         # 风控（仓位/亏损/爆仓）
│       ├── types.rs        # 数据类型（零拷贝 serde）
│       └── config.rs       # 配置（clap + env）
├── data/                   # 运行数据（gitignore）
├── kpi/                    # KPI + 计划 + 复盘
├── notes/                  # 团队经验笔记
└── .claude/skills/         # 技能（只调 make，不关心底层语言）
```

## 多语言架构

```
Skill → make xxx → 底层实现

Python (uv):   make backtest / make scan / make notify
Rust (cargo):  make build / make hft
Node.js (npm): make stream（以后加）
```

- 三种语言各管各的依赖管理
- Makefile 是唯一的命令入口
- Skill 和团队成员只用 `make xxx`，不关心底层语言
- `engine/` 不绑定语言名，当前用 Rust，未来可换

## 核心规则

- **dry-run 必须尽可能模拟真实**：扣手续费（0.04%）、考虑滑点（0.05%）、遵守最小下单量
- **KPI 以实盘真实利润为准**：dry-run 利润只作参考，真正的 KPI 是交易所的实际盈亏
- **报告必须包含真实数据**：从交易所拉真实数据，不用本地模拟数据
- **先验证再上实盘**：回测通过 → dry-run 验证 → 实盘，绝不跳过

## 核心流程

```
/find-alpha           → 并行搜索盈利策略（一键全流程）
  ├── 创建搜索团队（3 人并行回测）
  ├── 搜索 360+ 组合（币种×策略×周期×杠杆）
  ├── 筛选 Top 3（扣费后盈利、夏普>1、回撤<20%）
  ├── dry-run 验证
  └── 上实盘 + /heartbeat 监控

/heartbeat            → 激活公司（心跳驱动团队+报告+风控）
/create-team          → 创建运营团队
```

## 常用命令

```bash
make install                # 安装依赖
make watch                  # 查行情
make account                # 查余额
make scan                   # 扫描高波动币种
make backtest SYMBOL=BTC/USDT STRATEGY=trend DAYS=14 LEVERAGE=5  # 回测
make notify SUBJECT="xx" BODY="xx"  # 发邮件
make report-dev             # 迭代报告
```

## 技能

**核心入口：**
- `/find-alpha` — 一键寻找盈利策略（搜索→验证→上实盘）
- `/heartbeat` — 激活公司（心跳驱动团队+报告+风控）
- `/create-team` — 创建量化基金团队

**报告类：**
- `/report-risk` — 风控报告（每 10 分钟，问 risk）
- `/report-strategy` — 策略报告（每 30 分钟，问 trader）
- `/report-fund` — 资金报告（每 30 分钟，问 desk）
- `/report-market` — 市场报告（每小时，问 analyst）
- `/dev-report` — 迭代报告（每 30 分钟，commit + 邮件）
- `/ops-daily` — 运营日报（每日 20:00）
- `/retro` — 团队复盘（每小时）

**工具类：**
- `/scan` — 扫描高波动币种
- `/notify` — 发邮件
- `/kpi` — KPI 管理
- `/self-improve` — 自我更新（审视架构+优化）
- `/research-binance` — 调研币安 API

## 策略（回测通过的）

| 策略 | 最佳币种 | 周期 | 收益率 | 夏普 |
|------|---------|------|--------|------|
| trend | BTC | 1h | +43.6% | 6.82 |
| breakout | ETH | 1h | +19.6% | 5.52 |
| rsi | XRP | 1h | +20.0% | 7.51 |
| vwap | BTC | 15m | +5.8% | 12.93 |
| ema2050 | BTC | 1h | +4.6% | 3.10 |

## 维护规则

- **及时更新 skill 提示词**：每次流程变更必须同步
- **提交自己做**：有改动就 commit，不用问用户
- **迭代报告 = commit + 邮件**
- **报告存本地**：data/reports/YYYY-MM-DD/HH-MM-SS.md
- **团队可动态增减**

## KPI

- KPI 体系：[kpi/framework.md](kpi/framework.md)
- 报告体系：[kpi/report-framework.md](kpi/report-framework.md)
- 架构优化计划：[kpi/PLAN-architecture-cleanup.md](kpi/PLAN-architecture-cleanup.md)
- HFT 重构计划：[kpi/PLAN-hft-refactor.md](kpi/PLAN-hft-refactor.md)
- Day 1 复盘：[kpi/2026-03-18-retro.md](kpi/2026-03-18-retro.md)

## 通知

- 发件: `trader-bot-1@agentmail.to`
- 收件: `yarnb@qq.com`
