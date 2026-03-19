# Autopilot 重构 — 数据驱动的动态调控

**提出来源**: 架构讨论
**优先级**: 高

## 背景
当前 autopilot 需要每个策略目录下有 autopilot.json 配置文件才能工作。实际上没有策略创建了这个文件，autopilot 启动后处于空转状态。

## 新定位

autopilot 是常驻后台的**数据驱动调控引擎**，不需要 autopilot.json。

### 读取
- `records/ledger.json` — 各策略虚拟权益、PnL、回撤
- `accounts/.../strategies/*/state.json` — 策略运行状态
- `accounts/.../strategies/*/signal.json` — 策略配置（mode、capital）
- `accounts/.../strategies/*/risk.json` — 当前风控参数
- `accounts/.../portfolios/main/portfolio.json` — 组合风控红线

### 写入
- `accounts/.../strategies/*/trade.json` — 暂停/恢复/平仓指令
- `accounts/.../strategies/*/risk.json` — 动态调整风控参数

### 决策规则（写在代码里，不靠配置文件）

**trade.json 调控：**
- 策略连续亏损 >= 3 笔 → pause
- 策略日损失 >= risk.json 的 max_daily_loss → pause
- 暂停 30 分钟后 → resume
- 策略回撤 >= 25% 配额 → stop（全平）
- 全局回撤接近 10% 红线 → 全部 pause

**risk.json 调控：**
- 策略盈利中 → 收紧 trailing_stop（锁利）
- 策略亏损中 → 不放宽（防止越亏越松）
- 市场波动率突变 → 调整 max_loss_per_trade
- 资金费率异常高 → 暂停对应方向

## 改造要点

1. 删除 autopilot.json 的依赖 — 不再扫描/读取这个文件
2. 改为读 ledger.json + state.json + risk.json
3. 决策规则硬编码在 engine.rs 中（可配置阈值放 portfolio.json 的 risk 字段）
4. 保持文件监听模式 — state.json 变化触发评估
5. 定时轮询 ledger.json（每 30 秒）

## 删除
- ref-engine-config skill 中 autopilot.json 的说明
- 所有策略目录下的 autopilot.json（如果有的话）

## 涉及模块
- autopilot/src/main.rs — 改为读 ledger + state
- autopilot/src/engine.rs — 重写决策规则
- autopilot/src/config.rs — 简化或删除
- autopilot/src/types.rs — 适配新数据源

## 验收标准
- [ ] autopilot 启动不需要 autopilot.json
- [ ] 读 ledger.json 做决策
- [ ] 连续亏损自动 pause
- [ ] 回撤超限自动 stop
- [ ] 动态调整 risk.json 的 trailing_stop
- [ ] cargo build + test 通过
