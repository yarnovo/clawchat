#!/usr/bin/env python3
"""从交易所拉真实成交记录计算 P&L"""

import sys
from datetime import datetime, timedelta
from clawchat.exchange import get_futures_exchange, get_positions


def fetch_recent_trades(exchange, symbol=None, since_hours=24):
    """获取最近的成交记录"""
    since = int((datetime.now() - timedelta(hours=since_hours)).timestamp() * 1000)
    trades = []

    if symbol:
        symbols = [symbol.upper().replace('-', '/')]
    else:
        # 获取有持仓的 symbol
        positions = get_positions(exchange)
        symbols = list(set(p['symbol'] for p in positions))
        if not symbols:
            # 无持仓时查主要币种
            symbols = ['BTC/USDT', 'ETH/USDT']

    for sym in symbols:
        try:
            t = exchange.fetch_my_trades(sym, since=since, limit=100)
            trades.extend(t)
        except Exception as e:
            print(f"  获取 {sym} 成交记录失败: {e}")

    trades.sort(key=lambda x: x['timestamp'])
    return trades


def calc_pnl(trades):
    """计算已实现 P&L"""
    total_pnl = 0
    total_fee = 0
    by_symbol = {}

    for t in trades:
        sym = t['symbol']
        fee = float(t.get('fee', {}).get('cost', 0) or 0)
        cost = float(t.get('cost', 0) or 0)
        side = t.get('side', '')

        total_fee += fee

        if sym not in by_symbol:
            by_symbol[sym] = {'buy_cost': 0, 'sell_cost': 0, 'fee': 0, 'trades': 0}

        by_symbol[sym]['fee'] += fee
        by_symbol[sym]['trades'] += 1

        if side == 'buy':
            by_symbol[sym]['buy_cost'] += cost
        else:
            by_symbol[sym]['sell_cost'] += cost

    return by_symbol, total_fee


def show_pnl(exchange, symbol=None, hours=24):
    """显示 P&L 报告"""
    # 1. 成交记录
    trades = fetch_recent_trades(exchange, symbol, hours)

    print(f"\n{'='*60}")
    print(f"  P&L 报告  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  (最近 {hours}h)")
    print(f"{'='*60}")

    if trades:
        by_symbol, total_fee = calc_pnl(trades)
        print(f"\n  已成交记录 ({len(trades)} 笔):")
        print(f"  {'交易对':<14} {'买入':>12} {'卖出':>12} {'手续费':>10} {'笔数':>6}")
        print(f"  {'-'*56}")
        for sym, data in by_symbol.items():
            print(f"  {sym:<14} ${data['buy_cost']:>10.2f} ${data['sell_cost']:>10.2f} ${data['fee']:>8.4f} {data['trades']:>5}")
        print(f"\n  总手续费: ${total_fee:.4f}")
    else:
        print(f"\n  最近 {hours}h 无成交记录")

    # 2. 当前持仓未实现 P&L
    positions = get_positions(exchange)
    if positions:
        print(f"\n  当前持仓:")
        print(f"  {'交易对':<14} {'方向':<6} {'数量':>8} {'开仓价':>12} {'标记价':>12} {'未实现盈亏':>12}")
        print(f"  {'-'*68}")
        total_unrealized = 0
        for p in positions:
            sym = p.get('symbol', '')
            side = p.get('side', '')
            contracts = float(p.get('contracts', 0) or 0)
            entry = float(p.get('entryPrice', 0) or 0)
            mark = float(p.get('markPrice', 0) or 0)
            pnl = float(p.get('unrealizedPnl', 0) or 0)
            total_unrealized += pnl
            sign = '+' if pnl >= 0 else ''
            print(f"  {sym:<14} {side:<6} {contracts:>8.4f} ${entry:>10.2f} ${mark:>10.2f} {sign}${pnl:>10.4f}")
        sign = '+' if total_unrealized >= 0 else ''
        print(f"\n  未实现总计: {sign}${total_unrealized:.4f}")
    else:
        print(f"\n  无持仓")

    print()


def main():
    exchange = get_futures_exchange()
    symbol = None
    hours = 24

    if len(sys.argv) > 1:
        symbol = sys.argv[1].upper().replace('-', '/')
    if len(sys.argv) > 2:
        hours = int(sys.argv[2])

    show_pnl(exchange, symbol, hours)


if __name__ == '__main__':
    main()
