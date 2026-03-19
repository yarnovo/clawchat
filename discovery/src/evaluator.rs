use clawchat_shared::candle::Candle;
use clawchat_shared::criteria::BacktestMetrics;
use clawchat_shared::indicators::{atr_from_slices, bollinger_bands, ema_from_slice, ema_update, rsi_from_slice};
use rayon::prelude::*;
use std::collections::HashMap;

// ── Config ──────────────────────────────────────────────────────

/// Backtest configuration
pub struct BacktestConfig {
    pub fee_rate: f64,
    pub slippage_pct: f64,
    pub initial_capital: f64,
    pub leverage: u32,
    pub position_size: f64,
}

impl Default for BacktestConfig {
    fn default() -> Self {
        Self {
            fee_rate: 0.0004,
            slippage_pct: 0.0002,
            initial_capital: 200.0,
            leverage: 3,
            position_size: 0.3,
        }
    }
}

// ── Internal types ──────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
enum Side {
    Long,
    Short,
}

#[derive(Debug, Clone)]
struct Position {
    side: Side,
    entry_price: f64,
    sl: f64,
    tp: Option<f64>,
    trailing: bool,
}

struct TradeRecord {
    #[allow(dead_code)]
    entry_price: f64,
    #[allow(dead_code)]
    exit_price: f64,
    #[allow(dead_code)]
    side: Side,
    pnl_pct: f64,
}

// ── Signal logic (mirrors engine strategies) ────────────────────

enum StrategySignal {
    Long,
    Short,
    None,
}

/// Lightweight trend follower (EMA crossover) — incremental
fn trend_signal(
    candle: &Candle,
    ema_fast: &mut Option<f64>,
    ema_slow: &mut Option<f64>,
    prev_fast_above: &mut Option<bool>,
    atr_val: &mut Option<f64>,
    prev_close: &mut Option<f64>,
    candle_count: &mut usize,
    params: &HashMap<String, f64>,
) -> (StrategySignal, f64) {
    let fast_period = params.get("ema_fast").copied().unwrap_or(21.0) as usize;
    let slow_period = params.get("ema_slow").copied().unwrap_or(55.0) as usize;
    let atr_period = params.get("atr_period").copied().unwrap_or(14.0) as usize;

    *candle_count += 1;

    let new_fast = ema_update(*ema_fast, candle.close, fast_period);
    let new_slow = ema_update(*ema_slow, candle.close, slow_period);

    // Incremental ATR
    let tr = {
        let hl = candle.high - candle.low;
        match *prev_close {
            Some(pc) => {
                let hc = (candle.high - pc).abs();
                let lc = (candle.low - pc).abs();
                hl.max(hc).max(lc)
            }
            None => hl,
        }
    };
    let k = 2.0 / (atr_period as f64 + 1.0);
    let new_atr = match *atr_val {
        Some(prev_atr) => prev_atr + k * (tr - prev_atr),
        None => tr,
    };

    *ema_fast = Some(new_fast);
    *ema_slow = Some(new_slow);
    *atr_val = Some(new_atr);
    *prev_close = Some(candle.close);

    if *candle_count < slow_period {
        *prev_fast_above = Some(new_fast > new_slow);
        return (StrategySignal::None, new_atr);
    }

    let fast_above = new_fast > new_slow;
    let signal = match *prev_fast_above {
        Some(was_above) if !was_above && fast_above => StrategySignal::Long,
        Some(was_above) if was_above && !fast_above => StrategySignal::Short,
        _ => StrategySignal::None,
    };

    *prev_fast_above = Some(fast_above);
    (signal, new_atr)
}

/// Lightweight breakout strategy — uses accumulated slices
fn breakout_signal(
    candle: &Candle,
    closes: &[f64],
    highs: &[f64],
    lows: &[f64],
    params: &HashMap<String, f64>,
) -> (StrategySignal, f64) {
    let lookback = params.get("lookback").copied().unwrap_or(48.0) as usize;
    let atr_period = params.get("atr_period").copied().unwrap_or(14.0) as usize;
    let atr_filter = params.get("atr_filter").copied().unwrap_or(0.3);

    let n = closes.len();
    if n < lookback + 1 {
        return (StrategySignal::None, 0.0);
    }

    let atr = match atr_from_slices(highs, lows, closes, atr_period) {
        Some(a) if a > 0.0 => a,
        _ => return (StrategySignal::None, 0.0),
    };

    let start = n - lookback - 1;
    let end = n - 1;
    let highest = highs[start..end]
        .iter()
        .cloned()
        .fold(f64::NEG_INFINITY, f64::max);
    let lowest = lows[start..end]
        .iter()
        .cloned()
        .fold(f64::INFINITY, f64::min);

    if candle.close > highest && (candle.close - highest) > atr * atr_filter {
        (StrategySignal::Long, atr)
    } else if candle.close < lowest && (lowest - candle.close) > atr * atr_filter {
        (StrategySignal::Short, atr)
    } else {
        (StrategySignal::None, atr)
    }
}

/// Lightweight RSI strategy — uses accumulated slices
fn rsi_signal(
    candle: &Candle,
    closes: &[f64],
    highs: &[f64],
    lows: &[f64],
    params: &HashMap<String, f64>,
) -> (StrategySignal, f64) {
    let rsi_period = params.get("rsi_period").copied().unwrap_or(14.0) as usize;
    let oversold = params.get("rsi_oversold").copied().unwrap_or(25.0);
    let overbought = params.get("rsi_overbought").copied().unwrap_or(75.0);
    let trend_ema_period = params.get("trend_ema").copied().unwrap_or(50.0) as usize;
    let atr_period = params.get("atr_period").copied().unwrap_or(14.0) as usize;

    let n = closes.len();
    let warmup = (rsi_period + 1).max(trend_ema_period + 1);
    if n < warmup {
        return (StrategySignal::None, 0.0);
    }

    let rsi = match rsi_from_slice(closes, rsi_period) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };
    let trend = match ema_from_slice(closes, trend_ema_period) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };
    let atr = match atr_from_slices(highs, lows, closes, atr_period) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };

    if rsi < oversold && candle.close > trend {
        (StrategySignal::Long, atr)
    } else if rsi > overbought && candle.close < trend {
        (StrategySignal::Short, atr)
    } else {
        (StrategySignal::None, atr)
    }
}

/// Lightweight grid strategy — price crossing grid lines triggers buy/sell
fn grid_signal(
    candle: &Candle,
    closes: &[f64],
    _highs: &[f64],
    _lows: &[f64],
    params: &HashMap<String, f64>,
) -> StrategySignal {
    let grids = params.get("grids").copied().unwrap_or(5.0) as usize;
    let lookback = params.get("lookback").copied().unwrap_or(50.0) as usize;

    let n = closes.len();
    if n < 2 {
        return StrategySignal::None;
    }

    // 需要至少 min(lookback, 50) 根才能构建网格
    if n < lookback.min(50) {
        return StrategySignal::None;
    }

    // 用最近 lookback 根的价格区间构建网格
    let window_size = n.min(lookback);
    let window = &closes[n - window_size..];
    let lo = window.iter().cloned().fold(f64::INFINITY, f64::min);
    let hi = window.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let margin = (hi - lo) * 0.1;
    let lo = lo - margin;
    let hi = hi + margin;
    let step = (hi - lo) / grids as f64;

    if step < 1e-12 {
        return StrategySignal::None;
    }

    let lines: Vec<f64> = (0..=grids).map(|i| lo + i as f64 * step).collect();

    let prev = closes[n - 2];
    let close = candle.close;

    // 价格向下穿过网格线 → 买入
    for &line in &lines {
        if prev >= line && close < line {
            return StrategySignal::Long;
        }
    }

    // 价格向上穿过网格线 → 卖出
    for &line in &lines {
        if prev <= line && close > line {
            return StrategySignal::Short;
        }
    }

    StrategySignal::None
}

