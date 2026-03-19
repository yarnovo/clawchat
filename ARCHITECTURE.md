# ClawChat 系统架构

## 总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClawChat 量化基金                         │
│                                                                 │
│  决策层（写配置文件控制执行层）                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐           │
│  │ 策略发现  │  │ 自动调控  │  │ 报告引擎  │  │  你    │           │
│  │ discovery │  │ autopilot│  │ (待建)    │  │team-lead│          │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └───┬───┘           │
│        │写signal.json │写trade.json │读records/  │审批/决策       │
│                                                                 │
│  执行层（读配置文件，忠实执行）                                     │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  交易引擎     │  │  数据引擎     │                             │
│  │  engine (V2) │  │  data-engine │                             │
│  └──────┬───────┘  └──────┬───────┘                             │
│         │                  │                                     │
│         ▼                  ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    shared (共享库)                        │   │
│  │  indicators / candle / exchange / types / criteria /      │   │
│  │  strategy / risk / data / account / paths / logging       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 系统角色

| 组件 | 角色 | 读什么 | 写什么 |
|------|------|--------|--------|
| **交易引擎** | 执行者 — 配置驱动，不做决策 | signal.json / risk.json / trade.json | state.json / records/ |
| **数据引擎** | 执行者 — 采集存储行情 | Binance API | data/*.parquet |
| **策略发现** | 决策者 — 发现好参数 | data/*.parquet | discovered/*/signal.json |
| **autopilot** | 决策者 — 自动调控策略 | state.json / records/ | trade.json / signal.json / risk.json |
| **报告引擎** | 观察者 — 汇总数据生成报告 | records/ / ledger.json | reports/*.md |
| **你** | 最终决策者 | reports/ / discovered/ | 审批 status=approved |

## 通信机制：文件即接口

```
signal.json  → 信号参数（发现引擎写，交易引擎读）
risk.json    → 风控规则（autopilot/人写，交易引擎读）
trade.json   → 执行指令（autopilot/人写，交易引擎读）
state.json   → 运行状态（交易引擎写，autopilot 读）
records/     → 交易记录（交易引擎写，报告引擎读）

所有通信都是文件，没有直接 RPC/IPC
```

## 目录结构

```
clawchat/
├── accounts/                              # 账户层（三层结构）
│   └── binance-main/                      #   虚拟账户
│       ├── account.json                   #     交易所连接、总资金
│       └── portfolios/
│           └── main/                      #   投资组合
│               ├── portfolio.json         #     风险预算、敞口限制
│               └── strategies/            #   策略（approved 在此运行）
│                   ├── ntrn-trend-v2-5m/
│                   │   ├── signal.json    #     信号参数（什么时候买卖）
│                   │   ├── risk.json      #     策略级风控（亏了怎么办）
│                   │   ├── trade.json     #     执行控制（暂停/恢复/手动指令）
│                   │   └── state.json     #     运行时状态（引擎写入）
│                   ├── bard-breakout-15m/
│                   └── ...
│
├── discovered/                            # 策略暂存区（发现引擎产出 pending 策略）
│   └── bard-trend-ema20122-15m/
│       └── signal.json                    #   status=pending，等待审批
│
├── shared/                                # Rust 共享库
│   └── src/
│       ├── indicators.rs                  #   技术指标（EMA/RSI/ATR）
│       ├── candle.rs                      #   K 线数据结构
│       ├── exchange.rs                    #   Binance API 客户端
│       ├── types.rs                       #   通用类型（Side/OrderType/PositionSide）
│       ├── criteria.rs                    #   策略准入标准
│       ├── strategy.rs                    #   SignalConfig 配置结构（原 StrategyFile）
│       ├── risk.rs                        #   风控纯函数
│       ├── trade.rs                       #   TradeOverride 交易指令
│       ├── data.rs                        #   DataStore（Parquet 读写）
│       ├── account.rs                     #   AccountConfig / PortfolioConfig
│       ├── paths.rs                       #   统一路径管理
│       ├── logging.rs                     #   日志初始化
│       └── config_util.rs                 #   工具函数
│
├── engine/                                # 交易引擎（配置驱动的执行引擎）
│   └── src/
│       ├── main.rs                        #   入口 + 主事件循环
│       ├── gateway.rs                     #   WS 连接池 + 行情 broadcast
│       ├── worker.rs                      #   策略 Worker（tokio task）
│       ├── order_router.rs                #   订单路由（信号→风控→下单→簿记）
│       ├── ledger.rs                      #   虚拟账户管理
│       ├── global_risk.rs                 #   组合级风控
│       ├── strategy.rs                    #   Strategy trait + 所有信号实现
│       ├── risk.rs                        #   EngineRiskGuard
│       ├── filter.rs                      #   SignalFilter
│       ├── ws_feed.rs                     #   WebSocket 连接
│       ├── trade.rs                       #   TradeOverride 执行
│       ├── types.rs                       #   引擎内部类型
│       ├── config.rs                      #   引擎配置
│       └── state.rs                       #   状态持久化
│
├── data-engine/                           # 数据引擎
│   └── src/
│       ├── main.rs                        #   CLI（run/backfill/status/validate）
│       ├── collector.rs                   #   WS kline 实时采集
│       ├── backfill.rs                    #   REST 历史回填
│       └── validator.rs                   #   数据质量检查
│
├── discovery/                             # 策略发现引擎
│   └── src/
│       ├── main.rs                        #   CLI（scan/status）
│       ├── generator.rs                   #   参数空间定义 + 网格枚举
│       ├── evaluator.rs                   #   快速回测引擎（rayon 并行）
│       ├── selector.rs                    #   筛选管道
│       └── output.rs                      #   生成 signal.json + 报告
│
├── autopilot/                             # 自动调控引擎（决策层）
│   └── src/
│       ├── main.rs                        #   监听 state.json，评估规则，写控制文件
│       ├── engine.rs                      #   规则引擎（Decision 枚举）
│       ├── writer.rs                      #   写 trade.json / signal.json / risk.json
│       ├── config.rs                      #   autopilot 规则配置
│       └── types.rs                       #   类型定义
│
├── ops/                                   # CLI 工具集（binary: clawchat）
│   └── src/
│       ├── main.rs                        #   入口 + 子命令定义
│       ├── cmd/                           #   子命令实现
│       ├── backtest/                      #   回测模块
│       └── util.rs                        #   工具函数
│
├── data/                                  # K 线数据（Parquet，.gitignore）
├── records/                               # 运行记录（.gitignore）
│   ├── trades.jsonl                       #   全部交易日志
│   ├── pnl_by_strategy.jsonl              #   策略级 PnL
│   ├── risk_events.jsonl                  #   风控事件
│   ├── signals.jsonl                      #   信号日志
│   └── ledger.json                        #   虚拟账户快照
├── reports/                               # 日报/周报（报告引擎产出，.gitignore）
├── logs/                                  # 运行日志（按天轮转，.gitignore）
└── Makefile                               # 运维命令入口
```

## 配置文件规范

### 每个策略目录下的三个配置文件

```
strategies/{name}/
├── signal.json   ← 信号参数（什么时候买卖）
├── risk.json     ← 风控规则（亏了怎么办）
└── trade.json    ← 执行控制（暂停/恢复/手动指令）
```

**signal.json** — 信号参数 + 策略元数据 + 仓位配置
```json
{
  "name": "ntrn-trend-v2-5m",
  "engine_strategy": "default",
  "symbol": "NTRNUSDT",
  "timeframe": "5m",
  "timeframe_ms": 300000,
  "leverage": 3,
  "position_size": 0.3,
  "capital": 18,
  "params": {
    "ema_fast": 21,
    "ema_slow": 55,
    "atr_period": 14,
    "atr_sl_mult": 1.5,
    "atr_tp_mult": 2.5
  },
  "status": "approved",
  "backtest": {
    "return_pct": 47.29,
    "sharpe": 6.31,
    "max_drawdown_pct": 12.71,
    "trades": 23,
    "win_rate": 47.8,
    "profit_factor": 2.4
  }
}
```

**risk.json** — 见 /risk-config

**trade.json** — 见 /trade-config

### account.json
```json
{
  "name": "binance-main",
  "exchange": "binance",
  "base_url": "https://fapi.binance.com",
  "total_capital": 222,
  "api_key_env": "BINANCE_API_KEY",
  "api_secret_env": "BINANCE_API_SECRET"
}
```

### portfolio.json
```json
{
  "name": "main",
  "allocated_capital": 203,
  "reserve": 19,
  "risk": {
    "max_drawdown_pct": 10,
    "max_daily_loss_pct": 5,
    "max_total_exposure": 2.0,
    "max_per_coin_exposure_pct": 50
  }
}
```

## 交易引擎架构（V2 单进程 Gateway）

```
┌─────────────────────────────────────────────────────────────┐
│                    交易引擎 (配置驱动执行引擎)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Gateway — WS 连接池                                  │    │
│  │  aggTrade × N unique symbols (共享，不是每策略一条)   │    │
│  │  markPrice × N                                      │    │
│  │  userDataStream × 1                                 │    │
│  │  broadcast channel per symbol (容量 4096)            │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │ broadcast                         │
│  ┌───────┐ ┌───────┐ ┌──┴────┐ ┌───────┐ ┌───────┐        │
│  │Worker1│ │Worker2│ │Worker3│ │Worker4│ │WorkerN│        │
│  │       │ │       │ │       │ │       │ │       │        │
│  │CandleAggregator → Strategy.on_candle() → SignalFilter│  │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘        │
│      │         │         │         │         │              │
│      └─────────┴─────────┴────┬────┴─────────┘             │
│                               │ mpsc channel                │
│  ┌────────────────────────────▼─────────────────────────┐  │
│  │                   Order Router                        │  │
│  │                                                       │  │
│  │  ① 策略级风控 (EngineRiskGuard)                       │  │
│  │  ② 虚拟账户余额检查                                   │  │
│  │  ③ 全局风控 (GlobalRiskGuard)                         │  │
│  │  ④ compute_order_qty (虚拟权益)                       │  │
│  │  ⑤ Exchange.place_order → Binance                     │  │
│  │  ⑥ 成交回报 → 虚拟账本簿记                            │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │ Ledger — 虚拟账户                                      │  │
│  │  Account → Portfolio → StrategyAllocation × N          │  │
│  │  持久化: records/ledger.json (60 秒自动保存)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Config Watcher — 热更新                               │  │
│  │  signal.json 变化 → 重载信号参数                       │  │
│  │  risk.json 变化 → 重载风控配置                         │  │
│  │  trade.json 变化 → 执行交易指令（暂停/恢复/平仓）       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 风控分层

```
Account 层 — 物理安全网
  Binance 侧 STOP_MARKET 条件单
  保证金率监控

Portfolio 层 — 全局风控 (GlobalRiskGuard)
  总资产回撤 >= 10%        → CloseAll (KPI 红线)
  当日亏损 >= 5%           → Block (暂停开新仓)
  总敞口 > 200%            → Block
  单币种敞口 > 50% 总资金   → Block 该币种

Strategy 层 — 策略级风控
  EngineRiskGuard (下单前):
    杠杆超限 / 当日损失 / 连续亏损熔断 / 资金费率
  risk_gate (实时持仓):
    止损止盈 / 高水位回撤 / 持仓比例
  回撤分级:
    >= 15% 配额 → 黄灯
    >= 25% 配额 → 暂停
    >= 35% 配额 → 全平停机
```

## 策略生命周期

```
① 发现    make discover → discovered/*/signal.json (status=pending)
② 审批    /review-discovered → 检查冲突+配额 → approved → 搬到 accounts/
③ 运行    交易引擎加载 → Worker 算信号 → Order Router 下单 → Ledger 记账
④ 调控    autopilot 监控 state.json → 写 trade.json 暂停/缩仓/停机
⑤ 追踪    报告引擎读 records/ → 日报/周报
⑥ 评估    2 周负收益→下线 | 回撤超限→停机 | 赚钱→加配
⑦ 补位    下线释放配额 → 新发现策略填补 → 回到 ①
```

## 虚拟账户模型

```
Account (物理): binance-main, $222
  └── Portfolio: main ($203 allocated + $19 reserve)
        ├── ntrn-trend-v2-5m   $18 → equity $XX.XX
        ├── bard-breakout-15m  $18 → equity $XX.XX
        ├── bard-trend-15m     $18 → equity $XX.XX
        ├── bard-rsi-5m        $18 → equity $XX.XX
        ├── ntrn-breakout-5m   $18 → equity $XX.XX
        ├── ntrn-ema2050-5m    $18 → equity $XX.XX
        ├── ntrn-trend-fast-5m $18 → equity $XX.XX
        ├── fet-trend-15m      $27 → equity $XX.XX
        ├── lyn-trend-15m      $25 → equity $XX.XX
        └── sui-trend-15m      $25 → equity $XX.XX
