#!/usr/bin/env python3
"""币安 USDT-M 合约交易接口

支持：开多/开空/平仓、杠杆设置(1x-20x)、限价/市价/止损单
从 .env 读取 BINANCE_API_KEY / BINANCE_API_SECRET
"""

import os
import sys
import ccxt

# ── 手续费常量 ──────────────────────────────────────────────
MAKER_FEE = 0.0002  # 0.02%
TAKER_FEE = 0.0004  # 0.04%

# ── Testnet 开关 ────────────────────────────────────────────
TESTNET = os.environ.get('BINANCE_TESTNET', '').lower() in ('1', 'true', 'yes')


def get_futures_exchange():
    """创建并返回币安 USDT-M 合约 exchange 实例。

    用 fetchMarkets=['linear'] 只加载 USDT-M 合约市场，
    避免访问可能被墙的 dapi (COIN-M) 地址。
    """
    if TESTNET:
        ex = ccxt.binance({
            'apiKey': os.environ.get('BINANCE_TESTNET_API_KEY'),
            'secret': os.environ.get('BINANCE_TESTNET_API_SECRET'),
            'options': {
                'defaultType': 'future',
                'fetchMarkets': ['linear'],
                'fetchCurrencies': False,
            },
        })
        ex.set_sandbox_mode(True)
        return ex

    return ccxt.binance({
        'apiKey': os.environ.get('BINANCE_API_KEY'),
        'secret': os.environ.get('BINANCE_API_SECRET'),
        'options': {
            'defaultType': 'future',
            'fetchMarkets': ['linear'],
            'fetchCurrencies': False,
        },
    })


def set_leverage(exchange, symbol, leverage):
    """设置杠杆倍数 (1-20x)。"""
    if not 1 <= leverage <= 20:
        raise ValueError(f"杠杆倍数须在 1-20 之间，当前: {leverage}")
    resp = exchange.set_leverage(leverage, symbol)
    print(f"  {symbol} 杠杆已设置为 {leverage}x")
    return resp


def set_margin_mode(exchange, symbol, mode='cross'):
    """设置保证金模式: cross (全仓) 或 isolated (逐仓)。"""
    try:
        exchange.set_margin_mode(mode, symbol)
        print(f"  {symbol} 保证金模式: {mode}")
    except ccxt.ExchangeError as e:
        # 如果已经是目标模式，币安会报错，忽略
        if 'No need to change margin type' in str(e):
            pass
        else:
            raise


def estimate_fee(notional, side='taker'):
    """估算手续费。notional = 名义价值 (USDT)。"""
    rate = TAKER_FEE if side == 'taker' else MAKER_FEE
    return notional * rate


# ── 开仓 ───────────────────────────────────────────────────

def open_long(exchange, symbol, amount, price=None, leverage=None):
    """开多。amount = 合约数量。
    price=None → 市价单，price 有值 → 限价单。
    """
    if leverage:
        set_leverage(exchange, symbol, leverage)

    if price:
        order = exchange.create_limit_buy_order(symbol, amount, price)
        print(f"  LONG {symbol} x{amount} @ ${price} (限价)")
    else:
        order = exchange.create_market_buy_order(symbol, amount)
        print(f"  LONG {symbol} x{amount} (市价)")

    return order


def open_short(exchange, symbol, amount, price=None, leverage=None):
    """开空。amount = 合约数量。
    price=None → 市价单，price 有值 → 限价单。
    """
    if leverage:
        set_leverage(exchange, symbol, leverage)

    if price:
        order = exchange.create_limit_sell_order(symbol, amount, price)
        print(f"  SHORT {symbol} x{amount} @ ${price} (限价)")
    else:
        order = exchange.create_market_sell_order(symbol, amount)
        print(f"  SHORT {symbol} x{amount} (市价)")

    return order


# ── 平仓 ───────────────────────────────────────────────────

def close_long(exchange, symbol, amount, price=None):
    """平多仓。用 reduceOnly=True 确保只平仓不反向开仓。"""
    params = {'reduceOnly': True}
    if price:
        order = exchange.create_limit_sell_order(symbol, amount, price, params)
        print(f"  CLOSE LONG {symbol} x{amount} @ ${price} (限价)")
    else:
        order = exchange.create_market_sell_order(symbol, amount, params)
        print(f"  CLOSE LONG {symbol} x{amount} (市价)")
    return order


