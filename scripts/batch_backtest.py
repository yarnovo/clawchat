#!/usr/bin/env python3
"""
批量回测：N 币种 x M 策略 x K 杠杆

用法：
  python batch_backtest.py                        # 自动 scan 高波动 + 全策略
  python batch_backtest.py --symbols NTRN/USDT,BAN/USDT --strategies trend,grid
  python batch_backtest.py --top 10 --days 14     # scan top 10 币种

输出：reports/batch_results.csv（全部结果）+ 终端打印达标组合
"""

import argparse
import csv
import os
import sys

from backtest import STRATEGIES, fetch_candles, run_backtest, calc_metrics
from criteria import CRITERIA, passes as passes_criteria
from futures_exchange import get_futures_exchange

# 要跑的策略（排除 fast 变体等固定参数子类）
BATCH_STRATEGIES = [
    'trend', 'breakout', 'macd', 'scalping', 'rsi',
    'bollinger', 'grid', 'mean_reversion', 'ema2050',
]

LEVERAGES = [2, 3, 5]

SKIP_BASES = {'USDC', 'BUSD', 'TUSD', 'FDUSD', 'DAI', 'UST', 'USDP'}

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'reports', 'batch_results.csv')


def scan_symbols(top_n=15):
    """从币安扫描高波动 USDT 合约币种"""
    print(f"  扫描币安高波动币种 (top {top_n})...")
    exchange = get_futures_exchange()
    tickers = exchange.fetch_tickers()

    candidates = []
    for symbol, t in tickers.items():
        if '/USDT' not in symbol:
            continue
        base = symbol.split('/')[0]
        if base in SKIP_BASES:
            continue
        if not t.get('last') or not t.get('high') or not t.get('low') or not t.get('quoteVolume'):
            continue
        if t['last'] <= 0 or t['low'] <= 0:
            continue
        vol_usd = t['quoteVolume'] or 0
        if vol_usd < 1_000_000:
            continue
        amplitude = (t['high'] - t['low']) / t['low'] * 100
        candidates.append({
            'symbol': symbol,
            'amplitude': amplitude,
            'volume': vol_usd,
        })

    candidates.sort(key=lambda x: x['amplitude'], reverse=True)
    symbols = [c['symbol'] for c in candidates[:top_n]]
    print(f"  找到 {len(symbols)} 个币种: {', '.join(symbols[:5])}...")
    return symbols