/// Lightweight Bollinger Reversion strategy — uses accumulated slices
fn bollinger_reversion_signal(
    candle: &Candle,
    closes: &[f64],
    highs: &[f64],
    lows: &[f64],
    params: &HashMap<String, f64>,
) -> (StrategySignal, f64) {
    let bb_period = params.get("bb_period").copied().unwrap_or(20.0) as usize;
    let bb_std = params.get("bb_std").copied().unwrap_or(2.0);
    let rsi_period = params.get("rsi_period").copied().unwrap_or(14.0) as usize;
    let atr_period = params.get("atr_period").copied().unwrap_or(14.0) as usize;

    let n = closes.len();
    let warmup = bb_period.max(rsi_period + 1).max(atr_period + 1);
    if n < warmup {
        return (StrategySignal::None, 0.0);
    }

    let (upper, _middle, lower) = match bollinger_bands(closes, bb_period, bb_std) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };
    let rsi = match rsi_from_slice(closes, rsi_period) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };
    let atr = match atr_from_slices(highs, lows, closes, atr_period) {
        Some(v) => v,
        None => return (StrategySignal::None, 0.0),
    };

    // 做多：价格触及下轨 + RSI < 35
    if candle.close <= lower && rsi < 35.0 {
        (StrategySignal::Long, atr)
    // 做空：价格触及上轨 + RSI > 65
    } else if candle.close >= upper && rsi > 65.0 {
        (StrategySignal::Short, atr)
    } else {
        (StrategySignal::None, atr)
    }
}

// ── Backtest engine ─────────────────────────────────────────────

/// Run a single backtest with the given candles, strategy type, and parameters.
///
/// `strategy_type`: "default" (TrendFollower), "breakout", "rsi", "grid", "bollinger_reversion"
pub fn backtest(
    candles: &[Candle],
    strategy_type: &str,
    params: &HashMap<String, f64>,
    config: &BacktestConfig,
) -> Option<BacktestMetrics> {
    if candles.is_empty() {
        return None;
    }

    let atr_sl_mult = params.get("atr_sl_mult").copied().unwrap_or(1.5);
    let atr_tp_mult = params.get("atr_tp_mult").copied().unwrap_or(2.5);
    let trail_atr = params.get("trail_atr").copied().unwrap_or(3.0);

    let mut trades: Vec<TradeRecord> = Vec::new();
    let mut position: Option<Position> = None;
    let mut equity = config.initial_capital;
    let mut peak_equity = equity;
    let mut max_drawdown_pct: f64 = 0.0;

    // Daily return tracking
    let mut daily_equities: Vec<f64> = Vec::new();
    let mut last_day_ts: Option<u64> = None;

    // Trend strategy incremental state
    let mut ema_fast: Option<f64> = None;
    let mut ema_slow: Option<f64> = None;
    let mut prev_fast_above: Option<bool> = None;
    let mut atr_val: Option<f64> = None;
    let mut prev_close_trend: Option<f64> = None;
    let mut candle_count: usize = 0;

    // Breakout / RSI: accumulated history
    let mut closes: Vec<f64> = Vec::new();
    let mut highs_vec: Vec<f64> = Vec::new();
    let mut lows_vec: Vec<f64> = Vec::new();

    let is_breakout = strategy_type == "breakout";

    for candle in candles {
        // Track daily boundaries (86400000ms = 1 day)
        let day = candle.timestamp / 86_400_000;
        match last_day_ts {
            Some(last_day) if day != last_day => {
                daily_equities.push(equity);
            }
            None => {
                daily_equities.push(equity);
            }
            _ => {}
        }
        last_day_ts = Some(day);

        // Accumulate for breakout/rsi/grid
        if strategy_type == "breakout" || strategy_type == "rsi" || strategy_type == "grid" || strategy_type == "bollinger_reversion" {
            closes.push(candle.close);
            highs_vec.push(candle.high);
            lows_vec.push(candle.low);
        }

        // Check position exit
        if let Some(ref mut pos) = position {
            let exit = match (pos.side, pos.trailing) {
                (Side::Long, false) => {
                    candle.close <= pos.sl || pos.tp.is_some_and(|tp| candle.close >= tp)
                }
                (Side::Short, false) => {
                    candle.close >= pos.sl || pos.tp.is_some_and(|tp| candle.close <= tp)
                }
                (Side::Long, true) => {
                    let atr = atr_from_slices(
                        &highs_vec,
                        &lows_vec,
                        &closes,
                        params.get("atr_period").copied().unwrap_or(14.0) as usize,
                    )
                    .unwrap_or(0.0);
                    let new_stop = candle.close - atr * trail_atr;
                    if new_stop > pos.sl {
                        pos.sl = new_stop;
                    }
                    candle.close <= pos.sl
                }
                (Side::Short, true) => {
                    let atr = atr_from_slices(
                        &highs_vec,
                        &lows_vec,
                        &closes,
                        params.get("atr_period").copied().unwrap_or(14.0) as usize,
                    )
                    .unwrap_or(0.0);
                    let new_stop = candle.close + atr * trail_atr;
                    if new_stop < pos.sl {
                        pos.sl = new_stop;
                    }
                    candle.close >= pos.sl
                }
            };

            if exit {
                let close_side = match pos.side {
                    Side::Long => Side::Short,
                    Side::Short => Side::Long,
                };
                let exit_price = apply_slippage(candle.close, close_side, config.slippage_pct);
                let pnl_pct = calc_trade_pnl(
                    pos.entry_price,
                    exit_price,
                    pos.side,
                    config.fee_rate,
                    config.leverage,
                );
                let position_capital = equity * config.position_size;
                equity += position_capital * pnl_pct;

                trades.push(TradeRecord {
                    entry_price: pos.entry_price,
                    exit_price,
                    side: pos.side,
                    pnl_pct,
                });
                position = None;

                if equity > peak_equity {
                    peak_equity = equity;
                }
                let dd = (peak_equity - equity) / peak_equity * 100.0;
                if dd > max_drawdown_pct {
                    max_drawdown_pct = dd;
                }
                continue;
            }
        }

        // Skip signal if in position
        if position.is_some() {
            continue;
        }

        // Generate signal
        let (signal, atr) = match strategy_type {
            "default" => trend_signal(
                candle,
                &mut ema_fast,
                &mut ema_slow,
                &mut prev_fast_above,
                &mut atr_val,
                &mut prev_close_trend,
                &mut candle_count,
                params,
            ),
            "breakout" => breakout_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "rsi" => rsi_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "bollinger_reversion" => bollinger_reversion_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "grid" => {
                let sig = grid_signal(candle, &closes, &highs_vec, &lows_vec, params);
                (sig, 0.0)
            }
            _ => (StrategySignal::None, 0.0),
        };

        let is_grid = strategy_type == "grid";

        match signal {
            StrategySignal::Long => {
                let entry_price = apply_slippage(candle.close, Side::Long, config.slippage_pct);
                let (sl, tp) = if is_grid {
                    (0.0, None)
                } else if is_breakout {
                    (entry_price - atr * trail_atr, None)
                } else {
                    (
                        entry_price - atr * atr_sl_mult,
                        Some(entry_price + atr * atr_tp_mult),
                    )
                };
                position = Some(Position {
                    side: Side::Long,
                    entry_price,
                    sl,
                    tp,
                    trailing: is_breakout,
                });
            }
            StrategySignal::Short => {
                let entry_price = apply_slippage(candle.close, Side::Short, config.slippage_pct);
                let (sl, tp) = if is_grid {
                    (f64::MAX, None)
                } else if is_breakout {
                    (entry_price + atr * trail_atr, None)
                } else {
                    (
                        entry_price + atr * atr_sl_mult,
                        Some(entry_price - atr * atr_tp_mult),
                    )
                };
                position = Some(Position {
                    side: Side::Short,
                    entry_price,
                    sl,
                    tp,
                    trailing: is_breakout,
                });
            }
            StrategySignal::None => {}
        }
    }

    // Close remaining position at last candle
    if let Some(pos) = position {
        if let Some(last) = candles.last() {
            let close_side = match pos.side {
                Side::Long => Side::Short,
                Side::Short => Side::Long,
            };
            let exit_price = apply_slippage(last.close, close_side, config.slippage_pct);
            let pnl_pct = calc_trade_pnl(
                pos.entry_price,
                exit_price,
                pos.side,
                config.fee_rate,
                config.leverage,
            );
            let position_capital = equity * config.position_size;
            equity += position_capital * pnl_pct;

            trades.push(TradeRecord {
                entry_price: pos.entry_price,
                exit_price,
                side: pos.side,
                pnl_pct,
            });

            if equity > peak_equity {
                peak_equity = equity;
            }
            let dd = (peak_equity - equity) / peak_equity * 100.0;
            if dd > max_drawdown_pct {
                max_drawdown_pct = dd;
            }
        }
    }

    // Final daily equity snapshot
    daily_equities.push(equity);

    if trades.is_empty() {
        return None;
    }

    let total_trades = trades.len() as u32;
    let winning = trades.iter().filter(|t| t.pnl_pct > 0.0).count();
    let win_rate = winning as f64 / total_trades as f64 * 100.0;

    let gross_profit: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct > 0.0)
        .map(|t| t.pnl_pct)
        .sum();
    let gross_loss: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct < 0.0)
        .map(|t| t.pnl_pct.abs())
        .sum();
    let profit_factor = if gross_loss > 0.0 {
        gross_profit / gross_loss
    } else if gross_profit > 0.0 {
        f64::INFINITY
    } else {
        0.0
    };

    let roi = (equity / config.initial_capital - 1.0) * 100.0;
    let sharpe = calc_sharpe(&daily_equities);

    Some(BacktestMetrics {
        roi,
        sharpe,
        max_drawdown_pct,
        total_trades,
        win_rate,
        profit_factor,
    })
}

