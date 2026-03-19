use clawchat_shared::exchange::Exchange;
use clawchat_shared::types::{MAKER_FEE, TAKER_FEE, SLIPPAGE};
use crate::backtest::{self, strategies, BacktestConfig, timeframe_to_ms};
use std::collections::HashMap;

/// Fetch candles from exchange, paginating with endTime
pub async fn fetch_candles(
    exchange: &Exchange,
    symbol: &str,
    timeframe: &str,
    days: u32,
) -> Result<Vec<(f64, f64, f64, f64, f64)>, Box<dyn std::error::Error>> {
    let candles_per_day: u32 = match timeframe {
        "1m" => 1440, "5m" => 288, "15m" => 96,
        "1h" => 24, "4h" => 6, "1d" => 1, _ => 24,
    };
    let total = days * candles_per_day;
    let mut all_candles: Vec<(f64, f64, f64, f64, f64)> = Vec::new();
    let mut end_time = chrono::Utc::now().timestamp_millis() as u64;
    let mut remaining = total;

    while remaining > 0 {
        let limit = remaining.min(1000);
        let batch = exchange
            .fetch_ohlcv(symbol, timeframe, limit, None, Some(end_time))
            .await?;
        if batch.is_empty() { break; }

        let mut parsed: Vec<(f64, f64, f64, f64, f64)> = Vec::new();
        let mut earliest_ts: Option<u64> = None;
        for k in &batch {
            let arr = match k.as_array() {
                Some(a) if a.len() >= 6 => a,
                _ => continue,
            };
            let ts = arr[0].as_f64().or_else(|| arr[0].as_u64().map(|u| u as f64)).unwrap_or(0.0) as u64;
            let parse_val = |idx: usize| -> Option<f64> {
                arr[idx].as_str().and_then(|s| s.parse::<f64>().ok()).or_else(|| arr[idx].as_f64())
            };
            let o = match parse_val(1) { Some(v) => v, None => continue };
            let h = match parse_val(2) { Some(v) => v, None => continue };
            let l = match parse_val(3) { Some(v) => v, None => continue };
            let c = match parse_val(4) { Some(v) => v, None => continue };
            let v = match parse_val(5) { Some(v) => v, None => continue };
            parsed.push((o, h, l, c, v));
            match earliest_ts {
                None => earliest_ts = Some(ts),
                Some(ref mut e) if ts < *e => *e = ts,
                _ => {}
            }
        }

        let batch_len = parsed.len() as u32;
        if let Some(ts) = earliest_ts {
            end_time = ts - 1;
        }

        // Prepend to maintain chronological order
        parsed.extend(all_candles);
        all_candles = parsed;
        remaining = remaining.saturating_sub(batch_len);
        if batch_len < limit { break; }
    }

    let total = total as usize;
    if all_candles.len() > total {
        all_candles = all_candles[all_candles.len() - total..].to_vec();
    }
    Ok(all_candles)
}

/// 单策略回测
pub async fn backtest(
    exchange: &Exchange,
    symbol: &str,
    strategy: &str,
    days: u32,
    timeframe: &str,
    leverage: u32,
    capital: f64,
    position_size: f64,
    params: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n  正在拉取 {symbol} {timeframe} K线数据 ({days}天)...");
    let candles = fetch_candles(exchange, symbol, timeframe, days).await?;
    if candles.is_empty() {
        println!("  错误: 无法获取 K 线数据");
        return Ok(());
    }
    println!("  获取到 {} 根 K 线", candles.len());

    // Parse custom params
    let custom_params: Option<HashMap<String, f64>> = params.and_then(|p| {
        serde_json::from_str::<HashMap<String, serde_json::Value>>(p).ok().map(|m| {
            m.into_iter().filter_map(|(k, v)| v.as_f64().map(|n| (k, n))).collect()
        })
    });

    let mut strat = match strategies::get_strategy(strategy, custom_params.as_ref()) {
        Some(s) => s,
        None => {
            println!("  错误: 未知策略 '{strategy}'");
            println!("  可用: {}", strategies::strategy_names().join(", "));
            return Ok(());
        }
    };

    println!("  正在回测 [{strategy}] 策略...");
    let tf_ms = timeframe_to_ms(timeframe);
    let config = BacktestConfig {
        capital,
        leverage,
        position_pct: position_size,
        taker_fee: TAKER_FEE,
        slippage: SLIPPAGE,
        funding_rate_per_8h: 0.0001, // 0.01% per 8h
        funding_interval_candles: 0,  // will be set by with_funding
    }.with_funding(tf_ms);
    let result = backtest::run_backtest(&candles, strat.as_mut(), &config);
    let metrics = backtest::calc_metrics(&result, tf_ms);

    print_report(symbol, strategy, timeframe, days, leverage, capital, position_size, &metrics, candles.len());
    Ok(())
}

fn print_report(
    symbol: &str, strategy_name: &str, timeframe: &str, days: u32,
    leverage: u32, capital: f64, position_pct: f64, m: &backtest::Metrics, num_candles: usize,
) {
    println!("\n{}", "=".repeat(65));
    println!("  回测报告");
    println!("{}", "=".repeat(65));
    println!("  交易对:     {symbol}");
    println!("  策略:       {strategy_name}");
    println!("  时间周期:   {timeframe}  回测天数: {days}  K线数: {num_candles}");
    println!("  初始资金:   ${capital:.2}");
    println!("  杠杆倍数:   {leverage}x");
    println!("  仓位比例:   {:.0}%", position_pct * 100.0);
    println!("  手续费:     taker {:.2}%  maker {:.2}%", TAKER_FEE * 100.0, MAKER_FEE * 100.0);
    println!("  滑点:       {:.2}%", SLIPPAGE * 100.0);

    println!("\n  {}", "─".repeat(55));
    println!("  资金");
    println!("  {}", "─".repeat(55));
    println!("  最终余额:   ${:.2}", m.final_balance);
    println!("  净利润:     ${:.2}", m.net_profit);
    println!("  收益率:     {:.2}%", m.roi);
    println!("  总手续费:   ${:.2}", m.total_fees);
    if m.total_funding_cost.abs() > 0.001 {
        println!("  资金费率:   ${:.2}", m.total_funding_cost);
    }

    println!("\n  {}", "─".repeat(55));
    println!("  交易");
    println!("  {}", "─".repeat(55));
    println!("  总交易:     {}笔", m.total_trades);
    println!("  盈利:       {}笔", m.wins);
    println!("  亏损:       {}笔", m.losses);
    println!("  胜率:       {:.1}%", m.win_rate);
    println!("  平均盈利:   ${:.2}", m.avg_win);
    println!("  平均亏损:   ${:.2}", m.avg_loss);
    println!("  盈亏比:     {:.2}", m.profit_factor);
    println!("  期望值:     ${:.2}", m.expectancy);

    println!("\n  {}", "─".repeat(55));
    println!("  风险");
    println!("  {}", "─".repeat(55));
    println!("  夏普比率:   {:.2}", m.sharpe);
    println!("  最大回撤:   ${:.2}  ({:.2}%)", m.max_drawdown, m.max_drawdown_pct);

    println!("\n  {}", "─".repeat(55));
    let verdict = if m.net_profit > 0.0 && m.sharpe > 1.0 && m.max_drawdown_pct < 20.0 {
        "通过 - 策略可用"
    } else if m.net_profit > 0.0 {
        "勉强 - 盈利但风险指标不理想"
    } else {
        "不通过 - 策略亏损"
    };
    println!("  结论:       {verdict}");
    println!("{}\n", "=".repeat(65));
}
