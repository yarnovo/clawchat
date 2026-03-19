//! Backtest engine — translates the Python backtest framework to Rust.
//!
//! Core rules:
//! - Taker fee: 0.04%, Slippage: 0.05%
//! - Position sizing: `qty = (equity * position_pct * leverage) / price`
//! - Tracks equity curve and computes standard metrics
//!
//! Usage:
//! ```ignore
//! let candles = vec![(open, high, low, close, volume), ...];
//! let mut strategy = strategies::get_strategy("trend", None).unwrap();
//! let result = run_backtest(&candles, strategy.as_mut(), &BacktestConfig::default());
//! let metrics = calc_metrics(&result, 3_600_000); // 1h candles
//! ```

pub mod strategies;

use clawchat_shared::types::{SLIPPAGE, TAKER_FEE};

// ── Backtest result types ─────────────────────────────────────

/// A single completed trade.
#[derive(Debug, Clone)]
pub struct Trade {
    /// "long" or "short"
    pub side: &'static str,
    pub entry_price: f64,
    pub exit_price: f64,
    /// Net PnL (after close fee, excludes open fee which was deducted at open)
    pub pnl: f64,
    /// Gross PnL (before close fee)
    pub gross_pnl: f64,
    /// Total fees (open + close)
    pub fees: f64,
    pub qty: f64,
    pub entry_idx: usize,
    pub exit_idx: usize,
    pub liquidated: bool,
    pub force_closed: bool,
}

/// Result of a backtest run.
#[derive(Debug, Clone)]
pub struct BacktestResult {
    pub trades: Vec<Trade>,
    pub equity_curve: Vec<f64>,
    pub final_balance: f64,
    pub initial_capital: f64,
}

/// Configuration for the backtest engine.
#[derive(Debug, Clone)]
pub struct BacktestConfig {
    pub capital: f64,
    pub leverage: u32,
    pub position_pct: f64,
    pub taker_fee: f64,
    pub slippage: f64,
}

impl Default for BacktestConfig {
    fn default() -> Self {
        Self {
            capital: 200.0,
            leverage: 3,
            position_pct: 0.3,
            taker_fee: TAKER_FEE,
            slippage: SLIPPAGE,
        }
    }
}

/// Computed backtest metrics.
#[derive(Debug, Clone)]
pub struct Metrics {
    pub net_profit: f64,
    pub roi: f64,
    pub total_trades: usize,
    pub wins: usize,
    pub losses: usize,
    pub win_rate: f64,
    pub avg_win: f64,
    pub avg_loss: f64,
    pub profit_factor: f64,
    pub expectancy: f64,
    pub total_fees: f64,
    pub sharpe: f64,
    pub max_drawdown: f64,
    pub max_drawdown_pct: f64,
    pub final_balance: f64,
}

// ── Internal position tracking ─────────────────────────────────

#[derive(Debug, Clone)]
struct OpenPosition {
    side: &'static str, // "long" or "short"
    entry: f64,
    qty: f64,
    margin: f64,
    open_fee: f64,
    open_idx: usize,
}

// ── Backtest engine ────────────────────────────────────────────