/// Run backtest for multiple parameter sets in parallel using rayon.
pub fn backtest_batch(
    candles: &[Candle],
    strategy_type: &str,
    param_sets: &[HashMap<String, f64>],
    config: &BacktestConfig,
) -> Vec<(HashMap<String, f64>, Option<BacktestMetrics>)> {
    param_sets
        .par_iter()
        .map(|params| {
            let metrics = backtest(candles, strategy_type, params, config);
            (params.clone(), metrics)
        })
        .collect()
}

// ── Optimized batch backtest ────────────────────────────────────

/// Precomputed indicator series for TrendFollower strategy.
/// Computed once per unique (ema_fast, ema_slow, atr_period) combination.
struct PrecomputedTrendIndicators {
    #[allow(dead_code)]
    ema_fast_values: Vec<f64>,
    #[allow(dead_code)]
    ema_slow_values: Vec<f64>,
    atr_values: Vec<f64>,
    signals: Vec<i8>,
    #[allow(dead_code)]
    warmup: usize,
}

/// Indicator-defining parameters for grouping (TrendFollower).
#[derive(Hash, Eq, PartialEq, Clone)]
struct TrendIndicatorKey {
    ema_fast: u64,   // f64 bits
    ema_slow: u64,   // f64 bits
    atr_period: u64, // f64 bits
}

fn f64_key(v: f64) -> u64 {
    v.to_bits()
}

/// Precompute indicator series for a TrendFollower (ema_fast, ema_slow, atr_period)
/// over ALL candles, independent of position state.
fn precompute_trend_indicators(
    candles: &[Candle],
    ema_fast_period: usize,
    ema_slow_period: usize,
    atr_period: usize,
) -> PrecomputedTrendIndicators {
    let n = candles.len();
    let mut ema_fast_values = Vec::with_capacity(n);
    let mut ema_slow_values = Vec::with_capacity(n);
    let mut atr_values = Vec::with_capacity(n);
    let mut signals = Vec::with_capacity(n);

    let mut ema_fast: Option<f64> = None;
    let mut ema_slow: Option<f64> = None;
    let mut atr_val: Option<f64> = None;
    let mut prev_close: Option<f64> = None;
    let mut prev_fast_above: Option<bool> = None;

    let k_atr = 2.0 / (atr_period as f64 + 1.0);

    for (i, candle) in candles.iter().enumerate() {
        // EMA updates
        let new_fast = ema_update(ema_fast, candle.close, ema_fast_period);
        let new_slow = ema_update(ema_slow, candle.close, ema_slow_period);

        // Incremental ATR (same logic as trend_signal)
        let tr = {
            let hl = candle.high - candle.low;
            match prev_close {
                Some(pc) => {
                    let hc = (candle.high - pc).abs();
                    let lc = (candle.low - pc).abs();
                    hl.max(hc).max(lc)
                }
                None => hl,
            }
        };
        let new_atr = match atr_val {
            Some(prev_atr) => prev_atr + k_atr * (tr - prev_atr),
            None => tr,
        };

        ema_fast = Some(new_fast);
        ema_slow = Some(new_slow);
        atr_val = Some(new_atr);
        prev_close = Some(candle.close);

        ema_fast_values.push(new_fast);
        ema_slow_values.push(new_slow);
        atr_values.push(new_atr);

        // Signal detection (crossover)
        if i + 1 < ema_slow_period {
            // Warmup period — no signal
            prev_fast_above = Some(new_fast > new_slow);
            signals.push(0);
        } else {
            let fast_above = new_fast > new_slow;
            let signal = match prev_fast_above {
                Some(was_above) if !was_above && fast_above => 1i8,  // Long
                Some(was_above) if was_above && !fast_above => -1i8, // Short
                _ => 0i8,
            };
            prev_fast_above = Some(fast_above);
            signals.push(signal);
        }
    }

    PrecomputedTrendIndicators {
        ema_fast_values,
        ema_slow_values,
        atr_values,
        signals,
        warmup: ema_slow_period,
    }
}

