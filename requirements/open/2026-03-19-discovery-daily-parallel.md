# 策略发现日更新 + 并行 quant

## 优先级：P1

## 背景

当前发现引擎每周运行 1 次，产出 2-3 个候选策略。要达成高增长目标：
- 需要持续补充新策略（替代衰减的旧策略）
- 参数空间覆盖不足（单线程顺序扫描）
- 审批流程依赖人工，延迟 3-5 天

## 需求

### 1. 日更新调度

- schedule.json 中 discovery 频率从 `weekly` 改为 `daily`
- 每日 00:00 UTC 自动触发
- 使用最近 14 天数据回测（而非 30 天，加快速度）

### 2. 并行 quant 调度

- 启动多个 quant worker，每个负责不同搜索方向：
  - quant-A：EMA 参数空间（fast: 5-20, slow: 20-100）
  - quant-B：RSI 参数空间（period: 10-30, os/ob: 15-40）
  - quant-C：Bollinger 参数空间（period: 10-30, std: 1.5-3.0）
  - quant-D：新币种专项（每日 top 10 新上线币）
- 各 worker 独立输出到 discovered/，互不干扰

### 3. 自动筛选（减少人工审批压力）

- 发现引擎输出时自动标记置信度：
  - `confidence: "high"` — Sharpe > 8, ROI > 100%, DD < 15%
  - `confidence: "medium"` — Sharpe > 5, ROI > 50%, DD < 20%
  - `confidence: "low"` — 仅过基本准入
- team-lead 优先审批 high 级别

### 4. 发现引擎 CLI 增强

- `ops discover --parallel 4` — 启动 4 个并行 worker
- `ops discover --daily` — 以日更新模式运行
- `ops discover --symbols BTC,ETH,SOL` — 指定币种搜索

## 涉及文件

- `discovery/src/main.rs` — 并行调度、日更新
- `discovery/src/evaluator.rs` — 置信度标记
- `config/schedule.json` — 调度频率
- `ops/src/main.rs` — CLI 增强

## 验收标准

- 每日自动发现 10+ 候选策略
- 4 个 worker 并行运行，互不干扰
- 候选策略有置信度标记
