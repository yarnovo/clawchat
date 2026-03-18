---
name: monitor
description: 定时行情监控 - 配合 /loop 使用，检查持仓和市场状况
user-invocable: true
---

# 行情监控

定时检查币安行情和账户状态，适合配合 `/loop` 使用。

## 用法

- `/loop 5m /monitor` — 每5分钟监控一次
- `/monitor` — 手动执行一次

## 执行步骤

1. 运行行情：`source .env && uv run market watch`
2. 运行账户：`source .env && uv run market account`
3. 如果有网格策略：`source .env && uv run grid status`

## 输出要求

- 简洁汇报：主流币价格、账户余额、策略状态
- 24h 涨跌超过 5% 特别标注
- 网格策略有新成交则标注
