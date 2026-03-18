#!/usr/bin/env python3
"""
RSI 策略

原理：RSI < 超卖线买入，RSI > 超买线卖出。
适合抓超跌反弹，跟网格互补。

用法：
  python rsi.py run --symbol BTC/USDT --period 14 --oversold 30 --overbought 70 --amount 20 --dry-run
  python rsi.py status
  python rsi.py backtest --symbol BTC/USDT --days 30
"""

import json
import time
from datetime import datetime
from pathlib import Path
from exchange import get_exchange

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def state_file(symbol):
    safe = symbol.replace('/', '-').lower()
    return DATA_DIR / f"rsi_{safe}.json"


def load_state(symbol):
    f = state_file(symbol)
    return json.loads(f.read_text()) if f.exists() else None


def save_state(state):
    f = state_file(state['symbol'])
    f.write_text(json.dumps(state, indent=2, default=str))


def calc_rsi(closes, period=14):
    if len(closes) < period + 1:
        return None
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    recent = deltas[-period:]
    gains = [d for d in recent if d > 0]
    losses = [-d for d in recent if d < 0]
    avg_gain = sum(gains) / period if gains else 0
    avg_loss = sum(losses) / period if losses else 0
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def init_state(symbol, period, oversold, overbought, amount):
    return {
        'symbol': symbol,
        'period': period,
        'oversold': oversold,
        'overbought': overbought,
        'amount': amount,
        'active': True,
        'position': None,  # None=空仓, {'price':x, 'qty':y}=持仓
        'trades': [],
        'total_profit': 0,
        'created_at': datetime.now().isoformat(),
        'last_rsi': None,
        'last_price': None,
        'last_check': None,
    }


def run_once(state, exchange, dry_run=False):
    symbol = state['symbol']
    period = state['period']

    ohlcv = exchange.fetch_ohlcv(symbol, '1h', limit=period + 10)
    closes = [c[4] for c in ohlcv]
    price = closes[-1]
    rsi = calc_rsi(closes, period)

    state['last_price'] = price
    state['last_rsi'] = rsi
    state['last_check'] = datetime.now().isoformat()

    if rsi is None:
        save_state(state)
        return

    # 超卖 → 买入
    if rsi < state['oversold'] and state['position'] is None:
        qty = state['amount'] / price
        trade = {
            'side': 'buy', 'price': price, 'qty': qty,
            'rsi': rsi, 'amount': state['amount'],
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
        print(f"  BUY {symbol} @ ${price:,.4f}  RSI={rsi:.1f}  ${state['amount']}")

    # 超买 → 卖出
    elif rsi > state['overbought'] and state['position'] is not None:
        pos = state['position']
        trade = {
            'side': 'sell', 'price': price, 'qty': pos['qty'],
            'rsi': rsi, 'amount': price * pos['qty'],
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
        print(f"  SELL {symbol} @ ${price:,.4f}  RSI={rsi:.1f}  profit ${profit:.4f}")

    save_state(state)


def backtest(symbol, period, oversold, overbought, amount, days):
    exchange = get_exchange()
    ohlcv = exchange.fetch_ohlcv(symbol, '1h', limit=days * 24)
    closes = [c[4] for c in ohlcv]

    print(f"\n{'='*60}")
    print(f"  RSI 回测  {symbol}")
    print(f"  周期: {period}  超卖: {oversold}  超买: {overbought}  每笔: ${amount}")
    print(f"  回测天数: {days}")
    print(f"{'='*60}")

    position = None
    buy_count = sell_count = 0
    total_profit = 0

    for i in range(period + 1, len(closes)):
        rsi = calc_rsi(closes[:i + 1], period)
        price = closes[i]
        if rsi is None:
            continue

        if rsi < oversold and position is None:
            position = {'price': price, 'qty': amount / price}
            buy_count += 1

        elif rsi > overbought and position is not None:
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
        symbols = [f.stem.replace('rsi_', '').replace('-', '/').upper()
                   for f in DATA_DIR.glob("rsi_*.json")]
    if not symbols:
        print("  没有运行中的 RSI 策略")
        return
    for sym in symbols:
        state = load_state(sym)
        if not state:
            continue
        def fmt(v):
            return f"${v:,.2f}" if v >= 1 else f"${v:.4f}"
        lp = fmt(state['last_price']) if state['last_price'] else '?'
        rsi = f"{state['last_rsi']:.1f}" if state['last_rsi'] else '?'
        pos = '持仓' if state['position'] else '空仓'
        print(f"\n  {state['symbol']}  RSI({state['period']})  超卖<{state['oversold']}  超买>{state['overbought']}  ${state['amount']}/笔")
        print(f"  价格: {lp}  RSI: {rsi}  {pos}  交易: {len(state['trades'])}笔  利润: ${state['total_profit']:,.4f}")
    print()


def run_loop(symbol, period, oversold, overbought, amount, interval=300, dry_run=False):
    exchange = get_exchange()
    state = load_state(symbol)
    if not state or state['symbol'] != symbol:
        state = init_state(symbol, period, oversold, overbought, amount)
        save_state(state)

    print(f"\n  RSI 启动  {symbol}  RSI({period})  <{oversold} 买  >{overbought} 卖  "
          f"${amount}/笔  {'模拟' if dry_run else '实盘'}")

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
    parser = argparse.ArgumentParser(description='RSI 策略')
    sub = parser.add_subparsers(dest='cmd')

    p = sub.add_parser('run')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--period', type=int, default=14)
    p.add_argument('--oversold', type=float, default=30)
    p.add_argument('--overbought', type=float, default=70)
    p.add_argument('--amount', type=float, default=20)
    p.add_argument('--interval', type=int, default=300)
    p.add_argument('--dry-run', action='store_true')

    p = sub.add_parser('backtest')
    p.add_argument('--symbol', default='BTC/USDT')
    p.add_argument('--period', type=int, default=14)
    p.add_argument('--oversold', type=float, default=30)
    p.add_argument('--overbought', type=float, default=70)
    p.add_argument('--amount', type=float, default=20)
    p.add_argument('--days', type=int, default=30)

    p = sub.add_parser('status')
    p.add_argument('--symbol', default=None)

    args = parser.parse_args()

    if args.cmd == 'run':
        run_loop(args.symbol, args.period, args.oversold, args.overbought,
                 args.amount, args.interval, args.dry_run)
    elif args.cmd == 'backtest':
        backtest(args.symbol, args.period, args.oversold, args.overbought,
                 args.amount, args.days)
    elif args.cmd == 'status':
        show_status(args.symbol)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
