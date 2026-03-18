---
name: research-binance
description: 调研币安 API 文档 — 查找接口、解决技术问题
user-invocable: true
---

# 调研币安文档

查找币安 API 接口文档，解决技术问题。

## 用法

- `/research-binance 子账户下单` — 查子账户交易接口
- `/research-binance 最小下单量` — 查 NOTIONAL filter
- `/research-binance WebSocket` — 查实时行情接口

## 数据源

1. **官方文档**：https://developers.binance.com/docs/
2. **官方 Python SDK**：https://github.com/binance/binance-connector-python
3. **API 参考**：https://developers.binance.com/docs/binance-spot-api-docs
4. **子账户 API**：https://developers.binance.com/docs/sub_account
5. **社区**：https://dev.binance.vision

## 执行

1. 用 WebSearch 搜索币安官方文档
2. 用 WebFetch 读取具体文档页面
3. 整理成可执行的方案
4. 如果需要写代码验证，在 scripts/ 中创建测试脚本
