#!/usr/bin/env python3
"""批量回测：大币种 + 长周期组合，输出通过的策略"""

import subprocess
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT']
STRATEGIES = ['scalping', 'rsi', 'bollinger', 'grid']
TIMEFRAMES = ['15m', '1h', '4h']
LEVERAGES = [3, 5]
DAYS = 14
CAPITAL = 200

def run_one(symbol, strategy, timeframe, leverage):
    cmd = [
        'uv', 'run', 'python', 'backtest.py',
        '--symbol', symbol,
        '--strategy', strategy,
        '--days', str(DAYS),
        '--leverage', str(leverage),
        '--timeframe', timeframe,
        '--capital', str(CAPITAL),
    ]
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120,
            cwd='/Users/yarnb/agent-projects/clawchat/scripts',
            env={**__import__('os').environ},
        )
        output = r.stdout + r.stderr
        # 解析结论
        passed = '通过 - 策略可用' in output
        marginal = '勉强 -' in output

        # 解析关键指标
        metrics = {}
        for line in output.split('\n'):
            if '净利润:' in line:
                m = re.search(r'[-\$,\d.]+', line.split('净利润:')[1])
                if m:
                    metrics['net_profit'] = m.group().replace(',', '').replace('$', '')
            if '收益率:' in line:
                m = re.search(r'[-\d.]+', line.split('收益率:')[1])
                if m:
                    metrics['roi'] = m.group()
            if '夏普比率:' in line:
                m = re.search(r'[-\d.]+', line.split('夏普比率:')[1])
                if m:
                    metrics['sharpe'] = m.group()
            if '最大回撤:' in line and '(' in line:
                m = re.search(r'([\d.]+)%', line)
                if m:
                    metrics['max_dd_pct'] = m.group(1)
            if '胜率:' in line:
                m = re.search(r'[\d.]+', line.split('胜率:')[1])
                if m:
                    metrics['win_rate'] = m.group()
            if '总交易:' in line:
                m = re.search(r'\d+', line.split('总交易:')[1])
                if m:
                    metrics['trades'] = m.group()

        return {
            'symbol': symbol, 'strategy': strategy,
            'timeframe': timeframe, 'leverage': leverage,
            'passed': passed, 'marginal': marginal,
            'metrics': metrics, 'output': output,
        }
    except subprocess.TimeoutExpired:
        return {
            'symbol': symbol, 'strategy': strategy,
            'timeframe': timeframe, 'leverage': leverage,
            'passed': False, 'marginal': False,
            'metrics': {}, 'output': 'TIMEOUT',
        }
    except Exception as e:
        return {
            'symbol': symbol, 'strategy': strategy,
            'timeframe': timeframe, 'leverage': leverage,
            'passed': False, 'marginal': False,
            'metrics': {}, 'output': str(e),
        }


def main():
    combos = []
    for sym in SYMBOLS:
        for strat in STRATEGIES:
            for tf in TIMEFRAMES:
                for lev in LEVERAGES:
                    combos.append((sym, strat, tf, lev))

    print(f"总共 {len(combos)} 个组合，开始并行回测...\n")

    results = []
    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(run_one, *c): c for c in combos}
        for f in as_completed(futures):
            done += 1
            r = f.result()
            results.append(r)
            tag = 'PASS' if r['passed'] else ('MARGINAL' if r['marginal'] else 'FAIL')
            roi = r['metrics'].get('roi', '?')
            sys.stdout.write(f"\r  [{done}/{len(combos)}] {r['symbol']} {r['strategy']} {r['timeframe']} {r['leverage']}x → {tag} (ROI: {roi}%)    ")
            sys.stdout.flush()

    print('\n')

    # 输出通过的
    passed = [r for r in results if r['passed']]
    marginal = [r for r in results if r['marginal']]

    print(f"{'='*80}")
    print(f"  回测完成: {len(results)} 组合, {len(passed)} 通过, {len(marginal)} 勉强")
    print(f"{'='*80}")

    if passed:
        print(f"\n  === 通过的策略 ===")
        print(f"  {'币种':<12} {'策略':<12} {'周期':<6} {'杠杆':>4} {'净利润':>10} {'ROI':>8} {'夏普':>6} {'回撤':>6} {'胜率':>6} {'交易':>4}")
        print(f"  {'─'*76}")
        passed.sort(key=lambda x: float(x['metrics'].get('roi', '0')), reverse=True)
        for r in passed:
            m = r['metrics']
            print(f"  {r['symbol']:<12} {r['strategy']:<12} {r['timeframe']:<6} {r['leverage']:>3}x "
                  f"${m.get('net_profit','?'):>8} {m.get('roi','?'):>7}% "
                  f"{m.get('sharpe','?'):>5} {m.get('max_dd_pct','?'):>5}% "
                  f"{m.get('win_rate','?'):>5}% {m.get('trades','?'):>4}")

    if marginal:
        print(f"\n  === 勉强通过 ===")
        print(f"  {'币种':<12} {'策略':<12} {'周期':<6} {'杠杆':>4} {'净利润':>10} {'ROI':>8} {'夏普':>6} {'回撤':>6} {'胜率':>6} {'交易':>4}")
        print(f"  {'─'*76}")
        marginal.sort(key=lambda x: float(x['metrics'].get('roi', '0')), reverse=True)
        for r in marginal:
            m = r['metrics']
            print(f"  {r['symbol']:<12} {r['strategy']:<12} {r['timeframe']:<6} {r['leverage']:>3}x "
                  f"${m.get('net_profit','?'):>8} {m.get('roi','?'):>7}% "
                  f"{m.get('sharpe','?'):>5} {m.get('max_dd_pct','?'):>5}% "
                  f"{m.get('win_rate','?'):>5}% {m.get('trades','?'):>4}")

    if not passed and not marginal:
        print("\n  所有策略均未通过")

    print()


if __name__ == '__main__':
    main()