def main():
    parser = argparse.ArgumentParser(description='批量回测')
    parser.add_argument('--symbols', type=str, default=None,
                        help='逗号分隔的币种 (如 NTRN/USDT,BAN/USDT)')
    parser.add_argument('--strategies', type=str, default=None,
                        help='逗号分隔的策略 (如 trend,grid,macd)')
    parser.add_argument('--leverages', type=str, default=None,
                        help='逗号分隔的杠杆 (如 2,3,5)')
    parser.add_argument('--top', type=int, default=15,
                        help='scan top N 币种 (默认 15)')
    parser.add_argument('--days', type=int, default=14,
                        help='回测天数 (默认 14)')
    parser.add_argument('--timeframe', default='5m',
                        help='K线周期 (默认 5m)')
    parser.add_argument('--capital', type=float, default=200,
                        help='初始资金 (默认 200)')
    parser.add_argument('--position', type=float, default=0.5,
                        help='仓位比例 (默认 0.5)')
    args = parser.parse_args()

    # 币种
    if args.symbols:
        symbols = [s.strip().upper().replace('-', '/') for s in args.symbols.split(',')]
    else:
        symbols = scan_symbols(args.top)

    # 策略
    if args.strategies:
        strategies = [s.strip() for s in args.strategies.split(',')]
    else:
        strategies = BATCH_STRATEGIES

    # 杠杆
    if args.leverages:
        leverages = [int(x.strip()) for x in args.leverages.split(',')]
    else:
        leverages = LEVERAGES

    total = len(symbols) * len(strategies) * len(leverages)
    print(f"\n  批量回测: {len(symbols)} 币种 x {len(strategies)} 策略 x {len(leverages)} 杠杆 = {total} 组合")
    print(f"  天数: {args.days}  周期: {args.timeframe}  资金: ${args.capital}  仓位: {args.position*100:.0f}%")
    print(f"  准入: ROI>{CRITERIA['min_return_pct']}% 夏普>{CRITERIA['min_sharpe']} "
          f"回撤<{CRITERIA['max_drawdown_pct']}% 交易>={CRITERIA['min_trades']} "
          f"胜率>={CRITERIA['min_win_rate']}% PF>={CRITERIA['min_profit_factor']}")
    print()

    results = []
    passed = []
    done = 0

    # 缓存 K 线数据：同一币种只拉一次
    candle_cache = {}

    for symbol in symbols:
        if symbol not in candle_cache:
            print(f"  拉取 {symbol} {args.timeframe} {args.days}天 K线...")
            try:
                candles = fetch_candles(symbol, args.timeframe, args.days)
                candle_cache[symbol] = candles if candles and len(candles) >= 50 else None
            except Exception as e:
                print(f"    跳过 {symbol}: {e}")
                candle_cache[symbol] = None

        candles = candle_cache[symbol]
        if candles is None:
            done += len(strategies) * len(leverages)
            continue

        for strategy_name in strategies:
            if strategy_name not in STRATEGIES:
                done += len(leverages)
                continue

            for leverage in leverages:
                done += 1
                try:
                    strategy = STRATEGIES[strategy_name]()
                    result = run_backtest(
                        candles, strategy,
                        capital=args.capital,
                        leverage=leverage,
                        position_pct=args.position,
                    )
                    m = calc_metrics(result, args.timeframe)
                except Exception:
                    continue

                row = {
                    'symbol': symbol,
                    'strategy': strategy_name,
                    'leverage': leverage,
                    'days': args.days,
                    'timeframe': args.timeframe,
                    'roi': round(m['roi'], 2),
                    'sharpe': round(m['sharpe'], 2),
                    'max_drawdown_pct': round(m['max_drawdown_pct'], 2),
                    'trades': m['total_trades'],
                    'win_rate': round(m['win_rate'], 1),
                    'profit_factor': round(m['profit_factor'], 2),
                    'net_profit': round(m['net_profit'], 2),
                    'passed': passes_criteria(m, args.days),
                }
                results.append(row)

                if row['passed']:
                    passed.append(row)

                # 进度
                if done % 10 == 0 or done == total:
                    sys.stdout.write(f"\r  进度: {done}/{total} ({done*100//total}%)  达标: {len(passed)}")
                    sys.stdout.flush()

    print(f"\r  完成: {done}/{total}  达标: {len(passed)}                    ")

    # 写 CSV
    output_path = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if results:
        fields = list(results[0].keys())
        with open(output_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(results)
        print(f"\n  全部结果已写入: {output_path}")
    else:
        print("\n  无结果")

    # 打印达标组合
    if passed:
        passed.sort(key=lambda x: x['sharpe'], reverse=True)
        print(f"\n{'='*95}")
        print(f"  达标组合 ({len(passed)} 个)  按夏普排序")
        print(f"{'='*95}")
        print(f"  {'币种':<14} {'策略':<16} {'杠杆':>4} {'收益率':>8} {'夏普':>7} {'回撤':>7} {'交易':>5} {'胜率':>7} {'盈亏比':>7}")
        print(f"  {'-'*85}")
        for r in passed:
            print(f"  {r['symbol']:<14} {r['strategy']:<16} {r['leverage']:>3}x "
                  f"{r['roi']:>7.1f}% {r['sharpe']:>7.2f} {r['max_drawdown_pct']:>6.1f}% "
                  f"{r['trades']:>5} {r['win_rate']:>6.1f}% {r['profit_factor']:>7.2f}")
        print(f"{'='*95}")
    else:
        print("\n  无达标组合")


if __name__ == '__main__':
    main()
