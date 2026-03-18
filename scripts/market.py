#!/usr/bin/env python3
"""币安行情监控"""

import sys
from datetime import datetime
from exchange import get_exchange

WATCHLIST = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT']

# scan 排除的稳定币和低流动性标签
SKIP_QUOTES = {'USDC', 'BUSD', 'TUSD', 'FDUSD', 'DAI', 'EUR', 'GBP', 'TRY', 'BRL', 'ARS'}
SKIP_BASES = {'USDC', 'BUSD', 'TUSD', 'FDUSD', 'DAI', 'UST', 'USDP'}


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


def calc_rsi(closes, period=14):
    """计算 RSI"""
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


def scan(top_n=30):
    """扫描币安 USDT 交易对，按24h振幅排序，输出高波动币种"""
    exchange = get_exchange()

    print(f"\n  正在扫描币安全量 USDT 交易对...")
    tickers = exchange.fetch_tickers()

    # 筛选 USDT 交易对，排除稳定币
    candidates = []
    for symbol, t in tickers.items():
        if '/USDT' not in symbol:
            continue
        base = symbol.split('/')[0]
        if base in SKIP_BASES:
            continue
        # 需要有基本数据
        if not t.get('last') or not t.get('high') or not t.get('low') or not t.get('quoteVolume'):
            continue
        if t['last'] <= 0 or t['low'] <= 0:
            continue

        vol_usd = t['quoteVolume'] or 0
        if vol_usd < 1_000_000:  # 成交额 < 1M 跳过
            continue

        # 24h 振幅 = (high - low) / low * 100
        amplitude = (t['high'] - t['low']) / t['low'] * 100
        change_pct = t.get('percentage') or 0

        candidates.append({
            'symbol': symbol,
            'price': t['last'],
            'change': change_pct,
            'amplitude': amplitude,
            'volume': vol_usd,
            'high': t['high'],
            'low': t['low'],
        })

    # 按振幅排序
    candidates.sort(key=lambda x: x['amplitude'], reverse=True)
    top = candidates[:top_n]

    # 获取 RSI（用 1h K线）
    print(f"  正在计算 RSI（前 {len(top)} 个币）...")
    for c in top:
        try:
            ohlcv = exchange.fetch_ohlcv(c['symbol'], '1h', limit=20)
            closes = [candle[4] for candle in ohlcv]
            c['rsi'] = calc_rsi(closes)
        except Exception:
            c['rsi'] = None

    # 输出
    print(f"\n{'='*90}")
    print(f"  币安高波动扫描  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  (成交额>1M, 按振幅排序)")
    print(f"{'='*90}")
    print(f"  {'#':<4} {'交易对':<14} {'价格':>12} {'24h涨跌':>9} {'振幅':>8} {'成交额':>10} {'RSI':>6}  {'信号'}")
    print(f"  {'-'*80}")

    for i, c in enumerate(top, 1):
        price = format_price(c['price'])
        change = format_change(c['change'])
        amp = f"{c['amplitude']:.1f}%"
        vol = f"{c['volume'] / 1e6:.1f}M"
        rsi_str = f"{c['rsi']:.0f}" if c['rsi'] is not None else '-'

        # 信号判断
        signals = []
        if c['amplitude'] >= 8 and c['volume'] >= 10_000_000:
            signals.append('GRID')  # 适合网格
        if c['rsi'] is not None:
            if c['rsi'] < 30:
                signals.append('RSI-BUY')  # 超卖
            elif c['rsi'] > 70:
                signals.append('RSI-SELL')  # 超买
        signal = ' '.join(signals) if signals else ''

        print(f"  {i:<4} {c['symbol']:<14} {price:>12} {change:>9} {amp:>8} {vol:>10} {rsi_str:>6}  {signal}")

    print()

    # 汇总推荐
    grid_picks = [c for c in top if c['amplitude'] >= 8 and c['volume'] >= 10_000_000]
    rsi_buys = [c for c in top if c.get('rsi') is not None and c['rsi'] < 30]
    rsi_sells = [c for c in top if c.get('rsi') is not None and c['rsi'] > 70]

    print(f"  --- 推荐汇总 ---")
    if grid_picks:
        names = ', '.join(c['symbol'] for c in grid_picks[:10])
        print(f"  网格候选({len(grid_picks)}): {names}")
    if rsi_buys:
        items = ', '.join(f"{c['symbol']}(RSI={c['rsi']:.0f})" for c in rsi_buys)
        print(f"  RSI超卖({len(rsi_buys)}): {items}")
    if rsi_sells:
        items = ', '.join(f"{c['symbol']}(RSI={c['rsi']:.0f})" for c in rsi_sells)
        print(f"  RSI超买({len(rsi_sells)}): {items}")
    if not grid_picks and not rsi_buys and not rsi_sells:
        print(f"  暂无明显信号")
    print()

    return {'grid': grid_picks, 'rsi_buy': rsi_buys, 'rsi_sell': rsi_sells}


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
    elif cmd == 'scan':
        top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        scan(top_n)
    else:
        print("用法: market [watch|account|klines|scan] [参数]")


if __name__ == '__main__':
    main()
