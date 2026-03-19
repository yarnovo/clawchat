use clawchat_shared::candle::Candle;
use clawchat_shared::criteria::BacktestMetrics;
use clawchat_shared::indicators::{atr_from_slices, ema_from_slice, ema_update, rsi_from_slice};
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

// ── Backtest engine ─────────────────────────────────────────────

/// Run a single backtest with the given candles, strategy type, and parameters.
///
/// `strategy_type`: "default" (TrendFollower), "breakout", "rsi"
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

        // Accumulate for breakout/rsi
        if strategy_type == "breakout" || strategy_type == "rsi" {
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
            _ => (StrategySignal::None, 0.0),
        };

        match signal {
            StrategySignal::Long => {
                let entry_price = apply_slippage(candle.close, Side::Long, config.slippage_pct);
                let (sl, tp) = if is_breakout {
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
                let (sl, tp) = if is_breakout {
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
}
