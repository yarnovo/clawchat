# 引擎快速预热 — 从 DataStore 加载历史 K 线

**提出来源**: 用户需求
**优先级**: 高

## 背景
当前引擎启动后策略需要等几小时预热（EMA 55 需要 55 根 K 线）。数据引擎已有 180 天历史 K 线，引擎可以直接读取跳过预热。

## 需求

引擎启动时，每个策略 Worker 启动前：
1. 从 DataStore 读取该 symbol 最近 N 根 K 线（N = 策略最大指标周期 × 2，如 EMA 55 → 读 110 根）
2. 聚合到策略的 timeframe（1m → 5m/15m）
3. 逐根喂给 strategy.on_candle() 完成预热
4. 预热完成后切换到实时行情

## 效果
- 5m 策略：从 4.5 小时 → 秒级
- 15m 策略：从 14 小时 → 秒级
- 引擎重启后立即可产生信号

## 实现要点
- engine/src/main.rs 或 worker.rs — Worker 启动前加载历史数据
- shared/src/data.rs — DataStore::read_candles() 已就绪
- shared/src/data.rs — DataStore::aggregate_candles() 已就绪
- 预热期间产生的信号应忽略（只更新指标，不下单）

## 验收标准
- [ ] 引擎启动后策略立即处于就绪状态
- [ ] 预热用的历史数据和实时数据无缝衔接
- [ ] 预热期间不产生交易信号
- [ ] cargo build + test 通过