/// Run backtest using precomputed indicators (TrendFollower only).
/// Only SL/TP parameters vary; indicator values are shared.
fn backtest_with_precomputed_trend(
    candles: &[Candle],
    indicators: &PrecomputedTrendIndicators,
    atr_sl_mult: f64,
    atr_tp_mult: f64,
    config: &BacktestConfig,
) -> Option<BacktestMetrics> {
    if candles.is_empty() {
        return None;
    }

    let n = candles.len();
    let checkpoint_30 = n * 30 / 100;
    let checkpoint_60 = n * 60 / 100;

    let mut trades: Vec<TradeRecord> = Vec::new();
    let mut position: Option<Position> = None;
    let mut equity = config.initial_capital;
    let mut peak_equity = equity;
    let mut max_drawdown_pct: f64 = 0.0;

    let mut daily_equities: Vec<f64> = Vec::new();
    let mut last_day_ts: Option<u64> = None;

    for (i, candle) in candles.iter().enumerate() {
        // Track daily boundaries
        let day = candle.timestamp / 86_400_000;
        match last_day_ts {
            Some(last_day) if day != last_day => {
                daily_equities.push(equity);
            }
            None => {
                daily_equities.push(equity);
            }
            _ => {}
        }
        last_day_ts = Some(day);

        // Check position exit
        if let Some(ref mut pos) = position {
            let exit = match pos.side {
                Side::Long => {
                    candle.close <= pos.sl || pos.tp.is_some_and(|tp| candle.close >= tp)
                }
                Side::Short => {
                    candle.close >= pos.sl || pos.tp.is_some_and(|tp| candle.close <= tp)
                }
            };

            if exit {
                let close_side = match pos.side {
                    Side::Long => Side::Short,
                    Side::Short => Side::Long,
                };
                let exit_price = apply_slippage(candle.close, close_side, config.slippage_pct);
                let pnl_pct = calc_trade_pnl(
                    pos.entry_price,
                    exit_price,
                    pos.side,
                    config.fee_rate,
                    config.leverage,
                );
                let position_capital = equity * config.position_size;
                equity += position_capital * pnl_pct;

                trades.push(TradeRecord {
                    entry_price: pos.entry_price,
                    exit_price,
                    side: pos.side,
                    pnl_pct,
                });
                position = None;

                if equity > peak_equity {
                    peak_equity = equity;
                }
                let dd = (peak_equity - equity) / peak_equity * 100.0;
                if dd > max_drawdown_pct {
                    max_drawdown_pct = dd;
                }
                continue;
            }
        }

        // Skip signal if in position
        if position.is_some() {
            continue;
        }

        // Use precomputed signal and ATR
        let signal = indicators.signals[i];
        let atr = indicators.atr_values[i];

        if signal == 1 {
            // Long
            let entry_price = apply_slippage(candle.close, Side::Long, config.slippage_pct);
            position = Some(Position {
                side: Side::Long,
                entry_price,
                sl: entry_price - atr * atr_sl_mult,
                tp: Some(entry_price + atr * atr_tp_mult),
                trailing: false,
            });
        } else if signal == -1 {
            // Short
            let entry_price = apply_slippage(candle.close, Side::Short, config.slippage_pct);
            position = Some(Position {
                side: Side::Short,
                entry_price,
                sl: entry_price + atr * atr_sl_mult,
                tp: Some(entry_price - atr * atr_tp_mult),
                trailing: false,
            });
        }

        // Early pruning checkpoints
        if i == checkpoint_30 {
            let current_roi = (equity / config.initial_capital - 1.0) * 100.0;
            if max_drawdown_pct > 30.0 || current_roi < -20.0 {
                return None;
            }
        } else if i == checkpoint_60 {
            let current_roi = (equity / config.initial_capital - 1.0) * 100.0;
            if max_drawdown_pct > 25.0 || current_roi < -10.0 {
                return None;
            }
        }
    }

    // Close remaining position at last candle
    if let Some(pos) = position {
        if let Some(last) = candles.last() {
            let close_side = match pos.side {
                Side::Long => Side::Short,
                Side::Short => Side::Long,
            };
            let exit_price = apply_slippage(last.close, close_side, config.slippage_pct);
            let pnl_pct = calc_trade_pnl(
                pos.entry_price,
                exit_price,
                pos.side,
                config.fee_rate,
                config.leverage,
            );
            let position_capital = equity * config.position_size;
            equity += position_capital * pnl_pct;

            trades.push(TradeRecord {
                entry_price: pos.entry_price,
                exit_price,
                side: pos.side,
                pnl_pct,
            });

            if equity > peak_equity {
                peak_equity = equity;
            }
            let dd = (peak_equity - equity) / peak_equity * 100.0;
            if dd > max_drawdown_pct {
                max_drawdown_pct = dd;
            }
        }
    }

    daily_equities.push(equity);

    if trades.is_empty() {
        return None;
    }

    let total_trades = trades.len() as u32;
    let winning = trades.iter().filter(|t| t.pnl_pct > 0.0).count();
    let win_rate = winning as f64 / total_trades as f64 * 100.0;

    let gross_profit: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct > 0.0)
        .map(|t| t.pnl_pct)
        .sum();
    let gross_loss: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct < 0.0)
        .map(|t| t.pnl_pct.abs())
        .sum();
    let profit_factor = if gross_loss > 0.0 {
        gross_profit / gross_loss
    } else if gross_profit > 0.0 {
        f64::INFINITY
    } else {
        0.0
    };

    let roi = (equity / config.initial_capital - 1.0) * 100.0;
    let sharpe = calc_sharpe(&daily_equities);

    Some(BacktestMetrics {
        roi,
        sharpe,
        max_drawdown_pct,
        total_trades,
        win_rate,
        profit_factor,
    })
}

/// Optimized batch backtest with two improvements:
/// 1. Incremental indicator precomputation — for TrendFollower, groups params by
///    (ema_fast, ema_slow, atr_period) and precomputes indicators once per group.
///    Different (atr_sl_mult, atr_tp_mult) variants share the same indicators.
/// 2. Early pruning — built into `backtest_with_precomputed_trend`.
///
/// Falls back to standard `backtest` (with early pruning) for non-TrendFollower strategies.
pub fn backtest_batch_optimized(
    candles: &[Candle],
    strategy_type: &str,
    param_sets: &[HashMap<String, f64>],
    config: &BacktestConfig,
) -> Vec<(HashMap<String, f64>, Option<BacktestMetrics>)> {
    if strategy_type != "default" {
        // Non-trend strategies: use standard backtest with early pruning
        return param_sets
            .par_iter()
            .map(|params| {
                let metrics = backtest_with_pruning(candles, strategy_type, params, config);
                (params.clone(), metrics)
            })
            .collect();
    }

    // TrendFollower: group by indicator params, precompute, then fan out SL/TP
    let mut groups: HashMap<TrendIndicatorKey, Vec<&HashMap<String, f64>>> = HashMap::new();
    for params in param_sets {
        let key = TrendIndicatorKey {
            ema_fast: f64_key(params.get("ema_fast").copied().unwrap_or(21.0)),
            ema_slow: f64_key(params.get("ema_slow").copied().unwrap_or(55.0)),
            atr_period: f64_key(params.get("atr_period").copied().unwrap_or(14.0)),
        };
        groups.entry(key).or_default().push(params);
    }

    let group_list: Vec<(TrendIndicatorKey, Vec<&HashMap<String, f64>>)> =
        groups.into_iter().collect();

    group_list
        .par_iter()
        .flat_map(|(key, variants)| {
            let ema_fast_period = f64::from_bits(key.ema_fast) as usize;
            let ema_slow_period = f64::from_bits(key.ema_slow) as usize;
            let atr_period = f64::from_bits(key.atr_period) as usize;

            let indicators = precompute_trend_indicators(
                candles,
                ema_fast_period,
                ema_slow_period,
                atr_period,
            );

            variants
                .iter()
                .map(|params| {
                    let atr_sl_mult = params.get("atr_sl_mult").copied().unwrap_or(1.5);
                    let atr_tp_mult = params.get("atr_tp_mult").copied().unwrap_or(2.5);
                    let metrics = backtest_with_precomputed_trend(
                        candles,
                        &indicators,
                        atr_sl_mult,
                        atr_tp_mult,
                        config,
                    );
                    ((*params).clone(), metrics)
                })
                .collect::<Vec<_>>()
        })
        .collect()
}

