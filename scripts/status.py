#!/usr/bin/env python3
"""全局状态面板 — 一条命令看引擎/账户/持仓/风控/watcher/策略"""

import csv
import json
import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
STRATEGIES_DIR = ROOT / "strategies"
ENGINE_REGISTRY = Path("/tmp/hft-engines.json")
EQUITY_CSV = ROOT / "reports" / "equity.csv"


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def section(title):
    print(f"\n  {'─'*50}")
    print(f"  {title}")
    print(f"  {'─'*50}")


def read_registry():
    try:
        if ENGINE_REGISTRY.exists():
            return json.loads(ENGINE_REGISTRY.read_text())
    except Exception:
        pass
    return {}


def is_process_alive(name):
    """检查进程是否存活（按名称搜索）"""
    try:
        result = subprocess.run(
            ["pgrep", "-f", name], capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def show_engines():
    section("引擎")
    registry = read_registry()
    if not registry:
        print("  (无注册引擎)")
        return

    hft_alive = is_process_alive("hft-engine")
    for symbol, strategy in registry.items():
        status = "RUNNING" if hft_alive else "DEAD"
        print(f"  {symbol:<16} {strategy:<20} [{status}]")


def show_account():
    section("账户")
    try:
        from futures_exchange import get_futures_exchange
        ex = get_futures_exchange()
        balance = ex.fetch_balance()
        usdt = balance.get("USDT", {})
        total = float(usdt.get("total", 0) or 0)
        free = float(usdt.get("free", 0) or 0)
        used = float(usdt.get("used", 0) or 0)
        print(f"  总额: ${total:,.2f}  可用: ${free:,.2f}  占用: ${used:,.2f}")
    except Exception as e:
        print(f"  查询失败: {e}")


def show_positions():
    section("持仓")
    try:
        from futures_exchange import get_futures_exchange, get_positions
        ex = get_futures_exchange()
        positions = get_positions(ex)
        if not positions:
            print("  (无持仓)")
            return

        registry = read_registry()
        total_pnl = 0.0
        for p in positions:
            sym = p.get("symbol", "")
            raw = sym.replace("/", "").replace(":USDT", "")
            strategy = registry.get(raw, "?")
            side = p.get("side", "")
            contracts = float(p.get("contracts", 0) or 0)
            pnl = float(p.get("unrealizedPnl", 0) or 0)
            lev = p.get("leverage", "")
            total_pnl += pnl
            sign = "+" if pnl >= 0 else ""
            print(f"  {sym:<18} {side:<6} x{contracts:<10} {sign}${pnl:<10.4f} {lev}x  [{strategy}]")
        sign = "+" if total_pnl >= 0 else ""
        print(f"  {'':>36} 合计: {sign}${total_pnl:.4f}")
    except Exception as e:
        print(f"  查询失败: {e}")


def show_risk():
    section("风控")
    guard_alive = is_process_alive("risk_guard.py")
    status = "RUNNING" if guard_alive else "STOPPED"
    print(f"  风控守护: [{status}]")

    # 最近一次 equity 记录
    if EQUITY_CSV.exists():
        try:
            with open(EQUITY_CSV) as f:
                rows = list(csv.DictReader(f))
            if rows:
                last = rows[-1]
                ts = last.get("timestamp", "?")
                eq = last.get("equity", "?")
                pnl = last.get("unrealized_pnl", "?")
                pos = last.get("positions", "?")
                print(f"  最近检查: {ts}  equity=${eq}  pnl=${pnl}  positions={pos}")
            else:
                print("  (无检查记录)")
        except Exception:
            print("  (equity.csv 读取失败)")
    else:
        print("  (无检查记录)")


def show_watcher():
    section("Watcher")
    alive = is_process_alive("strategy_watcher.py")
    status = "RUNNING" if alive else "STOPPED"
    print(f"  策略监听: [{status}]")


def show_strategies():
    section("策略")
    if not STRATEGIES_DIR.exists():
        print("  (无策略目录)")
        return

    strategies = []
    for d in sorted(STRATEGIES_DIR.iterdir()):
        sf = d / "strategy.json"
        if not sf.exists():
            continue
        try:
            cfg = json.loads(sf.read_text())
            strategies.append(cfg)
        except Exception:
            pass

    if not strategies:
        print("  (无策略)")
        return

    approved = [s for s in strategies if s.get("status") == "approved"]
    suspended = [s for s in strategies if s.get("status") == "suspended"]
    other = [s for s in strategies if s.get("status") not in ("approved", "suspended")]

    if approved:
        print(f"  approved ({len(approved)}):")
        for s in approved:
            name = s.get("name", "?")
            sym = s.get("symbol", "?")
            strat = s.get("engine_strategy", "?")
            print(f"    {name:<28} {sym:<14} {strat}")

    if suspended:
        print(f"  suspended ({len(suspended)}):")
        for s in suspended:
            name = s.get("name", "?")
            reason = s.get("suspend_reason", "")
            short_reason = reason[:50] + "..." if len(reason) > 50 else reason
            print(f"    {name:<28} {short_reason}")

    if other:
        print(f"  other ({len(other)}):")
        for s in other:
            print(f"    {s.get('name', '?'):<28} status={s.get('status', '?')}")


def main():
    print(f"\n  ClawChat 全局状态  {now()}")
    print(f"  {'='*50}")

    show_engines()
    show_account()
    show_positions()
    show_risk()
    show_watcher()
    show_strategies()

    print(f"\n  {'='*50}")
    print()


if __name__ == "__main__":
    main()
