#!/usr/bin/env python3
"""全局状态面板 — 一条命令看引擎/账户/持仓/风控/watcher/策略"""

import csv
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from collections import defaultdict

from clawchat._paths import PROJECT_ROOT, STRATEGIES_DIR, RECORDS_DIR

EQUITY_CSV = RECORDS_DIR / "equity.csv"
TRADES_FILE = RECORDS_DIR / "trades.jsonl"
SIGNALS_FILE = RECORDS_DIR / "signals.jsonl"
HIGH_WATER_FILE = RECORDS_DIR / "high_water.json"

# ANSI 颜色
_RED = "\033[31m"
_GREEN = "\033[32m"
_YELLOW = "\033[33m"
_RESET = "\033[0m"
_STALE_MINUTES = 10


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def section(title):
    print(f"\n  {'─'*50}")
    print(f"  {title}")
    print(f"  {'─'*50}")


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
    hft_alive = is_process_alive("hft-engine")
    status = "RUNNING" if hft_alive else "STOPPED"
    print(f"  hft-engine: [{status}]")


def show_account():
    section("账户")
    try:
        from clawchat.exchange import get_futures_exchange
        ex = get_futures_exchange()
        balance = ex.fetch_balance()
        usdt = balance.get("USDT", {})
        total = float(usdt.get("total", 0) or 0)
        free = float(usdt.get("free", 0) or 0)
        used = float(usdt.get("used", 0) or 0)
        print(f"  总额: ${total:,.2f}  可用: ${free:,.2f}  占用: ${used:,.2f}")
    except Exception as e:
        print(f"  查询失败: {e}")


def _strategy_symbol_map():
    """从 strategies/ 目录构建 {norm_symbol: strategy_name} 映射"""
    m = {}
    if not STRATEGIES_DIR.exists():
        return m
    for d in STRATEGIES_DIR.iterdir():
        sf = d / "strategy.json"
        if not sf.exists():
            continue
        try:
            cfg = json.loads(sf.read_text())
            if cfg.get("status") not in ("approved", "active"):
                continue
            sym = cfg.get("symbol", "").replace("/", "").replace(":USDT", "")
            strat = cfg.get("engine_strategy", cfg.get("strategy", "?"))
            if sym:
                m[sym] = strat
        except Exception:
            pass
    return m


def show_positions():
    section("持仓")
    try:
        from clawchat.exchange import get_futures_exchange, get_positions
        ex = get_futures_exchange()
        positions = get_positions(ex)
        if not positions:
            print("  (无持仓)")
            return

        sym_map = _strategy_symbol_map()
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
    section("风控（hft-engine 内置）")
    print(f"  风控已合并到 hft-engine 主进程（RiskGate 实时检查）")

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


def _today_realized_pnl():
    """从 trades.jsonl 计算今日已实现 PnL（配对 buy/sell）"""
    if not TRADES_FILE.exists():
        return 0.0
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    trades_by_strat_sym = defaultdict(list)
    try:
        for line in TRADES_FILE.read_text().strip().split("\n"):
            if not line:
                continue
            try:
                rec = json.loads(line)
                ts = rec.get("ts", "")
                if not ts.startswith(today):
                    continue
                key = (rec.get("strategy", ""), rec.get("symbol", ""))
                trades_by_strat_sym[key].append(rec)
            except Exception:
                pass
    except Exception:
        return 0.0

    total_pnl = 0.0
    for _key, today_trades in trades_by_strat_sym.items():
        pos = None
        for t in today_trades:
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
                total_pnl += (price - pos["price"]) * close_qty
            else:
                total_pnl += (pos["price"] - price) * close_qty
            remaining = pos["qty"] - close_qty
            if remaining > 0:
                pos["qty"] = remaining
            elif qty > close_qty:
                pos = {"side": side, "price": price, "qty": qty - close_qty}
            else:
                pos = None
    return total_pnl


def _engine_health_counts():
    """统计引擎在线/超时数量（基于 state.json last_updated）"""
    online = 0
    stale = 0
    if not STRATEGIES_DIR.exists():
        return online, stale
    now_utc = datetime.now(timezone.utc)
    for d in STRATEGIES_DIR.iterdir():
        sf = d / "strategy.json"
        st = d / "state.json"
        if not sf.exists() or not st.exists():
            continue
        try:
            cfg = json.loads(sf.read_text())
            if cfg.get("status") not in ("approved", "active"):
                continue
            state = json.loads(st.read_text())
            updated = state.get("last_updated", "")
            if not updated:
                stale += 1
                continue
            dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            age_min = (now_utc - dt).total_seconds() / 60
            if age_min >= _STALE_MINUTES:
                stale += 1
            else:
                online += 1
        except Exception:
            stale += 1
    return online, stale


