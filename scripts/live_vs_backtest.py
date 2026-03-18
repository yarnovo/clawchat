#!/usr/bin/env python3
"""实盘 vs 回测对比工具

对比策略的实盘表现和回测预期，高亮差距过大的指标。

用法：
  python live_vs_backtest.py ntrn-trend-fast-5m
  make compare STRATEGY=ntrn-trend-fast-5m
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
TRADES_FILE = ROOT / "reports" / "trades.jsonl"
STRATEGIES_DIR = ROOT / "strategies"

# ANSI 颜色
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"


def load_trades(strategy_name: str) -> list[dict]:
    """从 trades.jsonl 加载指定策略的交易记录"""
    if not TRADES_FILE.exists():
        return []
    trades = []
    for line in TRADES_FILE.read_text().strip().split("\n"):
        if not line:
            continue
        try:
            t = json.loads(line)
            if t.get("strategy") == strategy_name:
                trades.append(t)
        except json.JSONDecodeError:
            pass
    return trades


def load_backtest(strategy_name: str) -> dict | None:
    """从 strategy.json 读取回测指标"""
    path = STRATEGIES_DIR / strategy_name / "strategy.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return data.get("backtest")


def compute_live_stats(trades: list[dict], strategy_name: str) -> dict:
    """配对交易计算实盘指标（复用 strategy_pnl 逻辑）"""
    by_symbol = defaultdict(list)
    for t in trades:
        by_symbol[t.get("symbol", "?")].append(t)

    total_pnl = 0.0
    wins = 0
    losses = 0
    total_win_pnl = 0.0
    total_loss_pnl = 0.0
    # 用于计算收益率的本金追踪
    capital_path = []

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

            # 反向 → 平仓
            close_qty = min(position["qty"], qty)
            if position["side"] == "buy":
                pnl = (price - position["price"]) * close_qty
            else:
                pnl = (position["price"] - price) * close_qty

            total_pnl += pnl
            capital_path.append(total_pnl)
            if pnl >= 0:
                wins += 1
                total_win_pnl += pnl
            else:
                losses += 1
                total_loss_pnl += abs(pnl)

            remaining = position["qty"] - close_qty
            if remaining > 0:
                position["qty"] = remaining
            elif qty > close_qty:
                position = {"side": side, "price": price, "qty": qty - close_qty}
            else:
                position = None

    round_trips = wins + losses
    win_rate = wins / round_trips if round_trips > 0 else 0
    profit_factor = total_win_pnl / total_loss_pnl if total_loss_pnl > 0 else float("inf")

    # 最大回撤（基于累计 P&L 序列）
    max_drawdown_pct = 0.0
    if capital_path:
        peak = capital_path[0]
        for val in capital_path:
            if val > peak:
                peak = val
            if peak > 0:
                dd = (peak - val) / peak
                if dd > max_drawdown_pct:
                    max_drawdown_pct = dd

    # 读 capital 算收益率
    strategy_json = STRATEGIES_DIR / strategy_name / "strategy.json"
    capital = 200.0
    if strategy_json.exists():
        cfg = json.loads(strategy_json.read_text())
        capital = float(cfg.get("capital", 200))

    return_pct = (total_pnl / capital) * 100 if capital > 0 else 0

    return {
        "return_pct": return_pct,
        "total_pnl": total_pnl,
        "trades": len(trades),
        "round_trips": round_trips,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "max_drawdown_pct": max_drawdown_pct * 100,
    }


def fmt_pct(val: float) -> str:
    return f"{val:.2f}%"


def fmt_ratio(val: float) -> str:
    if val == float("inf"):
        return "inf"
    return f"{val:.2f}"


def compare_metric(name: str, live_val: float, bt_val: float, higher_is_better: bool = True) -> str:
    """对比单个指标，返回格式化的对比行。实盘低于回测 50% 标红。"""
    live_str = fmt_pct(live_val) if "pct" in name or "rate" in name or "drawdown" in name else fmt_ratio(live_val)
    bt_str = fmt_pct(bt_val) if "pct" in name or "rate" in name or "drawdown" in name else fmt_ratio(bt_val)

    # 计算差距
    if bt_val == 0:
        ratio_str = "N/A"
        warn = False
    elif higher_is_better:
        ratio = live_val / bt_val if bt_val != 0 else 0
        ratio_str = f"{ratio:.0%}"
        warn = ratio < 0.5
    else:
        # 对于回撤等越低越好的指标，实盘高于回测 2x 标红
        ratio = live_val / bt_val if bt_val != 0 else 0
        ratio_str = f"{ratio:.0%}"
        warn = ratio > 2.0

    if warn:
        return f"  {RED}{BOLD}⚠ {name:<20} 实盘: {live_str:<12} 回测: {bt_str:<12} ({ratio_str}){RESET}"
    else:
        return f"    {name:<20} 实盘: {live_str:<12} 回测: {bt_str:<12} ({ratio_str})"


def main():
    if len(sys.argv) < 2:
        print(f"\n  用法: python {Path(__file__).name} <strategy-name>")
        print(f"  示例: python {Path(__file__).name} ntrn-trend-fast-5m")
        sys.exit(1)

    strategy_name = sys.argv[1]

    # 检查策略目录存在
    strategy_dir = STRATEGIES_DIR / strategy_name
    if not strategy_dir.exists():
        print(f"\n  {RED}错误: 策略目录不存在 strategies/{strategy_name}/{RESET}")
        sys.exit(1)

    # 加载回测数据
    backtest = load_backtest(strategy_name)
    if not backtest:
        print(f"\n  {RED}错误: strategy.json 无 backtest 字段{RESET}")
        sys.exit(1)

    # 加载实盘数据
    trades = load_trades(strategy_name)
    if not trades:
        print(f"\n  {YELLOW}警告: 无实盘交易记录 (reports/trades.jsonl 中无 strategy={strategy_name}){RESET}")
        print(f"\n  回测指标（仅供参考）:")
        print(f"    收益率:     {fmt_pct(backtest.get('return_pct', 0))}")
        print(f"    胜率:       {fmt_pct(backtest.get('win_rate', 0) * 100)}")
        print(f"    盈亏比:     {fmt_ratio(backtest.get('profit_factor', 0))}")
        print(f"    最大回撤:   {fmt_pct(backtest.get('max_drawdown_pct', 0))}")
        print(f"    交易笔数:   {backtest.get('trades', 0)}")
        print()
        return

    # 计算实盘指标
    live = compute_live_stats(trades, strategy_name)

    # 回测指标
    bt_return = backtest.get("return_pct", 0)
    bt_win_rate = backtest.get("win_rate", 0) * 100  # 转成百分比
    bt_profit_factor = backtest.get("profit_factor", 0)
    bt_max_dd = backtest.get("max_drawdown_pct", 0)
    bt_trades = backtest.get("trades", 0)

    print(f"\n  {'='*62}")
    print(f"  {BOLD}实盘 vs 回测对比: {strategy_name}{RESET}")
    print(f"  {'='*62}")
    print(f"    实盘交易: {live['trades']} 笔 ({live['round_trips']} 轮完整)")
    print(f"    回测交易: {bt_trades} 笔")
    print(f"  {'─'*62}")

    # 逐项对比
    print(compare_metric("return_pct (收益率)", live["return_pct"], bt_return, higher_is_better=True))
    print(compare_metric("win_rate (胜率)", live["win_rate"] * 100, bt_win_rate, higher_is_better=True))
    print(compare_metric("profit_factor (盈亏比)", live["profit_factor"], bt_profit_factor, higher_is_better=True))
    print(compare_metric("max_drawdown_pct (回撤)", live["max_drawdown_pct"], bt_max_dd, higher_is_better=False))

    print(f"  {'─'*62}")
    sign = "+" if live["total_pnl"] >= 0 else ""
    print(f"    实盘累计 P&L: {sign}${live['total_pnl']:.4f}")

    # 总体评估
    warnings = 0
    if bt_return > 0 and live["return_pct"] / bt_return < 0.5:
        warnings += 1
    if bt_win_rate > 0 and (live["win_rate"] * 100) / bt_win_rate < 0.5:
        warnings += 1
    if bt_profit_factor > 0 and bt_profit_factor != float("inf") and live["profit_factor"] / bt_profit_factor < 0.5:
        warnings += 1

    if warnings > 0:
        print(f"\n  {RED}{BOLD}⚠ 警告: {warnings} 项指标实盘表现低于回测 50%，建议检查策略或暂停运行{RESET}")
    elif live["round_trips"] < 5:
        print(f"\n  {YELLOW}提示: 实盘完整交易仅 {live['round_trips']} 轮，样本不足，对比仅供参考{RESET}")
    else:
        print(f"\n  {GREEN}策略表现正常{RESET}")

    print()


if __name__ == "__main__":
    main()
