"""clawchat emergency-close — 紧急全平命令"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


RISK_EVENTS_LOG = "records/risk_events.jsonl"


def load_strategy_symbols(strategies_dir):
    """读取所有策略目录，返回 {strategy_name: symbol} 映射。"""
    mapping = {}
    if not os.path.isdir(strategies_dir):
        return mapping
    for name in os.listdir(strategies_dir):
        cfg_path = os.path.join(strategies_dir, name, "strategy.json")
        if os.path.isfile(cfg_path):
            try:
                with open(cfg_path) as f:
                    cfg = json.load(f)
                symbol = cfg.get("symbol", "")
                if symbol:
                    mapping[name] = symbol.upper().replace("/", "").replace(":USDT", "")
            except (json.JSONDecodeError, OSError):
                pass
    return mapping


def normalize_symbol(raw):
    """将 ccxt 格式 symbol (如 NTRN/USDT:USDT) 转为 NTRNUSDT。"""
    return raw.replace("/", "").replace(":USDT", "")


def log_risk_event(strategy, symbol, detail):
    """追加写入 risk_events.jsonl。"""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    record = {
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "rule": "emergency_close",
        "pnl": 0,
        "verdict": "emergency_close",
        "detail": detail,
    }
    log_path = Path(RISK_EVENTS_LOG)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a") as f:
        f.write(json.dumps(record) + "\n")


def emergency_close(exchange, strategy_name=None, strategies_dir="strategies"):
    """执行紧急全平。

    Args:
        exchange: ccxt exchange 实例
        strategy_name: 可选，只平指定策略的持仓
        strategies_dir: 策略目录路径

    Returns:
        list of dicts: 平仓结果
    """
    # 获取所有持仓
    positions = exchange.fetch_positions()
    active = [p for p in positions if abs(float(p.get("contracts", 0) or 0)) > 0]

    if not active:
        print("  无持仓，无需平仓")
        return []

    # 如果指定了策略名，过滤只保留该策略的 symbol
    target_symbols = None
    if strategy_name:
        mapping = load_strategy_symbols(strategies_dir)
        if strategy_name not in mapping:
            print(f"  错误: 策略 '{strategy_name}' 未找到或无 symbol 配置")
            return []
        target_symbols = {mapping[strategy_name]}
        print(f"  目标策略: {strategy_name} → symbol: {mapping[strategy_name]}")

    results = []
    for pos in active:
        sym = pos.get("symbol", "")
        normalized = normalize_symbol(sym)

        if target_symbols and normalized not in target_symbols:
            continue

        contracts = abs(float(pos.get("contracts", 0) or 0))
        side = pos.get("side", "")
        pnl = float(pos.get("unrealizedPnl", 0) or 0)

        print(f"  平仓: {sym} {side} x{contracts} (未实现PnL: {pnl:+.4f})")

        try:
            if side == "long":
                params = {"reduceOnly": True}
                order = exchange.create_market_sell_order(sym, contracts, params)
            elif side == "short":
                params = {"reduceOnly": True}
                order = exchange.create_market_buy_order(sym, contracts, params)
            else:
                print(f"    跳过: 未知方向 {side}")
                continue

            status = order.get("status", "unknown")
            print(f"    结果: {status}")
            results.append({
                "symbol": sym,
                "side": side,
                "contracts": contracts,
                "pnl": pnl,
                "status": status,
            })

            # 写 risk_events.jsonl
            strat = strategy_name or "all"
            log_risk_event(
                strat, normalized,
                f"emergency close {side} x{contracts} pnl={pnl:+.4f} status={status}",
            )

        except Exception as e:
            print(f"    失败: {e}")
            results.append({
                "symbol": sym,
                "side": side,
                "contracts": contracts,
                "pnl": pnl,
                "status": f"error: {e}",
            })

    if not results:
        if strategy_name:
            print(f"  策略 '{strategy_name}' 无持仓")
        else:
            print("  无持仓需要平仓")

    return results


def main():
    parser = argparse.ArgumentParser(
        prog="clawchat emergency-close",
        description="紧急全平 — 一键平掉所有或指定策略持仓",
    )
    parser.add_argument(
        "strategy", nargs="?", default=None,
        help="策略名（可选，不填则平所有持仓）",
    )
    parser.add_argument(
        "--yes", "-y", action="store_true",
        help="跳过确认直接执行",
    )
    args = parser.parse_args()

    if not args.yes:
        target = f"策略 '{args.strategy}'" if args.strategy else "所有"
        confirm = input(f"  确认紧急平仓 {target} 持仓? (y/N) ")
        if confirm.lower() != "y":
            print("  已取消")
            return

    from clawchat.exchange import get_futures_exchange
    ex = get_futures_exchange()

    print("\n  === 紧急全平 ===\n")
    results = emergency_close(ex, args.strategy)

    if results:
        print(f"\n  共平仓 {len(results)} 笔")
        success = sum(1 for r in results if "error" not in r["status"])
        failed = len(results) - success
        if failed:
            print(f"  成功: {success}, 失败: {failed}")
    print()
