---
name: check
description: 风控检查 — 止损/仓位/爆仓保护
user-invocable: true
---

# Check — 风控检查

## 执行

### 1. 运行风控检查

```bash
cd /Users/yarnb/agent-projects/clawchat && make check
```

### 2. 检查项

- **止损**：未实现亏损是否超过阈值（单笔 -5%、总计 -10%）
- **仓位**：单币种仓位是否超过总资金 30%
- **爆仓距离**：标记价离强平价是否 < 10%
- **杠杆**：是否超过 20x 上限

### 3. 触发止损

如果任何检查不通过：
1. 立即执行平仓
2. `make notify` 发送风控告警
3. 记录到 `reports/event/`

### 4. 输出

风控状态摘要：通过/告警/触发止损。
