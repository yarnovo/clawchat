#!/usr/bin/env python3
"""
参数网格搜索：对指定策略自动遍历参数空间，找最优参数组合

用法：
  python grid_search.py --symbol NTRN/USDT --strategy trend --days 14 --timeframe 5m
  python grid_search.py --symbol BAN/USDT --strategy grid --days 14 --leverage 2
  python grid_search.py --symbol ETH/USDT --strategy macd --days 14 --timeframe 1h --top 20

输出：终端打印 Top N 达标参数组合
"""

import argparse
import itertools
import sys

from backtest import STRATEGIES, PARAM_ALIASES, fetch_candles, run_backtest, calc_metrics
from criteria import CRITERIA, passes as passes_criteria

# ── 各策略的参数搜索空间（SCHEMA 参数名）──
PARAM_GRIDS = {
    'trend': {
        'fast_ema': [10, 14, 21],
        'slow_ema': [30, 40, 55],
        'atr_sl': [1.0, 1.5, 2.0],
        'atr_tp': [2.0, 3.0, 4.0],
    },
    'scalping': {
        'fast': [8, 12, 16],
        'slow': [30, 50, 70],
        'vol_mult': [1.0, 1.2, 1.5],
    },
    'breakout': {
        'lookback': [24, 48, 72],
        'atr_filter': [0.2, 0.3, 0.5],
        'trail_atr': [2.0, 3.0, 4.0],
    },
    'rsi': {
        'period': [10, 14, 21],
        'oversold': [20, 25, 30],
        'overbought': [70, 75, 80],
    },
    'bollinger': {
        'period': [15, 20, 30],
        'num_std': [2.0, 2.5, 3.0],
    },
    'macd': {
        'fast': [8, 12, 16],
        'slow': [21, 26, 34],
        'signal': [5, 9, 12],
        'trend_ema': [100, 150, 200],
    },
    'mean_reversion': {
        'ema_period': [30, 50, 80],
        'std_period': [30, 50, 80],
        'entry_std': [1.5, 2.0, 2.5],
    },
    'grid': {
        'grids': [5, 8, 10, 15],
        'lookback': [30, 50, 100],
    },
    'ema2050': {
        'fast_ema': [15, 20, 30],
        'slow_ema': [40, 50, 70],
        'trail_atr': [2.0, 2.5, 3.5],
    },
}


