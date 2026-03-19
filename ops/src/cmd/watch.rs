use chrono::Local;
use clawchat_shared::exchange::Exchange;
use clawchat_shared::indicators::rsi_from_slice;

const WATCHLIST: &[&str] = &["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];

const SKIP_BASES: &[&str] = &[
    "USDC", "BUSD", "TUSD", "FDUSD", "DAI", "UST", "USDP",
];

fn format_price(price: f64) -> String {
    if price >= 1000.0 {
        format!("${price:.2}")
    } else if price >= 1.0 {
        format!("${price:.4}")
    } else {
        format!("${price:.6}")
    }
}

fn format_change(pct: f64) -> String {
    let sign = if pct >= 0.0 { "+" } else { "" };
    format!("{sign}{pct:.2}%")
}

/// 行情监控 — 显示自选列表实时价格
pub async fn watch(
    exchange: &Exchange,
    symbols: Option<Vec<String>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let watch_symbols: Vec<String> = symbols.unwrap_or_else(|| {
        WATCHLIST.iter().map(|s| s.to_string()).collect()
    });

    let tickers = exchange.fetch_tickers().await?;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n{}", "=".repeat(60));
    println!("  币安行情  {now}");
    println!("{}", "=".repeat(60));
    println!(
        "  {:<12} {:>12} {:>10} {:>14}",
        "交易对", "价格", "24h涨跌", "24h成交量"
    );
    println!("  {}", "-".repeat(48));

    for sym in &watch_symbols {
        if let Some(t) = tickers.iter().find(|t| {
            t.get("symbol")
                .and_then(|s| s.as_str())
                .map(|s| s == sym.as_str())
                .unwrap_or(false)
        }) {
            let price_val = t
                .get("lastPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);
            let change_pct = t
                .get("priceChangePercent")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);
            let quote_vol = t
                .get("quoteVolume")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);

            let price = format_price(price_val);
            let change = format_change(change_pct);
            let vol = format!("{:.1}M", quote_vol / 1e6);
            println!("  {sym:<12} {price:>12} {change:>10} {vol:>14}");
        }
    }
    println!();
    Ok(())
}

/// 账户余额概览
pub async fn account(exchange: &Exchange) -> Result<(), Box<dyn std::error::Error>> {
    let acct = exchange.get_account().await?;

    println!("\n  账户余额:");
    println!("  {}", "-".repeat(30));

    let mut has_balance = false;
    if let Some(assets) = acct.get("assets").and_then(|a| a.as_array()) {
        for asset in assets {
            let name = asset
                .get("asset")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let total: f64 = asset
                .get("walletBalance")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let available: f64 = asset
                .get("availableBalance")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            if total.abs() > 0.0001 {
                let margin = total - available;
                println!(
                    "  {name:<8} 总计: {total:<14.4} 可用: {available:<14.4} 冻结: {margin:.4}"
                );
                has_balance = true;
            }
        }
    }

    if !has_balance {
        // Fallback: check totalWalletBalance
        let total: f64 = acct
            .get("totalWalletBalance")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let available: f64 = acct
            .get("availableBalance")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        if total > 0.0001 {
            let margin = total - available;
            println!("  USDT     总计: {total:<14.4} 可用: {available:<14.4} 冻结: {margin:.4}");
        } else {
            println!("  (无持仓)");
        }
    }
    println!();
    Ok(())
}

