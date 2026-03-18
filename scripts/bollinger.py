#!/usr/bin/env python3
"""
布林带策略

原理：价格触碰下轨买入，触碰上轨卖出。
区间是动态的，跟着价格自动调整，不会像网格那样跑出区间就废了。

用法：
  python bollinger.py run --symbol BTC/USDT --period 20 --std 2 --amount 10 --dry-run
  python bollinger.py status
  python bollinger.py backtest --symbol ANKR/USDT --days 7
"""

import json
import time
import math
from datetime import datetime
from pathlib import Path
from exchange import get_exchange

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def state_file(symbol):
    safe = symbol.replace('/', '-').lower()
    return DATA_DIR / f"boll_{safe}.json"


def load_state(symbol):
    f = state_file(symbol)
    return json.loads(f.read_text()) if f.exists() else None


def save_state(state):
    f = state_file(state['symbol'])
    f.write_text(json.dumps(state, indent=2, default=str))


def calc_bollinger(closes, period=20, num_std=2):
    if len(closes) < period:
        return None, None, None
    window = closes[-period:]
    mean = sum(window) / period
    variance = sum((x - mean) ** 2 for x in window) / period
    std = math.sqrt(variance)
    upper = mean + num_std * std
    lower = mean - num_std * std
    return upper, mean, lower


def init_state(symbol, period, num_std, amount):
    return {
        'symbol': symbol,
        'period': period,
        'num_std': num_std,
        'amount': amount,
        'active': True,
        'position': None,
        'trades': [],
        'total_profit': 0,
        'created_at': datetime.now().isoformat(),
        'last_price': None,
        'last_upper': None,
        'last_lower': None,
        'last_mid': None,
        'last_check': None,
    }


def run_once(state, exchange, dry_run=False):
    symbol = state['symbol']
    period = state['period']

    ohlcv = exchange.fetch_ohlcv(symbol, '5m', limit=period + 5)
    closes = [c[4] for c in ohlcv]
    price = closes[-1]

    upper, mid, lower = calc_bollinger(closes, period, state['num_std'])
    state['last_price'] = price
    state['last_upper'] = upper
    state['last_lower'] = lower
    state['last_mid'] = mid
    state['last_check'] = datetime.now().isoformat()

    if upper is None:
        save_state(state)
        return

    # 触碰下轨 → 买入
    if price <= lower and state['position'] is None:
        qty = state['amount'] / price
        trade = {
            'side': 'buy', 'price': price, 'qty': qty,
            'band': 'lower', 'lower': lower, 'upper': upper,
            'amount': state['amount'],
            'time': datetime.now().isoformat(),
        }
        if not dry_run:
            try:
                order = exchange.create_market_buy_order(symbol, qty)
                trade['order_id'] = order['id']
                trade['filled'] = True
            except Exception as e:
                trade['error'] = str(e)
                trade['filled'] = False
        else:
            trade['dry_run'] = True
            trade['filled'] = True

        if trade.get('filled'):
            state['position'] = {'price': price, 'qty': qty}
        state['trades'].append(trade)
        print(f"  BUY {symbol} @ ${price:.6f}  下轨=${lower:.6f}")

    # 触碰上轨 → 卖出
    elif price >= upper and state['position'] is not None:
        pos = state['position']
        trade = {
            'side': 'sell', 'price': price, 'qty': pos['qty'],
            'band': 'upper', 'lower': lower, 'upper': upper,
            'amount': price * pos['qty'],
            'time': datetime.now().isoformat(),
        }
        if not dry_run:
            try:
                order = exchange.create_market_sell_order(symbol, pos['qty'])
                trade['order_id'] = order['id']
                trade['filled'] = True
            except Exception as e:
                trade['error'] = str(e)
                trade['filled'] = False
        else:
            trade['dry_run'] = True
            trade['filled'] = True

        if trade.get('filled'):
            profit = (price - pos['price']) * pos['qty']
            trade['profit'] = profit
            state['total_profit'] += profit
            state['position'] = None
        state['trades'].append(trade)
        print(f"  SELL {symbol} @ ${price:.6f}  上轨=${upper:.6f}  profit ${profit:.4f}")

    save_state(state)