def main():
    parser = argparse.ArgumentParser(description='参数网格搜索')
    parser.add_argument('--symbol', required=True, help='交易对 (如 NTRN/USDT)')
    parser.add_argument('--strategy', required=True,
                        choices=list(STRATEGIES.keys()),
                        help='策略名称')
    parser.add_argument('--days', type=int, default=14, help='回测天数')
    parser.add_argument('--timeframe', default='5m', help='K线周期')
    parser.add_argument('--leverage', type=int, default=3, help='杠杆倍数')
    parser.add_argument('--capital', type=float, default=200, help='初始资金')
    parser.add_argument('--position', type=float, default=0.5, help='仓位比例')
    parser.add_argument('--top', type=int, default=10, help='输出 Top N 结果')
    parser.add_argument('--grid', type=str, default=None,
                        help='自定义参数网格 JSON (如 \'{"fast_ema":[10,14],"slow_ema":[30,40]}\')')
    args = parser.parse_args()

    symbol = args.symbol.upper().replace('-', '/')
    strategy_name = args.strategy

    if args.grid:
        grid = json.loads(args.grid)
    elif strategy_name in PARAM_GRIDS:
        grid = PARAM_GRIDS[strategy_name]
    else:
        print(f"  错误: 策略 '{strategy_name}' 无预设网格，可用 --grid 自定义")
        sys.exit(1)
    param_names = list(grid.keys())
    param_values = list(grid.values())
    combos = list(itertools.product(*param_values))

    print(f"\n  参数网格搜索")
    print(f"  币种: {symbol}  策略: {strategy_name}  杠杆: {args.leverage}x")
    print(f"  天数: {args.days}  周期: {args.timeframe}  资金: ${args.capital}")
    print(f"  参数空间: {' x '.join(f'{k}({len(v)})' for k, v in grid.items())} = {len(combos)} 组合")
    print()

    # 拉取 K 线（只拉一次）
    print(f"  拉取 {symbol} {args.timeframe} {args.days}天 K线...")
    candles = fetch_candles(symbol, args.timeframe, args.days)
    if not candles or len(candles) < 50:
        print(f"  错误: K 线数据不足 (got {len(candles) if candles else 0})")
        sys.exit(1)
    print(f"  获取到 {len(candles)} 根 K 线")

    results = []
    done = 0
    t0 = time.time()

    for combo in combos:
        done += 1
        params = dict(zip(param_names, combo))

        try:
            strategy = STRATEGIES[strategy_name](**params)
            result = run_backtest(
                candles, strategy,
                capital=args.capital,
                leverage=args.leverage,
                position_pct=args.position,
            )
            m = calc_metrics(result, args.timeframe)
        except Exception:
            continue

        results.append({
            'params': params,
            'roi': round(m['roi'], 2),
            'sharpe': round(m['sharpe'], 2),
            'max_drawdown_pct': round(m['max_drawdown_pct'], 2),
            'trades': m['total_trades'],
            'win_rate': round(m['win_rate'], 1),
            'profit_factor': round(m['profit_factor'], 2),
            'net_profit': round(m['net_profit'], 2),
            'passed': passes_criteria(m, args.days),
        })

        if done % 10 == 0 or done == len(combos):
            elapsed = time.time() - t0
            eta = elapsed / done * (len(combos) - done) if done > 0 else 0
            n_passed = sum(1 for r in results if r['passed'])
            sys.stdout.write(
                f"\r  进度: {done}/{len(combos)} ({done*100//len(combos)}%)  "
                f"达标: {n_passed}  ETA {eta:.0f}s"
            )
            sys.stdout.flush()

    elapsed_total = time.time() - t0
    n_passed = sum(1 for r in results if r['passed'])
    print(f"\r  完成: {done}/{len(combos)}  达标: {n_passed}  耗时: {elapsed_total:.1f}s                    ")

    # 按夏普排序
    results.sort(key=lambda x: x['sharpe'], reverse=True)

    # 打印达标组合
    passed = [r for r in results if r['passed']]
    top_n = min(args.top, len(passed)) if passed else min(args.top, len(results))
    show = passed[:top_n] if passed else results[:top_n]

    label = "达标" if passed else "全部（无达标，显示最优）"
    print(f"\n{'='*100}")
    print(f"  Top {top_n} {label}  {symbol} {strategy_name} {args.leverage}x {args.timeframe}")
    print(f"{'='*100}")

    # 表头：动态参数列
    param_header = '  '.join(f'{k:>8}' for k in param_names)
    print(f"  # {param_header}  {'ROI':>8} {'夏普':>7} {'回撤':>7} {'交易':>5} {'胜率':>7} {'盈亏比':>7} {'达标':>4}")
    print(f"  {'-'*(len(param_names)*10 + 60)}")

    for i, r in enumerate(show, 1):
        param_vals = '  '.join(f'{r["params"][k]:>8}' if isinstance(r["params"][k], int) else f'{r["params"][k]:>8.1f}' if isinstance(r["params"][k], float) else f'{r["params"][k]:>8}' for k in param_names)
        mark = 'Y' if r['passed'] else '-'
        print(f"  {i:<2} {param_vals}  {r['roi']:>7.1f}% {r['sharpe']:>7.2f} "
              f"{r['max_drawdown_pct']:>6.1f}% {r['trades']:>5} {r['win_rate']:>6.1f}% "
              f"{r['profit_factor']:>7.2f} {mark:>4}")

    print(f"{'='*100}")

    # 输出最佳参数的 JSON（方便复制到 strategy.json）
    if show:
        best = show[0]
        print(f"\n  最佳参数 (JSON):")
        # 需要把 Python __init__ 名转回 SCHEMA 名
        reverse_aliases = {}
        aliases = PARAM_ALIASES.get(strategy_name, {})
        for schema_name, py_name in aliases.items():
            reverse_aliases[py_name] = schema_name
        schema_params = {}
        for k, v in best['params'].items():
            schema_name = reverse_aliases.get(k, k)
            schema_params[schema_name] = v
        print(f"  {json.dumps(schema_params)}")
    print()


if __name__ == '__main__':
    main()
