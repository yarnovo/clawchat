#!/usr/bin/env python3
"""风控守护进程 — 每 30 秒检查持仓，触发止损自动平仓 + 通知 + 记录权益曲线"""

import csv
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

from check import check_positions
from futures_exchange import get_futures_exchange, get_positions, close_all

INTERVAL = 30  # 秒
EQUITY_CSV = Path(__file__).parent.parent / "reports" / "equity.csv"

running = True


def handle_signal(signum, frame):
    global running
    print(f"\n  收到信号 {signum}，正在退出...")
    running = False


def append_equity(timestamp, equity, unrealized_pnl, num_positions):
    """追加一行到 equity.csv"""
    write_header = not EQUITY_CSV.exists()
    EQUITY_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(EQUITY_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(["timestamp", "equity", "unrealized_pnl", "positions"])
        writer.writerow([timestamp, f"{equity:.4f}", f"{unrealized_pnl:.4f}", num_positions])


def notify_stop_loss(alerts, exchange):
    """触发止损时发邮件通知"""
    try:
        from notify import send
        body_lines = ["风控守护进程触发自动止损：", ""]
        for a in alerts:
            body_lines.append(f"- {a}")
        body_lines.append("")
        body_lines.append(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        send("[STOP LOSS] 自动止损触发", "\n".join(body_lines))
    except Exception as e:
        print(f"  通知发送失败: {e}")


def run_check(exchange):
    """执行一轮风控检查"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result = check_positions(exchange)

    equity = result.get("equity", 0)
    unrealized = result.get("unrealized_pnl", 0)
    num_pos = result.get("positions", 0)

    # 记录权益曲线
    append_equity(now, equity, unrealized, num_pos)

    # 输出状态
    status = result["status"]
    if status == "OK":
        print(f"  [{now}] OK  equity=${equity:.2f}  positions={num_pos}")
    elif status == "WARNING":
        print(f"  [{now}] WARN  equity=${equity:.2f}  positions={num_pos}")
        for w in result["warnings"]:
            print(f"    [?] {w}")
    elif status == "ALERT":
        print(f"  [{now}] ALERT  equity=${equity:.2f}  positions={num_pos}")
        for a in result["alerts"]:
            print(f"    [!] {a}")

        # 自动止损
        print(f"  [{now}] 执行自动止损...")
        positions = get_positions(exchange)
        for p in positions:
            sym = p["symbol"]
            try:
                close_all(exchange, sym)
                print(f"    {sym} 已平仓")
            except Exception as e:
                print(f"    {sym} 平仓失败: {e}")

        # 发通知
        notify_stop_loss(result["alerts"], exchange)

    return result


def main():
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    print(f"\n{'='*60}")
    print(f"  风控守护进程启动  间隔={INTERVAL}s")
    print(f"  权益曲线: {EQUITY_CSV}")
    print(f"{'='*60}\n")

    exchange = get_futures_exchange()

    while running:
        try:
            run_check(exchange)
        except Exception as e:
            print(f"  [ERROR] {e}")
        time.sleep(INTERVAL)

    print("  风控守护进程已退出")


if __name__ == "__main__":
    main()
