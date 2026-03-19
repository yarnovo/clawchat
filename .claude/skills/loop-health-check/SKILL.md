---
name: loop-health-check
description: 健康检查 — 快速检查引擎和数据管道是否正常运行。定时用法：/loop 1h /health-check
user-invocable: true
---

# 健康检查

快速检查（< 10 秒），只看关键指标，有问题立即报。

## 检查项

### 1. 交易引擎进程

```bash
ps aux | grep hft-engine | grep -v grep
```
- 在运行 → ✓
- 没在运行 → 🔴 "交易引擎未运行"

### 2. 数据引擎进程

```bash
ps aux | grep data-engine | grep -v grep
```
- 在运行 → ✓
- 没在运行 → ⚠️ "数据引擎未运行（不影响交易，但数据会断）"

### 3. 最新数据时间

检查 `data/candles/` 下任一币种的 parquet 文件修改时间。
- < 2 小时 → ✓
- >= 2 小时 → ⚠️ "K 线数据超过 2 小时未更新"

### 4. Ledger 最后更新

检查 `records/ledger.json` 修改时间。
- < 5 分钟 → ✓
- >= 5 分钟 → ⚠️ "Ledger 超过 5 分钟未更新（引擎可能卡住）"

### 5. 磁盘空间

```bash
df -h .
```
- 可用 > 1GB → ✓
- 可用 < 1GB → 🔴 "磁盘空间不足"

## 输出

**全部正常**：
```
✓ 健康检查通过
```

**有异常**：
```
健康检查发现问题：
🔴 交易引擎未运行
⚠️ K 线数据 3 小时未更新
```

## 定时使用

```
/loop 1h /health-check
```
