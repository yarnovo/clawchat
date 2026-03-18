#!/usr/bin/env python3
"""实时交易引擎

接收币安 WebSocket 1h K 线，每根收盘时调用策略 on_candle()，
产生 buy/sell 信号后通过 futures_exchange 下单。

风控规则：
  - 止损 ATR * 2
  - 止盈 ATR * 3
  - 最大仓位 50% 资金

用法：
  python hft_engine.py --symbol BTC/USDT --strategy trend --leverage 5 --dry-run
  python hft_engine.py --symbol XRP/USDT --strategy rsi --leverage 5
  python hft_engine.py --symbol ETH/USDT --strategy ema2050 --leverage 3
"""

import argparse
import json
import logging
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

from backtest import (
    TrendFollowStrategy, RSIStrategy, EMA2050TrendStrategy,
    BreakoutStrategy, VWAPRevertStrategy, ScalpingStrategy, _atr,
)
from futures_exchange import (
    get_futures_exchange, set_leverage, set_margin_mode,
    open_long, open_short, close_long, close_short,
    place_stop_loss, place_take_profit, TAKER_FEE,
)
from ws_feed import WsFeed

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# 风控参数
ATR_SL_MULT = 2.0    # 止损 = ATR * 2
ATR_TP_MULT = 3.0    # 止盈 = ATR * 3
MAX_POSITION_PCT = 0.5  # 最大仓位 50%

STRATEGIES = {
    'trend': TrendFollowStrategy,
    'rsi': RSIStrategy,
    'ema2050': EMA2050TrendStrategy,
    'breakout': BreakoutStrategy,
    'vwap': VWAPRevertStrategy,
    'scalping': ScalpingStrategy,
}


# ── 状态管理 ─────────────────────────────────────────────

def state_file(symbol):
    safe = symbol.replace('/', '-').lower()
    return DATA_DIR / f"hft_{safe}.json"


def load_state(symbol):
    f = state_file(symbol)
    if f.exists():
        return json.loads(f.read_text())
    return None


def save_state(state):
    f = state_file(state['symbol'])
    f.write_text(json.dumps(state, indent=2, default=str))


def init_state(symbol, strategy_name, leverage, capital):
    return {
        'symbol': symbol,
        'strategy': strategy_name,
        'leverage': leverage,
        'capital': capital,
        'balance': capital,
        'position': None,   # {'side', 'entry', 'qty', 'margin', 'sl', 'tp'}
        'trades': [],
        'total_profit': 0,
        'candles_processed': 0,
        'created_at': datetime.now().isoformat(),
        'last_signal': None,
        'last_price': None,
        'last_update': None,
    }


# ── 交易引擎 ─────────────────────────────────────────────