/// Run a backtest over candle data with the given strategy and config.
///
/// `candles` is a slice of `(open, high, low, close, volume)` tuples.
/// The strategy's `on_candle` is called for each candle and position management
/// follows the Python backtest engine logic exactly.
pub fn run_backtest(
    candles: &[(f64, f64, f64, f64, f64)],
    strategy: &mut dyn strategies::BacktestStrategy,
    config: &BacktestConfig,
) -> BacktestResult {
    let mut balance = config.capital;
    let mut position: Option<OpenPosition> = None;
    let mut trades: Vec<Trade> = Vec::new();
    let mut equity_curve: Vec<f64> = Vec::with_capacity(candles.len());

    let leverage = config.leverage as f64;
    let taker_fee = config.taker_fee;
    let slippage = config.slippage;
    let position_pct = config.position_pct;

    for (idx, &(o, h, l, c, v)) in candles.iter().enumerate() {
        let signal = strategy.on_candle(o, h, l, c, v);

        // Record equity
        let equity = if let Some(ref pos) = position {
            let unrealized = if pos.side == "long" {
                (c - pos.entry) * pos.qty
            } else {
                (pos.entry - c) * pos.qty
            };
            balance + pos.margin + unrealized
        } else {
            balance
        };
        equity_curve.push(equity);

        match signal {
            Some("buy") => {
                if position.is_none() {
                    // Open long: taker + slippage
                    let entry = c * (1.0 + slippage);
                    let margin = balance * position_pct;
                    let notional = margin * leverage;
                    let qty = notional / entry;
                    let fee = notional * taker_fee;
                    balance -= margin + fee;
                    position = Some(OpenPosition {
                        side: "long",
                        entry,
                        qty,
                        margin,
                        open_fee: fee,
                        open_idx: idx,
                    });
                } else if position.as_ref().unwrap().side == "short" {
                    // Close short
                    let pos = position.take().unwrap();
                    let exit_price = c * (1.0 + slippage);
                    let gross_pnl = (pos.entry - exit_price) * pos.qty;
                    let fee = exit_price * pos.qty * taker_fee;
                    let net_pnl = gross_pnl - fee;
                    balance += pos.margin + net_pnl;
                    trades.push(Trade {
                        side: "short",
                        entry_price: pos.entry,
                        exit_price,
                        pnl: net_pnl,
                        gross_pnl,
                        fees: pos.open_fee + fee,
                        qty: pos.qty,
                        entry_idx: pos.open_idx,
                        exit_idx: idx,
                        liquidated: false,
                        force_closed: false,
                    });
                }
            }
            Some("sell") => {
                if position.is_none() {
                    // Open short: taker + slippage (sell price is lower)
                    let entry = c * (1.0 - slippage);
                    let margin = balance * position_pct;
                    let notional = margin * leverage;
                    let qty = notional / entry;
                    let fee = notional * taker_fee;
                    balance -= margin + fee;
                    position = Some(OpenPosition {
                        side: "short",
                        entry,
                        qty,
                        margin,
                        open_fee: fee,
                        open_idx: idx,
                    });
                } else if position.as_ref().unwrap().side == "long" {
                    // Close long
                    let pos = position.take().unwrap();
                    let exit_price = c * (1.0 - slippage);
                    let gross_pnl = (exit_price - pos.entry) * pos.qty;
                    let fee = exit_price * pos.qty * taker_fee;
                    let net_pnl = gross_pnl - fee;
                    balance += pos.margin + net_pnl;
                    trades.push(Trade {
                        side: "long",
                        entry_price: pos.entry,
                        exit_price,
                        pnl: net_pnl,
                        gross_pnl,
                        fees: pos.open_fee + fee,
                        qty: pos.qty,
                        entry_idx: pos.open_idx,
                        exit_idx: idx,
                        liquidated: false,
                        force_closed: false,
                    });
                }
            }
            _ => {}
        }

        // Liquidation check
        if position.is_some() && balance <= 0.0 {
            let pos = position.take().unwrap();
            trades.push(Trade {
                side: pos.side,
                entry_price: pos.entry,
                exit_price: c,
                pnl: -pos.margin,
                gross_pnl: -pos.margin,
                fees: pos.open_fee,
                qty: pos.qty,
                entry_idx: pos.open_idx,
                exit_idx: idx,
                liquidated: true,
                force_closed: false,
            });
            balance = 0.0;
            break;
        }
    }

    // Force-close any remaining position at last price
    if let Some(pos) = position.take() {
        if let Some(&(_, _, _, last_c, _)) = candles.last() {
            let (exit_price, gross_pnl) = if pos.side == "long" {
                let ep = last_c * (1.0 - slippage);
                (ep, (ep - pos.entry) * pos.qty)
            } else {
                let ep = last_c * (1.0 + slippage);
                (ep, (pos.entry - ep) * pos.qty)
            };
            let fee = exit_price * pos.qty * taker_fee;
            let net_pnl = gross_pnl - fee;
            balance += pos.margin + net_pnl;
            trades.push(Trade {
                side: pos.side,
                entry_price: pos.entry,
                exit_price,
                pnl: net_pnl,
                gross_pnl,
                fees: pos.open_fee + fee,
                qty: pos.qty,
                entry_idx: pos.open_idx,
                exit_idx: candles.len() - 1,
                liquidated: false,
                force_closed: true,
            });
        }
    }

    BacktestResult {
        trades,
        equity_curve,
        final_balance: balance,
        initial_capital: config.capital,
    }
}

