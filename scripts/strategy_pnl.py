#!/usr/bin/env python3
"""按策略聚合 P&L — 从 reports/trades.jsonl 计算已实现盈亏、胜率、盈亏比"""

import json
import sys
from collections import defaultdict
from pathlib import Path

TRADES_FILE = Path(__file__).parent.parent / "reports" / "trades.jsonl"


def load_trades():
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


def compute_pnl(trades):
    """按策略+symbol分组，配对 buy/sell 计算已实现 P&L。

    简化假设：同策略同 symbol 的交易按时间顺序配对，
    buy 后 sell 为一笔完整交易（或反过来做空）。
    """
    # 按 strategy 分组
    by_strategy = defaultdict(list)
    for t in trades:
        by_strategy[t.get("strategy", "unknown")].append(t)

    results = {}
    for strategy, strades in sorted(by_strategy.items()):
        # 按 symbol 分组内配对
        by_symbol = defaultdict(list)
        for t in strades:
            by_symbol[t.get("symbol", "?")].append(t)

        total_pnl = 0.0
        wins = 0
        losses = 0
        total_win_pnl = 0.0
        total_loss_pnl = 0.0
        trade_count = len(strades)

        for symbol, sym_trades in by_symbol.items():
            # 逐笔配对：记录持仓，遇到反向单算一笔 P&L
            position = None  # {'side': 'buy'|'sell', 'price': float, 'qty': float}
            for t in sym_trades:
                side = t.get("side", "").lower()
                price = float(t.get("price", 0) or 0)
                qty = float(t.get("qty", 0) or 0)

                if price == 0:
                    continue

                if position is None:
                    position = {"side": side, "price": price, "qty": qty}
                    continue

                # 同向加仓：更新均价
                if position["side"] == side:
                    total_qty = position["qty"] + qty
                    if total_qty > 0:
                        position["price"] = (
                            position["price"] * position["qty"] + price * qty
                        ) / total_qty
                        position["qty"] = total_qty
                    continue

                # 反向 → 平仓，计算 P&L
                close_qty = min(position["qty"], qty)
                if position["side"] == "buy":
                    pnl = (price - position["price"]) * close_qty
                else:
                    pnl = (position["price"] - price) * close_qty

                total_pnl += pnl
                if pnl >= 0:
                    wins += 1
                    total_win_pnl += pnl
                else:
                    losses += 1
                    total_loss_pnl += abs(pnl)

                # 剩余持仓
                remaining = position["qty"] - close_qty
                if remaining > 0:
                    position["qty"] = remaining
                elif qty > close_qty:
                    # 反向开仓
                    position = {"side": side, "price": price, "qty": qty - close_qty}
                else:
                    position = None

        round_trips = wins + losses
        win_rate = wins / round_trips if round_trips > 0 else 0
        avg_win = total_win_pnl / wins if wins > 0 else 0
        avg_loss = total_loss_pnl / losses if losses > 0 else 0
        profit_factor = total_win_pnl / total_loss_pnl if total_loss_pnl > 0 else float("inf")

        results[strategy] = {
            "total_pnl": total_pnl,
            "trades": trade_count,
            "round_trips": round_trips,
            "wins": wins,
            "losses": losses,
            "win_rate": win_rate,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": profit_factor,
        }

    return results


def main():
    trades = load_trades()
    if not trades:
        print("\n  (无交易记录，reports/trades.jsonl 为空或不存在)")
        return

    results = compute_pnl(trades)

    print(f"\n  {'='*60}")
    print(f"  策略 P&L 聚合  ({len(trades)} 笔交易)")
    print(f"  {'='*60}")

    for strategy, r in sorted(results.items()):
        sign = "+" if r["total_pnl"] >= 0 else ""
        print(f"\n  [{strategy}]")
        print(f"    P&L:       {sign}${r['total_pnl']:.4f}")
        print(f"    交易:      {r['trades']} 笔 ({r['round_trips']} 轮完整)")
        print(f"    胜率:      {r['win_rate']:.0%} ({r['wins']}W/{r['losses']}L)")
        if r["profit_factor"] == float("inf"):
            print(f"    盈亏比:    inf (无亏损)")
        else:
            print(f"    盈亏比:    {r['profit_factor']:.2f}")
        print(f"    平均盈利:  +${r['avg_win']:.4f}")
        print(f"    平均亏损:  -${r['avg_loss']:.4f}")

    # 汇总
    total = sum(r["total_pnl"] for r in results.values())
    total_trades = sum(r["trades"] for r in results.values())
    sign = "+" if total >= 0 else ""
    print(f"\n  {'─'*60}")
    print(f"  合计: {sign}${total:.4f}  ({total_trades} 笔)")
    print()


if __name__ == "__main__":
    main()
