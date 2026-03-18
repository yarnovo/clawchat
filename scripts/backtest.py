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
  python backtest.py --symbol BTC/USDT --strategy trend --days 7 --leverage 5 --capital 200
  python backtest.py --symbol ETH/USDT --strategy breakout --days 30 --timeframe 4h
  python backtest.py --symbol BTC/USDT --strategy macd --days 14 --leverage 3 --timeframe 1h
"""

import argparse
import math
import sys
import time
from datetime import datetime
from futures_exchange import get_futures_exchange


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

# ─── 工具函数 ───

def _ema(data, period):
    """计算 EMA"""
    if len(data) < period:
        return None
    k = 2 / (period + 1)
    ema = sum(data[:period]) / period
    for v in data[period:]:
        ema = v * k + ema * (1 - k)
    return ema


def _ema_series(data, period):
    """计算 EMA 序列，返回与 data 等长的列表（前 period-1 个为 None）"""
    if len(data) < period:
        return [None] * len(data)
    k = 2 / (period + 1)
    result = [None] * (period - 1)
    ema = sum(data[:period]) / period
    result.append(ema)
    for v in data[period:]:
        ema = v * k + ema * (1 - k)
        result.append(ema)
    return result


def _rsi(closes, period=14):
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


def _atr(highs, lows, closes, period=14):
    """计算 ATR (Average True Range)"""
    if len(closes) < period + 1:
        return None
    trs = []
    for i in range(1, len(closes)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        trs.append(tr)
    if len(trs) < period:
        return None
    return sum(trs[-period:]) / period


# ─── 内置策略 ───

class TrendFollowStrategy(Strategy):
    """
    趋势跟踪策略（推荐 1h/4h 级别）

    原理：
    - EMA 21/55 判断趋势方向
    - RSI 过滤：只在趋势方向上顺势开仓
    - ATR 动态止损/止盈：止损 1.5x ATR，止盈 3x ATR
    - 避免在震荡区间频繁交易

    设计目标：低频、高盈亏比、顺趋势
    """

    def __init__(self, fast_ema=21, slow_ema=55, rsi_period=14,
                 atr_period=14, atr_sl=1.5, atr_tp=3.0):
        self.fast_ema = fast_ema
        self.slow_ema = slow_ema
        self.rsi_period = rsi_period
        self.atr_period = atr_period
        self.atr_sl = atr_sl
        self.atr_tp = atr_tp
        self.closes = []
        self.highs = []
        self.lows = []
        # 持仓追踪（策略内部用于止损止盈判断）
        self._pos = None  # {'side': 'long'/'short', 'entry': price, 'sl': price, 'tp': price}

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        n = len(self.closes)
        if n < self.slow_ema + 1:
            return None

        # 计算指标
        fast = _ema(self.closes, self.fast_ema)
        slow = _ema(self.closes, self.slow_ema)
        fast_prev = _ema(self.closes[:-1], self.fast_ema)
        slow_prev = _ema(self.closes[:-1], self.slow_ema)
        rsi = _rsi(self.closes, self.rsi_period)
        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)

        if any(v is None for v in [fast, slow, fast_prev, slow_prev, rsi, atr]):
            return None

        # 如果有持仓，检查止损/止盈
        if self._pos:
            if self._pos['side'] == 'long':
                if close <= self._pos['sl'] or close >= self._pos['tp']:
                    self._pos = None
                    return 'sell'
            else:
                if close >= self._pos['sl'] or close <= self._pos['tp']:
                    self._pos = None
                    return 'buy'
            return None

        # 开仓条件：EMA 交叉 + RSI 确认
        # 做多：快线上穿慢线 + RSI > 45（不是超卖反弹，是趋势确认）
        if fast_prev <= slow_prev and fast > slow and rsi > 45 and rsi < 75:
            self._pos = {
                'side': 'long', 'entry': close,
                'sl': close - atr * self.atr_sl,
                'tp': close + atr * self.atr_tp,
            }
            return 'buy'

        # 做空：快线下穿慢线 + RSI < 55
        if fast_prev >= slow_prev and fast < slow and rsi < 55 and rsi > 25:
            self._pos = {
                'side': 'short', 'entry': close,
                'sl': close + atr * self.atr_sl,
                'tp': close - atr * self.atr_tp,
            }
            return 'sell'

        return None


class BreakoutStrategy(Strategy):
    """
    突破策略（推荐 1h/4h 级别）

    原理：
    - 价格突破 N 周期高点 → 做多
    - 价格跌破 N 周期低点 → 做空
    - 用 ATR 过滤假突破（突破幅度需 > 0.3x ATR）
    - ATR 移动止损（宽松：3x ATR，给趋势空间）

    设计目标：抓大波段，错过开头没关系，抓住中间
    """

    def __init__(self, lookback=48, atr_period=14, atr_filter=0.3,
                 trail_atr=3.0):
        self.lookback = lookback
        self.atr_period = atr_period
        self.atr_filter = atr_filter
        self.trail_atr = trail_atr
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None  # {'side', 'entry', 'trail_stop'}

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        n = len(self.closes)
        if n < self.lookback + 1:
            return None

        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)
        if atr is None or atr == 0:
            return None

        # 过去 N 根 K 线的高低点（不含当前）
        prev_highs = self.highs[-(self.lookback + 1):-1]
        prev_lows = self.lows[-(self.lookback + 1):-1]
        highest = max(prev_highs)
        lowest = min(prev_lows)

        # 持仓中：移动止损
        if self._pos:
            if self._pos['side'] == 'long':
                # 更新移动止损（只上移不下移）
                new_stop = close - atr * self.trail_atr
                if new_stop > self._pos['trail_stop']:
                    self._pos['trail_stop'] = new_stop
                if close <= self._pos['trail_stop']:
                    self._pos = None
                    return 'sell'
            else:
                new_stop = close + atr * self.trail_atr
                if new_stop < self._pos['trail_stop']:
                    self._pos['trail_stop'] = new_stop
                if close >= self._pos['trail_stop']:
                    self._pos = None
                    return 'buy'
            return None

        # 向上突破 + 突破幅度 > ATR * filter
        if close > highest and (close - highest) > atr * self.atr_filter:
            self._pos = {
                'side': 'long', 'entry': close,
                'trail_stop': close - atr * self.trail_atr,
            }
            return 'buy'

        # 向下突破
        if close < lowest and (lowest - close) > atr * self.atr_filter:
            self._pos = {
                'side': 'short', 'entry': close,
                'trail_stop': close + atr * self.trail_atr,
            }
            return 'sell'

        return None


class MACDTrendStrategy(Strategy):
    """
    MACD 趋势策略（推荐 1h/4h 级别）

    原理：
    - MACD 柱状图由负转正 → 做多
    - MACD 柱状图由正转负 → 做空
    - 用 EMA 200 过滤：只在大趋势方向上交易
    - ATR 止损

    设计目标：只做大趋势方向的回调入场，极低频
    """

    def __init__(self, fast=12, slow=26, signal=9, trend_ema=200,
                 atr_period=14, atr_sl=2.0):
        self.fast = fast
        self.slow = slow
        self.signal_period = signal
        self.trend_ema = trend_ema
        self.atr_period = atr_period
        self.atr_sl = atr_sl
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None

    def _macd(self):
        fast_ema = _ema(self.closes, self.fast)
        slow_ema = _ema(self.closes, self.slow)
        if fast_ema is None or slow_ema is None:
            return None, None, None
        macd_line = fast_ema - slow_ema

        # 计算 MACD 序列来算 signal line
        fast_series = _ema_series(self.closes, self.fast)
        slow_series = _ema_series(self.closes, self.slow)
        macd_series = []
        for f, s in zip(fast_series, slow_series):
            if f is not None and s is not None:
                macd_series.append(f - s)

        if len(macd_series) < self.signal_period:
            return macd_line, None, None

        signal = _ema(macd_series, self.signal_period)
        if signal is None:
            return macd_line, None, None
        histogram = macd_line - signal
        return macd_line, signal, histogram

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        if len(self.closes) < self.trend_ema + 1:
            return None

        trend = _ema(self.closes, self.trend_ema)
        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)
        _, _, hist = self._macd()

        if any(v is None for v in [trend, atr, hist]):
            return None

        # 需要至少 2 根柱状图来判断方向变化
        # 用前一根的 MACD histogram
        prev_closes = self.closes[:-1]
        if len(prev_closes) < self.slow + self.signal_period:
            return None
        # 简化：保存历史 histogram
        if not hasattr(self, '_prev_hist'):
            self._prev_hist = None
        prev_hist = self._prev_hist
        self._prev_hist = hist

        if prev_hist is None:
            return None

        # 持仓中：ATR 止损
        if self._pos:
            if self._pos['side'] == 'long':
                # 移动止损
                new_stop = close - atr * self.atr_sl
                if new_stop > self._pos['sl']:
                    self._pos['sl'] = new_stop
                if close <= self._pos['sl']:
                    self._pos = None
                    return 'sell'
                # MACD 转负也平仓
                if hist < 0 and prev_hist >= 0:
                    self._pos = None
                    return 'sell'
            else:
                new_stop = close + atr * self.atr_sl
                if new_stop < self._pos['sl']:
                    self._pos['sl'] = new_stop
                if close >= self._pos['sl']:
                    self._pos = None
                    return 'buy'
                if hist > 0 and prev_hist <= 0:
                    self._pos = None
                    return 'buy'
            return None

        # 做多：MACD 柱由负转正 + 价格在 EMA200 之上
        if prev_hist <= 0 and hist > 0 and close > trend:
            self._pos = {
                'side': 'long', 'entry': close,
                'sl': close - atr * self.atr_sl,
            }
            return 'buy'

        # 做空：MACD 柱由正转负 + 价格在 EMA200 之下
        if prev_hist >= 0 and hist < 0 and close < trend:
            self._pos = {
                'side': 'short', 'entry': close,
                'sl': close + atr * self.atr_sl,
            }
            return 'sell'

        return None


class ScalpingStrategy(Strategy):
    """EMA 交叉剥头皮（已调参：拉长周期、加 RSI 过滤）"""

    def __init__(self, fast=12, slow=50, vol_mult=1.2):
        self.fast = fast
        self.slow = slow
        self.vol_mult = vol_mult
        self.closes = []
        self.highs = []
        self.lows = []
        self.volumes = []
        self._pos = None

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)
        self.volumes.append(volume)
        if len(self.closes) < self.slow + 1:
            return None

        fast_now = _ema(self.closes, self.fast)
        slow_now = _ema(self.closes, self.slow)
        fast_prev = _ema(self.closes[:-1], self.fast)
        slow_prev = _ema(self.closes[:-1], self.slow)
        rsi = _rsi(self.closes, 14)
        atr = _atr(self.highs, self.lows, self.closes, 14)

        if any(v is None for v in [fast_now, slow_now, fast_prev, slow_prev, rsi, atr]):
            return None

        # 持仓中：ATR 止损/止盈
        if self._pos:
            if self._pos['side'] == 'long':
                if close <= self._pos['sl'] or close >= self._pos['tp']:
                    self._pos = None
                    return 'sell'
            else:
                if close >= self._pos['sl'] or close <= self._pos['tp']:
                    self._pos = None
                    return 'buy'
            return None

        avg_vol = sum(self.volumes[-self.slow:]) / self.slow
        vol_ok = volume > avg_vol * self.vol_mult

        # 做多：快线上穿慢线 + RSI 45-70 + 放量
        if fast_prev <= slow_prev and fast_now > slow_now and vol_ok and 45 < rsi < 70:
            self._pos = {
                'side': 'long', 'entry': close,
                'sl': close - atr * 1.5, 'tp': close + atr * 3,
            }
            return 'buy'
        # 做空：快线下穿慢线 + RSI 30-55
        if fast_prev >= slow_prev and fast_now < slow_now and 30 < rsi < 55:
            self._pos = {
                'side': 'short', 'entry': close,
                'sl': close + atr * 1.5, 'tp': close - atr * 3,
            }
            return 'sell'
        return None


class RSIStrategy(Strategy):
    """RSI 趋势确认（已调参：用趋势过滤，避免逆势）"""

    def __init__(self, period=14, oversold=25, overbought=75, trend_ema=50):
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
        self.trend_ema = trend_ema
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        if len(self.closes) < max(self.period + 1, self.trend_ema + 1):
            return None

        rsi = _rsi(self.closes, self.period)
        trend = _ema(self.closes, self.trend_ema)
        atr = _atr(self.highs, self.lows, self.closes, 14)

        if any(v is None for v in [rsi, trend, atr]):
            return None

        # 持仓中：止损止盈
        if self._pos:
            if self._pos['side'] == 'long':
                if close <= self._pos['sl'] or close >= self._pos['tp']:
                    self._pos = None
                    return 'sell'
            else:
                if close >= self._pos['sl'] or close <= self._pos['tp']:
                    self._pos = None
                    return 'buy'
            return None

        # 做多：RSI 超卖 + 价格在趋势线上方（回调入场）
        if rsi < self.oversold and close > trend:
            self._pos = {
                'side': 'long', 'entry': close,
                'sl': close - atr * 2, 'tp': close + atr * 4,
            }
            return 'buy'
        # 做空：RSI 超买 + 价格在趋势线下方
        if rsi > self.overbought and close < trend:
            self._pos = {
                'side': 'short', 'entry': close,
                'sl': close + atr * 2, 'tp': close - atr * 4,
            }
            return 'sell'
        return None


class BollingerStrategy(Strategy):
    """布林带突破（已调参：从均值回归改为突破策略）"""

    def __init__(self, period=20, num_std=2.5, trend_ema=50):
        self.period = period
        self.num_std = num_std
        self.trend_ema = trend_ema
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        if len(self.closes) < max(self.period, self.trend_ema + 1):
            return None

        window = self.closes[-self.period:]
        mean = sum(window) / self.period
        variance = sum((x - mean) ** 2 for x in window) / self.period
        std = math.sqrt(variance)
        upper = mean + self.num_std * std
        lower = mean - self.num_std * std
        trend = _ema(self.closes, self.trend_ema)
        atr = _atr(self.highs, self.lows, self.closes, 14)

        if trend is None or atr is None:
            return None

        # 持仓中：止损或回到中轨平仓
        if self._pos:
            if self._pos['side'] == 'long':
                if close <= self._pos['sl'] or close >= mean:
                    self._pos = None
                    return 'sell'
            else:
                if close >= self._pos['sl'] or close <= mean:
                    self._pos = None
                    return 'buy'
            return None

        # 突破上轨 + 趋势向上 → 做多（动量突破）
        if close > upper and close > trend:
            self._pos = {
                'side': 'long', 'entry': close,
                'sl': close - atr * 2,
            }
            return 'buy'
        # 突破下轨 + 趋势向下 → 做空
        if close < lower and close < trend:
            self._pos = {
                'side': 'short', 'entry': close,
                'sl': close + atr * 2,
            }
            return 'sell'
        return None


class GridStrategy(Strategy):
    """网格策略（已调参：更宽网格间距，减少交易频率）"""

    def __init__(self, grids=10, lookback=100):
        self.grids = grids
        self.lookback = lookback
        self.closes = []
        self.lines = None

    def _update_grid(self):
        window = self.closes[-self.lookback:]
        lo = min(window)
        hi = max(window)
        margin = (hi - lo) * 0.1
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
        for line in self.lines:
            if prev >= line > close:
                return 'buy'
        for line in self.lines:
            if prev <= line < close:
                return 'sell'
        return None


class TrendFastStrategy(TrendFollowStrategy):
    """趋势跟踪-快速版（适合 7 天 1h 回测，EMA 更短）"""

    def __init__(self):
        super().__init__(fast_ema=10, slow_ema=30, rsi_period=10,
                         atr_period=10, atr_sl=1.5, atr_tp=3.5)


class MACDFastStrategy(MACDTrendStrategy):
    """MACD 趋势-快速版（EMA 100 替代 200，适合短回测窗口）"""

    def __init__(self):
        super().__init__(fast=12, slow=26, signal=9, trend_ema=100,
                         atr_period=14, atr_sl=2.5)


class EMA2050TrendStrategy(Strategy):
    """
    EMA20/50 趋势跟踪策略

    原理：
    - EMA20 上穿 EMA50 → 做多，下穿 → 做空
    - 只在大趋势方向交易：用 EMA20 斜率确认趋势强度
    - 持仓时间长，用宽松的 ATR 移动止损（2.5x），让利润奔跑
    - 不设固定止盈，靠移动止损保护利润

    设计目标：少交易、长持仓、抓大趋势
    """

    def __init__(self, fast_ema=20, slow_ema=50, atr_period=14,
                 trail_atr=2.5, slope_lookback=5, min_slope=0.001):
        self.fast_ema = fast_ema
        self.slow_ema = slow_ema
        self.atr_period = atr_period
        self.trail_atr = trail_atr
        self.slope_lookback = slope_lookback
        self.min_slope = min_slope
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None  # {'side', 'entry', 'trail_stop', 'peak'}

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        n = len(self.closes)
        if n < self.slow_ema + self.slope_lookback:
            return None

        fast = _ema(self.closes, self.fast_ema)
        slow = _ema(self.closes, self.slow_ema)
        fast_prev = _ema(self.closes[:-1], self.fast_ema)
        slow_prev = _ema(self.closes[:-1], self.slow_ema)
        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)

        if any(v is None for v in [fast, slow, fast_prev, slow_prev, atr]) or atr == 0:
            return None

        # EMA 斜率：fast EMA 最近 N 根变化率
        fast_back = _ema(self.closes[:-self.slope_lookback], self.fast_ema)
        if fast_back is None or fast_back == 0:
            return None
        slope = (fast - fast_back) / fast_back

        # 持仓中：移动止损
        if self._pos:
            if self._pos['side'] == 'long':
                # 追踪最高价
                if close > self._pos['peak']:
                    self._pos['peak'] = close
                new_stop = self._pos['peak'] - atr * self.trail_atr
                if new_stop > self._pos['trail_stop']:
                    self._pos['trail_stop'] = new_stop
                # 止损触发，或 EMA 死叉
                if close <= self._pos['trail_stop'] or (fast_prev >= slow_prev and fast < slow):
                    self._pos = None
                    return 'sell'
            else:
                if close < self._pos['peak']:
                    self._pos['peak'] = close
                new_stop = self._pos['peak'] + atr * self.trail_atr
                if new_stop < self._pos['trail_stop']:
                    self._pos['trail_stop'] = new_stop
                if close >= self._pos['trail_stop'] or (fast_prev <= slow_prev and fast > slow):
                    self._pos = None
                    return 'buy'
            return None

        # 做多：金叉 + 斜率向上
        if fast_prev <= slow_prev and fast > slow and slope > self.min_slope:
            self._pos = {
                'side': 'long', 'entry': close,
                'trail_stop': close - atr * self.trail_atr,
                'peak': close,
            }
            return 'buy'

        # 做空：死叉 + 斜率向下
        if fast_prev >= slow_prev and fast < slow and slope < -self.min_slope:
            self._pos = {
                'side': 'short', 'entry': close,
                'trail_stop': close + atr * self.trail_atr,
                'peak': close,
            }
            return 'sell'

        return None


class VWAPRevertStrategy(Strategy):
    """
    VWAP 均值回归策略

    原理：
    - 计算滚动 VWAP（成交量加权平均价）
    - 价格偏离 VWAP 超过阈值时反向操作
    - 偏离 > +2% → 做空（价格会回归均值）
    - 偏离 < -2% → 做多
    - ATR 止损保护，回到 VWAP 附近止盈

    设计目标：在震荡行情中低买高卖
    """

    def __init__(self, vwap_period=48, deviation_pct=0.02, atr_period=14,
                 atr_sl=2.0):
        self.vwap_period = vwap_period
        self.deviation_pct = deviation_pct
        self.atr_period = atr_period
        self.atr_sl = atr_sl
        self.closes = []
        self.highs = []
        self.lows = []
        self.volumes = []
        self.typical_prices = []  # (H+L+C)/3
        self._pos = None  # {'side', 'entry', 'vwap_at_entry'}

    def _calc_vwap(self):
        """滚动 VWAP = sum(TP * vol) / sum(vol)"""
        n = min(self.vwap_period, len(self.typical_prices))
        if n < 10:
            return None
        tps = self.typical_prices[-n:]
        vols = self.volumes[-n:]
        total_vol = sum(vols)
        if total_vol == 0:
            return None
        return sum(tp * v for tp, v in zip(tps, vols)) / total_vol

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)
        self.volumes.append(volume)
        self.typical_prices.append((high + low + close) / 3)

        vwap = self._calc_vwap()
        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)

        if vwap is None or atr is None or vwap == 0:
            return None

        deviation = (close - vwap) / vwap  # 偏离比例

        # 持仓中：检查止损和止盈（回归 VWAP）
        if self._pos:
            if self._pos['side'] == 'long':
                # 止盈：价格回到 VWAP 附近（偏离 < 0.3%）
                if deviation > -0.003:
                    self._pos = None
                    return 'sell'
                # 止损
                if close <= self._pos['entry'] - atr * self.atr_sl:
                    self._pos = None
                    return 'sell'
            else:
                if deviation < 0.003:
                    self._pos = None
                    return 'buy'
                if close >= self._pos['entry'] + atr * self.atr_sl:
                    self._pos = None
                    return 'buy'
            return None

        # 做多：价格远低于 VWAP
        if deviation < -self.deviation_pct:
            self._pos = {
                'side': 'long', 'entry': close,
                'vwap_at_entry': vwap,
            }
            return 'buy'

        # 做空：价格远高于 VWAP
        if deviation > self.deviation_pct:
            self._pos = {
                'side': 'short', 'entry': close,
                'vwap_at_entry': vwap,
            }
            return 'sell'

        return None


class MeanReversionStrategy(Strategy):
    """
    均值回归策略

    原理：
    - 计算 EMA 作为均值线
    - 计算价格偏离 EMA 的标准差
    - 偏离超过 N 个标准差 → 反向开仓（价格会回归均值）
    - 价格回到 EMA 附近 → 平仓
    - ATR 止损保护

    适合震荡行情。
    """
    def __init__(self, ema_period=50, std_period=50, entry_std=2.0, atr_period=14, atr_sl=2.0):
        self.ema_period = ema_period
        self.std_period = std_period
        self.entry_std = entry_std
        self.atr_period = atr_period
        self.atr_sl = atr_sl
        self.closes = []
        self.highs = []
        self.lows = []
        self._pos = None

    def on_candle(self, open, high, low, close, volume):
        self.closes.append(close)
        self.highs.append(high)
        self.lows.append(low)

        ema = _ema(self.closes, self.ema_period)
        atr = _atr(self.highs, self.lows, self.closes, self.atr_period)
        if ema is None or atr is None:
            return None

        # 计算标准差：最近 std_period 根的 close 与 EMA 的偏离
        n = min(self.std_period, len(self.closes))
        if n < self.ema_period:
            return None
        recent = self.closes[-n:]
        mean = sum(recent) / len(recent)
        variance = sum((c - mean) ** 2 for c in recent) / len(recent)
        std = variance ** 0.5
        if std == 0:
            return None

        deviation = (close - ema) / std  # 偏离标准差数

        # 持仓中
        if self._pos:
            if self._pos['side'] == 'long':
                # 止盈：价格回到 EMA（偏离 < 0.3 标准差）
                if close >= ema:
                    self._pos = None
                    return 'sell'
                # 止损
                if close <= self._pos['entry'] - atr * self.atr_sl:
                    self._pos = None
                    return 'sell'
            else:
                if close <= ema:
                    self._pos = None
                    return 'buy'
                if close >= self._pos['entry'] + atr * self.atr_sl:
                    self._pos = None
                    return 'buy'
            return None

        # 做多：价格远低于均值（偏离 < -N 个标准差）
        if deviation < -self.entry_std:
            self._pos = {'side': 'long', 'entry': close}
            return 'buy'

        # 做空：价格远高于均值（偏离 > N 个标准差）
        if deviation > self.entry_std:
            self._pos = {'side': 'short', 'entry': close}
            return 'sell'

        return None


STRATEGIES = {
    'trend': TrendFollowStrategy,
    'trend_fast': TrendFastStrategy,
    'ema2050': EMA2050TrendStrategy,
    'breakout': BreakoutStrategy,
    'macd': MACDTrendStrategy,
    'macd_fast': MACDFastStrategy,
    'vwap': VWAPRevertStrategy,
    'scalping': ScalpingStrategy,
    'rsi': RSIStrategy,
    'bollinger': BollingerStrategy,
    'grid': GridStrategy,
    'mean_reversion': MeanReversionStrategy,
}


# ─── 回测引擎 ───

def fetch_candles(symbol, timeframe, days):
    """从币安拉历史 K 线数据（endTime 向前翻页，确保拿到完整历史）"""
    exchange = get_futures_exchange()
    candles_per_day = {
        '1m': 1440, '5m': 288, '15m': 96,
        '1h': 24, '4h': 6, '1d': 1,
    }
    cpd = candles_per_day.get(timeframe, 24)
    total = days * cpd

    # 用 endTime 向前翻页：从当前时间往回拉，每次 1000 根
    all_candles = []
    end_time = int(time.time() * 1000)  # 当前时间戳(ms)
    remaining = total

    while remaining > 0:
        limit = min(1000, remaining)
        batch = exchange.fetch_ohlcv(
            symbol, timeframe, limit=limit,
            params={'endTime': end_time}
        )
        if not batch:
            break
        all_candles = batch + all_candles  # 前插保持时间顺序
        remaining -= len(batch)
        # 下一批的 endTime = 本批最早一根的时间戳 - 1
        end_time = batch[0][0] - 1
        if len(batch) < limit:
            break  # 没有更早的数据了

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
    parser.add_argument('--strategy', default='trend',
                        choices=list(STRATEGIES.keys()),
                        help='策略名称')
    parser.add_argument('--days', type=int, default=7, help='回测天数')
    parser.add_argument('--timeframe', default='1h',
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