```

## 数据输出分层

| 目录 | 写入者 | 内容 | 读取者 |
|------|--------|------|--------|
| `records/` | 交易引擎实时写 | 结构化数据（JSONL/CSV/JSON） | autopilot、报告引擎、CLI |
| `reports/` | 报告引擎定时写 | Markdown 日报/周报 | 你（人） |
| `logs/` | tracing 自动写 | 运行日志（按天轮转） | 排查问题 |

## 运维命令

```bash
# 交易引擎
make hft                    # 启动（单进程，所有 approved 策略）
                            # 每策略按 signal.json 的 mode 字段独立控制 dry-run/live

# 数据引擎
make data-engine            # 启动实时 K 线采集
make data-backfill          # 回填 180 天历史
make data-status            # 查看数据状态
make data-validate          # 校验数据质量

# 策略发现
make discover               # 全量扫描
make discover-scan          # 指定条件扫描

# 审批
/review-discovered          # 审批 discovered/ 中的 pending 策略

# 监控
make status                 # 总览
```

## KPI

| 指标 | 目标 | 红线 | 保障机制 |
|------|------|------|----------|
| 周增长 | +10% | — | 策略发现持续补位 |
| 月增长 | +50% | — | 多策略组合分散 |
| 最大回撤 | — | -10% | GlobalRiskGuard → CloseAll |

起始资产：$222（2026-03-19）