class HFTEngine:
    """实时交易引擎"""

    def __init__(self, symbol, strategy, leverage, capital, dry_run=True):
        self.symbol = symbol
        self.ws_symbol = symbol.replace('/', '').upper()  # BTCUSDT
        self.strategy = strategy
        self.leverage = leverage
        self.dry_run = dry_run
        self.exchange = None if dry_run else get_futures_exchange()

        # 历史 K 线数据（用于 ATR 计算）
        self.highs = []
        self.lows = []
        self.closes = []

        # 加载或初始化状态
        self.state = load_state(symbol)
        if self.state and self.state['strategy'] == type(strategy).__name__:
            logger.info("恢复状态: %s 笔交易, 余额 $%.2f",
                        len(self.state['trades']), self.state['balance'])
        else:
            self.state = init_state(symbol, type(strategy).__name__,
                                    leverage, capital)
            save_state(self.state)

        # 预热：拉历史 K 线喂给策略
        self._warmup()

        # 设置杠杆和保证金模式
        if not dry_run and self.exchange:
            try:
                set_leverage(self.exchange, symbol, leverage)
                set_margin_mode(self.exchange, symbol, 'cross')
            except Exception as e:
                logger.warning("设置杠杆/保证金模式失败: %s", e)

    def _warmup(self):
        """拉历史 K 线预热策略指标"""
        logger.info("正在拉取历史 K 线预热策略...")
        try:
            from futures_exchange import get_futures_exchange
            ex = get_futures_exchange()
            ohlcv = ex.fetch_ohlcv(self.symbol, '1h', limit=200)
            for candle in ohlcv:
                _, o, h, l, c, v = candle
                self.highs.append(h)
                self.lows.append(l)
                self.closes.append(c)
                self.strategy.on_candle(o, h, l, c, v)
            logger.info("预热完成: %d 根历史 K 线", len(ohlcv))
        except Exception as e:
            logger.error("预热失败: %s", e)

    def on_kline(self, payload):
        """处理 WebSocket K 线消息"""
        if payload.get('e') != 'kline':
            return

        k = payload.get('k', {})
        sym = k.get('s', '')
        if sym != self.ws_symbol:
            return

        # 只在 K 线收盘时触发（k.x = true 表示 K 线已关闭）
        is_closed = k.get('x', False)
        if not is_closed:
            return

        o = float(k.get('o', 0))
        h = float(k.get('h', 0))
        l = float(k.get('l', 0))
        c = float(k.get('c', 0))
        v = float(k.get('q', 0))  # 成交额

        self.highs.append(h)
        self.lows.append(l)
        self.closes.append(c)

        ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logger.info("[%s] K线收盘 %s O=%.2f H=%.2f L=%.2f C=%.2f",
                    ts, self.symbol, o, h, l, c)

        # 调用策略
        signal = self.strategy.on_candle(o, h, l, c, v)
        self.state['candles_processed'] += 1
        self.state['last_price'] = c
        self.state['last_update'] = ts

        if signal:
            self.state['last_signal'] = signal
            logger.info("策略信号: %s", signal)
            self._execute_signal(signal, c)
        else:
            # 检查持仓的止损止盈
            self._check_risk(c)

        save_state(self.state)

    def _calc_atr(self):
        """计算当前 ATR"""
        return _atr(self.highs, self.lows, self.closes, 14)

    def _execute_signal(self, signal, price):
        """执行交易信号"""
        pos = self.state['position']
        atr = self._calc_atr()
        if atr is None or atr == 0:
            logger.warning("ATR 无法计算，跳过信号")
            return

        if signal == 'buy':
            if pos and pos['side'] == 'long':
                return  # 已经做多，忽略
            if pos and pos['side'] == 'short':
                self._close_position(price, 'buy')  # 先平空
            if self.state['balance'] > 0:
                self._open_position('long', price, atr)

        elif signal == 'sell':
            if pos and pos['side'] == 'short':
                return  # 已经做空，忽略
            if pos and pos['side'] == 'long':
                self._close_position(price, 'sell')  # 先平多
            if self.state['balance'] > 0:
                self._open_position('short', price, atr)

    def _open_position(self, side, price, atr):
        """开仓"""
        margin = self.state['balance'] * MAX_POSITION_PCT
        notional = margin * self.leverage
        qty = notional / price
        fee = notional * TAKER_FEE

        if side == 'long':
            sl = price - atr * ATR_SL_MULT
            tp = price + atr * ATR_TP_MULT
        else:
            sl = price + atr * ATR_SL_MULT
            tp = price - atr * ATR_TP_MULT

        mode = "模拟" if self.dry_run else "实盘"
        direction = "LONG" if side == 'long' else "SHORT"
        logger.info("  [%s] %s %s @ $%.2f  qty=%.6f  margin=$%.2f  SL=$%.2f  TP=$%.2f",
                    mode, direction, self.symbol, price, qty, margin, sl, tp)

        # 实盘下单
        order_id = None
        if not self.dry_run and self.exchange:
            try:
                if side == 'long':
                    order = open_long(self.exchange, self.symbol, qty)
                else:
                    order = open_short(self.exchange, self.symbol, qty)
                order_id = order.get('id')

                # 挂止损止盈单
                sl_side = 'sell' if side == 'long' else 'buy'
                tp_side = sl_side
                place_stop_loss(self.exchange, self.symbol, sl_side, qty, sl)
                place_take_profit(self.exchange, self.symbol, tp_side, qty, tp)

            except Exception as e:
                logger.error("下单失败: %s", e)
                return

        self.state['balance'] -= margin + fee
        self.state['position'] = {
            'side': side,
            'entry': price,
            'qty': qty,
            'margin': margin,
            'fee': fee,
            'sl': sl,
            'tp': tp,
            'order_id': order_id,
            'open_time': datetime.now().isoformat(),
        }

    def _close_position(self, price, close_side):
        """平仓"""
        pos = self.state['position']
        if not pos:
            return

        # 计算盈亏
        if pos['side'] == 'long':
            pnl = (price - pos['entry']) * pos['qty']
        else:
            pnl = (pos['entry'] - price) * pos['qty']

        fee = price * pos['qty'] * TAKER_FEE
        net_pnl = pnl - fee
        total_fees = pos['fee'] + fee

        mode = "模拟" if self.dry_run else "实盘"
        sign = '+' if net_pnl >= 0 else ''
        logger.info("  [%s] CLOSE %s %s @ $%.2f  PnL=%s$%.2f  fees=$%.4f",
                    mode, pos['side'].upper(), self.symbol, price,
                    sign, net_pnl, total_fees)

        # 实盘平仓
        if not self.dry_run and self.exchange:
            try:
                if pos['side'] == 'long':
                    close_long(self.exchange, self.symbol, pos['qty'])
                else:
                    close_short(self.exchange, self.symbol, pos['qty'])
            except Exception as e:
                logger.error("平仓失败: %s", e)

        self.state['balance'] += pos['margin'] + net_pnl
        self.state['total_profit'] += net_pnl
        self.state['trades'].append({
            'side': pos['side'],
            'entry': pos['entry'],
            'exit': price,
            'qty': pos['qty'],
            'pnl': net_pnl,
            'gross_pnl': pnl,
            'fees': total_fees,
            'open_time': pos['open_time'],
            'close_time': datetime.now().isoformat(),
        })
        self.state['position'] = None

    def _check_risk(self, price):
        """检查持仓的止损止盈（策略层面的风控补充）"""
        pos = self.state['position']
        if not pos:
            return

        if pos['side'] == 'long':
            if price <= pos['sl']:
                logger.info("触发止损 (LONG SL=$%.2f, 当前=$%.2f)", pos['sl'], price)
                self._close_position(price, 'sell')
            elif price >= pos['tp']:
                logger.info("触发止盈 (LONG TP=$%.2f, 当前=$%.2f)", pos['tp'], price)
                self._close_position(price, 'sell')
        else:
            if price >= pos['sl']:
                logger.info("触发止损 (SHORT SL=$%.2f, 当前=$%.2f)", pos['sl'], price)
                self._close_position(price, 'buy')
            elif price <= pos['tp']:
                logger.info("触发止盈 (SHORT TP=$%.2f, 当前=$%.2f)", pos['tp'], price)
                self._close_position(price, 'buy')

    def show_status(self):
        """打印当前状态"""
        s = self.state
        pos = s['position']
        mode = "模拟" if self.dry_run else "实盘"
        print(f"\n  {'='*60}")
        print(f"  HFT 引擎状态  [{mode}]")
        print(f"  {'='*60}")
        print(f"  交易对:     {s['symbol']}")
        print(f"  策略:       {s['strategy']}")
        print(f"  杠杆:       {s['leverage']}x")
        print(f"  余额:       ${s['balance']:,.2f}")
        print(f"  总利润:     ${s['total_profit']:,.2f}")
        print(f"  总交易:     {len(s['trades'])}笔")
        print(f"  已处理K线:  {s['candles_processed']}根")
        if pos:
            side = pos['side'].upper()
            unrealized = (s['last_price'] - pos['entry']) * pos['qty'] \
                if pos['side'] == 'long' \
                else (pos['entry'] - s['last_price']) * pos['qty']
            print(f"  持仓:       {side} @ ${pos['entry']:,.2f}  "
                  f"SL=${pos['sl']:,.2f}  TP=${pos['tp']:,.2f}  "
                  f"浮盈=${unrealized:,.2f}")
        else:
            print(f"  持仓:       空仓")
        if s['last_price']:
            print(f"  最新价:     ${s['last_price']:,.2f}")
        print(f"  最后信号:   {s.get('last_signal', '-')}")
        print(f"  {'='*60}\n")


