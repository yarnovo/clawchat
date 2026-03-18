"""报告生成工具 — 日报/周报 markdown 输出到 reports/"""

import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from clawchat._paths import PROJECT_ROOT, STRATEGIES_DIR, RECORDS_DIR

TRADES_FILE = RECORDS_DIR / "trades.jsonl"
EQUITY_FILE = RECORDS_DIR / "equity.csv"
REPORTS_DIR = PROJECT_ROOT / "reports"


# ── 数据加载 ──────────────────────────────────────────────────


def load_trades() -> list[dict]:
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


def load_equity() -> list[dict]:
    if not EQUITY_FILE.exists():
        return []
    rows = []
    with EQUITY_FILE.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def load_strategy_configs() -> dict[str, dict]:
    """加载所有 strategy.json"""
    configs = {}
    if not STRATEGIES_DIR.exists():
        return configs
    for d in sorted(STRATEGIES_DIR.iterdir()):
        sj = d / "strategy.json"
        if sj.exists():
            try:
                configs[d.name] = json.loads(sj.read_text())
            except json.JSONDecodeError:
                pass
    return configs


def load_performance(name: str) -> dict | None:
    """加载单个策略的 performance.json"""
    path = STRATEGIES_DIR / name / "performance.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


# ── 指标计算 ──────────────────────────────────────────────────


def filter_trades_by_date(trades: list[dict], start: datetime, end: datetime) -> list[dict]:
    """按时间窗口过滤交易"""
    result = []
    for t in trades:
        ts_str = t.get("ts", "")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if start <= ts < end:
                result.append(t)
        except (ValueError, TypeError):
            pass
    return result


def compute_pnl_by_strategy(trades: list[dict]) -> dict[str, dict]:
    """按策略分组计算 PnL"""
    by_strat = defaultdict(list)
    for t in trades:
        by_strat[t.get("strategy", "unknown")].append(t)

    results = {}
    for strat, strades in sorted(by_strat.items()):
        by_symbol = defaultdict(list)
        for t in strades:
            by_symbol[t.get("symbol", "?")].append(t)

        total_pnl = 0.0
        wins = 0
        losses = 0

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
                close_qty = min(position["qty"], qty)
                if position["side"] == "buy":
                    pnl = (price - position["price"]) * close_qty
                else:
                    pnl = (position["price"] - price) * close_qty
                total_pnl += pnl
                if pnl >= 0:
                    wins += 1
                else:
                    losses += 1
                remaining = position["qty"] - close_qty
                if remaining > 0:
                    position["qty"] = remaining
                elif qty > close_qty:
                    position = {"side": side, "price": price, "qty": qty - close_qty}
                else:
                    position = None

        round_trips = wins + losses
        win_rate = wins / round_trips if round_trips > 0 else 0.0
        results[strat] = {
            "pnl": total_pnl,
            "trades": len(strades),
            "round_trips": round_trips,
            "wins": wins,
            "losses": losses,
            "win_rate": win_rate,
        }
    return results


def compute_equity_stats(rows: list[dict], start: datetime, end: datetime) -> dict:
    """从 equity.csv 计算窗口内的权益统计"""
    filtered = []
    for row in rows:
        ts_str = row.get("timestamp", "")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if start <= ts < end:
                filtered.append({"ts": ts, "equity": float(row.get("equity", 0))})
        except (ValueError, TypeError):
            pass

    if not filtered:
        return {"start_equity": 0, "end_equity": 0, "peak": 0, "trough": 0, "max_drawdown_pct": 0}

    equities = [r["equity"] for r in filtered]
    start_eq = equities[0]
    end_eq = equities[-1]
    peak = equities[0]
    max_dd_pct = 0.0
    for eq in equities:
        if eq > peak:
            peak = eq
        if peak > 0:
            dd = (peak - eq) / peak * 100
            if dd > max_dd_pct:
                max_dd_pct = dd

    return {
        "start_equity": start_eq,
        "end_equity": end_eq,
        "peak": max(equities),
        "trough": min(equities),
        "max_drawdown_pct": max_dd_pct,
    }


