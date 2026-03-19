# ops 命令纯函数化 — 输出到 stdout，不写配置

**提出来源**: 架构讨论
**优先级**: 高

## 背景
ops 命令应该是原子函数：查询数据 → stdout 输出结果。agent 看结果后自己决定是否写配置。命令本身不应直接修改 config/ 文件。

## 需求

### scan-symbols 改造
- 现在：扫描后直接写 symbols.json
- 改后：扫描后输出 JSON 到 stdout，不写文件
- 输出格式：
```json
[
  {"symbol":"BTCUSDT","volume_24h":18808000000,"listing_days":2000},
  {"symbol":"ETHUSDT","volume_24h":17627000000,"listing_days":1800}
]
```
- agent 收到后分析，自己写 config/symbols.json

### expand-symbol 改造
- 现在：无结果时直接改 symbols.json 状态
- 改后：输出结果到 stdout，agent 自己更新 symbols.json
- 输出格式：`{"symbol":"WLDUSDT","backfill":"ok","discovery":"no_signal","candidates":0}`

## 验收标准
- [ ] scan-symbols 只输出 JSON 到 stdout
- [ ] expand-symbol 只输出 JSON 到 stdout
- [ ] 两个命令都不写 config/ 文件
- [ ] --json flag 控制输出格式（默认表格，--json 输出 JSON）