/// 扫描高波动币种
pub async fn scan(
    exchange: &Exchange,
    top: usize,
    min_vol: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n  正在扫描币安全量 USDT 交易对...");
    let tickers = exchange.fetch_tickers().await?;

    let mut candidates: Vec<(String, f64, f64, f64, f64, f64)> = Vec::new();

    for t in &tickers {
        let symbol = t
            .get("symbol")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !symbol.ends_with("USDT") {
            continue;
        }
        let base = symbol.trim_end_matches("USDT");
        if SKIP_BASES.contains(&base) {
            continue;
        }

        let last: f64 = t
            .get("lastPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let high: f64 = t
            .get("highPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let low: f64 = t
            .get("lowPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let vol: f64 = t
            .get("quoteVolume")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let change_pct: f64 = t
            .get("priceChangePercent")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        if last <= 0.0 || low <= 0.0 || high <= 0.0 || vol < min_vol {
            continue;
        }

        let amplitude = (high - low) / low * 100.0;
        candidates.push((symbol, last, change_pct, amplitude, vol, high));
    }

    candidates.sort_by(|a, b| b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal));
    let top_items: Vec<_> = candidates.into_iter().take(top).collect();

    // Fetch RSI for top items
    println!("  正在计算 RSI（前 {} 个币）...", top_items.len());
    let mut rsi_map: Vec<Option<f64>> = Vec::new();
    for (sym, ..) in &top_items {
        match exchange.fetch_ohlcv(sym, "1h", 20, None, None).await {
            Ok(klines) => {
                let closes: Vec<f64> = klines
                    .iter()
                    .filter_map(|k| {
                        k.as_array()
                            .and_then(|a| a.get(4))
                            .and_then(|v| v.as_str().or_else(|| v.as_f64().map(|_| "")))
                            .and_then(|s| {
                                if s.is_empty() {
                                    k.as_array()
                                        .and_then(|a| a.get(4))
                                        .and_then(|v| v.as_f64())
                                } else {
                                    s.parse::<f64>().ok()
                                }
                            })
                    })
                    .collect();
                rsi_map.push(rsi_from_slice(&closes, 14));
            }
            Err(_) => rsi_map.push(None),
        }
    }

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n{}", "=".repeat(90));
    println!(
        "  币安高波动扫描  {now}  (成交额>{:.0}M, 按振幅排序)",
        min_vol / 1e6
    );
    println!("{}", "=".repeat(90));
    println!(
        "  {:<4} {:<14} {:>12} {:>9} {:>8} {:>10} {:>6}  {}",
        "#", "交易对", "价格", "24h涨跌", "振幅", "成交额", "RSI", "信号"
    );
    println!("  {}", "-".repeat(80));

    let mut grid_picks: Vec<String> = Vec::new();
    let mut rsi_buys: Vec<(String, f64)> = Vec::new();
    let mut rsi_sells: Vec<(String, f64)> = Vec::new();

    for (i, (sym, price_val, change_pct, amplitude, vol, _high)) in top_items.iter().enumerate() {
        let price = format_price(*price_val);
        let change = format_change(*change_pct);
        let amp = format!("{amplitude:.1}%");
        let vol_str = format!("{:.1}M", vol / 1e6);
        let rsi = rsi_map.get(i).copied().flatten();
        let rsi_str = rsi.map(|r| format!("{r:.0}")).unwrap_or_else(|| "-".to_string());

        let mut signals = Vec::new();
        if *amplitude >= 8.0 && *vol >= 10_000_000.0 {
            signals.push("GRID");
            grid_picks.push(sym.clone());
        }
        if let Some(r) = rsi {
            if r < 30.0 {
                signals.push("RSI-BUY");
                rsi_buys.push((sym.clone(), r));
            } else if r > 70.0 {
                signals.push("RSI-SELL");
                rsi_sells.push((sym.clone(), r));
            }
        }
        let signal = signals.join(" ");

        println!(
            "  {:<4} {:<14} {:>12} {:>9} {:>8} {:>10} {:>6}  {}",
            i + 1,
            sym,
            price,
            change,
            amp,
            vol_str,
            rsi_str,
            signal
        );
    }
    println!();

    // Summary
    println!("  --- 推荐汇总 ---");
    if !grid_picks.is_empty() {
        let names = grid_picks.iter().take(10).cloned().collect::<Vec<_>>().join(", ");
        println!("  网格候选({}): {names}", grid_picks.len());
    }
    if !rsi_buys.is_empty() {
        let items: Vec<String> = rsi_buys
            .iter()
            .map(|(s, r)| format!("{s}(RSI={r:.0})"))
            .collect();
        println!("  RSI超卖({}): {}", rsi_buys.len(), items.join(", "));
    }
    if !rsi_sells.is_empty() {
        let items: Vec<String> = rsi_sells
            .iter()
            .map(|(s, r)| format!("{s}(RSI={r:.0})"))
            .collect();
        println!("  RSI超买({}): {}", rsi_sells.len(), items.join(", "));
    }
    if grid_picks.is_empty() && rsi_buys.is_empty() && rsi_sells.is_empty() {
        println!("  暂无明显信号");
    }
    println!();

    Ok(())
}
