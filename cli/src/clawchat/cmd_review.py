"""策略实盘评估 — 对比实盘表现 vs 回测预期，生成 performance.json，自动状态转换"""

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from clawchat._paths import STRATEGIES_DIR, RECORDS_DIR

TRADES_FILE = RECORDS_DIR / "trades.jsonl"

# ANSI
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"

# 生命周期常量
PROBATION_DAYS = 7
DEGRADED_GRACE_DAYS = 7

# probation → active 升级条件
PROBATION_MIN_TRADES = 10
PROBATION_MIN_ROI = 0.0           # 实盘收益 > 0%
PROBATION_MIN_WR_RATIO = 0.8     # 胜率 >= 回测 80%
PROBATION_MAX_DD_RATIO = 1.5     # 回撤 < 回测 1.5 倍


def is_active_status(status: str | None) -> bool:
    """status 是否表示策略应该在运行"""
    return status in ("approved", "active")


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


def save_strategy_config(name: str, cfg: dict):
    """写回 strategy.json"""
    path = STRATEGIES_DIR / name / "strategy.json"
    path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n")


def get_reviewable_strategies() -> list[str]:
    """扫描 strategies/ 找所有 approved/active 的策略"""
    results = []
    if not STRATEGIES_DIR.exists():
        return results
    for d in sorted(STRATEGIES_DIR.iterdir()):
        sj = d / "strategy.json"
        if not sj.exists():
            continue
        try:
            cfg = json.loads(sj.read_text())
            if is_active_status(cfg.get("status")):
                results.append(d.name)
        except (json.JSONDecodeError, OSError):
            pass
    return results


# keep old name as alias for backward compatibility
get_approved_strategies = get_reviewable_strategies


def filter_trades_by_window(trades: list[dict], days: int = 7) -> list[dict]:
    """过滤最近 N 天的交易"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = []
    for t in trades:
        ts_str = t.get("ts", "")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if ts >= cutoff:
                result.append(t)
        except (ValueError, TypeError):
            pass
    return result


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


def _parse_date(s: str | None) -> datetime | None:
    """解析日期字符串（支持 YYYY-MM-DD 和 ISO 格式）"""
    if not s:
        return None
    try:
        # YYYY-MM-DD
        if len(s) == 10:
            return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        # ISO format
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _today() -> str:
    """返回今天日期字符串"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def check_probation_upgrade(
    cfg: dict, live_7d: dict, backtest: dict | None, now: datetime | None = None,
) -> str | None:
    """检查是否应该从 approved → active（试运行期满升级）

    条件：
    - status=approved + lifecycle.approved 存在
    - approved 已过 PROBATION_DAYS 天
    - 7 天窗口实盘达标：
      - ROI > 0%
      - 胜率 >= 回测 80%
      - 回撤 < 回测 1.5 倍
      - 交易 >= 10 笔完整交易

    返回 "active" 表示应该升级，None 表示不升级。
    """
    if cfg.get("status") != "approved":
        return None

    lifecycle = cfg.get("lifecycle", {})
    approved_date = _parse_date(lifecycle.get("approved") or cfg.get("approved_date"))
    if not approved_date:
        return None

    if now is None:
        now = datetime.now(timezone.utc)
    if (now - approved_date).days < PROBATION_DAYS:
        return None

    # 检查实盘指标
    if live_7d["round_trips"] < PROBATION_MIN_TRADES:
        return None
    if live_7d["roi"] <= PROBATION_MIN_ROI:
        return None

    # 胜率对比回测
    if backtest:
        bt_wr = backtest.get("win_rate", 0) * 100
        if bt_wr > 0 and live_7d["win_rate"] < bt_wr * PROBATION_MIN_WR_RATIO:
            return None
        bt_dd = backtest.get("max_drawdown_pct", 0)
        if bt_dd > 0 and live_7d["max_drawdown_pct"] > bt_dd * PROBATION_MAX_DD_RATIO:
            return None

    return "active"


def check_degraded_suspension(
    cfg: dict, health: str, now: datetime | None = None,
) -> str | None:
    """检查是否应该从 degraded → suspended（持续退化自动降级）

    条件：
    - 当前 health=degraded
    - lifecycle.degraded_since 存在且已过 DEGRADED_GRACE_DAYS 天

    返回 "suspended" 表示应该降级，None 表示不降级。
    """
    if health != "degraded":
        return None

    lifecycle = cfg.get("lifecycle", {})
    degraded_since = _parse_date(lifecycle.get("degraded_since"))

    if now is None:
        now = datetime.now(timezone.utc)

    if degraded_since and (now - degraded_since).days >= DEGRADED_GRACE_DAYS:
        return "suspended"

    return None


def _update_lifecycle(cfg: dict, health: str, now: datetime | None = None):
    """更新 lifecycle 时间戳"""
    if now is None:
        now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    lifecycle = cfg.setdefault("lifecycle", {})
    lifecycle["last_review"] = today

    # 记录 degraded_since（首次进入 degraded 时设置）
    if health == "degraded":
        if not lifecycle.get("degraded_since"):
            lifecycle["degraded_since"] = today
    else:
        # 不再 degraded → 清除
        lifecycle.pop("degraded_since", None)


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


