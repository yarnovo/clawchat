use clawchat_shared::criteria::{passes, CRITERIA};
use clawchat_shared::exchange::Exchange;
use clawchat_shared::paths::records_dir;
use clawchat_shared::types::{TAKER_FEE, SLIPPAGE};
use crate::backtest::{self, strategies, BacktestConfig, timeframe_to_ms};
use crate::cmd::backtest::fetch_candles;

const BATCH_STRATEGIES: &[&str] = &[
    "trend", "breakout", "macd", "scalping", "rsi",
    "bollinger", "grid", "mean_reversion", "ema2050",
];
const LEVERAGES: &[u32] = &[2, 3, 5];
const SKIP_BASES: &[&str] = &["USDC", "BUSD", "TUSD", "FDUSD", "DAI", "UST", "USDP"];

async fn scan_symbols(exchange: &Exchange, top_n: usize) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    println!("  扫描币安高波动币种 (top {top_n})...");
    let tickers = exchange.fetch_tickers().await?;
    let mut candidates: Vec<(String, f64)> = Vec::new();

    for t in &tickers {
        let symbol = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if !symbol.ends_with("USDT") { continue; }
        let base = symbol.trim_end_matches("USDT");
        if SKIP_BASES.contains(&base) { continue; }

        let last: f64 = t.get("lastPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let high: f64 = t.get("highPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let low: f64 = t.get("lowPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let vol: f64 = t.get("quoteVolume").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);

        if last <= 0.0 || low <= 0.0 || vol < 1_000_000.0 { continue; }
        let amplitude = (high - low) / low * 100.0;
        candidates.push((symbol, amplitude));
    }

    candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let symbols: Vec<String> = candidates.into_iter().take(top_n).map(|(s, _)| s).collect();
    println!("  找到 {} 个币种: {}...", symbols.len(), symbols.iter().take(5).cloned().collect::<Vec<_>>().join(", "));
    Ok(symbols)
}

/// 批量回测 — 多策略 x 多币种
pub async fn batch_backtest(
    exchange: &Exchange,
    days: u32,
    timeframe: &str,
    top_symbols: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbols = scan_symbols(exchange, top_symbols).await?;
    let strat_names = BATCH_STRATEGIES;
    let leverages = LEVERAGES;
    let capital = 200.0;
    let position_pct = 0.5;

    let total = symbols.len() * strat_names.len() * leverages.len();
    println!("\n  批量回测: {} 币种 x {} 策略 x {} 杠杆 = {total} 组合",
        symbols.len(), strat_names.len(), leverages.len());
    println!("  天数: {days}  周期: {timeframe}  资金: ${capital}  仓位: {:.0}%", position_pct * 100.0);
    println!("  准入: ROI>{:.0}% 夏普>{:.0} 回撤<{:.0}% 交易>={} 胜率>={:.0}% PF>={:.1}",
        CRITERIA.min_return_pct, CRITERIA.min_sharpe, CRITERIA.max_drawdown_pct,
        CRITERIA.min_trades, CRITERIA.min_win_rate, CRITERIA.min_profit_factor);
    println!();

    let mut results: Vec<CsvRow> = Vec::new();
    let mut passed_results: Vec<CsvRow> = Vec::new();
    let mut done = 0usize;
    let tf_ms = timeframe_to_ms(timeframe);

    // Cache candles per symbol
    let mut candle_cache: std::collections::HashMap<String, Option<Vec<(f64, f64, f64, f64, f64)>>> = std::collections::HashMap::new();

    for symbol in &symbols {
        if !candle_cache.contains_key(symbol) {
            println!("  拉取 {symbol} {timeframe} {days}天 K线...");
            match fetch_candles(exchange, symbol, timeframe, days).await {
                Ok(candles) if candles.len() >= 50 => {
                    candle_cache.insert(symbol.clone(), Some(candles));
                }
                Ok(_) | Err(_) => {
                    candle_cache.insert(symbol.clone(), None);
                }
            }
        }

        let candles = match candle_cache.get(symbol) {
            Some(Some(c)) => c,
            _ => {
                done += strat_names.len() * leverages.len();
                continue;
            }
        };

        for &strategy_name in strat_names {
            for &lev in leverages {
                done += 1;
                let mut strat = match strategies::get_strategy(strategy_name, None) {
                    Some(s) => s,
                    None => continue,
                };

                let config = BacktestConfig {
                    capital,
                    leverage: lev,
                    position_pct,
                    taker_fee: TAKER_FEE,
                    slippage: SLIPPAGE,
                };

                let result = backtest::run_backtest(candles, strat.as_mut(), &config);
                let m = backtest::calc_metrics(&result, tf_ms);

                let bm = m.to_backtest_metrics();
                let is_passed = passes(&bm, days);

                let row = CsvRow {
                    symbol: symbol.clone(),
                    strategy: strategy_name.to_string(),
                    leverage: lev,
                    roi: (m.roi * 100.0).round() / 100.0,
                    sharpe: (m.sharpe * 100.0).round() / 100.0,
                    max_drawdown_pct: (m.max_drawdown_pct * 100.0).round() / 100.0,
                    trades: m.total_trades as u32,
                    win_rate: (m.win_rate * 10.0).round() / 10.0,
                    profit_factor: (m.profit_factor * 100.0).round() / 100.0,
                    net_profit: (m.net_profit * 100.0).round() / 100.0,
                    passed: is_passed,
                };

                if is_passed {
                    passed_results.push(row.clone());
                }
                results.push(row);

                if done % 10 == 0 || done == total {
                    eprint!("\r  进度: {done}/{total} ({}%)  达标: {}", done * 100 / total, passed_results.len());
                }
            }
        }
    }
    eprintln!("\r  完成: {done}/{total}  达标: {}                    ", passed_results.len());

    // Write CSV
    let rdir = records_dir();
    let _ = std::fs::create_dir_all(&rdir);
    let output_path = rdir.join("batch_results.csv");
    if !results.is_empty() {
        let mut wtr = csv::Writer::from_path(&output_path)?;
        wtr.write_record(["symbol", "strategy", "leverage", "roi", "sharpe", "max_drawdown_pct", "trades", "win_rate", "profit_factor", "net_profit", "passed"])?;
        for r in &results {
            wtr.write_record(&[
                &r.symbol, &r.strategy, &r.leverage.to_string(),
                &format!("{:.2}", r.roi), &format!("{:.2}", r.sharpe),
                &format!("{:.2}", r.max_drawdown_pct), &r.trades.to_string(),
                &format!("{:.1}", r.win_rate), &format!("{:.2}", r.profit_factor),
                &format!("{:.2}", r.net_profit), &r.passed.to_string(),
            ])?;
        }
        wtr.flush()?;
        println!("\n  全部结果已写入: {}", output_path.display());
    }

    // Print passed
    if !passed_results.is_empty() {
        passed_results.sort_by(|a, b| b.sharpe.partial_cmp(&a.sharpe).unwrap_or(std::cmp::Ordering::Equal));
        println!("\n{}", "=".repeat(95));
        println!("  达标组合 ({} 个)  按夏普排序", passed_results.len());
        println!("{}", "=".repeat(95));
        println!("  {:<14} {:<16} {:>4} {:>8} {:>7} {:>7} {:>5} {:>7} {:>7}",
            "币种", "策略", "杠杆", "收益率", "夏普", "回撤", "交易", "胜率", "盈亏比");
        println!("  {}", "-".repeat(85));
        for r in &passed_results {
            println!("  {:<14} {:<16} {:>3}x {:>7.1}% {:>7.2} {:>6.1}% {:>5} {:>6.1}% {:>7.2}",
                r.symbol, r.strategy, r.leverage, r.roi, r.sharpe,
                r.max_drawdown_pct, r.trades, r.win_rate, r.profit_factor);
        }
        println!("{}", "=".repeat(95));
    } else {
        println!("\n  无达标组合");
    }

    Ok(())
}

#[derive(Clone)]
struct CsvRow {
    symbol: String,
    strategy: String,
    leverage: u32,
    roi: f64,
    sharpe: f64,
    max_drawdown_pct: f64,
    trades: u32,
    win_rate: f64,
    profit_factor: f64,
    net_profit: f64,
    passed: bool,
}
