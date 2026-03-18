---
name: create-team
description: 创建策略研发团队 — 招聘 searcher + strategy-dev 并行搜索
user-invocable: true
---

# Create Team — 创建策略研发团队

## 执行

### 1. 创建团队

```
TeamCreate(team_name="alpha-search")
```

### 2. 招聘成员

| 成员 | 职责 |
|------|------|
| **searcher-small** | 小币种 + 短周期（1m/5m），跑回测搜索 |
| **searcher-large** | 大币种 + 长周期（15m/1h/4h），跑回测搜索 |
| **strategy-dev** | 设计新策略、优化参数、分析回测结果 |

每个成员用：
```bash
cd /Users/yarnb/agent-projects/clawchat && make backtest SYMBOL=XXX STRATEGY=XXX DAYS=14 LEVERAGE=X TIMEFRAME=Xh
```

### 3. 确认就绪

团队创建后，可用 `/find-alpha` 启动全流程搜索，或直接给成员分配回测任务。