# ── 日报生成 ──────────────────────────────────────────────────


def generate_daily_report(date: datetime) -> str:
    """生成指定日期的日报 markdown"""
    day_start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    date_str = day_start.strftime("%Y-%m-%d")

    trades = load_trades()
    day_trades = filter_trades_by_date(trades, day_start, day_end)
    pnl_by_strat = compute_pnl_by_strategy(day_trades)
    equity_rows = load_equity()
    eq_stats = compute_equity_stats(equity_rows, day_start, day_end)
    configs = load_strategy_configs()

    total_pnl = sum(s["pnl"] for s in pnl_by_strat.values())
    total_trades = sum(s["trades"] for s in pnl_by_strat.values())

    lines = [
        f"# 日报 {date_str}",
        "",
        "## 总览",
        "",
        f"| 指标 | 值 |",
        f"|------|-----|",
        f"| 日期 | {date_str} |",
        f"| 交易笔数 | {total_trades} |",
        f"| 总 PnL | ${total_pnl:+.4f} |",
        f"| 起始权益 | ${eq_stats['start_equity']:,.2f} |",
        f"| 结束权益 | ${eq_stats['end_equity']:,.2f} |",
        f"| 最大回撤 | {eq_stats['max_drawdown_pct']:.2f}% |",
        "",
        "## 策略表现",
        "",
    ]

    if pnl_by_strat:
        lines.append("| 策略 | PnL | 交易 | 胜率 |")
        lines.append("|------|-----|------|------|")
        for strat, s in sorted(pnl_by_strat.items(), key=lambda x: x[1]["pnl"], reverse=True):
            wr = f"{s['win_rate']:.0%}" if s["round_trips"] > 0 else "N/A"
            lines.append(f"| {strat} | ${s['pnl']:+.4f} | {s['trades']} | {wr} |")
    else:
        lines.append("(无交易)")

    lines.append("")
    lines.append("## 策略状态")
    lines.append("")
    lines.append("| 策略 | 状态 | 币种 | 周期 |")
    lines.append("|------|------|------|------|")
    for name, cfg in sorted(configs.items()):
        status = cfg.get("status", "?")
        symbol = cfg.get("symbol", "?")
        tf = cfg.get("timeframe", "?")
        lines.append(f"| {name} | {status} | {symbol} | {tf} |")

    lines.append("")
    lines.append(f"---\n*生成时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}*")
    lines.append("")
    return "\n".join(lines)


# ── 周报生成 ──────────────────────────────────────────────────


