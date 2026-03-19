# 数据采集与币种扩展

**优先级**: P2
**来源**: 调研分析（增长基础）

## 问题

当前数据引擎仅采集约 7 个币种的 K 线数据，严重限制发现引擎的搜索空间：
- symbols.json 已注册 20+ 币种，但多数状态为 pending（无数据）
- PIPPIN/BAN/BTC/ETH/FLOKI 等币种无历史蜡烛数据
- 主流币种（ADA、XLM、APT、DOT、AVAX 等）未覆盖
- 发现引擎尝试评估无数据币种时浪费算力（batch_results.csv 大量 0 ROI）
- 无新币自动发现机制（Binance 新上线合约不会自动加入采集）

## 需求

### 1. 扩展币种覆盖

优先级分层：
- **T1（立即采集）**：Binance FAPI 成交量 Top 30 的永续合约
- **T2（按需采集）**：发现引擎请求的新币种
- **T3（自动发现）**：Binance 新上线的永续合约

### 2. 新币自动发现

- 每日查询 Binance `/fapi/v1/exchangeInfo` 获取当前所有永续合约列表
- 与 symbols.json 对比，新上线的币种自动添加（status=pending）
- 写入 `records/new_symbols.jsonl` 记录发现时间

### 3. 数据质量检查

- 采集后检查 K 线完整性（缺失 > 5% → 标记不可用）
- 新币种前 7 天数据不足时标记"数据预热中"
- 发现引擎跳过数据不足的币种（与发现加速需求协同）

### 4. 历史数据回填

- 新加入的币种自动回填 90 天历史 K 线
- 回填完成后 status 从 pending → ready
- 支持手动触发：`cargo run -p clawchat-ops -- data backfill SYMBOL`

## 涉及文件

- `data-engine/src/` — 扩展采集器，新币扫描
- `config/symbols.json` — 币种注册表扩展
- `ops/src/` — data backfill 命令

## 验收标准

- [ ] 采集覆盖 Binance Top 30 永续合约
- [ ] 新上线合约自动发现并加入采集
- [ ] 数据质量检查防止无效回测
- [ ] 历史数据支持 90 天回填