// ── Metrics calculation ────────────────────────────────────────

/// Timeframe milliseconds → periods per year lookup.
fn periods_per_year(timeframe_ms: u64) -> f64 {
    match timeframe_ms {
        60_000 => 525_600.0,       // 1m
        300_000 => 105_120.0,      // 5m
        900_000 => 35_040.0,       // 15m
        3_600_000 => 8_760.0,      // 1h
        14_400_000 => 2_190.0,     // 4h
        86_400_000 => 365.0,       // 1d
        _ => 8_760.0,              // default to 1h
    }
}

/// Parse timeframe string (e.g. "5m", "1h") to milliseconds.
pub fn timeframe_to_ms(tf: &str) -> u64 {
    match tf {
        "1m" => 60_000,
        "5m" => 300_000,
        "15m" => 900_000,
        "1h" => 3_600_000,
        "4h" => 14_400_000,
        "1d" => 86_400_000,
        _ => 3_600_000,
    }
}

/// Compute all backtest metrics from a `BacktestResult`.
///
/// `timeframe_ms` is the candle interval in milliseconds, used for Sharpe annualization.
pub fn calc_metrics(result: &BacktestResult, timeframe_ms: u64) -> Metrics {
    let trades = &result.trades;
    let equity = &result.equity_curve;
    let capital = result.initial_capital;
    let final_bal = result.final_balance;

    let net_profit = final_bal - capital;
    let roi = if capital > 0.0 {
        (net_profit / capital) * 100.0
    } else {
        0.0
    };
    let total_trades = trades.len();

    if total_trades == 0 {
        return Metrics {
            net_profit: 0.0,
            roi: 0.0,
            total_trades: 0,
            wins: 0,
            losses: 0,
            win_rate: 0.0,
            avg_win: 0.0,
            avg_loss: 0.0,
            profit_factor: 0.0,
            expectancy: 0.0,
            total_fees: 0.0,
            sharpe: 0.0,
            max_drawdown: 0.0,
            max_drawdown_pct: 0.0,
            final_balance: final_bal,
        };
    }

    // Win/loss classification (pnl <= 0 counts as loss, matching Python)
    let win_trades: Vec<&Trade> = trades.iter().filter(|t| t.pnl > 0.0).collect();
    let loss_trades: Vec<&Trade> = trades.iter().filter(|t| t.pnl <= 0.0).collect();
    let wins = win_trades.len();
    let losses = loss_trades.len();
    let win_rate = (wins as f64 / total_trades as f64) * 100.0;

    // Average win/loss
    let avg_win = if wins > 0 {
        win_trades.iter().map(|t| t.pnl).sum::<f64>() / wins as f64
    } else {
        0.0
    };
    let avg_loss = if losses > 0 {
        (loss_trades.iter().map(|t| t.pnl).sum::<f64>() / losses as f64).abs()
    } else {
        0.0
    };

    // Profit factor
    let profit_factor = if avg_loss > 0.0 {
        avg_win / avg_loss
    } else if avg_win > 0.0 {
        f64::INFINITY
    } else {
        0.0
    };

    // Expectancy
    let expectancy = trades.iter().map(|t| t.pnl).sum::<f64>() / total_trades as f64;

    // Total fees
    let total_fees = trades.iter().map(|t| t.fees).sum::<f64>();

    // Max drawdown
    let mut peak = if !equity.is_empty() { equity[0] } else { capital };
    let mut max_dd = 0.0_f64;
    let mut max_dd_pct = 0.0_f64;
    for &e in equity {
        if e > peak {
            peak = e;
        }
        let dd = peak - e;
        let dd_pct = if peak > 0.0 { dd / peak * 100.0 } else { 0.0 };
        if dd > max_dd {
            max_dd = dd;
            max_dd_pct = dd_pct;
        }
    }

    // Sharpe ratio (annualized)
    let ppy = periods_per_year(timeframe_ms);
    let sharpe = if equity.len() > 1 {
        let returns: Vec<f64> = equity
            .windows(2)
            .filter(|w| w[0] > 0.0)
            .map(|w| (w[1] - w[0]) / w[0])
            .collect();
        if returns.is_empty() {
            0.0
        } else {
            let mean_r = returns.iter().sum::<f64>() / returns.len() as f64;
            let variance =
                returns.iter().map(|r| (r - mean_r).powi(2)).sum::<f64>() / returns.len() as f64;
            let std_r = variance.sqrt();
            if std_r > 0.0 {
                (mean_r / std_r) * ppy.sqrt()
            } else {
                0.0
            }
        }
    } else {
        0.0
    };

    Metrics {
        net_profit,
        roi,
        total_trades,
        wins,
        losses,
        win_rate,
        avg_win,
        avg_loss,
        profit_factor,
        expectancy,
        total_fees,
        sharpe,
        max_drawdown: max_dd,
        max_drawdown_pct: max_dd_pct,
        final_balance: final_bal,
    }
}

