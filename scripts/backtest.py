#!/usr/bin/env python3
"""
通用回测框架

核心规则：
  - 合约手续费：maker 0.02%, taker 0.04%（默认按 taker 算）
  - 滑点：0.05%
  - 输出真实指标：净利润、夏普比率、最大回撤、胜率、盈亏比

支持策略接口：
  strategy.on_candle(open, high, low, close, volume) → 'buy' / 'sell' / None

用法：
  python backtest.py --symbol BTC/USDT --strategy scalping --days 7 --leverage 5 --capital 200
  python backtest.py --symbol ETH/USDT --strategy rsi --days 30 --timeframe 1h
  python backtest.py --symbol BTC/USDT --strategy bollinger --days 14 --leverage 3
"""

import argparse
import math
import sys
from datetime import datetime
from exchange import get_exchange


# ─── 费用常量 ───

MAKER_FEE = 0.0002   # 0.02%
TAKER_FEE = 0.0004   # 0.04%
SLIPPAGE = 0.0005     # 0.05%


# ─── 策略基类 ───

class Strategy:
    """策略接口。子类实现 on_candle 方法。"""

    def on_candle(self, open, high, low, close, volume):
        """返回 'buy' / 'sell' / None"""
        raise NotImplementedError


# ─── 内置策略 ───

class ScalpingStrategy(Strategy):
    """简单剥头皮：EMA 交叉 + 成交量过滤"""

    def __init__(self, fast=5, slow=20, vol_mult=1.5):
        self.fast = fast
        self.slow = slow
        self.vol_mult = vol_mult
        self.closes = []
        self.volumes = []

    def _ema(self, data, period):
        if len(data) < period:
            return None
        k = 2 / (period + 1)
        ema = sum(data[:period]) / period
        for v in data[period:]:
            ema = v * k + ema * (1 - k)
        return ema

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.volumes.append(volume)
        if len(self.closes) < self.slow + 1:
            return None

        fast_now = self._ema(self.closes, self.fast)
        slow_now = self._ema(self.closes, self.slow)
        fast_prev = self._ema(self.closes[:-1], self.fast)
        slow_prev = self._ema(self.closes[:-1], self.slow)

        if fast_now is None or slow_now is None or fast_prev is None or slow_prev is None:
            return None

        avg_vol = sum(self.volumes[-self.slow:]) / self.slow
        vol_ok = volume > avg_vol * self.vol_mult

        # 快线上穿慢线 + 放量 → 买
        if fast_prev <= slow_prev and fast_now > slow_now and vol_ok:
            return 'buy'
        # 快线下穿慢线 → 卖
        if fast_prev >= slow_prev and fast_now < slow_now:
            return 'sell'
        return None


class RSIStrategy(Strategy):
    """RSI 超买超卖"""

    def __init__(self, period=14, oversold=30, overbought=70):
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
        self.closes = []

    def _rsi(self):
        if len(self.closes) < self.period + 1:
            return None
        deltas = [self.closes[i] - self.closes[i - 1]
                  for i in range(1, len(self.closes))]
        recent = deltas[-self.period:]
        gains = [d for d in recent if d > 0]
        losses = [-d for d in recent if d < 0]
        avg_gain = sum(gains) / self.period if gains else 0
        avg_loss = sum(losses) / self.period if losses else 0
        if avg_loss == 0:
            return 100
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        rsi = self._rsi()
        if rsi is None:
            return None
        if rsi < self.oversold:
            return 'buy'
        if rsi > self.overbought:
            return 'sell'
        return None


class BollingerStrategy(Strategy):
    """布林带策略：碰下轨买，碰上轨卖"""

    def __init__(self, period=20, num_std=2):
        self.period = period
        self.num_std = num_std
        self.closes = []

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        if len(self.closes) < self.period:
            return None
        window = self.closes[-self.period:]
        mean = sum(window) / self.period
        variance = sum((x - mean) ** 2 for x in window) / self.period
        std = math.sqrt(variance)
        upper = mean + self.num_std * std
        lower = mean - self.num_std * std

        if close <= lower:
            return 'buy'
        if close >= upper:
            return 'sell'
        return None


