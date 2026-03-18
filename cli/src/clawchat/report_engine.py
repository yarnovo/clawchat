"""报告引擎 — 定时调度器，自动生成日报/周报"""

import argparse
import time
import sys
from datetime import datetime, timezone, timedelta

from clawchat._report_core import (
    REPORTS_DIR,
    generate_daily_report,
    generate_weekly_report,
)

# ── 调度配置 ──────────────────────────────────────────────────

SCHEDULE = [
    {"type": "daily", "hour": 9, "minute": 0},          # 每日 09:00 UTC
    {"type": "weekly", "hour": 9, "minute": 0, "weekday": 0},  # 每周一 09:00 UTC
]

CHECK_INTERVAL = 60  # 秒


# ── 调度逻辑 ──────────────────────────────────────────────────


def should_run(schedule: dict, now: datetime, last_run: dict) -> bool:
    """判断当前时刻是否应触发指定调度"""
    if now.hour != schedule["hour"] or now.minute != schedule["minute"]:
        return False
    if "weekday" in schedule and now.weekday() != schedule["weekday"]:
        return False
    # 同一分钟内不重复触发
    key = schedule["type"]
    if key in last_run:
        diff = (now - last_run[key]).total_seconds()
        if diff < CHECK_INTERVAL:
            return False
    return True


def run_report(report_type: str, date: datetime) -> str:
    """生成报告并写入文件，返回文件路径"""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    if report_type == "daily":
        # 日报用昨天的日期（09:00 生成的是前一天的报告）
        report_date = date - timedelta(days=1)
        content = generate_daily_report(report_date)
        filename = f"daily-{report_date.strftime('%Y-%m-%d')}.md"
    else:
        # 周报用昨天作为截止日
        report_date = date - timedelta(days=1)
        content = generate_weekly_report(report_date)
        filename = f"weekly-{report_date.strftime('%Y-%m-%d')}.md"

    out_path = REPORTS_DIR / filename
    out_path.write_text(content)
    return str(out_path)


def run_loop():
    """主循环：每 60 秒检查是否需要生成报告"""
    last_run: dict[str, datetime] = {}
    print(f"  报告引擎启动 (检查间隔 {CHECK_INTERVAL}s)")
    print(f"  调度: 日报 09:00 UTC, 周报 周一 09:00 UTC")
    print(f"  输出: {REPORTS_DIR}")
    print()

    while True:
        now = datetime.now(timezone.utc)
        for sched in SCHEDULE:
            if should_run(sched, now, last_run):
                rtype = sched["type"]
                print(f"  [{now.strftime('%H:%M:%S')}] 生成{rtype}报告...")
                try:
                    path = run_report(rtype, now)
                    print(f"  [{now.strftime('%H:%M:%S')}] 完成: {path}")
                    last_run[rtype] = now
                except Exception as e:
                    print(f"  [{now.strftime('%H:%M:%S')}] 错误: {e}")
        time.sleep(CHECK_INTERVAL)


# ── CLI 入口 ──────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        prog="report-engine",
        description="报告引擎 — 定时生成日报/周报",
    )
    parser.add_argument(
        "--once",
        choices=["daily", "weekly"],
        help="单次生成模式（不进入循环）",
    )
    args = parser.parse_args()

    if args.once:
        now = datetime.now(timezone.utc)
        path = run_report(args.once, now)
        print(f"\n  {args.once} 报告已生成: {path}")
    else:
        run_loop()


if __name__ == "__main__":
    main()
