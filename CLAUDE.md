# ClawChat 量化基金

## 工具

**CLI 量化分析工具**：回测、扫描、风控检查、状态监控等。
```bash
cd cli && uv run clawchat --help
```

**Rust 交易引擎**：自动接收行情、计算信号、执行交易。
```bash
make build   # 编译
make hft     # 运行
```

## 配置

三个 JSON 配置控制引擎行为，格式规范用技能查看：
- `strategy.json` — 策略参数（quant 写）→ `/strategy-config`
- `trade.json` — 交易指令（trader 写）→ `/trade-config`
- `risk.json` — 风控规则（quant 写，risk 审核）→ `/risk-config`

## records/

引擎运行时记录（程序写入，.gitignore 忽略）：
- `equity.csv` — 权益曲线
- `high_water.json` — 高水位持久化
- `trades.jsonl` — 交易日志
- `batch_results.csv` — 批量回测结果

## reports/

给人看的报告（CLI 生成，.gitignore 忽略）：
- 日报/周报/策略报告（`clawchat report` 生成）

## KPI

| 指标 | 目标 | 红线 |
|------|------|------|
| 周增长 | +10% | — |
| 月增长 | +50% | — |
| 最大回撤 | — | -10%（总资产不低于起始的 90%） |

起始资产：$222（2026-03-19）

## 规则

- **配置/标准只在一处定义，其他地方引用，不重复写。** 准入标准源头：`cli/src/clawchat/criteria.py`，配置规范见 skill（`/strategy-config` `/trade-config` `/risk-config`）
- **TODO.md 只有 team-lead 维护**，成员不能修改
- **git commit 只有 team-lead 做**，成员完成后汇报等验收
- **策略 status 只有 team-lead 能改为 approved**，成员产出写 `status=pending`
- **回测数据必须真实可复现**，team-lead 会亲自验证
- **需要全团队看到的规则写在这里（CLAUDE.md）**，不要散落在其他文件
