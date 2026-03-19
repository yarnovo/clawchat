---
name: scout
description: 投资机会侦察 — 发现新币种、新赛道、新组合方向，分析后落地为投资组合
user-invocable: true
---

# 投资机会侦察

不只是找新币，是发现**新的投资组合方向**。

## 侦察维度

### 1. 新币种发现
- `clawchat scan-symbols --json` 扫描 Binance 候选
- 分析成交量趋势、赛道归属、和已有币种相关性
- 有潜力 → 写 config/symbols.json → data-engine 自动采集

### 2. 赛道/主题发现
- 观察市场热点：AI 概念、meme、DeFi、L2 等
- 同赛道多个币集体趋势 → 建议创建主题组合
- 例：发现 SOL/JUP/RAY 集体上涨 → "SOL 生态组合"

### 3. 新组合方向
- 打新组合（新上线高波动）
- Funding Rate 套利组合（费率异常时做反方向）
- 趋势追踪组合（跟大盘方向）
- 均值回归组合（震荡市专用）

### 4. 现有组合优化
- 哪些币种该退出（成交量萎缩、下架风险）
- 哪些组合该关闭（持续亏损、市场环境变了）

## 执行流程

收到"执行币种侦察"时：

### Phase 1: 扫描
```bash
clawchat scan-symbols --min-volume 5000000 --top 20 --json
```
获取候选列表（纯 stdout 输出）。

### Phase 2: 分析
- 候选币种按赛道分类
- 和已有组合对比：缺什么？重复什么？
- 当前市场环境适合什么类型的组合？
- 配额是否充足？

### Phase 3: 决策
分析后可能的产出：
- **加币**：写 config/symbols.json 新增币种
- **建组合**：在 accounts/.../portfolios/ 下创建新组合（portfolio.json + risk.json）
- **扩展现有**：对新币种跑 `clawchat expand-symbol --json`
- **不行动**：市场没有新机会，记录到 notes/

### Phase 4: 汇报
向 team-lead 汇报：
- 扫描了什么、发现了什么
- 建议什么行动（加币/建组合/不行动）
- 理由
- 写 notes/ 记录侦察经验

## 注意
- scan-symbols 是纯函数，只输出不写文件
- 写 config/symbols.json 和创建组合是 scout 自己的决策
- 新组合的 portfolio.json 要设合理的风控参数
- 不要 git commit
