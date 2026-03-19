# Gateway 动态添加新 symbol WS 连接

**提出来源**: 架构师分析
**优先级**: 中

## 背景
当前新增全新 symbol 的策略需要重启引擎。同 symbol 新策略已支持热加载。

## 推荐方案：B（独立连接）
新 symbol 单独建一条 WS 连接，不动现有 combined stream。

- 零风险、零中断
- ~160 行改动
- Gateway 新增 `add_symbol()` 方法
- channels 改为 `Arc<RwLock<HashMap>>`

## 远期演进
方案 C（Binance SUBSCRIBE 协议动态订阅），symbol 超 20 个时再考虑。

## 涉及模块
- engine/src/gateway.rs
- engine/src/main.rs