# ── 主入口 ─────────────────────────────────────────────────

def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description='实时交易引擎')
    parser.add_argument('--symbol', default='BTC/USDT', help='交易对')
    parser.add_argument('--strategy', default='trend',
                        choices=list(STRATEGIES.keys()),
                        help='策略名称')
    parser.add_argument('--leverage', type=int, default=5, help='杠杆倍数')
    parser.add_argument('--capital', type=float, default=200, help='初始资金 USDT')
    parser.add_argument('--dry-run', action='store_true', help='模拟模式')
    args = parser.parse_args()

    symbol = args.symbol.upper().replace('-', '/')
    ws_symbol = symbol.replace('/', '').upper()
    strategy = STRATEGIES[args.strategy]()

    mode = "模拟" if args.dry_run else "实盘"
    print(f"\n  {'='*60}")
    print(f"  HFT 引擎启动  [{mode}]")
    print(f"  {'='*60}")
    print(f"  交易对:   {symbol}")
    print(f"  策略:     {args.strategy}")
    print(f"  杠杆:     {args.leverage}x")
    print(f"  资金:     ${args.capital:,.2f}")
    print(f"  风控:     SL=ATR*{ATR_SL_MULT}  TP=ATR*{ATR_TP_MULT}  "
          f"最大仓位={MAX_POSITION_PCT*100:.0f}%")
    print(f"  K线周期:  1h")
    print(f"  {'='*60}\n")

    engine = HFTEngine(
        symbol=symbol,
        strategy=strategy,
        leverage=args.leverage,
        capital=args.capital,
        dry_run=args.dry_run,
    )

    # WebSocket 订阅 K 线
    feed = WsFeed(
        symbols=[ws_symbol],
        streams=["kline"],
        kline_interval="1h",
    )
    feed.on_raw(engine.on_kline)
    feed.start()

    # 优雅退出
    def shutdown(signum, frame):
        print(f"\n  正在停止...")
        feed.stop()
        engine.show_status()
        save_state(engine.state)
        print("  状态已保存，已退出")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    engine.show_status()
    print("  等待 K 线收盘信号...\n")

    # 保活 + 定期状态保存
    while True:
        time.sleep(60)
        save_state(engine.state)


if __name__ == '__main__':
    main()
