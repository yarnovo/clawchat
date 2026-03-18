"""资金费率查看 — 当前费率 + 历史记录"""

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

from clawchat._paths import RECORDS_DIR, STRATEGIES_DIR

FUNDING_CSV = RECORDS_DIR / "funding_rate_history.csv"

# ANSI
BOLD = "\033[1m"
DIM = "\033[2m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

CSV_FIELDS = ["timestamp", "symbol", "funding_rate", "next_funding_time"]


# ── 策略 symbol 收集 ─────────────────────────────────────────


def get_strategy_symbols() -> list[str]:
    """从 strategies/ 下所有 strategy.json 收集 symbol 列表（去重）。"""
    import json

    symbols = set()
    if not STRATEGIES_DIR.exists():
        return []
    for d in STRATEGIES_DIR.iterdir():
        cfg = d / "strategy.json"
        if cfg.exists():
            try:
                data = json.loads(cfg.read_text())
                sym = data.get("symbol", "")
                if sym:
                    # 统一格式：NTRNUSDT → NTRN/USDT
                    sym = sym.upper().replace("-", "")
                    if "/" not in sym and sym.endswith("USDT"):
                        sym = sym[:-4] + "/USDT"
                    symbols.add(sym)
            except (json.JSONDecodeError, OSError):
                pass
    return sorted(symbols)


# ── 交易所 API ────────────────────────────────────────────────


def fetch_current_funding(exchange, symbols: list[str]) -> list[dict]:
    """通过 premiumIndex 获取当前资金费率。

    返回: [{symbol, funding_rate, next_funding_time, mark_price}]
    """
    results = []
    for sym in symbols:
        try:
            # ccxt binance: fetchFundingRate 返回 premiumIndex 数据
            info = exchange.fetch_funding_rate(sym)
            results.append({
                "symbol": sym,
                "funding_rate": float(info.get("fundingRate", 0) or 0),
                "next_funding_time": info.get("fundingTimestamp"),
                "mark_price": float(info.get("markPrice", 0) or 0),
            })
        except Exception as e:
            results.append({
                "symbol": sym,
                "funding_rate": None,
                "next_funding_time": None,
                "mark_price": None,
                "error": str(e),
            })
    return results


def fetch_funding_history(exchange, symbol: str, limit: int = 100) -> list[dict]:
    """获取历史资金费率。

    返回: [{timestamp, symbol, funding_rate}]
    """
    try:
        history = exchange.fetch_funding_rate_history(symbol, limit=limit)
        return [
            {
                "timestamp": h.get("timestamp"),
                "symbol": symbol,
                "funding_rate": float(h.get("fundingRate", 0) or 0),
            }
            for h in history
        ]
    except Exception as e:
        print(f"  获取 {symbol} 历史资金费率失败: {e}")
        return []


# ── 本地 CSV ──────────────────────────────────────────────────


