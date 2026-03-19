# 数据引擎不动态采集新币种

**发现来源**: 新币流程排查
**严重程度**: 高

## 现象
expand-symbol 一次性回填历史数据后，data-engine 不会自动开始实时采集新币的 K 线。需要重启 data-engine。

## 根因
data-engine 启动时读 symbols.json 确定采集列表，运行中不监听 symbols.json 变化。

## 建议修复
data-engine 的 collector 监听 symbols.json 文件变化，发现新币种时动态建 WS kline 连接（和交易引擎的 gateway.add_symbol 同一思路）。

## 涉及文件
- data-engine/src/collector.rs
- data-engine/src/main.rs
