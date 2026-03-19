//! Backtest strategy implementations.
//!
//! Each strategy implements `BacktestStrategy::on_candle` and returns
//! `Some("buy")`, `Some("sell")`, or `None`. The backtest engine in `mod.rs`
//! handles position tracking, PnL, and equity calculation.
//!
//! These are BACKTEST strategies with internal SL/TP tracking for signal
//! generation only. The actual position management is done by the engine.

use clawchat_shared::indicators::{
    atr_from_slices, bollinger_bands, ema_from_slice, macd, rsi_from_slice, std_dev,
};
use std::collections::HashMap;

// ── Trait ──────────────────────────────────────────────────────

pub trait BacktestStrategy {
    /// Process a new candle and optionally emit a signal.
    fn on_candle(
        &mut self,
        open: f64,
        high: f64,
        low: f64,
        close: f64,
        volume: f64,
    ) -> Option<&'static str>;

    /// Strategy name (matches the registry key).
    fn name(&self) -> &'static str;
}

// ── Internal position state (for SL/TP signal generation) ─────

#[derive(Debug, Clone)]
struct PosState {
    side: &'static str, // "long" or "short"
    #[allow(dead_code)]
    entry: f64,
    sl: f64,
    tp: f64,
}

#[derive(Debug, Clone)]
struct TrailPosState {
    side: &'static str,
    #[allow(dead_code)]
    entry: f64,
    trail_stop: f64,
}

#[derive(Debug, Clone)]
struct PeakTrailState {
    side: &'static str,
    #[allow(dead_code)]
    entry: f64,
    trail_stop: f64,
    peak: f64,
}

// ── 1. TrendFollowStrategy ────────────────────────────────────

/// EMA 21/55 crossover + RSI filter (45-75 for long, 25-55 for short) + ATR SL/TP.
pub struct TrendFollowStrategy {
    fast_ema: usize,
    slow_ema: usize,
    rsi_period: usize,
    atr_period: usize,
    atr_sl: f64,
    atr_tp: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<PosState>,
}

impl TrendFollowStrategy {
    pub fn new(
        fast_ema: usize,
        slow_ema: usize,
        rsi_period: usize,
        atr_period: usize,
        atr_sl: f64,
        atr_tp: f64,
    ) -> Self {
        Self {
            fast_ema,
            slow_ema,
            rsi_period,
            atr_period,
            atr_sl,
            atr_tp,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(21, 55, 14, 14, 1.5, 3.0)
    }
}

impl BacktestStrategy for TrendFollowStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let n = self.closes.len();
        if n < self.slow_ema + 1 {
            return None;
        }