/// Backtest with early pruning (for non-TrendFollower strategies).
/// Same as `backtest` but returns None early if intermediate metrics are terrible.
fn backtest_with_pruning(
    candles: &[Candle],
    strategy_type: &str,
    params: &HashMap<String, f64>,
    config: &BacktestConfig,
) -> Option<BacktestMetrics> {
    if candles.is_empty() {
        return None;
    }

    let atr_sl_mult = params.get("atr_sl_mult").copied().unwrap_or(1.5);
    let atr_tp_mult = params.get("atr_tp_mult").copied().unwrap_or(2.5);
    let trail_atr = params.get("trail_atr").copied().unwrap_or(3.0);

    let n = candles.len();
    let checkpoint_30 = n * 30 / 100;
    let checkpoint_60 = n * 60 / 100;

    let mut trades: Vec<TradeRecord> = Vec::new();
    let mut position: Option<Position> = None;
    let mut equity = config.initial_capital;
    let mut peak_equity = equity;
    let mut max_drawdown_pct: f64 = 0.0;

    let mut daily_equities: Vec<f64> = Vec::new();
    let mut last_day_ts: Option<u64> = None;

    let mut ema_fast: Option<f64> = None;
    let mut ema_slow: Option<f64> = None;
    let mut prev_fast_above: Option<bool> = None;
    let mut atr_val: Option<f64> = None;
    let mut prev_close_trend: Option<f64> = None;
    let mut candle_count: usize = 0;

    let mut closes: Vec<f64> = Vec::new();
    let mut highs_vec: Vec<f64> = Vec::new();
    let mut lows_vec: Vec<f64> = Vec::new();

    let is_breakout = strategy_type == "breakout";

    for (i, candle) in candles.iter().enumerate() {
        let day = candle.timestamp / 86_400_000;
        match last_day_ts {
            Some(last_day) if day != last_day => {
                daily_equities.push(equity);
            }
            None => {
                daily_equities.push(equity);
            }
            _ => {}
        }
        last_day_ts = Some(day);

        if strategy_type == "breakout" || strategy_type == "rsi" || strategy_type == "grid" || strategy_type == "bollinger_reversion" {
            closes.push(candle.close);
            highs_vec.push(candle.high);
            lows_vec.push(candle.low);
        }

        if let Some(ref mut pos) = position {
            let exit = match (pos.side, pos.trailing) {
                (Side::Long, false) => {
                    candle.close <= pos.sl || pos.tp.is_some_and(|tp| candle.close >= tp)
                }
                (Side::Short, false) => {
                    candle.close >= pos.sl || pos.tp.is_some_and(|tp| candle.close <= tp)
                }
                (Side::Long, true) => {
                    let atr = atr_from_slices(
                        &highs_vec,
                        &lows_vec,
                        &closes,
                        params.get("atr_period").copied().unwrap_or(14.0) as usize,
                    )
                    .unwrap_or(0.0);
                    let new_stop = candle.close - atr * trail_atr;
                    if new_stop > pos.sl {
                        pos.sl = new_stop;
                    }
                    candle.close <= pos.sl
                }
                (Side::Short, true) => {
                    let atr = atr_from_slices(
                        &highs_vec,
                        &lows_vec,
                        &closes,
                        params.get("atr_period").copied().unwrap_or(14.0) as usize,
                    )
                    .unwrap_or(0.0);
                    let new_stop = candle.close + atr * trail_atr;
                    if new_stop < pos.sl {
                        pos.sl = new_stop;
                    }
                    candle.close >= pos.sl
                }
            };

            if exit {
                let close_side = match pos.side {
                    Side::Long => Side::Short,
                    Side::Short => Side::Long,
                };
                let exit_price = apply_slippage(candle.close, close_side, config.slippage_pct);
                let pnl_pct = calc_trade_pnl(
                    pos.entry_price,
                    exit_price,
                    pos.side,
                    config.fee_rate,
                    config.leverage,
                );
                let position_capital = equity * config.position_size;
                equity += position_capital * pnl_pct;

                trades.push(TradeRecord {
                    entry_price: pos.entry_price,
                    exit_price,
                    side: pos.side,
                    pnl_pct,
                });
                position = None;

                if equity > peak_equity {
                    peak_equity = equity;
                }
                let dd = (peak_equity - equity) / peak_equity * 100.0;
                if dd > max_drawdown_pct {
                    max_drawdown_pct = dd;
                }
                continue;
            }
        }

        if position.is_some() {
            continue;
        }

        let (signal, atr) = match strategy_type {
            "default" => trend_signal(
                candle,
                &mut ema_fast,
                &mut ema_slow,
                &mut prev_fast_above,
                &mut atr_val,
                &mut prev_close_trend,
                &mut candle_count,
                params,
            ),
            "breakout" => breakout_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "rsi" => rsi_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "bollinger_reversion" => bollinger_reversion_signal(candle, &closes, &highs_vec, &lows_vec, params),
            "grid" => {
                let sig = grid_signal(candle, &closes, &highs_vec, &lows_vec, params);
                (sig, 0.0)
            }
            _ => (StrategySignal::None, 0.0),
        };

        let is_grid = strategy_type == "grid";

        match signal {
            StrategySignal::Long => {
                let entry_price = apply_slippage(candle.close, Side::Long, config.slippage_pct);
                let (sl, tp) = if is_grid {
                    (0.0, None)
                } else if is_breakout {
                    (entry_price - atr * trail_atr, None)
                } else {
                    (
                        entry_price - atr * atr_sl_mult,
                        Some(entry_price + atr * atr_tp_mult),
                    )
                };
                position = Some(Position {
                    side: Side::Long,
                    entry_price,
                    sl,
                    tp,
                    trailing: is_breakout,
                });
            }
            StrategySignal::Short => {
                let entry_price = apply_slippage(candle.close, Side::Short, config.slippage_pct);
                let (sl, tp) = if is_grid {
                    (f64::MAX, None)
                } else if is_breakout {
                    (entry_price + atr * trail_atr, None)
                } else {
                    (
                        entry_price + atr * atr_sl_mult,
                        Some(entry_price - atr * atr_tp_mult),
                    )
                };
                position = Some(Position {
                    side: Side::Short,
                    entry_price,
                    sl,
                    tp,
                    trailing: is_breakout,
                });
            }
            StrategySignal::None => {}
        }

        // Early pruning checkpoints
        if i == checkpoint_30 {
            let current_roi = (equity / config.initial_capital - 1.0) * 100.0;
            if max_drawdown_pct > 30.0 || current_roi < -20.0 {
                return None;
            }
        } else if i == checkpoint_60 {
            let current_roi = (equity / config.initial_capital - 1.0) * 100.0;
            if max_drawdown_pct > 25.0 || current_roi < -10.0 {
                return None;
            }
        }
    }

    // Close remaining position at last candle
    if let Some(pos) = position {
        if let Some(last) = candles.last() {
            let close_side = match pos.side {
                Side::Long => Side::Short,
                Side::Short => Side::Long,
            };
            let exit_price = apply_slippage(last.close, close_side, config.slippage_pct);
            let pnl_pct = calc_trade_pnl(
                pos.entry_price,
                exit_price,
                pos.side,
                config.fee_rate,
                config.leverage,
            );
            let position_capital = equity * config.position_size;
            equity += position_capital * pnl_pct;

            trades.push(TradeRecord {
                entry_price: pos.entry_price,
                exit_price,
                side: pos.side,
                pnl_pct,
            });

            if equity > peak_equity {
                peak_equity = equity;
            }
            let dd = (peak_equity - equity) / peak_equity * 100.0;
            if dd > max_drawdown_pct {
                max_drawdown_pct = dd;
            }
        }
    }

    daily_equities.push(equity);

    if trades.is_empty() {
        return None;
    }

    let total_trades = trades.len() as u32;
    let winning = trades.iter().filter(|t| t.pnl_pct > 0.0).count();
    let win_rate = winning as f64 / total_trades as f64 * 100.0;

    let gross_profit: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct > 0.0)
        .map(|t| t.pnl_pct)
        .sum();
    let gross_loss: f64 = trades
        .iter()
        .filter(|t| t.pnl_pct < 0.0)
        .map(|t| t.pnl_pct.abs())
        .sum();
    let profit_factor = if gross_loss > 0.0 {
        gross_profit / gross_loss
    } else if gross_profit > 0.0 {
        f64::INFINITY
    } else {
        0.0
    };

    let roi = (equity / config.initial_capital - 1.0) * 100.0;
    let sharpe = calc_sharpe(&daily_equities);

    Some(BacktestMetrics {
        roi,
        sharpe,
        max_drawdown_pct,
        total_trades,
        win_rate,
        profit_factor,
    })
}

