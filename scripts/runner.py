#!/usr/bin/env python3
"""
策略运行器

根据 data/strategies.json 配置启动/停止策略。
支持 dryrun → live 切换。

用法：
  python runner.py start      # 启动所有策略
  python runner.py stop       # 停止所有策略
  python runner.py status     # 查看运行状态
  python runner.py promote ANKR   # 切换到实盘
  python runner.py demote ANKR    # 切回 dryrun
"""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
CONFIG_FILE = DATA_DIR / "strategies.json"
PID_DIR = DATA_DIR / "pids"

DEFAULT_STRATEGIES = [
    {"symbol": "BTC/USDT", "type": "grid", "lower": 73000, "upper": 75000, "grids": 20, "amount": 10, "interval": 30},
    {"symbol": "ETH/USDT", "type": "grid", "lower": 2250, "upper": 2400, "grids": 20, "amount": 10, "interval": 30},
    {"symbol": "HYPER/USDT", "type": "grid", "lower": 0.09, "upper": 0.11, "grids": 20, "amount": 5, "interval": 30},
    {"symbol": "POLYX/USDT", "type": "grid", "lower": 0.046, "upper": 0.052, "grids": 25, "amount": 5, "interval": 30},
    {"symbol": "VANRY/USDT", "type": "grid", "lower": 0.005, "upper": 0.009, "grids": 20, "amount": 5, "interval": 30},
    {"symbol": "ROBO/USDT", "type": "grid", "lower": 0.025, "upper": 0.035, "grids": 25, "amount": 20, "interval": 30},
    {"symbol": "ANKR/USDT", "type": "grid", "lower": 0.005, "upper": 0.007, "grids": 25, "amount": 5, "interval": 30},
    {"symbol": "ENJ/USDT", "type": "grid", "lower": 0.019, "upper": 0.024, "grids": 20, "amount": 5, "interval": 30},
    {"symbol": "OPN/USDT", "type": "grid", "lower": 0.295, "upper": 0.305, "grids": 25, "amount": 10, "interval": 30},
    {"symbol": "FXS/USDT", "type": "grid", "lower": 0.80, "upper": 0.85, "grids": 20, "amount": 5, "interval": 30},
    {"symbol": "HYPER/USDT", "type": "rsi", "amount": 5, "interval": 60, "period": 14, "oversold": 30, "overbought": 70},
]


def load_config():
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    # 首次运行，用默认配置初始化
    config = []
    for s in DEFAULT_STRATEGIES:
        s['mode'] = 'dryrun'
        config.append(s)
    save_config(config)
    return config


def save_config(config):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def strategy_id(s):
    return f"{s['type']}_{s['symbol'].replace('/', '-').lower()}"


def start_all():
    stop_all()
    config = load_config()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PID_DIR.mkdir(parents=True, exist_ok=True)
    scripts_dir = ROOT / "scripts"

    for s in config:
        sid = strategy_id(s)
        log_file = DATA_DIR / f"{sid}.log"
        is_live = s.get('mode') == 'live'

        if s['type'] == 'grid':
            cmd = [
                "uv", "run", "python", "grid.py", "run",
                "--symbol", s['symbol'],
                "--lower", str(s['lower']),
                "--upper", str(s['upper']),
                "--grids", str(s['grids']),
                "--amount", str(s['amount']),
                "--interval", str(s['interval']),
            ]
            if not is_live:
                cmd.append("--dry-run")
        elif s['type'] == 'rsi':
            cmd = [
                "uv", "run", "python", "rsi.py", "run",
                "--symbol", s['symbol'],
                "--amount", str(s['amount']),
                "--interval", str(s['interval']),
            ]
            if not is_live:
                cmd.append("--dry-run")
        elif s['type'] == 'bollinger':
            cmd = [
                "uv", "run", "python", "bollinger.py", "run",
                "--symbol", s['symbol'],
                "--amount", str(s['amount']),
                "--interval", str(s['interval']),
                "--period", str(s.get('period', 20)),
                "--std", str(s.get('num_std', 2)),
            ]
            if not is_live:
                cmd.append("--dry-run")
        else:
            continue

        mode_label = "LIVE" if is_live else "dryrun"
        with open(log_file, 'w') as lf:
            proc = subprocess.Popen(
                cmd, cwd=scripts_dir, stdout=lf, stderr=lf,
                start_new_session=True,
            )
        # 保存 PID
        (PID_DIR / f"{sid}.pid").write_text(str(proc.pid))
        print(f"  [{mode_label:>6}] {s['symbol']:<14} {s['type']:<6} PID={proc.pid}")

    print(f"\n  {len(config)} 个策略已启动")


def stop_all():
    if not PID_DIR.exists():
        return
    for pid_file in PID_DIR.glob("*.pid"):
        try:
            pid = int(pid_file.read_text())
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError, ValueError):
            pass
        pid_file.unlink()
    # 兜底
    os.system("pkill -f 'grid.py run' 2>/dev/null; pkill -f 'rsi.py run' 2>/dev/null")
    time.sleep(1)
    print("  策略已停止")


