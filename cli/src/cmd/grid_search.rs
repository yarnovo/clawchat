use clawchat_shared::criteria::passes;
use clawchat_shared::exchange::Exchange;
use clawchat_shared::types::{TAKER_FEE, SLIPPAGE};
use crate::backtest::{self, strategies, BacktestConfig, timeframe_to_ms};
use crate::cmd::backtest::fetch_candles;
use std::collections::HashMap;

/// Default parameter grids for each strategy
fn get_param_grid(strategy: &str) -> Option<Vec<(String, Vec<f64>)>> {
    let grid: Vec<(String, Vec<f64>)> = match strategy {
        "trend" => vec![
            ("ema_fast".into(), vec![10.0, 14.0, 21.0]),
            ("ema_slow".into(), vec![30.0, 40.0, 55.0]),
            ("atr_sl_mult".into(), vec![1.0, 1.5, 2.0]),
            ("atr_tp_mult".into(), vec![2.0, 3.0, 4.0]),
        ],
        "scalping" => vec![
            ("ema_fast".into(), vec![8.0, 12.0, 16.0]),
            ("ema_slow".into(), vec![30.0, 50.0, 70.0]),
            ("volume_multiplier".into(), vec![1.0, 1.2, 1.5]),
        ],
        "breakout" => vec![
            ("lookback".into(), vec![24.0, 48.0, 72.0]),
            ("atr_filter".into(), vec![0.2, 0.3, 0.5]),
            ("trail_atr".into(), vec![2.0, 3.0, 4.0]),
        ],
        "rsi" => vec![
            ("rsi_period".into(), vec![10.0, 14.0, 21.0]),
            ("rsi_oversold".into(), vec![20.0, 25.0, 30.0]),
            ("rsi_overbought".into(), vec![70.0, 75.0, 80.0]),
        ],
        "bollinger" => vec![
            ("bb_period".into(), vec![15.0, 20.0, 30.0]),
            ("num_std".into(), vec![2.0, 2.5, 3.0]),
        ],
        "macd" => vec![
            ("fast_period".into(), vec![8.0, 12.0, 16.0]),
            ("slow_period".into(), vec![21.0, 26.0, 34.0]),
            ("signal_period".into(), vec![5.0, 9.0, 12.0]),
            ("trend_ema".into(), vec![100.0, 150.0, 200.0]),
        ],
        "mean_reversion" => vec![
            ("ema_period".into(), vec![30.0, 50.0, 80.0]),
            ("std_period".into(), vec![30.0, 50.0, 80.0]),
            ("entry_std".into(), vec![1.5, 2.0, 2.5]),
        ],
        "grid" => vec![
            ("grids".into(), vec![5.0, 8.0, 10.0, 15.0]),
            ("lookback".into(), vec![30.0, 50.0, 100.0]),
        ],
        "ema2050" => vec![
            ("ema_fast".into(), vec![15.0, 20.0, 30.0]),
            ("ema_slow".into(), vec![40.0, 50.0, 70.0]),
            ("trail_atr".into(), vec![2.0, 2.5, 3.5]),
        ],
        _ => return None,
    };
    Some(grid)
}

fn cartesian_product(grid: &[(String, Vec<f64>)]) -> Vec<HashMap<String, f64>> {
    let mut combos: Vec<HashMap<String, f64>> = vec![HashMap::new()];
    for (key, values) in grid {
        let mut new_combos = Vec::new();
        for combo in &combos {
            for &val in values {
                let mut new = combo.clone();
                new.insert(key.clone(), val);
                new_combos.push(new);
            }
        }
        combos = new_combos;
    }
    combos
}