def load_local_history(symbol: str | None = None, limit: int = 50) -> list[dict]:
    """读取本地 funding_rate_history.csv。"""
    if not FUNDING_CSV.exists():
        return []
    rows = []
    with open(FUNDING_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if symbol and row.get("symbol", "").upper() != symbol.upper():
                continue
            rows.append(row)
    # 取最后 limit 条
    return rows[-limit:]


def append_to_csv(records: list[dict]):
    """追加记录到 funding_rate_history.csv。"""
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not FUNDING_CSV.exists()
    with open(FUNDING_CSV, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()
        for r in records:
            writer.writerow({
                "timestamp": r.get("timestamp", ""),
                "symbol": r.get("symbol", ""),
                "funding_rate": r.get("funding_rate", ""),
                "next_funding_time": r.get("next_funding_time", ""),
            })


# ── 格式化输出 ────────────────────────────────────────────────


def format_rate(rate) -> str:
    """格式化资金费率，正数红色，负数绿色。"""
    if rate is None:
        return f"{DIM}N/A{RESET}"
    r = float(rate)
    pct = r * 100
    if r > 0.0005:
        return f"{RED}{pct:+.4f}%{RESET}"
    elif r < -0.0005:
        return f"{GREEN}{pct:+.4f}%{RESET}"
    else:
        return f"{pct:+.4f}%"


def format_timestamp(ts) -> str:
    """将毫秒时间戳或 ISO 字符串格式化为可读时间。"""
    if ts is None:
        return "N/A"
    try:
        if isinstance(ts, (int, float)):
            dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        else:
            dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except (ValueError, TypeError, OSError):
        return str(ts)


def print_current(results: list[dict]):
    """打印当前资金费率表。"""
    print(f"\n  {BOLD}当前资金费率{RESET}")
    print(f"  {'='*60}")
    print(f"  {'币种':<14} {'费率':>10} {'标记价':>14} {'下次结算':>22}")
    print(f"  {'─'*60}")

    for r in results:
        sym = r["symbol"]
        if "error" in r:
            print(f"  {sym:<14} {DIM}获取失败: {r['error'][:30]}{RESET}")
            continue
        rate_str = format_rate(r["funding_rate"])
        mark = f"${r['mark_price']:,.6f}" if r["mark_price"] else "N/A"
        next_time = format_timestamp(r["next_funding_time"])
        print(f"  {sym:<14} {rate_str:>20} {mark:>14} {next_time:>22}")

    print()


def print_history(records: list[dict], symbol: str):
    """打印历史资金费率。"""
    if not records:
        print(f"\n  {symbol} 无历史资金费率记录")
        return

    print(f"\n  {BOLD}{symbol} 历史资金费率{RESET}")
    print(f"  {'='*50}")
    print(f"  {'时间':>22} {'费率':>12}")
    print(f"  {'─'*50}")

    for r in records:
        ts = r.get("timestamp")
        rate = r.get("funding_rate")
        ts_str = format_timestamp(ts)
        rate_str = format_rate(rate)
        print(f"  {ts_str:>22} {rate_str:>22}")

    # 统计
    rates = [float(r["funding_rate"]) for r in records if r.get("funding_rate") is not None]
    if rates:
        avg = sum(rates) / len(rates)
        print(f"\n  {DIM}平均费率: {avg*100:+.4f}% ({len(rates)} 条记录){RESET}")
    print()


# ── CLI 入口 ──────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        prog="clawchat funding",
        description="资金费率查看",
    )
    parser.add_argument(
        "symbol", nargs="?", default=None,
        help="指定币种（如 NTRN/USDT），不指定则显示所有策略币种",
    )
    parser.add_argument(
        "--history", "-H", action="store_true",
        help="显示历史资金费率",
    )
    parser.add_argument(
        "--local", "-l", action="store_true",
        help="只看本地 CSV 记录（不调 API）",
    )
    parser.add_argument(
        "--limit", "-n", type=int, default=50,
        help="历史记录条数（默认 50）",
    )
    parser.add_argument(
        "--save", "-s", action="store_true",
        help="将当前费率保存到本地 CSV",
    )

    args = parser.parse_args()

    # 只看本地记录
    if args.local:
        sym = args.symbol.upper().replace("-", "") if args.symbol else None
        records = load_local_history(sym, args.limit)
        if not records:
            print(f"\n  本地无记录（{FUNDING_CSV}）")
            return
        print_history(records, sym or "ALL")
        return

    # 确定要查询的 symbols
    if args.symbol:
        sym = args.symbol.upper().replace("-", "")
        if "/" not in sym and sym.endswith("USDT"):
            sym = sym[:-4] + "/USDT"
        symbols = [sym]
    else:
        symbols = get_strategy_symbols()
        if not symbols:
            print("\n  无策略，请指定币种：clawchat funding NTRN/USDT")
            return

    # 连接交易所
    from clawchat.exchange import get_futures_exchange
    exchange = get_futures_exchange()

    # 显示当前费率
    results = fetch_current_funding(exchange, symbols)
    print_current(results)

    # 保存到 CSV
    if args.save:
        now = datetime.now(timezone.utc).isoformat()
        csv_records = [
            {
                "timestamp": now,
                "symbol": r["symbol"],
                "funding_rate": r["funding_rate"],
                "next_funding_time": r.get("next_funding_time", ""),
            }
            for r in results
            if r.get("funding_rate") is not None
        ]
        if csv_records:
            append_to_csv(csv_records)
            print(f"  已保存 {len(csv_records)} 条记录到 {FUNDING_CSV}")

    # 显示历史
    if args.history and len(symbols) == 1:
        history = fetch_funding_history(exchange, symbols[0], args.limit)
        print_history(history, symbols[0])
    elif args.history and len(symbols) > 1:
        print(f"  {YELLOW}--history 只支持单个币种，请指定：clawchat funding NTRN/USDT --history{RESET}")


if __name__ == "__main__":
    main()