class GridStrategy(Strategy):
    """网格策略：价格穿越网格线时交易"""

    def __init__(self, grids=20, lookback=100):
        self.grids = grids
        self.lookback = lookback
        self.closes = []
        self.lines = None

    def _update_grid(self):
        window = self.closes[-self.lookback:]
        lo = min(window)
        hi = max(window)
        margin = (hi - lo) * 0.05
        lo -= margin
        hi += margin
        step = (hi - lo) / self.grids
        self.lines = [lo + i * step for i in range(self.grids + 1)]

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        if len(self.closes) < 2:
            return None
        if self.lines is None and len(self.closes) >= min(self.lookback, 50):
            self._update_grid()
        if self.lines is None:
            return None

        prev = self.closes[-2]
        # 下穿网格线 → 买
        for line in self.lines:
            if prev >= line > close:
                return 'buy'
        # 上穿网格线 → 卖
        for line in self.lines:
            if prev <= line < close:
                return 'sell'
        return None


STRATEGIES = {
    'scalping': ScalpingStrategy,
    'rsi': RSIStrategy,
    'bollinger': BollingerStrategy,
    'grid': GridStrategy,
}


# ─── 回测引擎 ───

def fetch_candles(symbol, timeframe, days):
    """从币安拉历史 K 线数据"""
    exchange = get_exchange()
    candles_per_day = {
        '1m': 1440, '5m': 288, '15m': 96,
        '1h': 24, '4h': 6, '1d': 1,
    }
    cpd = candles_per_day.get(timeframe, 24)
    total = days * cpd

    # 币安单次最多 1000 根，需要分页
    all_candles = []
    since = None
    while len(all_candles) < total:
        limit = min(1000, total - len(all_candles))
        batch = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=limit)
        if not batch:
            break
        all_candles.extend(batch)
        # 下一批从最后一根的下一个时间戳开始
        since = batch[-1][0] + 1
        if len(batch) < limit:
            break

    return all_candles[-total:] if len(all_candles) > total else all_candles


def run_backtest(candles, strategy, capital, leverage, position_pct,
                 maker_fee=MAKER_FEE, taker_fee=TAKER_FEE, slippage=SLIPPAGE):
    """
    执行回测。

    参数:
      candles: OHLCV 列表 [[ts, o, h, l, c, v], ...]
      strategy: Strategy 实例
      capital: 初始资金 (USDT)
      leverage: 杠杆倍数
      position_pct: 每笔仓位占可用资金的比例 (0-1)
      maker_fee/taker_fee: 手续费率
      slippage: 滑点率
    """
    balance = capital
    position = None  # {'side': 'long', 'entry': price, 'qty': qty, 'margin': margin}
    trades = []      # 已平仓交易记录
    equity_curve = []

    for candle in candles:
        ts, o, h, l, c, v = candle
        signal = strategy.on_candle(o, h, l, c, v)

        # 记录权益
        if position:
            if position['side'] == 'long':
                unrealized = (c - position['entry']) * position['qty']
            else:
                unrealized = (position['entry'] - c) * position['qty']
            equity = balance + position['margin'] + unrealized
        else:
            equity = balance
        equity_curve.append(equity)

        if signal == 'buy':
            if position is None:
                # 开多：taker 吃单 + 滑点
                entry = c * (1 + slippage)
                margin = balance * position_pct
                notional = margin * leverage
                qty = notional / entry
                fee = notional * taker_fee
                balance -= margin + fee
                position = {
                    'side': 'long', 'entry': entry, 'qty': qty,
                    'margin': margin, 'open_fee': fee, 'open_time': ts,
                }
            elif position['side'] == 'short':
                # 平空
                exit_price = c * (1 + slippage)
                pnl = (position['entry'] - exit_price) * position['qty']
                fee = exit_price * position['qty'] * taker_fee
                net_pnl = pnl - fee
                balance += position['margin'] + net_pnl
                trades.append({
                    'side': 'short',
                    'entry': position['entry'], 'exit': exit_price,
                    'qty': position['qty'], 'pnl': net_pnl,
                    'gross_pnl': pnl,
                    'fees': position['open_fee'] + fee,
                    'open_time': position['open_time'], 'close_time': ts,
                })
                position = None

        elif signal == 'sell':
            if position is None:
                # 开空：taker + 滑点（卖出价更低）
                entry = c * (1 - slippage)
                margin = balance * position_pct
                notional = margin * leverage
                qty = notional / entry
                fee = notional * taker_fee
                balance -= margin + fee
                position = {
                    'side': 'short', 'entry': entry, 'qty': qty,
                    'margin': margin, 'open_fee': fee, 'open_time': ts,
                }
            elif position['side'] == 'long':
                # 平多
                exit_price = c * (1 - slippage)
                pnl = (exit_price - position['entry']) * position['qty']
                fee = exit_price * position['qty'] * taker_fee
                net_pnl = pnl - fee
                balance += position['margin'] + net_pnl
                trades.append({
                    'side': 'long',
                    'entry': position['entry'], 'exit': exit_price,
                    'qty': position['qty'], 'pnl': net_pnl,
                    'gross_pnl': pnl,
                    'fees': position['open_fee'] + fee,
                    'open_time': position['open_time'], 'close_time': ts,
                })
                position = None

        # 爆仓检查
        if position and balance <= 0:
            trades.append({
                'side': position['side'],
                'entry': position['entry'], 'exit': c,
                'qty': position['qty'], 'pnl': -position['margin'],
                'gross_pnl': -position['margin'],
                'fees': position['open_fee'],
                'open_time': position['open_time'], 'close_time': ts,
                'liquidated': True,
            })
            balance = 0
            position = None
            break

    # 如果还有持仓，按最后价格平仓
    if position and candles:
        last_c = candles[-1][4]
        if position['side'] == 'long':
            exit_price = last_c * (1 - slippage)
            pnl = (exit_price - position['entry']) * position['qty']
        else:
            exit_price = last_c * (1 + slippage)
            pnl = (position['entry'] - exit_price) * position['qty']
        fee = exit_price * position['qty'] * taker_fee
        net_pnl = pnl - fee
        balance += position['margin'] + net_pnl
        trades.append({
            'side': position['side'],
            'entry': position['entry'], 'exit': exit_price,
            'qty': position['qty'], 'pnl': net_pnl,
            'gross_pnl': pnl,
            'fees': position['open_fee'] + fee,
            'open_time': position['open_time'],
            'close_time': candles[-1][0],
            'force_closed': True,
        })
        position = None

    return {
        'trades': trades,
        'equity_curve': equity_curve,
        'final_balance': balance,
        'initial_capital': capital,
    }


