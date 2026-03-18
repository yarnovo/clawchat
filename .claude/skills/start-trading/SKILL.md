---
name: start-trading
description: 一键启动交易系统 — 后台进程 + 定时监控 + 邮件报告
user-invocable: true
---

# 启动交易系统

## 执行步骤

### 1. 启动网格策略后台进程

```bash
source .env && cd scripts
pkill -f "grid.py run" 2>/dev/null

nohup uv run python grid.py run --symbol BTC/USDT --lower 70000 --upper 80000 --grids 10 --amount 10 --interval 120 --dry-run > ../data/btc-grid.log 2>&1 &
nohup uv run python grid.py run --symbol ETH/USDT --lower 2000 --upper 2800 --grids 10 --amount 10 --interval 120 --dry-run > ../data/eth-grid.log 2>&1 &
nohup uv run python grid.py run --symbol HYPER/USDT --lower 0.09 --upper 0.13 --grids 20 --amount 5 --interval 60 --dry-run > ../data/hyper-grid.log 2>&1 &
```

### 2. 启动定时监控

使用 `/loop 30m` 调度：每 30 分钟运行 `/report` 发送邮件报告。

### 3. 确认

运行 `uv run python grid.py status` 确认策略在跑，并立即发一封报告邮件。
