# 高频交易架构重构计划

created: 2026-03-18 16:30
status: planning

## 目标

从 30 秒轮询网格交易 → 秒级 WebSocket 高频交易 + 合约杠杆

## 新架构

```
clawchat/
├── scripts/
│   ├── ws_feed.py          # WebSocket 实时行情（替代 REST 轮询）
│   ├── hft_engine.py       # 高频策略引擎（事件驱动，非 while loop）
│   ├── futures_exchange.py # 合约交易接口（替代现货 exchange.py）
│   ├── backtest.py         # 回测框架（扣手续费 + 滑点）
│   ├── risk_manager.py     # 实时风控（杠杆爆仓保护）
│   ├── market.py           # 保留：行情查询
│   ├── runner.py           # 保留：策略启停
│   └── notify.py           # 保留：邮件通知
├── strategies/             # 策略目录（独立于脚本）
│   ├── scalping.py         # 剥头皮策略
│   ├── momentum.py         # 动量策略
│   ├── mean_revert.py      # 均值回归
│   └── grid_hf.py          # 高频网格（改良版）
├── data/
│   ├── ticks/              # tick 级数据存储
│   └── backtest/           # 回测结果
└── .claude/skills/         # 技能
```

## 核心改动

### Phase 1: WebSocket 实时数据（替代 REST 轮询）
- [ ] ws_feed.py: 币安 WebSocket 行情流
- [ ] 本地 Order Book 维护
- [ ] 事件驱动架构（on_tick callback）

### Phase 2: 合约交易接口
- [ ] futures_exchange.py: 币安合约 API
- [ ] 支持做多/做空/杠杆设置
- [ ] 限价单/市价单/止损单

### Phase 3: 高频策略引擎
- [ ] hft_engine.py: 事件驱动引擎
- [ ] 策略接口定义（on_tick/on_order_fill）
- [ ] 1-5 秒级决策

### Phase 4: 回测框架（必须扣手续费）
- [ ] backtest.py: 用历史 tick 数据回测
- [ ] 扣手续费 0.02%（合约 maker）
- [ ] 考虑滑点
- [ ] 输出夏普比率/最大回撤

### Phase 5: 风控
- [ ] risk_manager.py: 实时爆仓价计算
- [ ] 强制止损线
- [ ] 杠杆倍数管理

### Phase 6: 部署到 ECS
- [ ] 7×24 运行
- [ ] 低延迟（靠近币安服务器）
