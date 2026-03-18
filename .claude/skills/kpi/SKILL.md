---
name: kpi
description: 制定和管理 KPI 目标
user-invocable: true
---

# KPI 管理

制定、查看、更新 KPI 目标。

## 用法

- `/kpi` — 查看当日 KPI 进度
- `/kpi 实盘利润$10` — 制定新 KPI
- `/kpi promote率50%` — 制定 promote 率目标
- `/kpi list` — 列出所有活跃 KPI

## 执行

### 制定 KPI

解析用户输入，创建 KPI 条目写入 `kpi/YYYY-MM-DD.md`。

KPI 类型（参考 kpi/framework.md 六大维度）：

| 维度 | 示例 KPI |
|------|---------|
| 收益 | 实盘利润$10、收益率>1%、利润集中度<50% |
| 交易 | 总交易>200笔、平均每笔利润>$0.01 |
| 策略 | promote率>30%、无效策略<2、策略类型>=3 |
| 资金 | 资金利用率>50%、最大单策略敞口<$100 |
| 风控 | 最大回撤<5%、总浮亏<$20 |
| 系统 | 进程存活率100%、报告成功率100% |

### 查看进度

执行以下命令收集数据：
```bash
make pnl          # 实盘盈亏
make check        # promote 进度 + 风控
make status       # 策略状态
make account      # 账户余额
```

对比 KPI 目标，输出进度报告。

### 自动检查

KPI 心跳（每分钟 cron）自动检查 KPI 进度：
- 达标 → 发邮件庆祝 + 更新 kpi 文件
- 未达标 → 分析差距，主动调整策略
