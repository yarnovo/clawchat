#!/usr/bin/env python3
"""网格交易策略"""

import json
import time
from datetime import datetime
from pathlib import Path
from exchange import get_exchange

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def state_file(symbol):
    safe = symbol.replace('/', '-').lower()
    return DATA_DIR / f"grid_{safe}.json"


def calc_grid_lines(lower, upper, grids):
    step = (upper - lower) / grids
    return [lower + i * step for i in range(grids + 1)]


def load_state(symbol='BTC/USDT'):
    f = state_file(symbol)
    if f.exists():
        return json.loads(f.read_text())
    return None


def save_state(state):
    f = state_file(state['symbol'])
    f.write_text(json.dumps(state, indent=2, default=str))


def init_state(symbol, lower, upper, grids, amount):
    lines = calc_grid_lines(lower, upper, grids)
    return {
        'symbol': symbol, 'lower': lower, 'upper': upper,
        'grids': grids, 'amount_per_grid': amount, 'grid_lines': lines,
        'active': True, 'trades': [], 'total_profit': 0,
        'created_at': datetime.now().isoformat(),
        'last_price': None, 'last_check': None,
    }


def run_once(state, exchange, dry_run=False):
    symbol = state['symbol']
    lines = state['grid_lines']
    ticker = exchange.fetch_ticker(symbol)
    price = ticker['last']
    last_price = state.get('last_price')
    state['last_price'] = price
    state['last_check'] = datetime.now().isoformat()

    if last_price is None:
        print(f"  初始化: {symbol} = ${price:,.2f}")
        save_state(state)
        return

    for line in lines:
        if last_price >= line > price:
            amount_qty = state['amount_per_grid'] / price
            trade = {'side': 'buy', 'price': price, 'grid_line': line,
                     'amount_usdt': state['amount_per_grid'], 'amount_qty': amount_qty,
                     'time': datetime.now().isoformat()}
            if not dry_run:
                try:
                    order = exchange.create_market_buy_order(symbol, amount_qty)
                    trade['order_id'] = order['id']
                    trade['filled'] = True
                except Exception as e:
                    trade['error'] = str(e)
                    trade['filled'] = False
            else:
                trade['dry_run'] = True
                trade['filled'] = True
            state['trades'].append(trade)
            print(f"  BUY {symbol} @ ${price:,.2f} (grid ${line:,.2f}) ${state['amount_per_grid']}")

        elif last_price <= line < price:
            amount_qty = state['amount_per_grid'] / price
            trade = {'side': 'sell', 'price': price, 'grid_line': line,
                     'amount_usdt': state['amount_per_grid'], 'amount_qty': amount_qty,
                     'time': datetime.now().isoformat()}
            if not dry_run:
                try:
                    order = exchange.create_market_sell_order(symbol, amount_qty)
                    trade['order_id'] = order['id']
                    trade['filled'] = True
                except Exception as e:
                    trade['error'] = str(e)
                    trade['filled'] = False
            else:
                trade['dry_run'] = True
                trade['filled'] = True
            state['trades'].append(trade)
            profit = state['amount_per_grid'] * (price - line) / line
            state['total_profit'] += profit
            print(f"  SELL {symbol} @ ${price:,.2f} (grid ${line:,.2f}) profit ${profit:.2f}")

    save_state(state)


def backtest(symbol, lower, upper, grids, amount, days):
    exchange = get_exchange()
    lines = calc_grid_lines(lower, upper, grids)

    print(f"\n{'='*60}")
    print(f"  网格回测  {symbol}")
    print(f"  区间: ${lower:,.2f} - ${upper:,.2f}  网格数: {grids}  每格: ${amount}")
    print(f"  回测天数: {days}")
    print(f"{'='*60}")

    ohlcv = exchange.fetch_ohlcv(symbol, '1h', limit=days * 24)
    buy_count = sell_count = 0
    total_profit = 0.0

    for i in range(1, len(ohlcv)):
        last_close = ohlcv[i - 1][4]
        close = ohlcv[i][4]
        for line in lines:
            if last_close >= line > close:
                buy_count += 1
            elif last_close <= line < close:
                sell_count += 1
                total_profit += amount * (close - line) / line

    total_trades = buy_count + sell_count
    total_fees = total_trades * amount * 0.001
    net_profit = total_profit - total_fees

    print(f"\n  回测结果:")
    print(f"  {'─'*40}")
    print(f"  买入: {buy_count}  卖出: {sell_count}  总: {total_trades}")
    print(f"  毛利: ${total_profit:,.2f}  手续费: ${total_fees:,.2f}  净利: ${net_profit:,.2f}")
    print(f"  投入: ${amount * grids:,.2f}  收益率: {net_profit / (amount * grids) * 100:.2f}%")
    print()


def show_status(symbol=None):
    if symbol:
        symbols = [symbol]
    else:
        symbols = [f.stem.replace('grid_', '').replace('-', '/').upper()
                   for f in DATA_DIR.glob("grid_*.json")]
    if not symbols:
        print("  没有运行中的网格策略")
        return
    for sym in symbols:
        state = load_state(sym)
        if not state:
            continue
        def fmt(v):
            return f"${v:,.2f}" if v >= 1 else f"${v:.4f}"
        lp = fmt(state['last_price']) if state['last_price'] else '?'
        print(f"\n  {state['symbol']}  {fmt(state['lower'])}-{fmt(state['upper'])}  "
              f"x{state['grids']}  ${state['amount_per_grid']}/格")
        print(f"  价格: {lp}  交易: {len(state['trades'])}笔  "
              f"利润: ${state['total_profit']:,.2f}  {'运行中' if state['active'] else '已停止'}")
    print()


def run_loop(symbol, lower, upper, grids, amount, interval=60, dry_run=False):
    exchange = get_exchange()
    state = load_state(symbol)
    if not state or state['symbol'] != symbol:
        state = init_state(symbol, lower, upper, grids, amount)
        save_state(state)

    print(f"\n  网格启动  {symbol}  ${lower:,.0f}-${upper:,.0f}  x{grids}  "
          f"${amount}/格  {'模拟' if dry_run else '实盘'}")

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
    parser = argparse.ArgumentParser(description='网格交易')
    sub = parser.add_subparsers(dest='cmd')

    p = sub.add_parser('run')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--lower', type=float, required=True)
    p.add_argument('--upper', type=float, required=True)
    p.add_argument('--grids', type=int, default=10)
    p.add_argument('--amount', type=float, default=50)
    p.add_argument('--interval', type=int, default=60)
    p.add_argument('--dry-run', action='store_true')

    p = sub.add_parser('backtest')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--lower', type=float, required=True)
    p.add_argument('--upper', type=float, required=True)
    p.add_argument('--grids', type=int, default=10)
    p.add_argument('--amount', type=float, default=50)
    p.add_argument('--days', type=int, default=30)

    p = sub.add_parser('status')
    p.add_argument('--symbol', default=None)
    args = parser.parse_args()

    if args.cmd == 'run':
        run_loop(args.symbol, args.lower, args.upper, args.grids, args.amount,
                 args.interval, args.dry_run)
    elif args.cmd == 'backtest':
        backtest(args.symbol, args.lower, args.upper, args.grids, args.amount, args.days)
    elif args.cmd == 'status':
        show_status(args.symbol)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
