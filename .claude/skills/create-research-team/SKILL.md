---
name: create-research-team
description: 创建策略研发团队 — 研发交易策略，输出信号模型+参数+回测报告到 strategies/
user-invocable: true
---

# Create Research Team — 策略研发团队

交易团队的上游。研发团队负责产出可执行的交易策略，输出到 `strategies/` 目录，交易团队从这里读取并执行。

## 输出目录

```
strategies/
├── approved/           # 已验证，交易团队可直接执行
│   └── {symbol}-{strategy}-{timeframe}.md
├── backtest/           # 回测报告
│   └── {symbol}-{strategy}-{timeframe}-{date}.md
└── rejected/           # 未通过验证
    └── {symbol}-{strategy}-{timeframe}.md
```

## 输出格式：策略文件

每个通过验证的策略输出一份完整文件到 `strategies/approved/`：

```markdown
# {SYMBOL} {STRATEGY} 策略

## 基本信息
- 交易所: Binance USDT-M 合约
- 交易对: BTC/USDT
- 策略类型: trend
- 时间周期: 1h
- 杠杆: 5x
- 保证金模式: cross

## 信号模型
- 入场条件: (具体技术指标 + 阈值)
- 出场条件: (具体技术指标 + 阈值)
- 方向: long / short / both

## 参数设置
- EMA 快线: 20
- EMA 慢线: 50
- RSI 周期: 14
- RSI 超买: 70
- RSI 超卖: 30
- 止损: -3%
- 止盈: +6%
- (策略相关的所有参数)

## 资金管理
- 建议仓位: 总资金的 X%
- 单笔最大亏损: -5%
- 每日最大亏损: -10%

## 回测结果
- 测试周期: 14 天
- 本金: $200
- 净利润: +$XX (扣手续费 0.04% + 滑点 0.05%)
- 收益率: +XX%
- 夏普比率: X.XX
- 最大回撤: -XX%
- 交易笔数: XX
- 胜率: XX%
- 盈亏比: X.XX

## 执行命令
\```bash
cd /Users/yarnb/agent-projects/clawchat/scripts
# dry-run 验证
uv run python hft_engine.py --symbol BTC/USDT --strategy trend --leverage 5 --dry-run
# 实盘
uv run python hft_engine.py --symbol BTC/USDT --strategy trend --leverage 5
\```
```

## 执行

### 1. 创建团队

```
TeamCreate(team_name="research")
```

招聘 3 人：

| 成员 | 职责 |
|------|------|
| **searcher-small** | 小币种(SOL/XRP/DOGE/ANKR/ENJ) + 短周期(1m/5m)，大量回测 |
| **searcher-large** | 大币种(BTC/ETH/BNB) + 长周期(15m/1h/4h)，大量回测 |
| **strategy-dev** | 设计新信号模型、优化参数、撰写策略文件 |

### 2. 扫描选品

```bash
cd /Users/yarnb/agent-projects/clawchat && make scan
```

把 scan 结果中的高波动币种加入搜索列表。

### 3. 并行回测搜索

每个成员跑：
```bash
cd /Users/yarnb/agent-projects/clawchat && make backtest SYMBOL=XXX STRATEGY=XXX DAYS=14 LEVERAGE=X TIMEFRAME=Xh
```

搜索矩阵：
- **币种**: BTC/ETH/SOL/XRP/BNB/DOGE + scan 高波动币
- **策略**: trend, rsi, breakout, ema2050, vwap, scalping, bollinger, grid
- **周期**: 1m, 5m, 15m, 1h, 4h
- **杠杆**: 3x, 5x, 10x

### 4. 筛选

通过标准（Binance USDT-M 合约，扣手续费 0.04% + 滑点 0.05%）：
- 净利润 > 0
- 夏普 > 1
- 最大回撤 < 20%
- 交易 >= 3 笔
- 排除：100% 胜率但 < 3 笔

### 5. 输出

- 每次回测结果写入 `strategies/backtest/`
- 通过筛选的写入 `strategies/approved/`，包含完整信号模型+参数+回测数据
- 未通过的写入 `strategies/rejected/`
- 按收益率排序，标注推荐 Top 3

### 6. 交接

输出完成后通知交易团队：`strategies/approved/` 下有新策略可执行。
交易团队用 `/execute` 读取策略文件上实盘。