/// 参数网格搜索 — 穷举寻找最优参数组合
pub async fn grid_search(
    exchange: &Exchange,
    symbol: &str,
    strategy: &str,
    days: u32,
    timeframe: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let leverage = 3u32;
    let capital = 200.0;
    let position_pct = 0.5;
    let top_n = 10;

    let grid = match get_param_grid(strategy) {
        Some(g) => g,
        None => {
            println!("  错误: 策略 '{strategy}' 无预设网格");
            return Ok(());
        }
    };

    let param_names: Vec<String> = grid.iter().map(|(k, _)| k.clone()).collect();
    let combos = cartesian_product(&grid);

    println!("\n  参数网格搜索");
    println!("  币种: {symbol}  策略: {strategy}  杠杆: {leverage}x");
    println!("  天数: {days}  周期: {timeframe}  资金: ${capital}");
    let space_desc: Vec<String> = grid.iter().map(|(k, v)| format!("{k}({})", v.len())).collect();
    println!("  参数空间: {} = {} 组合", space_desc.join(" x "), combos.len());
    println!();

    // Fetch candles once
    println!("  拉取 {symbol} {timeframe} {days}天 K线...");
    let candles = fetch_candles(exchange, symbol, timeframe, days).await?;
    if candles.len() < 50 {
        println!("  错误: K 线数据不足 (got {})", candles.len());
        return Ok(());
    }
    println!("  获取到 {} 根 K 线", candles.len());

    let tf_ms = timeframe_to_ms(timeframe);
    let mut results: Vec<GridResult> = Vec::new();
    let total = combos.len();
    let t0 = std::time::Instant::now();

    for (i, params) in combos.iter().enumerate() {
        let done = i + 1;
        let mut strat = match strategies::get_strategy(strategy, Some(params)) {
            Some(s) => s,
            None => continue,
        };

        let config = BacktestConfig {
            capital,
            leverage,
            position_pct,
            taker_fee: TAKER_FEE,
            slippage: SLIPPAGE,
        };

        let result = backtest::run_backtest(&candles, strat.as_mut(), &config);
        let m = backtest::calc_metrics(&result, tf_ms);
        let bm = m.to_backtest_metrics();

        results.push(GridResult {
            params: params.clone(),
            roi: (m.roi * 100.0).round() / 100.0,
            sharpe: (m.sharpe * 100.0).round() / 100.0,
            max_drawdown_pct: (m.max_drawdown_pct * 100.0).round() / 100.0,
            trades: m.total_trades as u32,
            win_rate: (m.win_rate * 10.0).round() / 10.0,
            profit_factor: (m.profit_factor * 100.0).round() / 100.0,
            net_profit: (m.net_profit * 100.0).round() / 100.0,
            passed: passes(&bm, days),
        });

        if done % 10 == 0 || done == total {
            let elapsed = t0.elapsed().as_secs_f64();
            let eta = if done > 0 { elapsed / done as f64 * (total - done) as f64 } else { 0.0 };
            let n_passed = results.iter().filter(|r| r.passed).count();
            eprint!("\r  进度: {done}/{total} ({}%)  达标: {n_passed}  ETA {eta:.0}s", done * 100 / total);
        }
    }

    let n_passed = results.iter().filter(|r| r.passed).count();
    let elapsed = t0.elapsed().as_secs_f64();
    eprintln!("\r  完成: {total}/{total}  达标: {n_passed}  耗时: {elapsed:.1}s                    ");

    results.sort_by(|a, b| b.sharpe.partial_cmp(&a.sharpe).unwrap_or(std::cmp::Ordering::Equal));

    let passed: Vec<&GridResult> = results.iter().filter(|r| r.passed).collect();
    let show: Vec<&GridResult> = if !passed.is_empty() {
        passed.iter().take(top_n).copied().collect()
    } else {
        results.iter().take(top_n).collect()
    };

    let label = if !passed.is_empty() { "达标" } else { "全部（无达标，显示最优）" };
    println!("\n{}", "=".repeat(100));
    println!("  Top {} {label}  {symbol} {strategy} {leverage}x {timeframe}", show.len());
    println!("{}", "=".repeat(100));

    // Header
    let param_header: String = param_names.iter().map(|k| format!("{k:>8}")).collect::<Vec<_>>().join("  ");
    println!("  # {param_header}  {:>8} {:>7} {:>7} {:>5} {:>7} {:>7} {:>4}", "ROI", "夏普", "回撤", "交易", "胜率", "盈亏比", "达标");
    println!("  {}", "-".repeat(param_names.len() * 10 + 60));

    for (i, r) in show.iter().enumerate() {
        let param_vals: String = param_names.iter().map(|k| {
            let v = r.params.get(k).copied().unwrap_or(0.0);
            if v == v.floor() { format!("{v:>8.0}") } else { format!("{v:>8.1}") }
        }).collect::<Vec<_>>().join("  ");
        let mark = if r.passed { "Y" } else { "-" };
        println!("  {:<2} {param_vals}  {:>7.1}% {:>7.2} {:>6.1}% {:>5} {:>6.1}% {:>7.2} {mark:>4}",
            i + 1, r.roi, r.sharpe, r.max_drawdown_pct, r.trades, r.win_rate, r.profit_factor);
    }
    println!("{}", "=".repeat(100));

    // Print best params as JSON
    if let Some(best) = show.first() {
        println!("\n  最佳参数 (JSON):");
        println!("  {}", serde_json::to_string(&best.params).unwrap_or_default());
    }
    println!();

    Ok(())
}

struct GridResult {
    params: HashMap<String, f64>,
    roi: f64,
    sharpe: f64,
    max_drawdown_pct: f64,
    trades: u32,
    win_rate: f64,
    profit_factor: f64,
    net_profit: f64,
    passed: bool,
}
