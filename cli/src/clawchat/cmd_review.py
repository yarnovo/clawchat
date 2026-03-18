"""策略实盘评估 — 对比实盘表现 vs 回测预期，生成 performance.json"""

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from clawchat._paths import STRATEGIES_DIR, RECORDS_DIR

TRADES_FILE = RECORDS_DIR / "trades.jsonl"

# ANSI
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"


def load_all_trades() -> list[dict]:
    """从 trades.jsonl 加载所有交易"""
    if not TRADES_FILE.exists():
        return []
    trades = []
    for line in TRADES_FILE.read_text().strip().split("\n"):
        if not line:
            continue
        try:
            trades.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return trades


def load_strategy_config(name: str) -> dict | None:
    """读取 strategy.json"""
    path = STRATEGIES_DIR / name / "strategy.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def get_approved_strategies() -> list[str]:
    """扫描 strategies/ 找所有 status=approved 的策略"""
    results = []
    if not STRATEGIES_DIR.exists():
        return results
    for d in sorted(STRATEGIES_DIR.iterdir()):
        sj = d / "strategy.json"
        if not sj.exists():
            continue
        try:
            cfg = json.loads(sj.read_text())
            if cfg.get("status") == "approved":
                results.append(d.name)
        except (json.JSONDecodeError, OSError):
            pass
    return results


def compute_live_metrics(trades: list[dict], capital: float) -> dict:
    """从交易记录计算实盘指标：收益、胜率、PF、回撤、夏普"""
    by_symbol = defaultdict(list)
    for t in trades:
        by_symbol[t.get("symbol", "?")].append(t)

    total_pnl = 0.0
    wins = 0
    losses = 0
    total_win_pnl = 0.0
    total_loss_pnl = 0.0
    pnl_series = []  # 每笔完整交易的 P&L，用于计算夏普

    for symbol, sym_trades in by_symbol.items():
        position = None
        for t in sym_trades:
            side = t.get("side", "").lower()
            price = float(t.get("price", 0) or 0)
            qty = float(t.get("qty", 0) or 0)

            if price == 0:
                continue

            if position is None:
                position = {"side": side, "price": price, "qty": qty}
                continue

            if position["side"] == side:
                total_qty = position["qty"] + qty
                if total_qty > 0:
                    position["price"] = (
                        position["price"] * position["qty"] + price * qty
                    ) / total_qty
                    position["qty"] = total_qty
                continue

            # 反向 → 平仓
            close_qty = min(position["qty"], qty)
            if position["side"] == "buy":
                pnl = (price - position["price"]) * close_qty
            else:
                pnl = (position["price"] - price) * close_qty

            total_pnl += pnl
            pnl_series.append(pnl)
            if pnl > 0:
                wins += 1
                total_win_pnl += pnl
            else:
                losses += 1
                total_loss_pnl += abs(pnl)

            remaining = position["qty"] - close_qty
            if remaining > 0:
                position["qty"] = remaining
            elif qty > close_qty:
                position = {"side": side, "price": price, "qty": qty - close_qty}
            else:
                position = None

    round_trips = wins + losses
    roi = (total_pnl / capital) * 100 if capital > 0 else 0
    win_rate = (wins / round_trips * 100) if round_trips > 0 else 0
    profit_factor = (total_win_pnl / total_loss_pnl) if total_loss_pnl > 0 else float("inf")

    # 最大回撤（基于累计 P&L 序列）
    max_drawdown_pct = 0.0
    cumulative = 0.0
    peak = 0.0
    for pnl in pnl_series:
        cumulative += pnl
        if cumulative > peak:
            peak = cumulative
        if peak > 0:
            dd = (peak - cumulative) / peak
            if dd > max_drawdown_pct:
                max_drawdown_pct = dd

    # 夏普比率（基于每笔交易收益率）
    sharpe = 0.0
    if len(pnl_series) > 1 and capital > 0:
        returns = [p / capital for p in pnl_series]
        mean_r = sum(returns) / len(returns)
        std_r = math.sqrt(sum((r - mean_r) ** 2 for r in returns) / len(returns))
        if std_r > 0:
            # 年化：假设每天 ~10 笔交易，一年 365 天
            sharpe = (mean_r / std_r) * math.sqrt(len(pnl_series))

    return {
        "roi": round(roi, 2),
        "total_pnl": round(total_pnl, 4),
        "trades": len(trades),
        "round_trips": round_trips,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 1),
        "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else "inf",
        "max_drawdown_pct": round(max_drawdown_pct * 100, 2),
        "sharpe": round(sharpe, 2),
    }


