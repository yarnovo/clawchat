"""策略相关性分析 — 计算策略间收益的 Pearson 相关系数"""

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from clawchat._paths import RECORDS_DIR

TRADES_FILE = RECORDS_DIR / "trades.jsonl"

# ANSI
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

WARN_THRESHOLD = 0.7


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


# ── 交易配对 → 按日 PnL ──────────────────────────────────────


def trades_to_daily_pnl(trades: list[dict]) -> dict[str, dict[str, float]]:
    """将交易配对后按策略+日期聚合 PnL。

    返回: {strategy: {date_str: daily_pnl}}
    """
    by_strat = defaultdict(list)
    for t in trades:
        by_strat[t.get("strategy", "unknown")].append(t)

    result = {}
    for strat, strades in by_strat.items():
        # 按 symbol 分组配对
        by_symbol = defaultdict(list)
        for t in strades:
            by_symbol[t.get("symbol", "?")].append(t)

        daily = defaultdict(float)
        for symbol, sym_trades in by_symbol.items():
            position = None
            for t in sym_trades:
                side = t.get("side", "").lower()
                price = float(t.get("price", 0) or 0)
                qty = float(t.get("qty", 0) or 0)
                ts_str = t.get("ts", "")
                if price == 0:
                    continue

                if position is None:
                    position = {"side": side, "price": price, "qty": qty, "ts": ts_str}
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

                # 归入平仓日期
                date_key = _extract_date(ts_str)
                daily[date_key] += pnl

                remaining = position["qty"] - close_qty
                if remaining > 0:
                    position["qty"] = remaining
                elif qty > close_qty:
                    position = {"side": side, "price": price, "qty": qty - close_qty, "ts": ts_str}
                else:
                    position = None

        result[strat] = dict(daily)
    return result


def _extract_date(ts_str: str) -> str:
    """从 ISO 时间戳提取日期 YYYY-MM-DD"""
    if not ts_str:
        return "unknown"
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return "unknown"


# ── Pearson 相关系数 ──────────────────────────────────────────


def pearson(x: list[float], y: list[float]) -> float | None:
    """计算 Pearson 相关系数。数据不足或标准差为零返回 None。"""
    n = len(x)
    if n < 3 or n != len(y):
        return None

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y)) / n
    std_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x) / n)
    std_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y) / n)

    if std_x == 0 or std_y == 0:
        return None
    return cov / (std_x * std_y)


# ── 相关性矩阵 ───────────────────────────────────────────────


def build_correlation_matrix(
    daily_pnl: dict[str, dict[str, float]],
) -> tuple[list[str], dict[tuple[str, str], float | None]]:
    """构建策略间相关性矩阵。

    返回: (策略名列表, {(s1, s2): correlation})
    """
    strategies = sorted(daily_pnl.keys())
    # 收集所有日期
    all_dates = set()
    for pnl_map in daily_pnl.values():
        all_dates.update(pnl_map.keys())
    all_dates.discard("unknown")
    sorted_dates = sorted(all_dates)

    matrix = {}
    for i, s1 in enumerate(strategies):
        for j, s2 in enumerate(strategies):
            if i == j:
                matrix[(s1, s2)] = 1.0
                continue
            if j < i:
                matrix[(s1, s2)] = matrix[(s2, s1)]
                continue
            # 对齐：只用两个策略都有数据的日期
            common_dates = [d for d in sorted_dates if d in daily_pnl[s1] and d in daily_pnl[s2]]
            if len(common_dates) < 3:
                matrix[(s1, s2)] = None
                continue
            x = [daily_pnl[s1][d] for d in common_dates]
            y = [daily_pnl[s2][d] for d in common_dates]
            matrix[(s1, s2)] = pearson(x, y)

    return strategies, matrix


def format_matrix(
    strategies: list[str], matrix: dict[tuple[str, str], float | None]
) -> str:
    """格式化相关性矩阵为终端表格字符串。"""
    if not strategies:
        return "  (无策略数据)"

    # 截断策略名
    max_name = 16
    names = [s[:max_name] for s in strategies]
    col_w = max(max_name, 7)

    lines = []
    # 表头
    header = f"  {'':>{col_w}}"
    for n in names:
        header += f"  {n:>{col_w}}"
    lines.append(header)
    lines.append(f"  {'─' * (col_w + 1)}" + f"{'─' * (col_w + 2)}" * len(names))

    # 数据行
    for i, s1 in enumerate(strategies):
        row = f"  {names[i]:>{col_w}}"
        for j, s2 in enumerate(strategies):
            val = matrix.get((s1, s2))
            if val is None:
                cell = "N/A"
                row += f"  {DIM}{cell:>{col_w}}{RESET}"
            elif i == j:
                cell = "1.00"
                row += f"  {DIM}{cell:>{col_w}}{RESET}"
            elif abs(val) >= WARN_THRESHOLD:
                cell = f"{val:+.2f}"
                row += f"  {RED}{BOLD}{cell:>{col_w}}{RESET}"
            else:
                cell = f"{val:+.2f}"
                row += f"  {cell:>{col_w}}"
        lines.append(row)

    return "\n".join(lines)


# ── CLI 入口 ──────────────────────────────────────────────────


def main():
    trades = load_trades()
    if not trades:
        print("\n  (无交易记录，records/trades.jsonl 为空或不存在)")
        return

    daily_pnl = trades_to_daily_pnl(trades)
    if len(daily_pnl) < 2:
        print(f"\n  策略数不足（{len(daily_pnl)} 个），需要至少 2 个策略才能计算相关性")
        return

    strategies, matrix = build_correlation_matrix(daily_pnl)

    print(f"\n  {'='*60}")
    print(f"  {BOLD}策略相关性矩阵 (Pearson){RESET}")
    print(f"  {'='*60}")
    print(f"  策略数: {len(strategies)}  |  相关性 > {WARN_THRESHOLD} 标红")
    print()
    print(format_matrix(strategies, matrix))

    # 高相关性警告
    warnings = []
    for i, s1 in enumerate(strategies):
        for j, s2 in enumerate(strategies):
            if j <= i:
                continue
            val = matrix.get((s1, s2))
            if val is not None and abs(val) >= WARN_THRESHOLD:
                warnings.append((s1, s2, val))

    if warnings:
        print(f"\n  {RED}{BOLD}高相关性警告:{RESET}")
        for s1, s2, val in sorted(warnings, key=lambda x: abs(x[2]), reverse=True):
            print(f"  {RED}  {s1} <-> {s2}: {val:+.2f}{RESET}")
        print(f"\n  高相关策略同涨同跌，建议降低其中一个的仓位或替换")
    else:
        print(f"\n  各策略相关性均 < {WARN_THRESHOLD}，分散度良好")

    print()


if __name__ == "__main__":
    main()
