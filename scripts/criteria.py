"""策略准入标准 — 唯一定义源（与 engine/SCHEMA.md 同步）"""

CRITERIA = {
    "min_days": 14,
    "min_return_pct": 15,
    "min_sharpe": 5,
    "max_drawdown_pct": 20,
    "min_trades": 20,
    "min_win_rate": 45,
    "min_profit_factor": 1.8,
}


def passes(metrics, days):
    """检查回测结果是否达标"""
    c = CRITERIA
    return (
        days >= c["min_days"]
        and metrics["roi"] > c["min_return_pct"]
        and metrics["sharpe"] > c["min_sharpe"]
        and metrics["max_drawdown_pct"] < c["max_drawdown_pct"]
        and metrics["total_trades"] >= c["min_trades"]
        and metrics["win_rate"] >= c["min_win_rate"]
        and metrics["profit_factor"] >= c["min_profit_factor"]
    )
