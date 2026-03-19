# 策略发现引擎加速

**优先级**: P1
**来源**: 调研分析（增长瓶颈）

## 问题

当前策略发现引擎速度严重不足：
- 首轮发现（2026-03-19）耗时 >5 小时，仅在 FET/LYN/SUI 上找到 33 个通过准入的候选
- Selector 阶段异常耗时：RSI 100k 组合每个候选需 ~15 次回测，参数空间组合数膨胀
- Generator 使用全网格搜索（暴力枚举），未使用智能搜索算法
- batch_results.csv 显示大量 0 ROI 的垃圾结果（无数据币种浪费算力）

要从 $222 增长到 $1 亿，需要 50-100+ 个高质量策略持续补位，当前发现速率远不够。

## 需求

### 1. Selector 并行化

- 当前 selector 串行执行回测，改为多线程并行（tokio::spawn 或 rayon）
- 目标：selector 阶段耗时减少 3-5 倍

### 2. 智能参数搜索

- 替换全网格搜索为更高效的搜索算法：
  - 随机搜索（Random Search）— 简单有效，覆盖同等空间只需 1/10 的评估次数
  - 或贝叶斯优化（Bayesian Optimization）— 根据历史评估结果引导搜索方向
- Generator 产出候选数不变，但评估次数大幅减少

### 3. 无效候选早期过滤

- Generator 阶段检查币种是否有足够 K 线数据（至少 30 天），无数据的直接跳过
- 评估前期（前 7 天）如果 ROI < -10%，提前终止该候选（early stopping）

### 4. 发现引擎性能指标

- 记录每轮发现的耗时、评估数、通过率
- 写入 `records/discovery_metrics.jsonl`

## 涉及文件

- `discovery/src/selector.rs` — 并行化回测执行
- `discovery/src/generator.rs` — 智能搜索算法替换
- `discovery/src/evaluator.rs` — 早期过滤和 early stopping
- `discovery/src/` — 性能指标记录

## 验收标准

- [ ] 发现引擎单轮耗时从 5+ 小时降至 1-2 小时
- [ ] 无数据币种不再浪费回测算力
- [ ] 每轮发现的性能指标有记录
