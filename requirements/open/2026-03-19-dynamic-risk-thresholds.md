# 风控红线动态化

## 优先级：P1

## 背景

当前风控参数全部固定（全局回撤 10%、日损 5%）。问题：
- 小资金阶段（$200）：10% = $20 浮亏，过于严格会错杀策略
- 大资金阶段（$100K+）：10% = $10K 浮亏，过于宽松
- 不同阶段需要不同的风险偏好

## 需求

1. **动态红线计算**（risk.json 新增配置）：
   ```json
   {
     "dynamic_thresholds": true,
     "drawdown_schedule": [
       { "aum_below": 1000, "max_drawdown_pct": 12 },
       { "aum_below": 10000, "max_drawdown_pct": 10 },
       { "aum_below": 100000, "max_drawdown_pct": 8 },
       { "aum_above": 100000, "max_drawdown_pct": 5 }
     ],
     "daily_loss_schedule": [
       { "aum_below": 1000, "max_daily_loss_pct": 8 },
       { "aum_below": 10000, "max_daily_loss_pct": 6 },
       { "aum_above": 10000, "max_daily_loss_pct": 4 }
     ]
   }
   ```

2. **GlobalRiskGuard 适配**：
   - 根据当前 portfolio equity 查表确定红线
   - equity 变化时实时更新（不需重启）

3. **日志与报告**：
   - 红线变化时写日志：`"drawdown threshold changed: 12% → 10% (AUM crossed $1000)"`
   - 报告引擎显示当前适用的红线

## 涉及文件

- `engine/src/global_risk.rs` — 动态查表
- `shared/src/risk.rs` — 新增 schedule 配置结构
- `report-engine/src/` — 显示当前红线

## 验收标准

- AUM 增长时红线自动收紧
- 固定模式（`dynamic_thresholds: false`）不受影响
- 红线变化有日志记录
