"""clawchat risk-log — 风控事件查询"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from clawchat._paths import RECORDS_DIR

RISK_EVENTS_FILE = RECORDS_DIR / "risk_events.jsonl"

# ANSI 颜色
_RED = "\033[31m"
_YELLOW = "\033[33m"
_RESET = "\033[0m"


def load_events(path=None, strategy=None, days=None):
    """读取 risk_events.jsonl，按条件过滤，返回事件列表。"""
    fpath = path or RISK_EVENTS_FILE
    if not Path(fpath).exists():
        return []

    cutoff = None
    if days is not None:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    events = []
    for line in Path(fpath).read_text().strip().split("\n"):
        if not line:
            continue
        try:
            rec = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue

        if strategy and rec.get("strategy") != strategy:
            continue
        if cutoff and rec.get("ts", "") < cutoff:
            continue

        events.append(rec)
    return events


def format_event(rec):
    """格式化单条事件为可读行。"""
    ts = rec.get("ts", "?")[:19]  # trim to seconds
    strat = rec.get("strategy", "?")
    symbol = rec.get("symbol", "?")
    rule = rec.get("rule", "?")
    pnl = rec.get("pnl", 0.0)
    detail = rec.get("detail", "")

    color = _RED if rule == "close_position" else _YELLOW
    sign = "+" if pnl >= 0 else "-"
    return f"  {ts}  {strat:<26} {symbol:<14} {color}{rule:<16}{_RESET} pnl={sign}${abs(pnl):.4f}  {detail}"


def print_stats(events):
    """输出触发频率统计。"""
    if not events:
        return

    print(f"\n  --- 统计 ---")

    # 按 rule 统计
    by_rule = defaultdict(int)
    for e in events:
        by_rule[e.get("rule", "?")] += 1
    for rule, count in sorted(by_rule.items(), key=lambda x: -x[1]):
        print(f"    {rule:<20} {count}次")

    # 按策略统计
    by_strat = defaultdict(int)
    for e in events:
        by_strat[e.get("strategy", "?")] += 1
    if len(by_strat) > 1:
        print()
        for strat, count in sorted(by_strat.items(), key=lambda x: -x[1]):
            print(f"    {strat:<26} {count}次")


def risk_log(strategy=None, days=None, path=None):
    """主函数：加载事件、显示、统计。"""
    events = load_events(path=path, strategy=strategy, days=days)

    title = "风控事件"
    if strategy:
        title += f" [{strategy}]"
    if days is not None:
        title += f" (最近 {days} 天)"

    print(f"\n  {title}")
    print(f"  {'─'*60}")

    if not events:
        print("  (无事件)")
        return

    for e in events:
        print(format_event(e))

    print(f"\n  共 {len(events)} 条事件")
    print_stats(events)
    print()


def main():
    parser = argparse.ArgumentParser(
        prog="clawchat risk-log",
        description="风控事件查询",
    )
    parser.add_argument(
        "--strategy", "-s",
        help="按策略名筛选",
    )
    parser.add_argument(
        "--days", "-d",
        type=int,
        help="最近 N 天",
    )
    args = parser.parse_args()
    risk_log(strategy=args.strategy, days=args.days)


if __name__ == "__main__":
    main()
