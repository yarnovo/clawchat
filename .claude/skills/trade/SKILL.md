---
name: trade
description: 交易指令编写规范 — trade.json 格式和 action 说明
user-invocable: true
---

# 交易指令编写规范

trader 通过 trade.json 控制引擎行为。引擎文件监听，改了立即执行。

## trade.json

```json
{
  "action": "hold",
  "params": {},
  "note": "",
  "updated_at": "2026-03-18T15:33:00Z",
  "executed_at": null
}
```

文件不存在 = hold（放行策略信号）。

## action 枚举

| action | 类型 | params | 说明 |
|--------|------|--------|------|
| hold | 持续 | — | 默认，放行策略信号 |
| pause | 持续 | — | 阻止开新仓，不平现有仓 |
| resume | 持续 | — | 取消 pause |
| stop | 一次性 | — | 平所有仓 + 进入 pause |
| close_all | 一次性 | — | 平所有仓 |
| close_long | 一次性 | — | 平多仓 |
| close_short | 一次性 | — | 平空仓 |
| add | 一次性 | `{"percent":30,"direction":"long"}` | 加仓 |
| reduce | 一次性 | `{"percent":50}` | 减仓 |

### 一次性 vs 持续

- **一次性**（close_all/add/reduce/stop）：执行后自动回 hold，写 executed_at
- **持续**（pause）：保持阻止直到 resume

### 优先级

```
trade.json override > risk.json 风控规则 > strategy.json 策略信号
```

## 使用示例

**暂停开仓：**
```json
{"action":"pause","params":{},"note":"市场震荡","updated_at":"2026-03-18T15:00:00Z"}
```

**减仓 50%：**
```json
{"action":"reduce","params":{"percent":50},"note":"锁利","updated_at":"2026-03-18T15:00:00Z"}
```

**加仓 30% 做多：**
```json
{"action":"add","params":{"percent":30,"direction":"long"},"note":"趋势确认","updated_at":"2026-03-18T15:00:00Z"}
```

**恢复交易：**
```json
{"action":"resume","params":{},"note":"恢复","updated_at":"2026-03-18T15:00:00Z"}
```

## 注意

- trade.json 放在 `strategies/{name}/` 目录下
- 只对该策略的引擎生效
- **suspended 策略没有引擎运行**，trade.json 不会被监听，需要手动操作