# ─── 指标计算 ───

def calc_metrics(result, timeframe):
    """计算回测指标"""
    trades = result['trades']
    equity = result['equity_curve']
    capital = result['initial_capital']
    final = result['final_balance']

    # 基础
    net_profit = final - capital
    roi = (net_profit / capital) * 100 if capital > 0 else 0
    total_trades = len(trades)

    if total_trades == 0:
        return {
            'net_profit': 0, 'roi': 0, 'total_trades': 0,
            'win_rate': 0, 'profit_factor': 0, 'sharpe': 0,
            'max_drawdown': 0, 'max_drawdown_pct': 0,
            'avg_win': 0, 'avg_loss': 0, 'expectancy': 0,
            'total_fees': 0, 'final_balance': final,
        }

    # 胜率
    wins = [t for t in trades if t['pnl'] > 0]
    losses = [t for t in trades if t['pnl'] <= 0]
    win_rate = len(wins) / total_trades * 100

    # 平均盈亏
    avg_win = sum(t['pnl'] for t in wins) / len(wins) if wins else 0
    avg_loss = abs(sum(t['pnl'] for t in losses) / len(losses)) if losses else 0

    # 盈亏比
    profit_factor = avg_win / avg_loss if avg_loss > 0 else float('inf')

    # 期望值
    expectancy = sum(t['pnl'] for t in trades) / total_trades

    # 总手续费
    total_fees = sum(t['fees'] for t in trades)

    # 最大回撤
    peak = equity[0] if equity else capital
    max_dd = 0
    max_dd_pct = 0
    for e in equity:
        if e > peak:
            peak = e
        dd = peak - e
        dd_pct = dd / peak * 100 if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
            max_dd_pct = dd_pct

    # 夏普比率（年化）
    # 计算每根 K 线的收益率
    periods_per_year = {
        '1m': 525600, '5m': 105120, '15m': 35040,
        '1h': 8760, '4h': 2190, '1d': 365,
    }
    ppy = periods_per_year.get(timeframe, 8760)

    if len(equity) > 1:
        returns = [(equity[i] - equity[i - 1]) / equity[i - 1]
                   for i in range(1, len(equity)) if equity[i - 1] > 0]
        if returns:
            mean_r = sum(returns) / len(returns)
            std_r = math.sqrt(sum((r - mean_r) ** 2 for r in returns) / len(returns))
            sharpe = (mean_r / std_r) * math.sqrt(ppy) if std_r > 0 else 0
        else:
            sharpe = 0
    else:
        sharpe = 0

    return {
        'net_profit': net_profit,
        'roi': roi,
        'total_trades': total_trades,
        'wins': len(wins),
        'losses': len(losses),
        'win_rate': win_rate,
        'avg_win': avg_win,
        'avg_loss': avg_loss,
        'profit_factor': profit_factor,
        'expectancy': expectancy,
        'total_fees': total_fees,
        'sharpe': sharpe,
        'max_drawdown': max_dd,
        'max_drawdown_pct': max_dd_pct,
        'final_balance': final,
    }


