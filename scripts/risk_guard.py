#!/usr/bin/env python3
"""风控守护进程 — 每 30 秒检查持仓，触发止损自动平仓 + 通知 + 记录权益曲线
支持按策略独立风控：读取 strategies/*/risk.json + strategy.json"""

import csv
import json
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

from check import check_positions, DEFAULT_RISK
from futures_exchange import get_futures_exchange, get_positions, close_all

INTERVAL = 30  # 秒
EQUITY_CSV = Path(__file__).parent.parent / "reports" / "equity.csv"
HIGH_WATER_FILE = Path(__file__).parent.parent / "reports" / "high_water.json"
ENGINE_REGISTRY = Path("/tmp/hft-engines.json")
STRATEGIES_DIR = Path(__file__).parent.parent / "strategies"

running = True
high_water_marks = {}  # "{symbol}:{side}" → max_pnl_seen


def handle_signal(signum, frame):
    global running
    print(f"\n  收到信号 {signum}，正在退出...")
    running = False


def load_high_water():
    """从 reports/high_water.json 恢复高水位记录"""
    global high_water_marks
    try:
        if HIGH_WATER_FILE.exists():
            high_water_marks = json.loads(HIGH_WATER_FILE.read_text())
    except Exception:
        high_water_marks = {}


def save_high_water():
    """持久化高水位到 reports/high_water.json"""
    try:
        HIGH_WATER_FILE.parent.mkdir(parents=True, exist_ok=True)
        HIGH_WATER_FILE.write_text(json.dumps(high_water_marks, indent=2))
    except Exception as e:
        print(f"  高水位写入失败: {e}")


def check_profit_protection(exchange, positions, risk_by_symbol):
    """高水位利润保护：从最高盈利回撤超过阈值自动平仓。
    返回被平仓的 symbol 列表。
    """
    closed = []
    hwm_updated = False

    for p in positions:
        sym = p.get("symbol", "")
        side = p.get("side", "")
        pnl = float(p.get("unrealizedPnl", 0) or 0)
        key = f"{sym}:{side}"

        # 只对正利润生效
        if pnl <= 0:
            continue

        # 获取该持仓的风控配置
        raw_sym = sym.replace("/", "").replace(":USDT", "")
        risk = risk_by_symbol.get(raw_sym, DEFAULT_RISK)
        dd_stop = risk.get("max_drawdown_stop", DEFAULT_RISK.get("max_drawdown_stop", 0.30))
        strategy_name = risk.get("name", "unknown")

        # 更新高水位
        prev_hwm = high_water_marks.get(key, 0)
        if pnl > prev_hwm:
            high_water_marks[key] = pnl
            hwm_updated = True

        hwm = high_water_marks.get(key, 0)

        # 高水位 > 0 时才检查利润保护
        if hwm <= 0:
            continue

        # 保护线 = hwm * (1 - max_drawdown_stop)
        protection_line = hwm * (1 - dd_stop)

        if pnl <= protection_line:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"  [{now}] [PROFIT PROTECT] [{strategy_name}] {sym} {side} "
                  f"从高水位 +${hwm:.4f} 回撤到 +${pnl:.4f}，保护利润平仓")
            try:
                close_all(exchange, sym)
                print(f"    {sym} 已平仓")
                closed.append(sym)
                # 清除该持仓的高水位
                high_water_marks.pop(key, None)
                hwm_updated = True
            except Exception as e:
                print(f"    {sym} 平仓失败: {e}")

    if hwm_updated:
        save_high_water()

    return closed