def review_strategy(
    name: str,
    all_trades: list[dict],
    verbose: bool = True,
    now: datetime | None = None,
) -> dict | None:
    """评估单个策略，返回 performance dict

    自动执行状态转换：
    - probation → active（试运行期满升级）
    - degraded → suspended（持续退化降级）
    """
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
        # 全量指标
        live = compute_live_metrics(strades, capital)
        health = assess_health(live, backtest)

    # 更新 lifecycle 时间戳
    cfg_changed = False
    _update_lifecycle(cfg, health, now=now)
    cfg_changed = True

    # 滚动 7 天窗口指标（用于 probation 升级判断）
    strades_7d = filter_trades_by_window(strades, days=PROBATION_DAYS)
    live_7d = compute_live_metrics(strades_7d, capital)

    # 自动状态转换
    transition = None

    # 1. probation → active
    new_status = check_probation_upgrade(cfg, live_7d, backtest, now=now)
    if new_status:
        transition = ("approved", "active", "试运行期满，实盘达标")
        cfg["status"] = "active"
        cfg.setdefault("lifecycle", {})["probation_end"] = _today() if now is None else now.strftime("%Y-%m-%d")
        cfg_changed = True

    # 2. degraded → suspended
    if not transition:
        new_status = check_degraded_suspension(cfg, health, now=now)
        if new_status:
            transition = (cfg.get("status", "?"), "suspended", f"degraded 超过 {DEGRADED_GRACE_DAYS} 天未恢复")
            cfg["status"] = "suspended"
            cfg["suspend_reason"] = f"auto: degraded {DEGRADED_GRACE_DAYS}+ days"
            cfg_changed = True

    # 写回 strategy.json（如果有变更）
    if cfg_changed:
        save_strategy_config(name, cfg)

    perf = generate_performance(name, live, backtest, health)

    # 写 performance.json
    perf_path = STRATEGIES_DIR / name / "performance.json"
    perf_path.write_text(json.dumps(perf, indent=2, ensure_ascii=False) + "\n")

    if verbose:
        _print_review(name, live, backtest, health, transition)

    if transition:
        perf["transition"] = {
            "from": transition[0],
            "to": transition[1],
            "reason": transition[2],
        }

    return perf


def _print_review(
    name: str, live: dict, backtest: dict | None, health: str,
    transition: tuple | None = None,
):
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
        if transition:
            _print_transition(transition)
        return

    pf_str = str(live["profit_factor"]) if live["profit_factor"] == "inf" else f"{live['profit_factor']:.2f}"
    sign = "+" if live["total_pnl"] >= 0 else ""

    print(f"    实盘: ROI={live['roi']:.1f}%  WR={live['win_rate']:.0f}%  PF={pf_str}  DD={live['max_drawdown_pct']:.1f}%  Sharpe={live['sharpe']:.2f}")
    print(f"    交易: {live['trades']} 笔 ({live['round_trips']} 轮)  P&L: {sign}${live['total_pnl']:.4f}")

    if backtest:
        bt_wr = backtest.get("win_rate", 0) * 100
        bt_pf = backtest.get("profit_factor", 0)
        print(f"    回测: ROI={backtest.get('return_pct', 0):.1f}%  WR={bt_wr:.0f}%  PF={bt_pf:.2f}  DD={backtest.get('max_drawdown_pct', 0):.1f}%")

    if transition:
        _print_transition(transition)


def _print_transition(transition: tuple):
    """打印状态转换信息"""
    from_s, to_s, reason = transition
    if to_s == "active":
        color = GREEN
    elif to_s == "suspended":
        color = RED
    else:
        color = YELLOW
    print(f"    {color}{BOLD}>>> {from_s} -> {to_s}: {reason}{RESET}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="策略实盘评估")
    parser.add_argument("strategy", nargs="?", help="策略名（不指定则评估所有 approved/active 策略）")
    args = parser.parse_args()

    all_trades = load_all_trades()

    if args.strategy:
        names = [args.strategy]
    else:
        names = get_reviewable_strategies()
        if not names:
            print("\n  无 approved/active 策略")
            return

    print(f"\n  {'='*62}")
    print(f"  {BOLD}策略实盘评估  ({len(all_trades)} 笔交易记录){RESET}")
    print(f"  {'='*62}")

    healths = {}
    transitions = []
    for name in names:
        perf = review_strategy(name, all_trades)
        if perf:
            healths[name] = perf["health"]
            if "transition" in perf:
                transitions.append((name, perf["transition"]))

    # 汇总
    print(f"\n  {'─'*62}")
    healthy = sum(1 for h in healths.values() if h == "healthy")
    warning = sum(1 for h in healths.values() if h == "warning")
    degraded = sum(1 for h in healths.values() if h == "degraded")
    no_data = sum(1 for h in healths.values() if h in ("no_data", "no_backtest"))
    print(f"  合计: {len(healths)} 策略  {GREEN}healthy={healthy}{RESET}  {YELLOW}warning={warning}{RESET}  {RED}degraded={degraded}{RESET}  no_data={no_data}")

    if transitions:
        print(f"\n  {BOLD}状态变更:{RESET}")
        for name, t in transitions:
            print(f"    {name}: {t['from']} -> {t['to']} ({t['reason']})")

    print()


if __name__ == "__main__":
    main()
