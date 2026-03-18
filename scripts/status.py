#!/usr/bin/env python3
"""全局状态面板 — 一条命令看引擎/账户/持仓/风控/watcher/策略"""

import csv
import json
import subprocess
from datetime import datetime
from pathlib import Path

from collections import defaultdict

ROOT = Path(__file__).parent.parent
STRATEGIES_DIR = ROOT / "strategies"
ENGINE_REGISTRY = Path("/tmp/hft-engines.json")
EQUITY_CSV = ROOT / "reports" / "equity.csv"
TRADES_FILE = ROOT / "reports" / "trades.jsonl"


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


def _registry_symbol_map(registry):
    """从 registry 构建 {norm_symbol: strategy} 映射，兼容新旧格式。"""
    m = {}
    for key, val in registry.items():
        if isinstance(val, dict):
            sym = val.get("symbol", "")
            strat = val.get("strategy", "?")
            if sym:
                m[sym] = strat
        else:
            m[key] = val
    return m


def show_engines():
    section("引擎")
    registry = read_registry()
    if not registry:
        print("  (无注册引擎)")
        return

    for name, val in registry.items():
        if isinstance(val, dict):
            symbol = val.get("symbol", "?")
            strategy = val.get("strategy", "?")
            pid = val.get("pid", 0)
            try:
                alive = subprocess.run(
                    ["kill", "-0", str(pid)], capture_output=True, timeout=2
                ).returncode == 0 if pid else False
            except Exception:
                alive = False
            status = "RUNNING" if alive else "DEAD"
            print(f"  {name:<28} {symbol:<14} {strategy:<12} PID={pid} [{status}]")
        else:
            hft_alive = is_process_alive("hft-engine")
            status = "RUNNING" if hft_alive else "DEAD"
            print(f"  {name:<28} {val:<14} [{status}]")


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

        sym_map = _registry_symbol_map(read_registry())
        total_pnl = 0.0
        for p in positions:
            sym = p.get("symbol", "")
            raw = sym.replace("/", "").replace(":USDT", "")
            strategy = sym_map.get(raw, "?")
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


def show_performance():
    section("策略表现")
    if not TRADES_FILE.exists():
        print("  (无交易记录)")
        return

    trades = []
    for line in TRADES_FILE.read_text().strip().split("\n"):
        if not line:
            continue
        try:
            trades.append(json.loads(line))
        except Exception:
            pass

    if not trades:
        print("  (无交易记录)")
        return

    # 按策略+symbol配对计算 P&L
    by_strategy = defaultdict(list)
    for t in trades:
        by_strategy[t.get("strategy", "unknown")].append(t)

    for strategy, strades in sorted(by_strategy.items()):
        by_symbol = defaultdict(list)
        for t in strades:
            by_symbol[t.get("symbol", "?")].append(t)

        total_pnl = 0.0
        wins = 0
        losses = 0

        for symbol, sym_trades in by_symbol.items():
            pos = None
            for t in sym_trades:
                side = t.get("side", "").lower()
                price = float(t.get("price", 0) or 0)
                qty = float(t.get("qty", 0) or 0)
                if price == 0:
                    continue
                if pos is None:
                    pos = {"side": side, "price": price, "qty": qty}
                    continue
                if pos["side"] == side:
                    total_qty = pos["qty"] + qty
                    if total_qty > 0:
                        pos["price"] = (pos["price"] * pos["qty"] + price * qty) / total_qty
                        pos["qty"] = total_qty
                    continue
                close_qty = min(pos["qty"], qty)
                if pos["side"] == "buy":
                    pnl = (price - pos["price"]) * close_qty
                else:
                    pnl = (pos["price"] - price) * close_qty
                total_pnl += pnl
                if pnl >= 0:
                    wins += 1
                else:
                    losses += 1
                remaining = pos["qty"] - close_qty
                if remaining > 0:
                    pos["qty"] = remaining
                elif qty > close_qty:
                    pos = {"side": side, "price": price, "qty": qty - close_qty}
                else:
                    pos = None

        rounds = wins + losses
        wr = f"{wins / rounds:.0%}" if rounds > 0 else "N/A"
        sign = "+" if total_pnl >= 0 else ""
        print(f"  {strategy:<16} {sign}${total_pnl:<10.4f} {rounds}轮 {wr} ({wins}W/{losses}L)  [{len(strades)}笔]")

    total = sum(
        float(t.get("price", 0) or 0) for t in trades
    )  # just count
    print(f"  {'':>16} 共 {len(trades)} 笔交易记录")


def main():
    print(f"\n  ClawChat 全局状态  {now()}")
    print(f"  {'='*50}")

    show_engines()
    show_account()
    show_positions()
    show_performance()
    show_risk()
    show_watcher()
    show_strategies()

    print(f"\n  {'='*50}")
    print()


if __name__ == "__main__":
    main()
