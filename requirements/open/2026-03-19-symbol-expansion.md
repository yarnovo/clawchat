# 币种扩展闭环工作流

**提出来源**: 架构设计
**优先级**: 中

## 概述

自动发现新币种 → 回填数据 → 搜索策略 → 上线。嵌入现有 schedule + team 工作流。

## 核心新增

### 1. symbols.json — 币种注册表
位置：`accounts/binance-main/symbols.json`
- 所有币种的状态：active / data_ready / no_signal / dormant / delisted
- 数据引擎和交易引擎的 symbol 来源
- 替代硬编码

### 2. ops scan-symbols 命令
`clawchat-ops scan-symbols --min-volume 5000000 --top 10`
- 从 Binance 扫描所有 USDT 永续
- 筛选：成交量 > $5M、上线 > 180 天
- 排除已有 + 黑名单
- 更新 symbols.json

### 3. ops expand-symbol 命令
`clawchat-ops expand-symbol --symbol WLDUSDT`
- 回填 180 天数据
- 跑策略发现
- 有结果 → discovered/

### 4. schedule 集成
```json
accounts/binance-main/schedule.json:
  "symbol_scan": { "interval_min": 10080, "member": "quant" }
```

### 5. data-engine 改造
- 读 symbols.json 代替 DEFAULT_SYMBOLS 硬编码
- 监听 symbols.json 变化动态添加采集

## 实施路径
1. shared/src/symbols.rs — 注册表数据结构
2. ops scan-symbols + expand-symbol 命令
3. data-engine 去硬编码
4. /discover skill 集成币种扫描步骤
5. autopilot 币种下架检测

## 验收标准
- [ ] scan-symbols 能发现新币种
- [ ] expand-symbol 能全链路跑通（回填→发现→上线）
- [ ] data-engine 读 symbols.json
- [ ] schedule 每周自动触发