def backtest(symbol, period, num_std, amount, days):
    exchange = get_exchange()
    ohlcv = exchange.fetch_ohlcv(symbol, '5m', limit=days * 24 * 12)
    closes = [c[4] for c in ohlcv]

    print(f"\n{'='*60}")
    print(f"  布林带回测  {symbol}")
    print(f"  周期: {period}  标准差: {num_std}  每笔: ${amount}")
    print(f"  回测天数: {days}  K线数: {len(closes)}")
    print(f"{'='*60}")

    position = None
    buy_count = sell_count = 0
    total_profit = 0

    for i in range(period, len(closes)):
        price = closes[i]
        upper, mid, lower = calc_bollinger(closes[:i+1], period, num_std)
        if upper is None:
            continue

        if price <= lower and position is None:
            position = {'price': price, 'qty': amount / price}
            buy_count += 1
        elif price >= upper and position is not None:
            profit = (price - position['price']) * position['qty']
            total_profit += profit
            position = None
            sell_count += 1

    total_trades = buy_count + sell_count
    fees = total_trades * amount * 0.001
    net = total_profit - fees

    print(f"\n  回测结果:")
    print(f"  {'─'*40}")
    print(f"  买入: {buy_count}  卖出: {sell_count}  总: {total_trades}")
    print(f"  毛利: ${total_profit:,.4f}  手续费: ${fees:,.4f}  净利: ${net:,.4f}")
    if amount > 0:
        print(f"  投入: ${amount}  收益率: {net / amount * 100:.2f}%")
    if position:
        print(f"  (当前持仓中，未平仓)")
    print()


def show_status(symbol=None):
    if symbol:
        symbols = [symbol]
    else:
        symbols = [f.stem.replace('boll_', '').replace('-', '/').upper()
                   for f in DATA_DIR.glob("boll_*.json")]
    if not symbols:
        print("  没有运行中的布林带策略")
        return
    for sym in symbols:
        state = load_state(sym)
        if not state:
            continue
        def fmt(v):
            return f"${v:,.2f}" if v and v >= 1 else f"${v:.6f}" if v else '?'
        pos = '持仓' if state['position'] else '空仓'
        print(f"\n  {state['symbol']}  BOLL({state['period']},{state['num_std']}x)  ${state['amount']}/笔")
        print(f"  价格: {fmt(state['last_price'])}  上轨: {fmt(state['last_upper'])}  下轨: {fmt(state['last_lower'])}  {pos}  交易: {len(state['trades'])}笔  利润: ${state['total_profit']:,.4f}")
    print()


def run_loop(symbol, period, num_std, amount, interval=60, dry_run=False):
    exchange = get_exchange()
    state = load_state(symbol)
    if not state or state['symbol'] != symbol:
        state = init_state(symbol, period, num_std, amount)
        save_state(state)

    print(f"\n  布林带启动  {symbol}  BOLL({period},{num_std}x)  ${amount}/笔  {'模拟' if dry_run else '实盘'}")

    while state['active']:
        try:
            run_once(state, exchange, dry_run=dry_run)
            time.sleep(interval)
        except KeyboardInterrupt:
            state['active'] = False
            save_state(state)
            print("\n  已停止")
            break
        except Exception as e:
            print(f"  错误: {e}")
            time.sleep(interval)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='布林带策略')
    sub = parser.add_subparsers(dest='cmd')

    p = sub.add_parser('run')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--period', type=int, default=20)
    p.add_argument('--std', type=float, default=2)
    p.add_argument('--amount', type=float, default=10)
    p.add_argument('--interval', type=int, default=60)
    p.add_argument('--dry-run', action='store_true')

    p = sub.add_parser('backtest')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--period', type=int, default=20)
    p.add_argument('--std', type=float, default=2)
    p.add_argument('--amount', type=float, default=10)
    p.add_argument('--days', type=int, default=7)

    p = sub.add_parser('status')
    p.add_argument('--symbol', default=None)

    args = parser.parse_args()
    if args.cmd == 'run':
        run_loop(args.symbol, args.period, args.std, args.amount, args.interval, args.dry_run)
    elif args.cmd == 'backtest':
        backtest(args.symbol, args.period, args.std, args.amount, args.days)
    elif args.cmd == 'status':
        show_status(args.symbol)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