def close_short(exchange, symbol, amount, price=None):
    """平空仓。用 reduceOnly=True 确保只平仓不反向开仓。"""
    params = {'reduceOnly': True}
    if price:
        order = exchange.create_limit_buy_order(symbol, amount, price, params)
        print(f"  CLOSE SHORT {symbol} x{amount} @ ${price} (限价)")
    else:
        order = exchange.create_market_buy_order(symbol, amount, params)
        print(f"  CLOSE SHORT {symbol} x{amount} (市价)")
    return order


def close_all(exchange, symbol):
    """平掉指定 symbol 的所有仓位。"""
    positions = exchange.fetch_positions([symbol])
    closed = []
    for pos in positions:
        amt = abs(float(pos.get('contracts', 0) or 0))
        if amt == 0:
            continue
        side = pos.get('side')
        if side == 'long':
            order = close_long(exchange, symbol, amt)
        elif side == 'short':
            order = close_short(exchange, symbol, amt)
        else:
            continue
        closed.append(order)
    if not closed:
        print(f"  {symbol} 无持仓")
    return closed


# ── 止损单 ──────────────────────────────────────────────────

def place_stop_loss(exchange, symbol, side, amount, stop_price, close_position=False):
    """挂止损单。

    side: 'buy' (空仓止损) 或 'sell' (多仓止损)
    stop_price: 触发价格
    close_position=True 时忽略 amount，触发后平掉全部仓位
    """
    params = {
        'stopPrice': stop_price,
        'reduceOnly': True,
    }
    if close_position:
        params['closePosition'] = True
        # closePosition 时 quantity 设为 0
        amount = 0

    order = exchange.create_order(
        symbol, 'STOP_MARKET', side, amount, None, params
    )
    direction = '多仓止损' if side == 'sell' else '空仓止损'
    print(f"  STOP LOSS {symbol} {direction} @ ${stop_price} x{amount}")
    return order


def place_take_profit(exchange, symbol, side, amount, stop_price, close_position=False):
    """挂止盈单。

    side: 'buy' (空仓止盈) 或 'sell' (多仓止盈)
    stop_price: 触发价格
    """
    params = {
        'stopPrice': stop_price,
        'reduceOnly': True,
    }
    if close_position:
        params['closePosition'] = True
        amount = 0

    order = exchange.create_order(
        symbol, 'TAKE_PROFIT_MARKET', side, amount, None, params
    )
    direction = '多仓止盈' if side == 'sell' else '空仓止盈'
    print(f"  TAKE PROFIT {symbol} {direction} @ ${stop_price} x{amount}")
    return order


# ── 划转 ───────────────────────────────────────────────────

def transfer_to_futures(exchange, amount, currency='USDT'):
    """从现货账户划转到合约账户。"""
    resp = exchange.transfer(currency, amount, 'spot', 'future')
    print(f"  划转成功: {amount} {currency} 现货 → 合约")
    return resp


def transfer_to_spot(exchange, amount, currency='USDT'):
    """从合约账户划转到现货账户。"""
    resp = exchange.transfer(currency, amount, 'future', 'spot')
    print(f"  划转成功: {amount} {currency} 合约 → 现货")
    return resp


# ── 查询 ───────────────────────────────────────────────────

def get_positions(exchange, symbols=None):
    """获取当前持仓信息。"""
    positions = exchange.fetch_positions(symbols)
    active = [p for p in positions if abs(float(p.get('contracts', 0) or 0)) > 0]
    return active


