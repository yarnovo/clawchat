#!/usr/bin/env python3
"""策略自动上架监听器 — 扫描 strategies/ 目录，自动启停引擎"""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
STRATEGIES_DIR = ROOT / "strategies"
ENGINE_BIN = ROOT / "engine" / "target" / "release" / "hft-engine"
ENGINE_REGISTRY = Path("/tmp/hft-engines.json")
LOG_DIR = Path("/tmp")
INTERVAL = 60  # 秒

# strategy name → subprocess.Popen
running_engines = {}
running = True


def handle_signal(signum, frame):
    global running
    print(f"\n  [{now()}] 收到信号 {signum}，正在停止所有引擎...")
    running = False


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def scan_strategies():
    """扫描 strategies/*/strategy.json，返回 {name: config_dict}"""
    strategies = {}
    for path in sorted(STRATEGIES_DIR.glob("*/strategy.json")):
        try:
            cfg = json.loads(path.read_text())
            name = cfg.get("name", path.parent.name)
            cfg["_path"] = str(path)
            strategies[name] = cfg
        except Exception as e:
            print(f"  [{now()}] 解析失败 {path}: {e}")
    return strategies


def read_registry():
    """读取 /tmp/hft-engines.json"""
    try:
        if ENGINE_REGISTRY.exists():
            return json.loads(ENGINE_REGISTRY.read_text())
    except Exception:
        pass
    return {}


def write_registry(registry):
    """写入 /tmp/hft-engines.json"""
    try:
        ENGINE_REGISTRY.write_text(json.dumps(registry, indent=2))
    except Exception as e:
        print(f"  [{now()}] 写入 registry 失败: {e}")


def start_engine(name, cfg):
    """启动一个引擎实例"""
    config_path = cfg["_path"]
    log_file = LOG_DIR / f"rust-{name}.log"

    print(f"  [{now()}] 启动引擎: {name} → {config_path}")
    print(f"  [{now()}]   日志: {log_file}")

    with open(log_file, "a") as lf:
        proc = subprocess.Popen(
            [str(ENGINE_BIN), "--config", config_path],
            stdout=lf,
            stderr=lf,
            env={**os.environ},
        )

    running_engines[name] = proc

    # 更新 registry
    symbol = cfg.get("symbol", "").replace("/", "").replace(":USDT", "")
    strategy = cfg.get("strategy", "unknown")
    registry = read_registry()
    registry[symbol] = strategy
    write_registry(registry)

    print(f"  [{now()}]   PID={proc.pid} symbol={symbol} strategy={strategy}")


def stop_engine(name):
    """停止一个引擎实例"""
    proc = running_engines.get(name)
    if proc is None:
        return

    print(f"  [{now()}] 停止引擎: {name} PID={proc.pid}")
    try:
        proc.terminate()
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    except Exception as e:
        print(f"  [{now()}]   停止失败: {e}")

    del running_engines[name]


def check_engine_health():
    """检查运行中的引擎是否存活，清理已退出的"""
    dead = []
    for name, proc in running_engines.items():
        if proc.poll() is not None:
            print(f"  [{now()}] 引擎已退出: {name} PID={proc.pid} code={proc.returncode}")
            dead.append(name)
    for name in dead:
        del running_engines[name]
    return dead


def reconcile():
    """对比 approved 策略与运行中引擎，启停差异"""
    strategies = scan_strategies()

    # 应该运行的策略
    should_run = {
        name: cfg for name, cfg in strategies.items()
        if cfg.get("status") == "approved"
    }

    # 检查引擎健康，清理死掉的
    restarted = check_engine_health()

    # 启动新策略（approved 但未运行）
    for name, cfg in should_run.items():
        if name not in running_engines:
            start_engine(name, cfg)

    # 停止被移除/rejected/suspended 的策略
    to_stop = [name for name in running_engines if name not in should_run]
    for name in to_stop:
        stop_engine(name)

    # 输出状态
    n_approved = len(should_run)
    n_running = len(running_engines)
    print(f"  [{now()}] approved={n_approved} running={n_running} "
          f"engines={list(running_engines.keys())}")


def stop_all():
    """停止所有引擎"""
    for name in list(running_engines.keys()):
        stop_engine(name)


def main():
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    if not ENGINE_BIN.exists():
        print(f"  引擎未编译: {ENGINE_BIN}")
        print(f"  请先运行 make build")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  策略监听器启动  间隔={INTERVAL}s")
    print(f"  策略目录: {STRATEGIES_DIR}")
    print(f"  引擎: {ENGINE_BIN}")
    print(f"{'='*60}\n")

    while running:
        try:
            reconcile()
        except Exception as e:
            print(f"  [{now()}] ERROR: {e}")
        time.sleep(INTERVAL)

    stop_all()
    print(f"  [{now()}] 策略监听器已退出")


if __name__ == "__main__":
    main()