// ── Helpers ─────────────────────────────────────────────────────

fn apply_slippage(price: f64, side: Side, slippage_pct: f64) -> f64 {
    match side {
        Side::Long => price * (1.0 + slippage_pct),
        Side::Short => price * (1.0 - slippage_pct),
    }
}

fn calc_trade_pnl(entry: f64, exit: f64, side: Side, fee_rate: f64, leverage: u32) -> f64 {
    let raw_pnl = match side {
        Side::Long => (exit - entry) / entry,
        Side::Short => (entry - exit) / entry,
    };
    let fees = fee_rate * 2.0; // entry + exit
    (raw_pnl - fees) * leverage as f64
}

fn calc_sharpe(daily_equities: &[f64]) -> f64 {
    if daily_equities.len() < 2 {
        return 0.0;
    }

    let returns: Vec<f64> = daily_equities
        .windows(2)
        .map(|w| (w[1] - w[0]) / w[0])
        .collect();

    if returns.is_empty() {
        return 0.0;
    }

    let n = returns.len() as f64;
    let mean = returns.iter().sum::<f64>() / n;
    let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / n;
    let std = variance.sqrt();

    if std < 1e-12 {
        return 0.0;
    }

    mean / std * (365.0_f64).sqrt()
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_candle(open: f64, high: f64, low: f64, close: f64, ts: u64) -> Candle {
        Candle {
            open,
            high,
            low,
            close,
            volume: 100.0,
            timestamp: ts,
        }
    }

    fn trending_up_candles(n: usize, start_price: f64) -> Vec<Candle> {
        (0..n)
            .map(|i| {
                let price = start_price + i as f64 * 0.5;
                make_candle(
                    price - 0.2,
                    price + 1.0,
                    price - 1.0,
                    price,
                    i as u64 * 300_000,
                )
            })
            .collect()
    }

    fn oscillating_candles(n: usize, base: f64, amplitude: f64) -> Vec<Candle> {
        (0..n)
            .map(|i| {
                let price = base + amplitude * (i as f64 * 0.3).sin();
                make_candle(
                    price - 0.1,
                    price + 1.5,
                    price - 1.5,
                    price,
                    i as u64 * 300_000,
                )
            })
            .collect()
    }

    // 1. TrendFollower: verify produces trades on clear trend
    #[test]
    fn trend_backtest_produces_trades() {
        let mut candles = Vec::new();
        for i in 0..60 {
            let price = 100.0;
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        for i in 60..120 {
            let price = 100.0 + (i - 60) as f64 * 2.0;
            candles.push(make_candle(price - 1.0, price + 1.0, price - 1.0, price, i * 300_000));
        }
        for i in 120..180 {
            let price = 220.0 - (i - 120) as f64 * 2.0;
            candles.push(make_candle(price + 1.0, price + 1.0, price - 1.0, price, i * 300_000));
        }

        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 10.0),
            ("ema_slow".into(), 30.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 1.5),
            ("atr_tp_mult".into(), 5.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig::default();
        let result = backtest(&candles, "default", &params, &config);
        assert!(result.is_some(), "trend backtest should produce trades");
        let m = result.unwrap();
        assert!(m.total_trades > 0);
    }

    // 2. Breakout: verify breakout signal and trailing stop
    #[test]
    fn breakout_backtest_produces_trades() {
        let mut candles = Vec::new();
        for i in 0..60 {
            let price = 100.0 + (i as f64 * 0.1).sin();
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        for i in 60..80 {
            let price = 105.0 + (i - 60) as f64 * 3.0;
            candles.push(make_candle(price - 1.0, price + 2.0, price - 2.0, price, i * 300_000));
        }
        for i in 80..120 {
            let price = 165.0 - (i - 80) as f64 * 3.0;
            candles.push(make_candle(price + 1.0, price + 2.0, price - 2.0, price, i * 300_000));
        }

        let params: HashMap<String, f64> = [
            ("lookback".into(), 48.0),
            ("atr_period".into(), 14.0),
            ("atr_filter".into(), 0.3),
            ("trail_atr".into(), 3.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig::default();
        let result = backtest(&candles, "breakout", &params, &config);
        assert!(result.is_some(), "breakout backtest should produce trades");
        let m = result.unwrap();
        assert!(m.total_trades > 0);
    }

    // 3. RSI: verify no panic on oscillating data
    #[test]
    fn rsi_backtest_no_panic() {
        let candles = oscillating_candles(200, 100.0, 15.0);

        let params: HashMap<String, f64> = [
            ("rsi_period".into(), 14.0),
            ("rsi_oversold".into(), 30.0),
            ("rsi_overbought".into(), 70.0),
            ("trend_ema".into(), 50.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 2.0),
            ("atr_tp_mult".into(), 4.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig::default();
        let _result = backtest(&candles, "rsi", &params, &config);
        // No panic = pass
    }

    // 4. Metrics correctness: ROI bounds
    #[test]
    fn metrics_roi_calculation() {
        let candles = trending_up_candles(200, 10.0);
        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 10.0),
            ("ema_slow".into(), 30.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 1.0),
            ("atr_tp_mult".into(), 10.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig {
            fee_rate: 0.0,
            slippage_pct: 0.0,
            initial_capital: 100.0,
            leverage: 1,
            position_size: 1.0,
        };

        let result = backtest(&candles, "default", &params, &config);
        if let Some(m) = result {
            assert!(m.roi > -100.0, "ROI should be within reasonable bounds");
            assert!(m.max_drawdown_pct >= 0.0, "drawdown should be non-negative");
            assert!(m.win_rate >= 0.0 && m.win_rate <= 100.0);
        }
    }

    // 5. Fees reduce ROI
    #[test]
    fn fees_reduce_roi() {
        let candles = trending_up_candles(200, 10.0);
        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 10.0),
            ("ema_slow".into(), 30.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 1.5),
            ("atr_tp_mult".into(), 5.0),
        ]
        .into_iter()
        .collect();

        let no_fee_config = BacktestConfig {
            fee_rate: 0.0,
            slippage_pct: 0.0,
            initial_capital: 200.0,
            leverage: 3,
            position_size: 0.3,
        };
        let fee_config = BacktestConfig {
            fee_rate: 0.001,
            slippage_pct: 0.001,
            initial_capital: 200.0,
            leverage: 3,
            position_size: 0.3,
        };

        let r1 = backtest(&candles, "default", &params, &no_fee_config);
        let r2 = backtest(&candles, "default", &params, &fee_config);

        match (r1, r2) {
            (Some(m1), Some(m2)) => {
                assert!(
                    m1.roi > m2.roi,
                    "no-fee ROI ({}) should exceed with-fee ROI ({})",
                    m1.roi,
                    m2.roi
                );
            }
            _ => {}
        }
    }

    // 6. Empty / insufficient data doesn't panic
    #[test]
    fn empty_candles_returns_none() {
        let params = HashMap::new();
        let config = BacktestConfig::default();
        assert!(backtest(&[], "default", &params, &config).is_none());
        assert!(backtest(&[], "breakout", &params, &config).is_none());
        assert!(backtest(&[], "rsi", &params, &config).is_none());
    }

    #[test]
    fn insufficient_warmup_returns_none() {
        let candles: Vec<Candle> = (0..5)
            .map(|i| make_candle(100.0, 101.0, 99.0, 100.0, i * 300_000))
            .collect();
        let params: HashMap<String, f64> = [("ema_slow".into(), 55.0)].into_iter().collect();
        let config = BacktestConfig::default();
        let result = backtest(&candles, "default", &params, &config);
        assert!(result.is_none(), "insufficient warmup should return None");
    }

    // 7. Batch parallel matches serial
    #[test]
    fn batch_matches_serial() {
        let candles = trending_up_candles(150, 10.0);
        let param_sets: Vec<HashMap<String, f64>> = vec![
            [("ema_fast".into(), 10.0), ("ema_slow".into(), 30.0)]
                .into_iter()
                .collect(),
            [("ema_fast".into(), 15.0), ("ema_slow".into(), 40.0)]
                .into_iter()
                .collect(),
            [("ema_fast".into(), 21.0), ("ema_slow".into(), 55.0)]
                .into_iter()
                .collect(),
        ];

        let config = BacktestConfig::default();

        let serial_results: Vec<Option<BacktestMetrics>> = param_sets
            .iter()
            .map(|p| backtest(&candles, "default", p, &config))
            .collect();

        let batch_results = backtest_batch(&candles, "default", &param_sets, &config);

        assert_eq!(serial_results.len(), batch_results.len());

        for (i, (_, batch_metric)) in batch_results.iter().enumerate() {
            match (&serial_results[i], batch_metric) {
                (Some(s), Some(b)) => {
                    assert!(
                        (s.roi - b.roi).abs() < 1e-9,
                        "ROI mismatch at index {}: serial={}, batch={}",
                        i,
                        s.roi,
                        b.roi
                    );
                    assert_eq!(s.total_trades, b.total_trades);
                }
                (None, None) => {}
                _ => panic!("serial/batch mismatch at index {}", i),
            }
        }
    }

    // Sharpe calculation
    #[test]
    fn sharpe_zero_for_flat() {
        let equities = vec![100.0, 100.0, 100.0, 100.0];
        assert_eq!(calc_sharpe(&equities), 0.0);
    }

    #[test]
    fn sharpe_positive_for_noisy_growth() {
        // Slightly noisy growth so std > 0
        let equities: Vec<f64> = (0..30)
            .map(|i| {
                let noise = if i % 3 == 0 { 0.005 } else { 0.015 };
                100.0 * (1.0_f64 + noise).powi(i)
            })
            .collect();
        let s = calc_sharpe(&equities);
        assert!(s > 0.0, "sharpe should be positive for noisy growth: {}", s);
    }

    // Trade PnL helper
    #[test]
    fn pnl_long_profit() {
        let pnl = calc_trade_pnl(100.0, 110.0, Side::Long, 0.0, 1);
        assert!((pnl - 0.1).abs() < 1e-9);
    }

    #[test]
    fn pnl_short_profit() {
        let pnl = calc_trade_pnl(100.0, 90.0, Side::Short, 0.0, 1);
        assert!((pnl - 0.1).abs() < 1e-9);
    }

    #[test]
    fn pnl_with_fees_and_leverage() {
        let pnl = calc_trade_pnl(100.0, 110.0, Side::Long, 0.001, 3);
        // (0.1 - 0.002) * 3 = 0.294
        assert!((pnl - 0.294).abs() < 1e-9);
    }

    #[test]
    fn slippage_applied_correctly() {
        let buy_price = apply_slippage(100.0, Side::Long, 0.001);
        assert!((buy_price - 100.1).abs() < 1e-9);

        let sell_price = apply_slippage(100.0, Side::Short, 0.001);
        assert!((sell_price - 99.9).abs() < 1e-9);
    }

    #[test]
    fn unknown_strategy_returns_none() {
        let candles = trending_up_candles(100, 10.0);
        let params = HashMap::new();
        let config = BacktestConfig::default();
        assert!(backtest(&candles, "unknown", &params, &config).is_none());
    }

    // ── Optimized batch tests ──────────────────────────────────

    #[test]
    fn optimized_batch_trend_produces_results() {
        // Create data with clear trend reversal to trigger crossover signals
        let mut candles = Vec::new();
        // Flat warmup
        for i in 0..60 {
            let price = 100.0;
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        // Strong uptrend
        for i in 60..150 {
            let price = 100.0 + (i - 60) as f64 * 2.0;
            candles.push(make_candle(price - 1.0, price + 1.0, price - 1.0, price, i * 300_000));
        }
        // Strong downtrend (triggers short crossover)
        for i in 150..250 {
            let price = 280.0 - (i - 150) as f64 * 2.0;
            candles.push(make_candle(price + 1.0, price + 1.0, price - 1.0, price, i * 300_000));
        }

        let param_sets: Vec<HashMap<String, f64>> = vec![
            [
                ("ema_fast".into(), 10.0),
                ("ema_slow".into(), 30.0),
                ("atr_period".into(), 14.0),
                ("atr_sl_mult".into(), 1.5),
                ("atr_tp_mult".into(), 3.0),
            ]
            .into_iter()
            .collect(),
            [
                ("ema_fast".into(), 10.0),
                ("ema_slow".into(), 30.0),
                ("atr_period".into(), 14.0),
                ("atr_sl_mult".into(), 2.0),
                ("atr_tp_mult".into(), 4.0),
            ]
            .into_iter()
            .collect(),
        ];

        let config = BacktestConfig::default();
        let results = backtest_batch_optimized(&candles, "default", &param_sets, &config);
        assert_eq!(results.len(), 2);
        // At least one should produce metrics with clear trend reversal
        let has_some = results.iter().any(|(_, m)| m.is_some());
        assert!(has_some, "expected at least one result with metrics");
    }

    #[test]
    fn optimized_batch_shares_indicators() {
        // Two param sets with same indicator params but different SL/TP
        // should both run and produce results
        let mut candles = Vec::new();
        for i in 0..60 {
            let price = 100.0;
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        for i in 60..200 {
            let price = 100.0 + (i - 60) as f64 * 1.0;
            candles.push(make_candle(price - 0.5, price + 1.0, price - 1.0, price, i * 300_000));
        }

        let base_params: Vec<(String, f64)> = vec![
            ("ema_fast".into(), 10.0),
            ("ema_slow".into(), 30.0),
            ("atr_period".into(), 14.0),
        ];

        let mut param_sets = Vec::new();
        for sl in [1.0, 1.5, 2.0, 2.5, 3.0] {
            for tp in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0] {
                let mut p: HashMap<String, f64> = base_params.iter().cloned().collect();
                p.insert("atr_sl_mult".into(), sl);
                p.insert("atr_tp_mult".into(), tp);
                param_sets.push(p);
            }
        }

        let config = BacktestConfig::default();
        let results = backtest_batch_optimized(&candles, "default", &param_sets, &config);
        assert_eq!(results.len(), param_sets.len());
    }

    #[test]
    fn optimized_batch_fallback_breakout() {
        let mut candles = Vec::new();
        for i in 0..60 {
            let price = 100.0 + (i as f64 * 0.1).sin();
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        for i in 60..120 {
            let price = 105.0 + (i - 60) as f64 * 3.0;
            candles.push(make_candle(price - 1.0, price + 2.0, price - 2.0, price, i * 300_000));
        }

        let param_sets: Vec<HashMap<String, f64>> = vec![
            [
                ("lookback".into(), 48.0),
                ("atr_period".into(), 14.0),
                ("atr_filter".into(), 0.3),
                ("trail_atr".into(), 3.0),
            ]
            .into_iter()
            .collect(),
        ];

        let config = BacktestConfig::default();
        let results = backtest_batch_optimized(&candles, "breakout", &param_sets, &config);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn early_pruning_kills_terrible_params() {
        // Create candles that crash hard — should get pruned
        let mut candles = Vec::new();
        for i in 0..50 {
            let price = 100.0;
            candles.push(make_candle(price, price + 0.5, price - 0.5, price, i * 300_000));
        }
        // Sharp crash after warmup triggers bad trades
        for i in 50..500 {
            let price = 100.0 - (i - 50) as f64 * 0.8;
            let price = price.max(5.0);
            candles.push(make_candle(
                price + 0.5,
                price + 1.0,
                price - 1.0,
                price,
                i as u64 * 300_000,
            ));
        }

        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 8.0),
            ("ema_slow".into(), 20.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 0.5),
            ("atr_tp_mult".into(), 10.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig {
            initial_capital: 200.0,
            leverage: 5,
            position_size: 0.9,
            ..BacktestConfig::default()
        };

        // With pruning (optimized) — may return None due to early pruning
        let results = backtest_batch_optimized(&candles, "default", &[params.clone()], &config);
        // Without pruning (original)
        let original = backtest(&candles, "default", &params, &config);

        // If original also returns None (no trades) that's fine
        // If original returns Some with terrible metrics, pruning should have caught it
        if let Some(ref m) = original {
            if m.max_drawdown_pct > 30.0 || m.roi < -20.0 {
                // Pruning should have killed this
                assert!(
                    results[0].1.is_none(),
                    "expected pruning to kill terrible params (dd={:.1}%, roi={:.1}%)",
                    m.max_drawdown_pct,
                    m.roi
                );
            }
        }
    }

    // ── Benchmark test ──────────────────────────────────────────

    #[test]
    fn benchmark_optimized_vs_original() {
        // Generate realistic candle data: 5000 candles with trend + noise
        let n = 5000;
        let mut candles = Vec::with_capacity(n);
        for i in 0..n {
            let trend = 100.0 + (i as f64 * 0.02);
            let noise = ((i as f64 * 0.7).sin() * 3.0) + ((i as f64 * 1.3).cos() * 2.0);
            let price = trend + noise;
            candles.push(make_candle(
                price - 0.3,
                price + 2.0,
                price - 2.0,
                price,
                i as u64 * 300_000,
            ));
        }

        // Generate 1000+ param combinations (grid search)
        let mut param_sets = Vec::new();
        for ema_fast in [8.0, 12.0, 16.0, 21.0] {
            for ema_slow in [34.0, 45.0, 55.0, 70.0, 89.0] {
                if ema_fast >= ema_slow || (ema_slow - ema_fast) < 10.0 {
                    continue;
                }
                for atr_period in [10.0, 14.0, 20.0] {
                    for atr_sl_mult in [1.0, 1.5, 2.0, 2.5, 3.0] {
                        for atr_tp_mult in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0] {
                            let p: HashMap<String, f64> = [
                                ("ema_fast".into(), ema_fast),
                                ("ema_slow".into(), ema_slow),
                                ("atr_period".into(), atr_period),
                                ("atr_sl_mult".into(), atr_sl_mult),
                                ("atr_tp_mult".into(), atr_tp_mult),
                            ]
                            .into_iter()
                            .collect();
                            param_sets.push(p);
                        }
                    }
                }
            }
        }
        assert!(
            param_sets.len() >= 1000,
            "need 1000+ param sets, got {}",
            param_sets.len()
        );

        let config = BacktestConfig::default();

        // Time original
        let start_original = std::time::Instant::now();
        let original_results = backtest_batch(&candles, "default", &param_sets, &config);
        let elapsed_original = start_original.elapsed();

        // Time optimized
        let start_optimized = std::time::Instant::now();
        let optimized_results =
            backtest_batch_optimized(&candles, "default", &param_sets, &config);
        let elapsed_optimized = start_optimized.elapsed();

        assert_eq!(original_results.len(), optimized_results.len());

        println!(
            "Benchmark: {} param sets x {} candles",
            param_sets.len(),
            candles.len()
        );
        println!("  Original:  {:?}", elapsed_original);
        println!("  Optimized: {:?}", elapsed_optimized);
        println!(
            "  Speedup:   {:.1}x",
            elapsed_original.as_secs_f64() / elapsed_optimized.as_secs_f64()
        );

        // Verify optimized is faster (allow some tolerance for small data)
        // On real workloads with 30 SL/TP variants per indicator group, expect ~10-30x
        // Note: pruning may cause some results to differ (pruned vs not-pruned)
        // so we only check that the speedup is not negative
        assert!(
            elapsed_optimized <= elapsed_original + std::time::Duration::from_millis(500),
            "optimized should not be significantly slower"
        );
    }

    // ── Grid strategy backtest tests ──────────────────────────────

    #[test]
    fn grid_backtest_no_panic() {
        let candles = oscillating_candles(200, 100.0, 10.0);
        let params: HashMap<String, f64> = [
            ("grids".into(), 10.0),
            ("lookback".into(), 50.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig::default();
        let _result = backtest(&candles, "grid", &params, &config);
        // No panic = pass
    }

    #[test]
    fn grid_backtest_produces_trades_on_oscillating() {
        // Grid strategy should trade well on oscillating data
        let candles = oscillating_candles(300, 100.0, 15.0);
        let params: HashMap<String, f64> = [
            ("grids".into(), 5.0),
            ("lookback".into(), 20.0),
        ]
        .into_iter()
        .collect();

        let config = BacktestConfig::default();
        let result = backtest(&candles, "grid", &params, &config);
        assert!(result.is_some(), "grid backtest on oscillating data should produce trades");
        let m = result.unwrap();
        assert!(m.total_trades > 0);
    }
}
