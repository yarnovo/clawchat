# 状态快照报告（独立于日报）

**提出来源**: 用户需求
**优先级**: 高

## 背景
需要一份实时状态快照，每 5 分钟自动生成，老板随时打开就能看到系统全貌。独立于日报（日报是每天总结，快照是实时全景）。

## 运行方式
- 命令：`cargo run -p report-engine -- snapshot`
- 输出：`reports/snapshot.md`（覆盖写，始终是最新的）
- 频率：每 5 分钟由常驻进程或 schedule 驱动

## 需求

日报包含 7 个部分：

### 1. 账户总览
- Binance 真实余额（调 exchange.get_balance()）
- 虚拟账户总权益（ledger total_equity）
- 差额
- 总 PnL（已实现 + 未实现）
- 全局回撤百分比

### 2. 策略状态快照
| 策略 | 币种 | 周期 | mode | 配额 | 虚拟权益 | PnL | 回撤 | 交易数 | 胜率 | 持仓 | trade.json | risk 止损/止盈 |

### 3. 币种敞口汇总
| 币种 | 策略数 | 总配额 | 总 PnL | 净持仓 | 占总资产% |

### 4. 风控状态
- 全局回撤 vs 10% 红线
- 黄灯/红灯策略列表
- autopilot 最近动作

### 5. 今日交易明细
- 从 records/trades.jsonl 读取
- 每笔：时间、策略、方向、数量、价格、PnL

### 6. 回测参考
| 策略 | 回测 Sharpe | 回测 ROI | 回测 DD | 实盘 PnL | 偏差 |

### 7. 引擎状态
- 交易引擎/数据引擎/autopilot：PID、运行时长
- 各策略预热状态：已聚合 K 线数 vs 需要数 → 预热中/就绪

## 涉及模块
- report-engine/src/daily.rs — 重写
- report-engine/src/data.rs — 新增数据读取函数

## 验收标准
- [ ] 日报包含 7 个部分
- [ ] Binance 真实余额显示
- [ ] 每策略 mode 标注
- [ ] 预热状态显示
- [ ] 数据不存在时优雅降级（N/A）
