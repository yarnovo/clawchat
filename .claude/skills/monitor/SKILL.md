---
name: monitor
description: 定时行情监控 - 配合 /loop 使用，检查持仓和市场状况
user-invocable: true
---

# 行情监控

## 执行

```bash
source .env && cd scripts
uv run python market.py watch
uv run python market.py account
uv run python grid.py status
```

- 24h 涨跌超过 5% 特别标注
- 网格策略有新成交则标注