def show_today_overview():
    section("今日概览")

    # 1. PnL: realized (trades.jsonl) + unrealized (equity.csv)
    realized = _today_realized_pnl()
    unrealized = 0.0
    equity_now = 0.0
    if EQUITY_CSV.exists():
        try:
            with open(EQUITY_CSV) as f:
                rows = list(csv.DictReader(f))
            if rows:
                last = rows[-1]
                unrealized = float(last.get("unrealized_pnl", 0) or 0)
                equity_now = float(last.get("equity", 0) or 0)
        except Exception:
            pass

    total_pnl = realized + unrealized
    sign_t = "+" if total_pnl >= 0 else ""
    sign_r = "+" if realized >= 0 else ""
    sign_u = "+" if unrealized >= 0 else ""
    color = _GREEN if total_pnl >= 0 else _RED
    print(f"  今日 PnL: {color}{sign_t}${total_pnl:.2f}{_RESET} (realized {sign_r}${realized:.2f}, unrealized {sign_u}${unrealized:.2f})")

    # 2. 高水位 / 当前权益 / 回撤（从 equity.csv 历史取最大 equity）
    equity_hwm = 0.0
    if EQUITY_CSV.exists():
        try:
            with open(EQUITY_CSV) as f:
                for row in csv.DictReader(f):
                    eq = float(row.get("equity", 0) or 0)
                    if eq > equity_hwm:
                        equity_hwm = eq
        except Exception:
            pass

    if equity_hwm > 0 and equity_now > 0:
        drawdown_pct = (equity_now - equity_hwm) / equity_hwm * 100 if equity_now < equity_hwm else 0.0
        dd_color = _RED if drawdown_pct < -5 else _YELLOW if drawdown_pct < 0 else _GREEN
        print(f"  高水位: ${equity_hwm:.2f}  当前: ${equity_now:.2f}  回撤: {dd_color}{drawdown_pct:.2f}%{_RESET}")
    elif equity_now > 0:
        print(f"  当前权益: ${equity_now:.2f}")
    else:
        print(f"  (权益数据不足)")

    # 3. 引擎健康
    online, stale_count = _engine_health_counts()
    engine_str = f"  引擎: {online} 在线"
    if stale_count > 0:
        engine_str += f", {_RED}{stale_count} 超时{_RESET}"
    print(engine_str)


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
            cfg["_dir"] = d
            strategies.append(cfg)
        except Exception:
            pass

    if not strategies:
        print("  (无策略)")
        return

    # 预加载信号和交易数据（一次性读取，避免重复 IO）
    signal_counts = _load_signals_by_strategy()
    last_trades = _load_last_trade_by_strategy()

    approved = [s for s in strategies if s.get("status") in ("approved", "active")]
    suspended = [s for s in strategies if s.get("status") == "suspended"]
    other = [s for s in strategies if s.get("status") not in ("approved", "active", "suspended")]

    if approved:
        print(f"  running ({len(approved)}):")
        for s in approved:
            name = s.get("name", "?")
            sym = s.get("symbol", "?")
            strat = s.get("engine_strategy", "?")
            state_info = _read_state_summary(s.get("_dir"), signal_counts, last_trades)
            print(f"    {name:<28} {sym:<14} {strat}")
            if state_info:
                print(f"      {state_info}")

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


def _load_signals_by_strategy():
    """从 records/signals.jsonl 统计每个策略的信号数"""
    counts = defaultdict(int)
    if not SIGNALS_FILE.exists():
        return counts
    try:
        for line in SIGNALS_FILE.read_text().strip().split("\n"):
            if not line:
                continue
            try:
                rec = json.loads(line)
                counts[rec.get("strategy", "")] += 1
            except Exception:
                pass
    except Exception:
        pass
    return counts


def _load_last_trade_by_strategy():
    """从 records/trades.jsonl 取每个策略最后一笔交易时间"""
    last = {}
    if not TRADES_FILE.exists():
        return last
    try:
        for line in TRADES_FILE.read_text().strip().split("\n"):
            if not line:
                continue
            try:
                rec = json.loads(line)
                strat = rec.get("strategy", "")
                ts = rec.get("ts", "")
                if strat and ts:
                    last[strat] = ts
            except Exception:
                pass
    except Exception:
        pass
    return last


def _format_updated(updated_str):
    """格式化 last_updated，超 10 分钟标红"""
    if not updated_str or updated_str == "?":
        return f"{_RED}?{_RESET}"
    try:
        # 解析 ISO 格式（如 2026-03-18T16:54:59Z）
        dt = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - dt
        age_min = int(age.total_seconds() / 60)
        short_ts = dt.strftime("%m-%d %H:%M")
        if age_min >= _STALE_MINUTES:
            return f"{_RED}{short_ts} ({age_min}m ago){_RESET}"
        return f"{_GREEN}{short_ts} ({age_min}m ago){_RESET}"
    except Exception:
        return updated_str


def _read_state_summary(strategy_dir, signal_counts=None, last_trades=None):
    """Read state.json and return a one-line summary, or None."""
    if strategy_dir is None:
        return None
    state_file = strategy_dir / "state.json"
    if not state_file.exists():
        return None
    try:
        state = json.loads(state_file.read_text())
    except Exception:
        return None

    strategy_name = strategy_dir.name

    # 最后更新时间（超 10 分钟标红）
    updated = state.get("last_updated", "?")
    updated_fmt = _format_updated(updated)

    # K 线累计数
    indicators = state.get("indicators", {})
    if isinstance(indicators, dict):
        candle_count = indicators.get("candle_count", "?")
    else:
        candle_count = "?"

    # 交易统计
    ts = state.get("trade_stats", {})
    total = ts.get("total", 0)
    wins = ts.get("wins", 0)
    losses = ts.get("losses", 0)
    pnl = ts.get("realized_pnl", 0.0)
    sign = "+" if pnl >= 0 else ""
    wr = f"{wins / total:.0%}" if total > 0 else "N/A"

    # 信号数
    sig_count = 0
    if signal_counts:
        sig_count = signal_counts.get(strategy_name, 0)

    # 最后交易时间
    last_trade = "-"
    if last_trades and strategy_name in last_trades:
        try:
            lt = last_trades[strategy_name]
            lt_dt = datetime.fromisoformat(lt.replace("Z", "+00:00"))
            last_trade = lt_dt.strftime("%m-%d %H:%M")
        except Exception:
            last_trade = last_trades[strategy_name][:16]

    return (
        f"tick={updated_fmt}  candles={candle_count}  signals={sig_count}  "
        f"trades={total}({wins}W/{losses}L {wr})  pnl={sign}${pnl:.4f}  last_trade={last_trade}"
    )


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

    show_today_overview()
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