def show_positions(exchange, symbols=None):
    """打印当前持仓。"""
    positions = get_positions(exchange, symbols)
    if not positions:
        print("  无合约持仓")
        return

    print(f"\n  {'交易对':<14} {'方向':<6} {'数量':>8} {'开仓价':>12} {'标记价':>12} {'未实现盈亏':>12} {'杠杆':>6}")
    print(f"  {'─'*76}")

    for p in positions:
        sym = p.get('symbol', '')
        side = p.get('side', '')
        contracts = float(p.get('contracts', 0) or 0)
        entry = float(p.get('entryPrice', 0) or 0)
        mark = float(p.get('markPrice', 0) or 0)
        pnl = float(p.get('unrealizedPnl', 0) or 0)
        lev = p.get('leverage', '')
        sign = '+' if pnl >= 0 else ''
        print(f"  {sym:<14} {side:<6} {contracts:>8.4f} ${entry:>10.2f} ${mark:>10.2f} {sign}${pnl:>10.4f} {lev:>5}x")
    print()


def show_account(exchange):
    """打印合约账户信息。"""
    balance = exchange.fetch_balance()
    usdt = balance.get('USDT', {})
    total = float(usdt.get('total', 0) or 0)
    free = float(usdt.get('free', 0) or 0)
    used = float(usdt.get('used', 0) or 0)

    print(f"\n  合约账户 (USDT)")
    print(f"  {'─'*30}")
    print(f"  总额:   ${total:,.2f}")
    print(f"  可用:   ${free:,.2f}")
    print(f"  占用:   ${used:,.2f}")
    print()


# ── CLI ────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("用法: futures_exchange.py <命令> [参数]")
        print()
        print("命令:")
        print("  account                          查看合约账户")
        print("  positions [SYMBOL]               查看持仓")
        print("  leverage SYMBOL LEVERAGE          设置杠杆")
        print("  long SYMBOL AMOUNT [PRICE]       开多")
        print("  short SYMBOL AMOUNT [PRICE]      开空")
        print("  close-long SYMBOL AMOUNT [PRICE] 平多")
        print("  close-short SYMBOL AMOUNT [PRICE]平空")
        print("  close-all SYMBOL                 全部平仓")
        print("  transfer AMOUNT                  现货→合约划转")
        print("  transfer AMOUNT to-spot          合约→现货划转")
        print("  stop-loss SYMBOL SIDE AMOUNT PRICE  止损单")
        print("  take-profit SYMBOL SIDE AMOUNT PRICE 止盈单")
        return

    ex = get_futures_exchange()
    cmd = sys.argv[1]

    def sym(idx=2):
        return sys.argv[idx].upper().replace('-', '/')

    if cmd == 'account':
        show_account(ex)

    elif cmd == 'positions':
        symbols = [sym()] if len(sys.argv) > 2 else None
        show_positions(ex, symbols)

    elif cmd == 'leverage':
        set_leverage(ex, sym(), int(sys.argv[3]))

    elif cmd == 'long':
        price = float(sys.argv[4]) if len(sys.argv) > 4 else None
        lev = int(sys.argv[5]) if len(sys.argv) > 5 else None
        open_long(ex, sym(), float(sys.argv[3]), price, lev)

    elif cmd == 'short':
        price = float(sys.argv[4]) if len(sys.argv) > 4 else None
        lev = int(sys.argv[5]) if len(sys.argv) > 5 else None
        open_short(ex, sym(), float(sys.argv[3]), price, lev)

    elif cmd == 'close-long':
        price = float(sys.argv[4]) if len(sys.argv) > 4 else None
        close_long(ex, sym(), float(sys.argv[3]), price)

    elif cmd == 'close-short':
        price = float(sys.argv[4]) if len(sys.argv) > 4 else None
        close_short(ex, sym(), float(sys.argv[3]), price)

    elif cmd == 'close-all':
        close_all(ex, sym())

    elif cmd == 'transfer':
        # transfer AMOUNT [to-spot]
        amount = float(sys.argv[2])
        if len(sys.argv) > 3 and sys.argv[3] == 'to-spot':
            transfer_to_spot(ex, amount)
        else:
            transfer_to_futures(ex, amount)

    elif cmd == 'stop-loss':
        # stop-loss SYMBOL SIDE AMOUNT PRICE
        place_stop_loss(ex, sym(), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]))

    elif cmd == 'take-profit':
        # take-profit SYMBOL SIDE AMOUNT PRICE
        place_take_profit(ex, sym(), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]))

    else:
        print(f"未知命令: {cmd}")


if __name__ == '__main__':
    main()