/// Convert `Metrics` to a `BacktestMetrics` for admission checking.
impl Metrics {
    pub fn to_backtest_metrics(&self) -> clawchat_shared::criteria::BacktestMetrics {
        clawchat_shared::criteria::BacktestMetrics {
            roi: self.roi,
            sharpe: self.sharpe,
            max_drawdown_pct: self.max_drawdown_pct,
            total_trades: self.total_trades as u32,
            win_rate: self.win_rate,
            profit_factor: self.profit_factor,
        }
    }
}

// ── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    /// Minimal strategy that always returns None.
    struct NoopStrategy;
    impl strategies::BacktestStrategy for NoopStrategy {
        fn on_candle(&mut self, _o: f64, _h: f64, _l: f64, _c: f64, _v: f64) -> Option<&'static str> {
            None
        }
        fn name(&self) -> &'static str {
            "noop"
        }
    }

    /// Strategy that alternates buy/sell every N candles.
    struct AlternatingStrategy {
        count: usize,
        interval: usize,
        last_signal: Option<&'static str>,
    }

    impl AlternatingStrategy {
        fn new(interval: usize) -> Self {
            Self {
                count: 0,
                interval,
                last_signal: None,
            }
        }
    }

    impl strategies::BacktestStrategy for AlternatingStrategy {
        fn on_candle(&mut self, _o: f64, _h: f64, _l: f64, _c: f64, _v: f64) -> Option<&'static str> {
            self.count += 1;
            if self.count % self.interval == 0 {
                let sig = match self.last_signal {
                    None | Some("sell") => "buy",
                    _ => "sell",
                };
                self.last_signal = Some(sig);
                Some(sig)
            } else {
                None
            }
        }
        fn name(&self) -> &'static str {
            "alternating"
        }
    }

    fn make_candles(n: usize, base_price: f64) -> Vec<(f64, f64, f64, f64, f64)> {
        (0..n)
            .map(|i| {
                let price = base_price + (i as f64 * 0.01).sin() * base_price * 0.05;
                (price, price * 1.01, price * 0.99, price, 1000.0)
            })
            .collect()
    }

    #[test]
    fn backtest_noop_no_trades() {
        let candles = make_candles(100, 100.0);
        let mut strat = NoopStrategy;
        let config = BacktestConfig::default();
        let result = run_backtest(&candles, &mut strat, &config);
        assert!(result.trades.is_empty());
        assert_eq!(result.equity_curve.len(), 100);
        assert!((result.final_balance - config.capital).abs() < 1e-10);
    }

    #[test]
    fn backtest_alternating_creates_trades() {
        let candles = make_candles(200, 100.0);
        let mut strat = AlternatingStrategy::new(10);
        let config = BacktestConfig::default();
        let result = run_backtest(&candles, &mut strat, &config);
        assert!(!result.trades.is_empty());
        assert_eq!(result.equity_curve.len(), 200);
    }

    #[test]
    fn metrics_no_trades() {
        let result = BacktestResult {
            trades: vec![],
            equity_curve: vec![200.0],
            final_balance: 200.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert_eq!(m.total_trades, 0);
        assert_eq!(m.roi, 0.0);
        assert_eq!(m.sharpe, 0.0);
        assert_eq!(m.win_rate, 0.0);
        assert_eq!(m.profit_factor, 0.0);
        assert_eq!(m.max_drawdown, 0.0);
    }

    #[test]
    fn metrics_roi_positive() {
        let result = BacktestResult {
            trades: vec![Trade {
                side: "long",
                entry_price: 100.0,
                exit_price: 110.0,
                pnl: 20.0,
                gross_pnl: 20.5,
                fees: 0.5,
                qty: 2.0,
                entry_idx: 0,
                exit_idx: 1,
                liquidated: false,
                force_closed: false,
            }],
            equity_curve: vec![200.0, 220.0],
            final_balance: 220.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.roi - 10.0).abs() < 1e-10);
    }

    #[test]
    fn metrics_roi_negative() {
        let result = BacktestResult {
            trades: vec![Trade {
                side: "long",
                entry_price: 100.0,
                exit_price: 90.0,
                pnl: -50.0,
                gross_pnl: -49.5,
                fees: 0.5,
                qty: 5.0,
                entry_idx: 0,
                exit_idx: 1,
                liquidated: false,
                force_closed: false,
            }],
            equity_curve: vec![200.0, 150.0],
            final_balance: 150.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.roi - (-25.0)).abs() < 1e-10);
    }

    fn make_trade(pnl: f64, fees: f64) -> Trade {
        Trade {
            side: "long",
            entry_price: 100.0,
            exit_price: 100.0,
            pnl,
            gross_pnl: pnl + fees,
            fees,
            qty: 1.0,
            entry_idx: 0,
            exit_idx: 1,
            liquidated: false,
            force_closed: false,
        }
    }

    #[test]
    fn metrics_win_rate_all_wins() {
        let result = BacktestResult {
            trades: vec![make_trade(10.0, 0.0), make_trade(5.0, 0.0), make_trade(3.0, 0.0)],
            equity_curve: vec![200.0, 210.0, 215.0, 218.0],
            final_balance: 218.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.win_rate - 100.0).abs() < 1e-10);
    }

    #[test]
    fn metrics_win_rate_all_losses() {
        let result = BacktestResult {
            trades: vec![make_trade(-10.0, 0.0), make_trade(-5.0, 0.0)],
            equity_curve: vec![200.0, 190.0, 185.0],
            final_balance: 185.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.win_rate - 0.0).abs() < 1e-10);
    }

    #[test]
    fn metrics_zero_pnl_counts_as_loss() {
        let result = BacktestResult {
            trades: vec![make_trade(0.0, 0.0)],
            equity_curve: vec![200.0, 200.0],
            final_balance: 200.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert_eq!(m.win_rate, 0.0);
        assert_eq!(m.losses, 1);
    }

    #[test]
    fn metrics_profit_factor_basic() {
        let result = BacktestResult {
            trades: vec![make_trade(20.0, 0.0), make_trade(-10.0, 0.0)],
            equity_curve: vec![200.0, 220.0, 210.0],
            final_balance: 210.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.profit_factor - 2.0).abs() < 1e-10);
    }

    #[test]
    fn metrics_profit_factor_no_losses() {
        let result = BacktestResult {
            trades: vec![make_trade(10.0, 0.0), make_trade(20.0, 0.0)],
            equity_curve: vec![200.0, 210.0, 230.0],
            final_balance: 230.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!(m.profit_factor.is_infinite());
    }

    #[test]
    fn metrics_profit_factor_no_wins() {
        let result = BacktestResult {
            trades: vec![make_trade(-10.0, 0.0), make_trade(-20.0, 0.0)],
            equity_curve: vec![200.0, 190.0, 170.0],
            final_balance: 170.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert_eq!(m.profit_factor, 0.0);
    }

    #[test]
    fn metrics_drawdown_none() {
        let result = BacktestResult {
            trades: vec![make_trade(10.0, 0.0), make_trade(10.0, 0.0)],
            equity_curve: vec![200.0, 210.0, 220.0],
            final_balance: 220.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert_eq!(m.max_drawdown, 0.0);
        assert_eq!(m.max_drawdown_pct, 0.0);
    }

    #[test]
    fn metrics_drawdown_simple() {
        let result = BacktestResult {
            trades: vec![make_trade(20.0, 0.0), make_trade(-30.0, 0.0)],
            equity_curve: vec![200.0, 220.0, 190.0],
            final_balance: 190.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.max_drawdown - 30.0).abs() < 1e-10);
        assert!((m.max_drawdown_pct - (30.0 / 220.0 * 100.0)).abs() < 1e-8);
    }

    #[test]
    fn metrics_drawdown_multiple_peaks() {
        let result = BacktestResult {
            trades: vec![
                make_trade(50.0, 0.0),
                make_trade(-20.0, 0.0),
                make_trade(40.0, 0.0),
                make_trade(-60.0, 0.0),
            ],
            equity_curve: vec![200.0, 250.0, 230.0, 270.0, 210.0],
            final_balance: 210.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.max_drawdown - 60.0).abs() < 1e-10);
        assert!((m.max_drawdown_pct - (60.0 / 270.0 * 100.0)).abs() < 1e-8);
    }

    #[test]
    fn metrics_sharpe_flat_equity() {
        let result = BacktestResult {
            trades: vec![make_trade(0.0, 0.0)],
            equity_curve: vec![200.0, 200.0, 200.0],
            final_balance: 200.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert_eq!(m.sharpe, 0.0);
    }

    #[test]
    fn metrics_sharpe_positive_consistent_growth() {
        let result = BacktestResult {
            trades: vec![make_trade(1.0, 0.0); 5],
            equity_curve: vec![200.0, 201.0, 202.0, 203.0, 204.0, 205.0],
            final_balance: 205.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!(m.sharpe > 0.0);
    }

    #[test]
    fn metrics_sharpe_annualization() {
        let result = BacktestResult {
            trades: vec![make_trade(2.0, 0.0); 3],
            equity_curve: vec![200.0, 202.0, 204.0, 206.0],
            final_balance: 206.0,
            initial_capital: 200.0,
        };
        let m_5m = calc_metrics(&result, 300_000);   // 5m
        let m_1h = calc_metrics(&result, 3_600_000);  // 1h
        let ratio = (105_120.0_f64 / 8_760.0).sqrt();
        assert!((m_5m.sharpe / m_1h.sharpe - ratio).abs() < 0.01);
    }

    #[test]
    fn metrics_total_fees() {
        let result = BacktestResult {
            trades: vec![make_trade(10.0, 0.5), make_trade(-5.0, 0.3)],
            equity_curve: vec![200.0, 210.0, 205.0],
            final_balance: 205.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.total_fees - 0.8).abs() < 1e-10);
    }

    #[test]
    fn metrics_expectancy() {
        let result = BacktestResult {
            trades: vec![make_trade(10.0, 0.0), make_trade(-5.0, 0.0), make_trade(8.0, 0.0)],
            equity_curve: vec![200.0, 210.0, 205.0, 213.0],
            final_balance: 213.0,
            initial_capital: 200.0,
        };
        let m = calc_metrics(&result, 300_000);
        assert!((m.expectancy - 13.0 / 3.0).abs() < 1e-10);
    }

    #[test]
    fn backtest_runs_all_strategies() {
        // Ensure every registered strategy can run without panic
        for name in strategies::strategy_names() {
            let mut strat = strategies::get_strategy(name, None).expect(name);
            let candles = make_candles(300, 100.0);
            let config = BacktestConfig::default();
            let result = run_backtest(&candles, strat.as_mut(), &config);
            assert_eq!(result.equity_curve.len(), 300, "failed for {name}");
        }
    }

    #[test]
    fn strategy_creation_by_name() {
        assert!(strategies::get_strategy("trend", None).is_some());
        assert!(strategies::get_strategy("breakout", None).is_some());
        assert!(strategies::get_strategy("macd", None).is_some());
        assert!(strategies::get_strategy("scalping", None).is_some());
        assert!(strategies::get_strategy("rsi", None).is_some());
        assert!(strategies::get_strategy("bollinger", None).is_some());
        assert!(strategies::get_strategy("grid", None).is_some());
        assert!(strategies::get_strategy("ema2050", None).is_some());
        assert!(strategies::get_strategy("vwap", None).is_some());
        assert!(strategies::get_strategy("mean_reversion", None).is_some());
        assert!(strategies::get_strategy("trend_fast", None).is_some());
        assert!(strategies::get_strategy("macd_fast", None).is_some());
        assert!(strategies::get_strategy("nonexistent", None).is_none());
    }

    #[test]
    fn strategy_with_custom_params() {
        let mut params = HashMap::new();
        params.insert("ema_fast".to_string(), 15.0);
        params.insert("ema_slow".to_string(), 40.0);
        let strat = strategies::get_strategy("trend", Some(&params));
        assert!(strat.is_some());
    }

    #[test]
    fn to_backtest_metrics_conversion() {
        let m = Metrics {
            net_profit: 30.0,
            roi: 15.0,
            total_trades: 25,
            wins: 15,
            losses: 10,
            win_rate: 60.0,
            avg_win: 5.0,
            avg_loss: 2.5,
            profit_factor: 2.0,
            expectancy: 1.2,
            total_fees: 1.0,
            sharpe: 6.0,
            max_drawdown: 10.0,
            max_drawdown_pct: 5.0,
            final_balance: 230.0,
        };
        let bm = m.to_backtest_metrics();
        assert_eq!(bm.roi, 15.0);
        assert_eq!(bm.sharpe, 6.0);
        assert_eq!(bm.total_trades, 25);
    }

    /// Integration test: construct known candle data, run breakout strategy
    /// through the full backtest engine, and verify metrics are reasonable.
    ///
    /// breakout uses lookback=48 high/low channels + ATR filter + trailing stop.
    /// We build data with a clear breakout pattern: consolidation → breakout up → reversal.
    #[test]
    fn integration_breakout_backtest_known_data() {
        let mut candles: Vec<(f64, f64, f64, f64, f64)> = Vec::with_capacity(200);

        // Phase 1: consolidation range 98-102 for 60 candles (builds lookback)
        for i in 0..60 {
            let c = 100.0 + (i as f64 * 0.5).sin() * 2.0;
            candles.push((c, c + 1.0, c - 1.0, c, 1000.0));
        }

        // Phase 2: breakout above the consolidation high (~103) with strong move
        for i in 0..60 {
            let c = 104.0 + i as f64 * 0.8;
            candles.push((c - 0.5, c + 1.5, c - 1.5, c, 1500.0));
        }

        // Phase 3: crash back down → triggers trailing stop and short breakout
        for i in 0..80 {
            let c = 152.0 - i as f64 * 1.0;
            candles.push((c + 0.5, c + 1.5, c - 1.5, c, 1300.0));
        }

        assert_eq!(candles.len(), 200);

        let mut strat = strategies::get_strategy("breakout", None).unwrap();
        let config = BacktestConfig {
            capital: 200.0,
            leverage: 3,
            position_pct: 0.3,
            taker_fee: TAKER_FEE,
            slippage: SLIPPAGE,
        };
        let result = run_backtest(&candles, strat.as_mut(), &config);
        let metrics = calc_metrics(&result, 3_600_000); // 1h candles

        // Basic sanity checks
        assert_eq!(result.equity_curve.len(), 200);
        assert!(metrics.total_trades > 0, "breakout should produce trades, got 0");
        assert!(metrics.final_balance > 0.0, "balance should be positive");
        assert!(metrics.total_fees > 0.0, "fees should be charged");
        assert!(metrics.max_drawdown_pct >= 0.0, "drawdown should be non-negative");
        assert!(metrics.win_rate >= 0.0 && metrics.win_rate <= 100.0, "win rate in valid range");

        // Verify position sizing on first trade:
        // margin = capital * position_pct, notional = margin * leverage, qty = notional / entry
        let first_trade = &result.trades[0];
        let expected_margin = 200.0 * 0.3;
        let expected_notional = expected_margin * 3.0;
        let expected_qty = expected_notional / first_trade.entry_price;
        assert!(
            (first_trade.qty - expected_qty).abs() < 0.01,
            "position sizing: expected qty {:.4} got {:.4}",
            expected_qty,
            first_trade.qty
        );

        // Verify fees: open fee = notional * TAKER_FEE
        let expected_open_fee = expected_notional * TAKER_FEE;
        // Total fees include open + close fee
        assert!(
            first_trade.fees > expected_open_fee - 0.001,
            "trade fees should include at least the open fee"
        );

        // Verify slippage direction: first trade should be long (upward breakout)
        // Long entry = close * (1 + SLIPPAGE) → entry slightly above close
        assert_eq!(first_trade.side, "long", "first breakout should be long");
    }

    /// Verify position sizing formula: qty = equity * position_pct * leverage / entry_price
    #[test]
    fn position_sizing_formula() {
        // Use alternating strategy at a fixed price to verify exact math
        let price = 50.0;
        let candles: Vec<(f64, f64, f64, f64, f64)> = (0..20)
            .map(|_| (price, price + 0.1, price - 0.1, price, 1000.0))
            .collect();

        let mut strat = AlternatingStrategy::new(5);
        let config = BacktestConfig {
            capital: 100.0,
            leverage: 5,
            position_pct: 0.4,
            taker_fee: TAKER_FEE,
            slippage: SLIPPAGE,
        };
        let result = run_backtest(&candles, &mut strat, &config);

        assert!(!result.trades.is_empty());
        let t = &result.trades[0];

        // The first signal is "buy" at candle 5.
        // entry = price * (1 + SLIPPAGE) = 50 * 1.0005 = 50.025
        // margin = 100 * 0.4 = 40
        // notional = 40 * 5 = 200
        // qty = 200 / 50.025 ≈ 3.998
        // fee = 200 * 0.0004 = 0.08
        let entry = price * (1.0 + SLIPPAGE);
        let margin = 100.0 * 0.4;
        let notional = margin * 5.0;
        let qty = notional / entry;
        let fee = notional * TAKER_FEE;

        assert!((t.entry_price - entry).abs() < 1e-10, "entry price mismatch");
        assert!((t.qty - qty).abs() < 1e-10, "qty mismatch");
        // open_fee is part of total fees
        assert!(t.fees >= fee - 1e-10, "fee should include open fee");
    }
}