        let fast = ema_from_slice(&self.closes, self.fast_ema)?;
        let slow = ema_from_slice(&self.closes, self.slow_ema)?;
        let fast_prev = ema_from_slice(&self.closes[..n - 1], self.fast_ema)?;
        let slow_prev = ema_from_slice(&self.closes[..n - 1], self.slow_ema)?;
        let rsi = rsi_from_slice(&self.closes, self.rsi_period)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // Check SL/TP if in position
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                if close <= pos.sl || close >= pos.tp {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close >= pos.sl || close <= pos.tp {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: fast crosses above slow + RSI 45-75
        if fast_prev <= slow_prev && fast > slow && rsi > 45.0 && rsi < 75.0 {
            self.pos = Some(PosState {
                side: "long",
                entry: close,
                sl: close - atr * self.atr_sl,
                tp: close + atr * self.atr_tp,
            });
            return Some("buy");
        }

        // Short: fast crosses below slow + RSI 25-55
        if fast_prev >= slow_prev && fast < slow && rsi < 55.0 && rsi > 25.0 {
            self.pos = Some(PosState {
                side: "short",
                entry: close,
                sl: close + atr * self.atr_sl,
                tp: close - atr * self.atr_tp,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "trend"
    }
}

// ── 2. BreakoutStrategy ───────────────────────────────────────

/// Breakout of N-period high/low + ATR filter + trailing stop.
pub struct BreakoutStrategy {
    lookback: usize,
    atr_period: usize,
    atr_filter: f64,
    trail_atr: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<TrailPosState>,
}

impl BreakoutStrategy {
    pub fn new(lookback: usize, atr_period: usize, atr_filter: f64, trail_atr: f64) -> Self {
        Self {
            lookback,
            atr_period,
            atr_filter,
            trail_atr,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(48, 14, 0.3, 3.0)
    }
}

impl BacktestStrategy for BreakoutStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let n = self.closes.len();
        if n < self.lookback + 1 {
            return None;
        }

        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;
        if atr == 0.0 {
            return None;
        }

        // Previous N candles' highs/lows (excluding current)
        let start = n - self.lookback - 1;
        let end = n - 1;
        let prev_highs = &self.highs[start..end];
        let prev_lows = &self.lows[start..end];
        let highest = prev_highs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let lowest = prev_lows.iter().cloned().fold(f64::INFINITY, f64::min);

        // Trailing stop management
        if let Some(ref mut pos) = self.pos {
            if pos.side == "long" {
                let new_stop = close - atr * self.trail_atr;
                if new_stop > pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close <= pos.trail_stop {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                let new_stop = close + atr * self.trail_atr;
                if new_stop < pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close >= pos.trail_stop {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Upward breakout + ATR filter
        if close > highest && (close - highest) > atr * self.atr_filter {
            self.pos = Some(TrailPosState {
                side: "long",
                entry: close,
                trail_stop: close - atr * self.trail_atr,
            });
            return Some("buy");
        }

        // Downward breakout
        if close < lowest && (lowest - close) > atr * self.atr_filter {
            self.pos = Some(TrailPosState {
                side: "short",
                entry: close,
                trail_stop: close + atr * self.trail_atr,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "breakout"
    }
}

// ── 3. MACDTrendStrategy ──────────────────────────────────────

/// MACD histogram crossover + EMA trend filter + ATR trailing stop.
pub struct MACDTrendStrategy {
    fast: usize,
    slow: usize,
    signal_period: usize,
    trend_ema: usize,
    atr_period: usize,
    atr_sl: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<TrailPosState>, // reuse trail for SL tracking
    prev_hist: Option<f64>,
}

impl MACDTrendStrategy {
    pub fn new(
        fast: usize,
        slow: usize,
        signal_period: usize,
        trend_ema: usize,
        atr_period: usize,
        atr_sl: f64,
    ) -> Self {
        Self {
            fast,
            slow,
            signal_period,
            trend_ema,
            atr_period,
            atr_sl,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
            prev_hist: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(12, 26, 9, 200, 14, 2.0)
    }
}

impl BacktestStrategy for MACDTrendStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        if self.closes.len() < self.trend_ema + 1 {
            return None;
        }

        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;
        let (_, _, hist_opt) = macd(&self.closes, self.fast, self.slow, self.signal_period);
        let hist = hist_opt?;

        // Need previous histogram
        if self.closes.len() - 1 < self.slow + self.signal_period {
            self.prev_hist = Some(hist);
            return None;
        }

        let prev_hist = match self.prev_hist {
            Some(h) => h,
            None => {
                self.prev_hist = Some(hist);
                return None;
            }
        };
        self.prev_hist = Some(hist);

        // Position management: ATR trailing stop + MACD reversal
        if let Some(ref mut pos) = self.pos {
            if pos.side == "long" {
                // Update trailing stop (only up)
                let new_stop = close - atr * self.atr_sl;
                if new_stop > pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close <= pos.trail_stop {
                    self.pos = None;
                    return Some("sell");
                }
                // MACD turns negative → close
                if hist < 0.0 && prev_hist >= 0.0 {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                let new_stop = close + atr * self.atr_sl;
                if new_stop < pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close >= pos.trail_stop {
                    self.pos = None;
                    return Some("buy");
                }
                if hist > 0.0 && prev_hist <= 0.0 {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: MACD hist turns positive + price above trend EMA
        if prev_hist <= 0.0 && hist > 0.0 && close > trend {
            self.pos = Some(TrailPosState {
                side: "long",
                entry: close,
                trail_stop: close - atr * self.atr_sl,
            });
            return Some("buy");
        }

        // Short: MACD hist turns negative + price below trend EMA
        if prev_hist >= 0.0 && hist < 0.0 && close < trend {
            self.pos = Some(TrailPosState {
                side: "short",
                entry: close,
                trail_stop: close + atr * self.atr_sl,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "macd"
    }
}

// ── 4. ScalpingStrategy ───────────────────────────────────────

/// Fast EMA(12)/Slow EMA(50) crossover + volume filter + RSI filter + ATR SL/TP.
pub struct ScalpingStrategy {
    fast: usize,
    slow: usize,
    vol_mult: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    volumes: Vec<f64>,
    pos: Option<PosState>,
}

impl ScalpingStrategy {
    pub fn new(fast: usize, slow: usize, vol_mult: f64) -> Self {
        Self {
            fast,
            slow,
            vol_mult,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            volumes: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(12, 50, 1.2)
    }
}

impl BacktestStrategy for ScalpingStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);
        self.volumes.push(volume);

        let n = self.closes.len();
        if n < self.slow + 1 {
            return None;
        }

        let fast_now = ema_from_slice(&self.closes, self.fast)?;
        let slow_now = ema_from_slice(&self.closes, self.slow)?;
        let fast_prev = ema_from_slice(&self.closes[..n - 1], self.fast)?;
        let slow_prev = ema_from_slice(&self.closes[..n - 1], self.slow)?;
        let rsi = rsi_from_slice(&self.closes, 14)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, 14)?;

        // SL/TP check
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                if close <= pos.sl || close >= pos.tp {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close >= pos.sl || close <= pos.tp {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Volume filter
        let vol_window = &self.volumes[n.saturating_sub(self.slow)..];
        let avg_vol = vol_window.iter().sum::<f64>() / vol_window.len() as f64;
        let vol_ok = volume > avg_vol * self.vol_mult;

        // Long: fast crosses above slow + volume + RSI 45-70
        if fast_prev <= slow_prev && fast_now > slow_now && vol_ok && rsi > 45.0 && rsi < 70.0 {
            self.pos = Some(PosState {
                side: "long",
                entry: close,
                sl: close - atr * 1.5,
                tp: close + atr * 3.0,
            });
            return Some("buy");
        }

        // Short: fast crosses below slow + RSI 30-55
        if fast_prev >= slow_prev && fast_now < slow_now && rsi > 30.0 && rsi < 55.0 {
            self.pos = Some(PosState {
                side: "short",
                entry: close,
                sl: close + atr * 1.5,
                tp: close - atr * 3.0,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "scalping"
    }
}

// ── 5. RSIStrategy ────────────────────────────────────────────

/// RSI oversold/overbought + EMA trend filter + ATR SL/TP.
pub struct RSIStrategy {
    period: usize,
    oversold: f64,
    overbought: f64,
    trend_ema: usize,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<PosState>,
}

impl RSIStrategy {
    pub fn new(period: usize, oversold: f64, overbought: f64, trend_ema: usize) -> Self {
        Self {
            period,
            oversold,
            overbought,
            trend_ema,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(14, 25.0, 75.0, 50)
    }
}

impl BacktestStrategy for RSIStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let min_len = self.period.max(self.trend_ema) + 1;
        if self.closes.len() < min_len {
            return None;
        }

        let rsi = rsi_from_slice(&self.closes, self.period)?;
        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, 14)?;

        // SL/TP check
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                if close <= pos.sl || close >= pos.tp {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close >= pos.sl || close <= pos.tp {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: RSI oversold + price above trend
        if rsi < self.oversold && close > trend {
            self.pos = Some(PosState {
                side: "long",
                entry: close,
                sl: close - atr * 2.0,
                tp: close + atr * 4.0,
            });
            return Some("buy");
        }

        // Short: RSI overbought + price below trend
        if rsi > self.overbought && close < trend {
            self.pos = Some(PosState {
                side: "short",
                entry: close,
                sl: close + atr * 2.0,
                tp: close - atr * 4.0,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "rsi"
    }
}

// ── 6. BollingerStrategy ──────────────────────────────────────

/// Bollinger band breakout + trend filter + middle band TP.
pub struct BollingerStrategy {
    period: usize,
    num_std: f64,
    trend_ema: usize,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<BollingerPos>,
}

#[derive(Debug, Clone)]
struct BollingerPos {
    side: &'static str,
    sl: f64,
}

impl BollingerStrategy {
    pub fn new(period: usize, num_std: f64, trend_ema: usize) -> Self {
        Self {
            period,
            num_std,
            trend_ema,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(20, 2.5, 50)
    }
}

impl BacktestStrategy for BollingerStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let min_len = self.period.max(self.trend_ema + 1);
        if self.closes.len() < min_len {
            return None;
        }

        let (upper, mean, lower) = bollinger_bands(&self.closes, self.period, self.num_std)?;
        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, 14)?;

        // Position management: SL or return to middle band
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                if close <= pos.sl || close >= mean {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close >= pos.sl || close <= mean {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: breakout above upper band + uptrend
        if close > upper && close > trend {
            self.pos = Some(BollingerPos {
                side: "long",
                sl: close - atr * 2.0,
            });
            return Some("buy");
        }

        // Short: breakout below lower band + downtrend
        if close < lower && close < trend {
            self.pos = Some(BollingerPos {
                side: "short",
                sl: close + atr * 2.0,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "bollinger"
    }
}

// ── 7. GridStrategy ───────────────────────────────────────────

/// Grid trading between high/low of lookback period.
pub struct GridStrategy {
    grids: usize,
    lookback: usize,
    closes: Vec<f64>,
    lines: Option<Vec<f64>>,
}

impl GridStrategy {
    pub fn new(grids: usize, lookback: usize) -> Self {
        Self {
            grids,
            lookback,
            closes: Vec::new(),
            lines: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(10, 100)
    }

    fn update_grid(&mut self) {
        let start = self.closes.len().saturating_sub(self.lookback);
        let window = &self.closes[start..];
        let lo = window.iter().cloned().fold(f64::INFINITY, f64::min);
        let hi = window.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let margin = (hi - lo) * 0.1;
        let lo = lo - margin;
        let hi = hi + margin;
        let step = (hi - lo) / self.grids as f64;
        self.lines = Some((0..=self.grids).map(|i| lo + i as f64 * step).collect());
    }
}

impl BacktestStrategy for GridStrategy {
    fn on_candle(&mut self, _open: f64, _high: f64, _low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);

        if self.closes.len() < 2 {
            return None;
        }

        if self.lines.is_none() && self.closes.len() >= self.lookback.min(50) {
            self.update_grid();
        }

        let lines = self.lines.as_ref()?;
        let prev = self.closes[self.closes.len() - 2];

        // Price crosses down through a grid line → buy
        for &line in lines {
            if prev >= line && line > close {
                return Some("buy");
            }
        }

        // Price crosses up through a grid line → sell
        for &line in lines {
            if prev <= line && line < close {
                return Some("sell");
            }
        }

        None
    }

    fn name(&self) -> &'static str {
        "grid"
    }
}

// ── 8. EMA2050TrendStrategy ──────────────────────────────────

/// EMA 20/50 crossover + slope filter + ATR trailing stop (wider holds).
pub struct EMA2050TrendStrategy {
    fast_ema: usize,
    slow_ema: usize,
    atr_period: usize,
    trail_atr: f64,
    slope_lookback: usize,
    min_slope: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<PeakTrailState>,
}

impl EMA2050TrendStrategy {
    pub fn new(
        fast_ema: usize,
        slow_ema: usize,
        atr_period: usize,
        trail_atr: f64,
        slope_lookback: usize,
        min_slope: f64,
    ) -> Self {
        Self {
            fast_ema,
            slow_ema,
            atr_period,
            trail_atr,
            slope_lookback,
            min_slope,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(20, 50, 14, 2.5, 5, 0.001)
    }
}

impl BacktestStrategy for EMA2050TrendStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let n = self.closes.len();
        if n < self.slow_ema + self.slope_lookback {
            return None;
        }

        let fast = ema_from_slice(&self.closes, self.fast_ema)?;
        let slow = ema_from_slice(&self.closes, self.slow_ema)?;
        let fast_prev = ema_from_slice(&self.closes[..n - 1], self.fast_ema)?;
        let slow_prev = ema_from_slice(&self.closes[..n - 1], self.slow_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        if atr == 0.0 {
            return None;
        }

        // EMA slope: change over last N candles
        let back_end = n - self.slope_lookback;
        let fast_back = ema_from_slice(&self.closes[..back_end], self.fast_ema)?;
        if fast_back == 0.0 {
            return None;
        }
        let slope = (fast - fast_back) / fast_back;

        // Position management: trailing stop + EMA cross reversal
        if let Some(ref mut pos) = self.pos {
            if pos.side == "long" {
                if close > pos.peak {
                    pos.peak = close;
                }
                let new_stop = pos.peak - atr * self.trail_atr;
                if new_stop > pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close <= pos.trail_stop || (fast_prev >= slow_prev && fast < slow) {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close < pos.peak {
                    pos.peak = close;
                }
                let new_stop = pos.peak + atr * self.trail_atr;
                if new_stop < pos.trail_stop {
                    pos.trail_stop = new_stop;
                }
                if close >= pos.trail_stop || (fast_prev <= slow_prev && fast > slow) {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: golden cross + slope up
        if fast_prev <= slow_prev && fast > slow && slope > self.min_slope {
            self.pos = Some(PeakTrailState {
                side: "long",
                entry: close,
                trail_stop: close - atr * self.trail_atr,
                peak: close,
            });
            return Some("buy");
        }

        // Short: death cross + slope down
        if fast_prev >= slow_prev && fast < slow && slope < -self.min_slope {
            self.pos = Some(PeakTrailState {
                side: "short",
                entry: close,
                trail_stop: close + atr * self.trail_atr,
                peak: close,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "ema2050"
    }
}

// ── 9. VWAPRevertStrategy ─────────────────────────────────────

/// VWAP-based mean reversion. Price deviation from rolling VWAP triggers entries.
pub struct VWAPRevertStrategy {
    vwap_period: usize,
    deviation_pct: f64,
    atr_period: usize,
    atr_sl: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    volumes: Vec<f64>,
    typical_prices: Vec<f64>,
    pos: Option<VwapPos>,
}

#[derive(Debug, Clone)]
struct VwapPos {
    side: &'static str,
    entry: f64,
}

impl VWAPRevertStrategy {
    pub fn new(vwap_period: usize, deviation_pct: f64, atr_period: usize, atr_sl: f64) -> Self {
        Self {
            vwap_period,
            deviation_pct,
            atr_period,
            atr_sl,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            volumes: Vec::new(),
            typical_prices: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(48, 0.02, 14, 2.0)
    }

    fn calc_vwap(&self) -> Option<f64> {
        let n = self.vwap_period.min(self.typical_prices.len());
        if n < 10 {
            return None;
        }
        let start = self.typical_prices.len() - n;
        let tps = &self.typical_prices[start..];
        let vols = &self.volumes[start..];
        let total_vol: f64 = vols.iter().sum();
        if total_vol == 0.0 {
            return None;
        }
        Some(
            tps.iter()
                .zip(vols.iter())
                .map(|(tp, v)| tp * v)
                .sum::<f64>()
                / total_vol,
        )
    }
}

impl BacktestStrategy for VWAPRevertStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);
        self.volumes.push(volume);
        self.typical_prices.push((high + low + close) / 3.0);

        let vwap = self.calc_vwap()?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        if vwap == 0.0 {
            return None;
        }

        let deviation = (close - vwap) / vwap;

        // Position management
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                // TP: price returns near VWAP (deviation > -0.3%)
                if deviation > -0.003 {
                    self.pos = None;
                    return Some("sell");
                }
                // SL
                if close <= pos.entry - atr * self.atr_sl {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if deviation < 0.003 {
                    self.pos = None;
                    return Some("buy");
                }
                if close >= pos.entry + atr * self.atr_sl {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: price far below VWAP
        if deviation < -self.deviation_pct {
            self.pos = Some(VwapPos {
                side: "long",
                entry: close,
            });
            return Some("buy");
        }

        // Short: price far above VWAP
        if deviation > self.deviation_pct {
            self.pos = Some(VwapPos {
                side: "short",
                entry: close,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "vwap"
    }
}

// ── 10. MeanReversionStrategy ─────────────────────────────────

/// Standard deviation from EMA, reverse on extreme deviation.
pub struct MeanReversionStrategy {
    ema_period: usize,
    std_period: usize,
    entry_std: f64,
    atr_period: usize,
    atr_sl: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<VwapPos>, // reuse: just need side + entry
}

impl MeanReversionStrategy {
    pub fn new(
        ema_period: usize,
        std_period: usize,
        entry_std: f64,
        atr_period: usize,
        atr_sl: f64,
    ) -> Self {
        Self {
            ema_period,
            std_period,
            entry_std,
            atr_period,
            atr_sl,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn default_params() -> Self {
        Self::new(50, 50, 2.0, 14, 2.0)
    }
}

impl BacktestStrategy for MeanReversionStrategy {
    fn on_candle(&mut self, _open: f64, high: f64, low: f64, close: f64, _volume: f64) -> Option<&'static str> {
        self.closes.push(close);
        self.highs.push(high);
        self.lows.push(low);

        let ema = ema_from_slice(&self.closes, self.ema_period)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // Need enough data for std calculation
        let n = self.std_period.min(self.closes.len());
        if n < self.ema_period {
            return None;
        }

        let recent = &self.closes[self.closes.len() - n..];
        let sd = std_dev(recent);
        if sd == 0.0 {
            return None;
        }

        let deviation = (close - ema) / sd;

        // Position management
        if let Some(ref pos) = self.pos {
            if pos.side == "long" {
                // TP: price returns to EMA
                if close >= ema {
                    self.pos = None;
                    return Some("sell");
                }
                // SL
                if close <= pos.entry - atr * self.atr_sl {
                    self.pos = None;
                    return Some("sell");
                }
            } else {
                if close <= ema {
                    self.pos = None;
                    return Some("buy");
                }
                if close >= pos.entry + atr * self.atr_sl {
                    self.pos = None;
                    return Some("buy");
                }
            }
            return None;
        }

        // Long: price far below mean
        if deviation < -self.entry_std {
            self.pos = Some(VwapPos {
                side: "long",
                entry: close,
            });
            return Some("buy");
        }

        // Short: price far above mean
        if deviation > self.entry_std {
            self.pos = Some(VwapPos {
                side: "short",
                entry: close,
            });
            return Some("sell");
        }

        None
    }

    fn name(&self) -> &'static str {
        "mean_reversion"
    }
}

// ── 11. TrendFastStrategy ─────────────────────────────────────

/// Like TrendFollow but with EMA 10/30 (faster signals).
pub struct TrendFastStrategy {
    inner: TrendFollowStrategy,
}

impl TrendFastStrategy {
    pub fn new() -> Self {
        Self {
            inner: TrendFollowStrategy::new(10, 30, 10, 10, 1.5, 3.5),
        }
    }
}

impl BacktestStrategy for TrendFastStrategy {
    fn on_candle(&mut self, open: f64, high: f64, low: f64, close: f64, volume: f64) -> Option<&'static str> {
        self.inner.on_candle(open, high, low, close, volume)
    }

    fn name(&self) -> &'static str {
        "trend_fast"
    }
}

// ── 12. MACDFastStrategy ──────────────────────────────────────

/// Like MACD but with EMA 100 instead of 200 trend filter.
pub struct MACDFastStrategy {
    inner: MACDTrendStrategy,
}

impl MACDFastStrategy {
    pub fn new() -> Self {
        Self {
            inner: MACDTrendStrategy::new(12, 26, 9, 100, 14, 2.5),
        }
    }
}

impl BacktestStrategy for MACDFastStrategy {
    fn on_candle(&mut self, open: f64, high: f64, low: f64, close: f64, volume: f64) -> Option<&'static str> {
        self.inner.on_candle(open, high, low, close, volume)
    }

    fn name(&self) -> &'static str {
        "macd_fast"
    }
}

// ── Strategy registry ─────────────────────────────────────────

/// All registered strategy names.
pub fn strategy_names() -> &'static [&'static str] {
    &[
        "trend",
        "trend_fast",
        "ema2050",
        "breakout",
        "macd",
        "macd_fast",
        "vwap",
        "scalping",
        "rsi",
        "bollinger",
        "grid",
        "mean_reversion",
    ]
}

/// Helper to extract a param as usize with default.
fn param_usize(params: Option<&HashMap<String, f64>>, key: &str, default: usize) -> usize {
    params
        .and_then(|p| p.get(key))
        .map(|v| *v as usize)
        .unwrap_or(default)
}

/// Helper to extract a param as f64 with default.
fn param_f64(params: Option<&HashMap<String, f64>>, key: &str, default: f64) -> f64 {
    params
        .and_then(|p| p.get(key))
        .copied()
        .unwrap_or(default)
}

/// Create a strategy by name, optionally with custom parameters.
///
/// Parameter names follow the SCHEMA convention (e.g. `ema_fast`, `ema_slow`,
/// `atr_sl_mult`, `atr_tp_mult`).
pub fn get_strategy(
    name: &str,
    params: Option<&HashMap<String, f64>>,
) -> Option<Box<dyn BacktestStrategy>> {
    match name {
        "trend" => Some(Box::new(TrendFollowStrategy::new(
            param_usize(params, "ema_fast", 21),
            param_usize(params, "ema_slow", 55),
            param_usize(params, "rsi_period", 14),
            param_usize(params, "atr_period", 14),
            param_f64(params, "atr_sl_mult", 1.5),
            param_f64(params, "atr_tp_mult", 3.0),
        ))),

        "trend_fast" => Some(Box::new(TrendFastStrategy::new())),

        "ema2050" => Some(Box::new(EMA2050TrendStrategy::new(
            param_usize(params, "ema_fast", 20),
            param_usize(params, "ema_slow", 50),
            param_usize(params, "atr_period", 14),
            param_f64(params, "trail_atr", 2.5),
            param_usize(params, "slope_lookback", 5),
            param_f64(params, "min_slope", 0.001),
        ))),

        "breakout" => Some(Box::new(BreakoutStrategy::new(
            param_usize(params, "lookback", 48),
            param_usize(params, "atr_period", 14),
            param_f64(params, "atr_filter", 0.3),
            param_f64(params, "trail_atr", 3.0),
        ))),

        "macd" => Some(Box::new(MACDTrendStrategy::new(
            param_usize(params, "fast_period", 12),
            param_usize(params, "slow_period", 26),
            param_usize(params, "signal_period", 9),
            param_usize(params, "trend_ema", 200),
            param_usize(params, "atr_period", 14),
            param_f64(params, "atr_sl_mult", 2.0),
        ))),

        "macd_fast" => Some(Box::new(MACDFastStrategy::new())),

        "vwap" => Some(Box::new(VWAPRevertStrategy::new(
            param_usize(params, "vwap_period", 48),
            param_f64(params, "deviation_pct", 0.02),
            param_usize(params, "atr_period", 14),
            param_f64(params, "atr_sl_mult", 2.0),
        ))),

        "scalping" => Some(Box::new(ScalpingStrategy::new(
            param_usize(params, "ema_fast", 12),
            param_usize(params, "ema_slow", 50),
            param_f64(params, "volume_multiplier", 1.2),
        ))),

        "rsi" => Some(Box::new(RSIStrategy::new(
            param_usize(params, "rsi_period", 14),
            param_f64(params, "rsi_oversold", 25.0),
            param_f64(params, "rsi_overbought", 75.0),
            param_usize(params, "trend_ema", 50),
        ))),

        "bollinger" => Some(Box::new(BollingerStrategy::new(
            param_usize(params, "bb_period", 20),
            param_f64(params, "num_std", 2.5),
            param_usize(params, "trend_ema", 50),
        ))),

        "grid" => Some(Box::new(GridStrategy::new(
            param_usize(params, "grids", 10),
            param_usize(params, "lookback", 100),
        ))),

        "mean_reversion" => Some(Box::new(MeanReversionStrategy::new(
            param_usize(params, "ema_period", 50),
            param_usize(params, "std_period", 50),
            param_f64(params, "entry_std", 2.0),
            param_usize(params, "atr_period", 14),
            param_f64(params, "atr_sl_mult", 2.0),
        ))),

        _ => None,
    }
}

// ── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_trending_candles(n: usize, base: f64, trend: f64) -> Vec<(f64, f64, f64, f64, f64)> {
        (0..n)
            .map(|i| {
                let price = base + i as f64 * trend;
                let noise = (i as f64 * 0.1).sin() * base * 0.01;
                let c = price + noise;
                let h = c * 1.005;
                let l = c * 0.995;
                (c, h, l, c, 1000.0)
            })
            .collect()
    }

    #[test]
    fn trend_strategy_no_panic() {
        let mut s = TrendFollowStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn breakout_strategy_no_panic() {
        let mut s = BreakoutStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn macd_strategy_no_panic() {
        let mut s = MACDTrendStrategy::default_params();
        let candles = make_trending_candles(300, 100.0, 0.05);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn scalping_strategy_no_panic() {
        let mut s = ScalpingStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn rsi_strategy_no_panic() {
        let mut s = RSIStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn bollinger_strategy_no_panic() {
        let mut s = BollingerStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn grid_strategy_no_panic() {
        let mut s = GridStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn ema2050_strategy_no_panic() {
        let mut s = EMA2050TrendStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn vwap_strategy_no_panic() {
        let mut s = VWAPRevertStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn mean_reversion_strategy_no_panic() {
        let mut s = MeanReversionStrategy::default_params();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn trend_fast_strategy_no_panic() {
        let mut s = TrendFastStrategy::new();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn macd_fast_strategy_no_panic() {
        let mut s = MACDFastStrategy::new();
        let candles = make_trending_candles(200, 100.0, 0.1);
        for (o, h, l, c, v) in &candles {
            let _ = s.on_candle(*o, *h, *l, *c, *v);
        }
    }

    #[test]
    fn get_strategy_all_names() {
        for name in strategy_names() {
            assert!(
                get_strategy(name, None).is_some(),
                "get_strategy failed for '{name}'"
            );
        }
    }

    #[test]
    fn get_strategy_unknown_returns_none() {
        assert!(get_strategy("does_not_exist", None).is_none());
    }

    #[test]
    fn get_strategy_with_params() {
        let mut params = HashMap::new();
        params.insert("ema_fast".to_string(), 15.0);
        params.insert("ema_slow".to_string(), 40.0);
        params.insert("atr_sl_mult".to_string(), 2.0);
        let s = get_strategy("trend", Some(&params));
        assert!(s.is_some());
        assert_eq!(s.unwrap().name(), "trend");
    }

    #[test]
    fn grid_strategy_produces_signals() {
        let mut s = GridStrategy::new(5, 50);
        // Build up price history then force a crossing
        let mut signals = Vec::new();
        for i in 0..60 {
            let price = 100.0 + (i as f64 * 0.2).sin() * 5.0;
            if let Some(sig) = s.on_candle(price, price + 0.5, price - 0.5, price, 1000.0) {
                signals.push(sig);
            }
        }
        // Grid strategy should produce some signals with oscillating prices
        assert!(!signals.is_empty(), "grid should produce signals on oscillating data");
    }

    #[test]
    fn strategy_names_count() {
        assert_eq!(strategy_names().len(), 12);
    }
}
