---
name: scout
description: 币种侦察 — 扫描市场发现新币种，分析后加入采集，触发策略发现
user-invocable: true
---

# 币种侦察

扫描 Binance 市场发现有潜力的新币种，分析后决定是否采集和搜索策略。

## 流程

### 1. 扫描市场

```bash
cargo run -p clawchat-ops -- scan-symbols --min-volume 5000000 --top 20 --json
```

输出 JSON 数组到 stdout，包含候选币种的 symbol、24h 成交额、上线天数。

### 2. 分析候选

对每个候选分析：
- 和已有币种的相关性（同赛道的币不要太多）
- 成交量趋势（是持续高还是短期暴涨）
- 当前组合缺什么类型的币（大盘币？meme？DeFi？）
- 配额是否充足（每个新币至少需要 $15 × 2-3 个策略 = $30-45）

### 3. 决定采集

分析后选择要采集的新币种，写入 config/symbols.json：

```python
# 读现有
import json
reg = json.load(open("config/symbols.json"))

# 添加新币
reg["symbols"]["SOLUSDT"] = {
    "status": "data_ready",
    "added_at": "2026-03-19",
    "source": "scout",
    "volume_24h_usd": 2622500000
}

# 写回
json.dump(reg, open("config/symbols.json", "w"), indent=2)
```

data-engine 监听到变化后自动开始采集。

### 4. 触发策略发现

等数据回填完成后（或直接触发）：

```bash
cargo run -p clawchat-ops -- expand-symbol --symbol SOLUSDT --days 180 --json
```

输出结果 JSON，看有没有发现策略。

### 5. 汇报

向 team-lead 汇报：
- 扫描了多少候选
- 分析后选了哪些，理由
- 数据回填状态
- 策略发现结果
- 写 notes/ 记录侦察经验

## 注意
- scan-symbols 是纯函数，只输出不写文件
- 写 config/symbols.json 是 scout 自己的决策
- 不要 git commit