def assess_health(live: dict, backtest: dict | None) -> str:
    """评估策略健康状态: healthy / warning / degraded"""
    if not backtest:
        return "no_backtest"

    warnings = 0
    bt_return = backtest.get("return_pct", 0)
    bt_win_rate = backtest.get("win_rate", 0) * 100
    bt_pf = backtest.get("profit_factor", 0)

    if bt_return > 0 and live["roi"] / bt_return < 0.3:
        warnings += 1
    if bt_win_rate > 0 and live["win_rate"] / bt_win_rate < 0.5:
        warnings += 1
    pf = live["profit_factor"] if isinstance(live["profit_factor"], (int, float)) else 999
    if bt_pf > 0 and bt_pf != float("inf") and pf / bt_pf < 0.5:
        warnings += 1
    if live["max_drawdown_pct"] > 30:
        warnings += 1

    if warnings >= 2:
        return "degraded"
    if warnings >= 1:
        return "warning"
    return "healthy"


def generate_performance(name: str, live: dict, backtest: dict | None, health: str) -> dict:
    """生成 performance.json 内容"""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    perf = {
        "strategy": name,
        "reviewed_at": now,
        "health": health,
        "live": live,
    }
    if backtest:
        perf["backtest"] = backtest
    return perf


def review_strategy(name: str, all_trades: list[dict], verbose: bool = True) -> dict | None:
    """评估单个策略，返回 performance dict"""
    cfg = load_strategy_config(name)
    if not cfg:
        if verbose:
            print(f"  {RED}[{name}] strategy.json 不存在{RESET}")
        return None

    capital = float(cfg.get("capital", 200))
    backtest = cfg.get("backtest")

    # 筛选该策略的交易
    strades = [t for t in all_trades if t.get("strategy") == name]

    if not strades:
        if verbose:
            print(f"  {YELLOW}[{name}] 无实盘交易记录{RESET}")
        live = compute_live_metrics([], capital)
        health = "no_data"
    else:
        live = compute_live_metrics(strades, capital)
        health = assess_health(live, backtest)

    perf = generate_performance(name, live, backtest, health)

    # 写 performance.json
    perf_path = STRATEGIES_DIR / name / "performance.json"
    perf_path.write_text(json.dumps(perf, indent=2, ensure_ascii=False) + "\n")

    if verbose:
        _print_review(name, live, backtest, health)

    return perf


def _print_review(name: str, live: dict, backtest: dict | None, health: str):
    """打印单个策略的评估报告"""
    health_colors = {
        "healthy": GREEN,
        "warning": YELLOW,
        "degraded": RED,
        "no_data": YELLOW,
        "no_backtest": YELLOW,
    }
    hc = health_colors.get(health, RESET)

    print(f"\n  [{BOLD}{name}{RESET}]  {hc}{health.upper()}{RESET}")

    if live["trades"] == 0:
        print(f"    (无实盘数据)")
        return

    pf_str = str(live["profit_factor"]) if live["profit_factor"] == "inf" else f"{live['profit_factor']:.2f}"
    sign = "+" if live["total_pnl"] >= 0 else ""

    print(f"    实盘: ROI={live['roi']:.1f}%  WR={live['win_rate']:.0f}%  PF={pf_str}  DD={live['max_drawdown_pct']:.1f}%  Sharpe={live['sharpe']:.2f}")
    print(f"    交易: {live['trades']} 笔 ({live['round_trips']} 轮)  P&L: {sign}${live['total_pnl']:.4f}")

    if backtest:
        bt_wr = backtest.get("win_rate", 0) * 100
        bt_pf = backtest.get("profit_factor", 0)
        print(f"    回测: ROI={backtest.get('return_pct', 0):.1f}%  WR={bt_wr:.0f}%  PF={bt_pf:.2f}  DD={backtest.get('max_drawdown_pct', 0):.1f}%")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="策略实盘评估")
    parser.add_argument("strategy", nargs="?", help="策略名（不指定则评估所有 approved 策略）")
    args = parser.parse_args()

    all_trades = load_all_trades()

    if args.strategy:
        names = [args.strategy]
    else:
        names = get_approved_strategies()
        if not names:
            print("\n  无 approved 策略")
            return

    print(f"\n  {'='*62}")
    print(f"  {BOLD}策略实盘评估  ({len(all_trades)} 笔交易记录){RESET}")
    print(f"  {'='*62}")

    healths = {}
    for name in names:
        perf = review_strategy(name, all_trades)
        if perf:
            healths[name] = perf["health"]

    # 汇总
    print(f"\n  {'─'*62}")
    healthy = sum(1 for h in healths.values() if h == "healthy")
    warning = sum(1 for h in healths.values() if h == "warning")
    degraded = sum(1 for h in healths.values() if h == "degraded")
    no_data = sum(1 for h in healths.values() if h in ("no_data", "no_backtest"))
    print(f"  合计: {len(healths)} 策略  {GREEN}healthy={healthy}{RESET}  {YELLOW}warning={warning}{RESET}  {RED}degraded={degraded}{RESET}  no_data={no_data}")
    print()


if __name__ == "__main__":
    main()
