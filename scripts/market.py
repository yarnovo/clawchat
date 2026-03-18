#!/usr/bin/env python3
"""币安行情监控"""

import sys
from datetime import datetime
from exchange import get_exchange

WATCHLIST = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']


def format_price(price):
    if price >= 1000:
        return f"${price:,.2f}"
    elif price >= 1:
        return f"${price:.4f}"
    else:
        return f"${price:.6f}"


def format_change(pct):
    sign = '+' if pct >= 0 else ''
    return f"{sign}{pct:.2f}%"


def watch(symbols=None):
    exchange = get_exchange()
    symbols = symbols or WATCHLIST
    tickers = exchange.fetch_tickers(symbols)

    print(f"\n{'='*60}")
    print(f"  币安行情  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    print(f"  {'交易对':<12} {'价格':>12} {'24h涨跌':>10} {'24h成交量':>14}")
    print(f"  {'-'*48}")

    for symbol in symbols:
        t = tickers.get(symbol)
        if not t:
            continue
        price = format_price(t['last'])
        change = format_change(t['percentage'] or 0)
        vol = f"{(t['quoteVolume'] or 0) / 1e6:.1f}M"
        print(f"  {symbol:<12} {price:>12} {change:>10} {vol:>14}")
    print()


def account():
    exchange = get_exchange()
    balance = exchange.fetch_balance()
    print(f"\n  账户余额:")
    print(f"  {'-'*30}")
    has_balance = False
    for asset, amt in balance['total'].items():
        if amt > 0:
            free = balance['free'].get(asset, 0)
            locked = balance['used'].get(asset, 0)
            print(f"  {asset:<8} 总计: {amt:<14} 可用: {free:<14} 冻结: {locked}")
            has_balance = True
    if not has_balance:
        print("  (无持仓)")
    print()


def klines(symbol='BTC/USDT', timeframe='1h', limit=10):
    exchange = get_exchange()
    ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    print(f"\n  {symbol} {timeframe} K线 (最近{limit}根)")
    print(f"  {'时间':<18} {'开':>10} {'高':>10} {'低':>10} {'收':>10} {'量':>10}")
    print(f"  {'-'*70}")
    for candle in ohlcv:
        ts = datetime.fromtimestamp(candle[0] / 1000).strftime('%m-%d %H:%M')
        o, h, l, c, v = candle[1:]
        print(f"  {ts:<18} {o:>10.2f} {h:>10.2f} {l:>10.2f} {c:>10.2f} {v:>10.2f}")
    print()


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'watch'
    if cmd == 'watch':
        symbols = sys.argv[2:] if len(sys.argv) > 2 else None
        if symbols:
            symbols = [s.upper().replace('-', '/') for s in symbols]
        watch(symbols)
    elif cmd == 'account':
        account()
    elif cmd == 'klines':
        symbol = sys.argv[2] if len(sys.argv) > 2 else 'BTC/USDT'
        tf = sys.argv[3] if len(sys.argv) > 3 else '1h'
        limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10
        klines(symbol.upper().replace('-', '/'), tf, limit)
    else:
        print("用法: market [watch|account|klines] [参数]")


if __name__ == '__main__':
    main()