def append_equity(timestamp, equity, unrealized_pnl, num_positions, detail):
    """追加一行到 equity.csv，detail 为每个持仓的 JSON 明细"""
    write_header = not EQUITY_CSV.exists()
    EQUITY_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(EQUITY_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(["timestamp", "equity", "unrealized_pnl", "positions", "detail"])
        writer.writerow([timestamp, f"{equity:.4f}", f"{unrealized_pnl:.4f}", num_positions,
                         json.dumps(detail, ensure_ascii=False)])


def _build_strategy_index():
    """扫描 strategies/*/strategy.json，建立 {name: dir_path} 和 {norm_symbol: dir_path} 索引。"""
    by_name = {}
    by_symbol = {}
    for strategy_dir in sorted(STRATEGIES_DIR.iterdir()):
        if not strategy_dir.is_dir():
            continue
        strategy_file = strategy_dir / "strategy.json"
        if not strategy_file.exists():
            continue
        try:
            cfg = json.loads(strategy_file.read_text())
            name = cfg.get("name", strategy_dir.name)
            symbol = cfg.get("symbol", "")
            norm = symbol.replace("/", "").replace(":USDT", "")
            by_name[name] = strategy_dir
            if norm:
                by_symbol[norm] = strategy_dir
        except Exception:
            pass
    return by_name, by_symbol


def _load_risk_from_dir(strategy_dir, strategy_name):
    """从策略目录加载 risk.json，缺失则返回全局默认值。"""
    risk_file = strategy_dir / "risk.json"
    if risk_file.exists():
        try:
            risk_cfg = json.loads(risk_file.read_text())
        except Exception:
            risk_cfg = dict(DEFAULT_RISK)
    else:
        risk_cfg = dict(DEFAULT_RISK)
    risk_cfg['name'] = strategy_name
    return risk_cfg


def load_risk_configs():
    """加载每个持仓对应的策略风控配置。
    返回 {normalized_symbol: risk_config}，如 {'PIPPINUSDT': {...}}。

    匹配路径（优先 engine registry）：
    1. /tmp/hft-engines.json: {symbol: strategy_name} → strategies/{name}/risk.json
    2. 补充：遍历 strategies/*/strategy.json 按 symbol 字段匹配
    """
    by_name, by_symbol = _build_strategy_index()
    risk_by_symbol = {}

    # 路径 1：通过 engine registry (symbol→strategy name→risk.json)
    engine_map = {}
    try:
        if ENGINE_REGISTRY.exists():
            engine_map = json.loads(ENGINE_REGISTRY.read_text())
    except Exception:
        pass

    for norm_symbol, strategy_name in engine_map.items():
        if norm_symbol in risk_by_symbol:
            continue
        # strategy_name 可能是策略类型如 "scalping"，也可能是完整名如 "pippin-scalping-5m"
        # 先按完整名匹配
        strategy_dir = by_name.get(strategy_name)
        if strategy_dir:
            risk_by_symbol[norm_symbol] = _load_risk_from_dir(strategy_dir, strategy_name)
            continue
        # 再按 symbol 匹配
        strategy_dir = by_symbol.get(norm_symbol)
        if strategy_dir:
            dir_name = strategy_dir.name
            risk_by_symbol[norm_symbol] = _load_risk_from_dir(strategy_dir, dir_name)

    # 路径 2：补充——遍历 strategies/ 中未被 registry 覆盖的
    for norm_symbol, strategy_dir in by_symbol.items():
        if norm_symbol in risk_by_symbol:
            continue
        dir_name = strategy_dir.name
        risk_by_symbol[norm_symbol] = _load_risk_from_dir(strategy_dir, dir_name)

    return risk_by_symbol


def notify_stop_loss(alerts, exchange):
    """触发止损时打印到控制台。"""
    print(f"\n  ⚠ 自动止损触发 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    for a in alerts:
        print(f"  - {a}")


def run_check(exchange):
    """执行一轮风控检查"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 加载每个策略的独立风控配置
    risk_by_symbol = load_risk_configs()
    if risk_by_symbol:
        print(f"  [{now}] 加载 {len(risk_by_symbol)} 个策略风控配置: {list(risk_by_symbol.keys())}")

    result = check_positions(exchange, risk_by_symbol=risk_by_symbol)

    equity = result.get("equity", 0)
    unrealized = result.get("unrealized_pnl", 0)
    num_pos = result.get("positions", 0)

    # 读取引擎注册表: symbol → strategy
    strategy_map = {}
    try:
        if ENGINE_REGISTRY.exists():
            strategy_map = json.loads(ENGINE_REGISTRY.read_text())
    except Exception:
        pass

    # 获取每个持仓的独立盈亏（按策略标注）
    positions = get_positions(exchange)
    detail = []
    for p in positions:
        sym = p.get("symbol", "")
        # ccxt symbol 格式如 "PIPPIN/USDT:USDT"，registry 用 "PIPPINUSDT"
        raw_sym = sym.replace("/", "").replace(":USDT", "")
        strategy = strategy_map.get(raw_sym, "unknown")
        detail.append({
            "symbol": sym,
            "side": p.get("side", ""),
            "pnl": round(float(p.get("unrealizedPnl", 0) or 0), 4),
            "strategy": strategy,
        })

    # 高水位利润保护（在记录权益和常规止损之前检查）
    profit_protected = check_profit_protection(exchange, positions, risk_by_symbol)

    # 清理不再存在的持仓的高水位记录
    active_keys = {f"{p.get('symbol', '')}:{p.get('side', '')}" for p in positions}
    stale = [k for k in high_water_marks if k not in active_keys]
    if stale:
        for k in stale:
            del high_water_marks[k]
        save_high_water()

    # 记录权益曲线（含持仓明细）
    append_equity(now, equity, unrealized, num_pos, detail)

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

    load_high_water()

    print(f"\n{'='*60}")
    print(f"  风控守护进程启动  间隔={INTERVAL}s")
    print(f"  权益曲线: {EQUITY_CSV}")
    print(f"  高水位: {HIGH_WATER_FILE}")
    if high_water_marks:
        print(f"  恢复 {len(high_water_marks)} 个高水位记录")
    print(f"{'='*60}\n")

    exchange = get_futures_exchange()

    while running:
        try:
            run_check(exchange)
        except KeyboardInterrupt:
            break
        except BaseException as e:
            print(f"  [ERROR] {type(e).__name__}: {e}")
        time.sleep(INTERVAL)

    print("  风控守护进程已退出")


if __name__ == "__main__":
    main()