def generate_weekly_report(end_date: datetime) -> str:
    """生成截至 end_date 的周报 markdown（过去 7 天）"""
    week_end = end_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc) + timedelta(days=1)
    week_start = week_end - timedelta(days=7)
    start_str = week_start.strftime("%Y-%m-%d")
    end_str = (week_end - timedelta(days=1)).strftime("%Y-%m-%d")

    trades = load_trades()
    week_trades = filter_trades_by_date(trades, week_start, week_end)
    pnl_by_strat = compute_pnl_by_strategy(week_trades)
    equity_rows = load_equity()
    eq_stats = compute_equity_stats(equity_rows, week_start, week_end)
    configs = load_strategy_configs()

    total_pnl = sum(s["pnl"] for s in pnl_by_strat.values())
    total_trades = sum(s["trades"] for s in pnl_by_strat.values())
    total_round_trips = sum(s["round_trips"] for s in pnl_by_strat.values())

    lines = [
        f"# 周报 {start_str} ~ {end_str}",
        "",
        "## 总览",
        "",
        f"| 指标 | 值 |",
        f"|------|-----|",
        f"| 周期 | {start_str} ~ {end_str} |",
        f"| 交易笔数 | {total_trades} ({total_round_trips} 轮) |",
        f"| 总 PnL | ${total_pnl:+.4f} |",
        f"| 起始权益 | ${eq_stats['start_equity']:,.2f} |",
        f"| 结束权益 | ${eq_stats['end_equity']:,.2f} |",
        f"| 最大回撤 | {eq_stats['max_drawdown_pct']:.2f}% |",
        "",
        "## 策略排名（按 PnL）",
        "",
    ]

    if pnl_by_strat:
        lines.append("| # | 策略 | PnL | 交易 | 胜率 | 状态 |")
        lines.append("|---|------|-----|------|------|------|")
        ranked = sorted(pnl_by_strat.items(), key=lambda x: x[1]["pnl"], reverse=True)
        for i, (strat, s) in enumerate(ranked, 1):
            wr = f"{s['win_rate']:.0%}" if s["round_trips"] > 0 else "N/A"
            status = configs.get(strat, {}).get("status", "?")
            lines.append(f"| {i} | {strat} | ${s['pnl']:+.4f} | {s['trades']} | {wr} | {status} |")
    else:
        lines.append("(无交易)")

    # 资金曲线摘要
    lines.append("")
    lines.append("## 资金曲线")
    lines.append("")
    if eq_stats["start_equity"] > 0:
        change = eq_stats["end_equity"] - eq_stats["start_equity"]
        change_pct = change / eq_stats["start_equity"] * 100
        lines.append(f"- 起始: ${eq_stats['start_equity']:,.2f}")
        lines.append(f"- 结束: ${eq_stats['end_equity']:,.2f} ({change_pct:+.2f}%)")
        lines.append(f"- 峰值: ${eq_stats['peak']:,.2f}")
        lines.append(f"- 谷值: ${eq_stats['trough']:,.2f}")
        lines.append(f"- 最大回撤: {eq_stats['max_drawdown_pct']:.2f}%")
    else:
        lines.append("(无权益数据)")

    # 回撤分析 — 各策略 performance.json
    lines.append("")
    lines.append("## 回撤分析")
    lines.append("")
    perf_data = []
    for name in sorted(configs.keys()):
        perf = load_performance(name)
        if perf and perf.get("live"):
            live = perf["live"]
            dd = live.get("max_drawdown_pct", 0)
            perf_data.append((name, dd, perf.get("health", "?")))

    if perf_data:
        lines.append("| 策略 | 实盘回撤 | 健康 |")
        lines.append("|------|----------|------|")
        for name, dd, health in sorted(perf_data, key=lambda x: x[1], reverse=True):
            lines.append(f"| {name} | {dd:.2f}% | {health} |")
    else:
        lines.append("(无 performance 数据)")

    lines.append("")
    lines.append(f"---\n*生成时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}*")
    lines.append("")
    return "\n".join(lines)


# ── CLI 入口 ──────────────────────────────────────────────────


def main():
    import argparse

    parser = argparse.ArgumentParser(prog="clawchat report", description="报告生成")
    sub = parser.add_subparsers(dest="type", help="报告类型")

    daily_p = sub.add_parser("daily", help="日报")
    daily_p.add_argument("--date", default=None, help="日期 YYYY-MM-DD（默认今天）")

    weekly_p = sub.add_parser("weekly", help="周报")
    weekly_p.add_argument("--date", default=None, help="截止日期 YYYY-MM-DD（默认今天）")

    args = parser.parse_args()

    if args.type is None:
        parser.print_help()
        return

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.type == "daily":
        if args.date:
            date = datetime.strptime(args.date, "%Y-%m-%d")
        else:
            date = datetime.now(timezone.utc)
        report = generate_daily_report(date)
        filename = f"daily-{date.strftime('%Y-%m-%d')}.md"
        out_path = REPORTS_DIR / filename
        out_path.write_text(report)
        print(f"\n  日报已生成: {out_path}")
        print(report)

    elif args.type == "weekly":
        if args.date:
            date = datetime.strptime(args.date, "%Y-%m-%d")
        else:
            date = datetime.now(timezone.utc)
        report = generate_weekly_report(date)
        filename = f"weekly-{date.strftime('%Y-%m-%d')}.md"
        out_path = REPORTS_DIR / filename
        out_path.write_text(report)
        print(f"\n  周报已生成: {out_path}")
        print(report)


if __name__ == "__main__":
    main()