# ─── 报告输出 ───

def print_report(symbol, strategy_name, timeframe, days, leverage, capital,
                 position_pct, metrics, num_candles):
    """输出完整回测报告"""
    m = metrics
    print(f"\n{'='*65}")
    print(f"  回测报告")
    print(f"{'='*65}")
    print(f"  交易对:     {symbol}")
    print(f"  策略:       {strategy_name}")
    print(f"  时间周期:   {timeframe}  回测天数: {days}  K线数: {num_candles}")
    print(f"  初始资金:   ${capital:,.2f}")
    print(f"  杠杆倍数:   {leverage}x")
    print(f"  仓位比例:   {position_pct * 100:.0f}%")
    print(f"  手续费:     taker {TAKER_FEE*100:.2f}%  maker {MAKER_FEE*100:.2f}%")
    print(f"  滑点:       {SLIPPAGE*100:.2f}%")

    print(f"\n  {'─'*55}")
    print(f"  资金")
    print(f"  {'─'*55}")
    print(f"  最终余额:   ${m['final_balance']:,.2f}")
    print(f"  净利润:     ${m['net_profit']:,.2f}")
    print(f"  收益率:     {m['roi']:.2f}%")
    print(f"  总手续费:   ${m['total_fees']:,.2f}")

    print(f"\n  {'─'*55}")
    print(f"  交易")
    print(f"  {'─'*55}")
    print(f"  总交易:     {m['total_trades']}笔")
    print(f"  盈利:       {m.get('wins', 0)}笔")
    print(f"  亏损:       {m.get('losses', 0)}笔")
    print(f"  胜率:       {m['win_rate']:.1f}%")
    print(f"  平均盈利:   ${m['avg_win']:,.2f}")
    print(f"  平均亏损:   ${m['avg_loss']:,.2f}")
    print(f"  盈亏比:     {m['profit_factor']:.2f}")
    print(f"  期望值:     ${m['expectancy']:,.2f}")

    print(f"\n  {'─'*55}")
    print(f"  风险")
    print(f"  {'─'*55}")
    print(f"  夏普比率:   {m['sharpe']:.2f}")
    print(f"  最大回撤:   ${m['max_drawdown']:,.2f}  ({m['max_drawdown_pct']:.2f}%)")

    # 结论
    print(f"\n  {'─'*55}")
    if m['net_profit'] > 0 and m['sharpe'] > 1 and m['max_drawdown_pct'] < 20:
        verdict = "通过 - 策略可用"
    elif m['net_profit'] > 0:
        verdict = "勉强 - 盈利但风险指标不理想"
    else:
        verdict = "不通过 - 策略亏损"
    print(f"  结论:       {verdict}")
    print(f"{'='*65}\n")


# ─── 主入口 ───

def main():
    parser = argparse.ArgumentParser(description='通用回测框架')
    parser.add_argument('--symbol', default='BTC/USDT', help='交易对')
    parser.add_argument('--strategy', default='scalping',
                        choices=list(STRATEGIES.keys()),
                        help='策略名称')
    parser.add_argument('--days', type=int, default=7, help='回测天数')
    parser.add_argument('--timeframe', default='5m',
                        help='K线周期 (1m/5m/15m/1h/4h/1d)')
    parser.add_argument('--leverage', type=int, default=1, help='杠杆倍数')
    parser.add_argument('--capital', type=float, default=200, help='初始资金 USDT')
    parser.add_argument('--position', type=float, default=0.5,
                        help='每笔仓位占可用资金比例 (0-1)')

    args = parser.parse_args()

    symbol = args.symbol.upper().replace('-', '/')
    strategy_name = args.strategy
    strategy = STRATEGIES[strategy_name]()

    print(f"\n  正在拉取 {symbol} {args.timeframe} K线数据 ({args.days}天)...")
    candles = fetch_candles(symbol, args.timeframe, args.days)
    if not candles:
        print("  错误: 无法获取 K 线数据")
        sys.exit(1)
    print(f"  获取到 {len(candles)} 根 K 线")

    print(f"  正在回测 [{strategy_name}] 策略...")
    result = run_backtest(
        candles, strategy,
        capital=args.capital,
        leverage=args.leverage,
        position_pct=args.position,
    )

    metrics = calc_metrics(result, args.timeframe)
    print_report(
        symbol, strategy_name, args.timeframe, args.days,
        args.leverage, args.capital, args.position,
        metrics, len(candles),
    )


if __name__ == '__main__':
    main()