def show_status():
    config = load_config()
    live_count = sum(1 for s in config if s.get('mode') == 'live')
    dry_count = sum(1 for s in config if s.get('mode') != 'live')

    print(f"\n  {'策略':<20} {'类型':<6} {'模式':<8} {'参数'}")
    print(f"  {'─'*65}")
    for s in config:
        mode = s.get('mode', 'dryrun')
        mode_display = f"{'🔴 LIVE' if mode == 'live' else 'dryrun'}"
        if s['type'] == 'grid':
            params = f"${s['lower']}-${s['upper']} x{s['grids']} ${s['amount']}/格"
        else:
            params = f"RSI<{s.get('oversold',30)} >{s.get('overbought',70)} ${s['amount']}/笔"
        print(f"  {s['symbol']:<20} {s['type']:<6} {mode_display:<8} {params}")

    print(f"\n  实盘: {live_count}  模拟: {dry_count}  总计: {len(config)}")
    print()


def promote(symbol):
    config = load_config()
    found = False
    for s in config:
        if s['symbol'].upper() == symbol.upper().replace('-', '/'):
            s['mode'] = 'live'
            found = True
            print(f"  {s['symbol']} {s['type']} → LIVE 实盘")
    if not found:
        print(f"  未找到 {symbol} 的策略")
        return
    save_config(config)
    print("  重启策略中...")
    start_all()


def check_promote():
    """检查 dryrun 策略是否达到 promote 条件，自动切换到实盘。

    promote 规则（动态阈值）：
    - 按策略的每格金额计算，利润达到 amount * 2% 即可 promote
    - 同时要求至少 5 笔成交（避免偶然）
    - 例：amount=$5 → 阈值 $0.10，amount=$20 → 阈值 $0.40
    """
    config = load_config()
    promoted = []

    for s in config:
        if s.get('mode') == 'live':
            continue

        sid = strategy_id(s)
        state_path = DATA_DIR / f"{sid.replace('grid_', 'grid_').replace('rsi_', 'rsi_')}"
        # grid 和 rsi 的状态文件命名
        safe_sym = s['symbol'].replace('/', '-').lower()
        if s['type'] == 'grid':
            state_path = DATA_DIR / f"grid_{safe_sym}.json"
        else:
            state_path = DATA_DIR / f"rsi_{safe_sym}.json"

        if not state_path.exists():
            continue

        state = json.loads(state_path.read_text())
        profit = state.get('total_profit', 0)
        trades = len(state.get('trades', []))
        amount = s.get('amount', 5)

        # 动态阈值：amount * 2%，最少 5 笔交易
        threshold = amount * 0.02
        min_trades = 5

        if profit >= threshold and trades >= min_trades:
            s['mode'] = 'live'
            promoted.append({
                'symbol': s['symbol'],
                'type': s['type'],
                'profit': profit,
                'trades': trades,
                'threshold': threshold,
            })
            print(f"  AUTO PROMOTE: {s['symbol']} {s['type']} → LIVE (利润${profit:.4f} >= 阈值${threshold:.4f}, {trades}笔交易)")

    if promoted:
        save_config(config)
        print(f"\n  {len(promoted)} 个策略已自动 promote 到实盘！重启中...")
        start_all()
    else:
        # 显示各策略距 promote 的进度
        print(f"\n  {'策略':<20} {'利润':>8} {'阈值':>8} {'进度':>8} {'交易':>6}")
        print(f"  {'─'*55}")
        for s in config:
            if s.get('mode') == 'live':
                continue
            safe_sym = s['symbol'].replace('/', '-').lower()
            sp = DATA_DIR / f"{s['type']}_{safe_sym}.json"
            if not sp.exists():
                continue
            st = json.loads(sp.read_text())
            profit = st.get('total_profit', 0)
            trades = len(st.get('trades', []))
            threshold = s.get('amount', 5) * 0.02
            pct = min(profit / threshold * 100, 100) if threshold > 0 else 0
            bar = '█' * int(pct / 10) + '░' * (10 - int(pct / 10))
            print(f"  {s['symbol']:<20} ${profit:>6.4f} ${threshold:>6.4f} {bar} {trades:>4}笔")
        print()

    return promoted


def demote(symbol):
    config = load_config()
    found = False
    for s in config:
        if s['symbol'].upper() == symbol.upper().replace('-', '/'):
            s['mode'] = 'dryrun'
            found = True
            print(f"  {s['symbol']} {s['type']} → dryrun 模拟")
    if not found:
        print(f"  未找到 {symbol} 的策略")
        return
    save_config(config)
    print("  重启策略中...")
    start_all()


def main():
    if len(sys.argv) < 2:
        print("用法: runner.py [start|stop|status|promote|demote] [SYMBOL]")
        return

    cmd = sys.argv[1]
    if cmd == 'start':
        start_all()
    elif cmd == 'stop':
        stop_all()
    elif cmd == 'status':
        show_status()
    elif cmd == 'check':
        check_promote()
    elif cmd == 'promote':
        if len(sys.argv) < 3:
            print("用法: runner.py promote SYMBOL")
            return
        promote(sys.argv[2])
    elif cmd == 'demote':
        if len(sys.argv) < 3:
            print("用法: runner.py demote SYMBOL")
            return
        demote(sys.argv[2])
    else:
        print(f"未知命令: {cmd}")


if __name__ == '__main__':
    main()
