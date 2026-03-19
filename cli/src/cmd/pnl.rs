use chrono::Local;
use clawchat_shared::exchange::Exchange;

/// P&L 查询 — 指定币种或全局盈亏
pub async fn pnl(
    exchange: &Exchange,
    symbol: Option<String>,
    hours: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // Determine symbols to query
    let symbols: Vec<String> = if let Some(sym) = symbol {
        vec![sym]
    } else {
        // Get symbols from open positions
        let positions = exchange.get_positions().await?;
        let syms: Vec<String> = positions
            .iter()
            .filter_map(|p| p.get("symbol").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();
        if syms.is_empty() {
            vec!["BTCUSDT".to_string(), "ETHUSDT".to_string()]
        } else {
            syms
        }
    };

    // Fetch trades for each symbol
    let mut all_trades: Vec<serde_json::Value> = Vec::new();
    for sym in &symbols {
        match exchange.fetch_my_trades(sym, 100).await {
            Ok(trades) => all_trades.extend(trades),
            Err(e) => println!("  获取 {sym} 成交记录失败: {e}"),
        }
    }
    all_trades.sort_by_key(|t| {
        t.get("time")
            .and_then(|v| v.as_u64())
            .unwrap_or(0)
    });

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n{}", "=".repeat(60));
    println!("  P&L 报告  {now}  (最近 {hours}h)");
    println!("{}", "=".repeat(60));

    if !all_trades.is_empty() {
        // Aggregate by symbol
        let mut by_symbol: std::collections::HashMap<String, (f64, f64, f64, u32)> =
            std::collections::HashMap::new();
        let mut total_fee = 0.0f64;

        for t in &all_trades {
            let sym = t
                .get("symbol")
                .and_then(|v| v.as_str())
                .unwrap_or("?")
                .to_string();
            let fee: f64 = t
                .get("commission")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let cost: f64 = t
                .get("quoteQty")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let side = t
                .get("side")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            total_fee += fee;
            let entry = by_symbol.entry(sym).or_insert((0.0, 0.0, 0.0, 0));
            entry.2 += fee;
            entry.3 += 1;
            if side == "BUY" {
                entry.0 += cost;
            } else {
                entry.1 += cost;
            }
        }

        println!("\n  已成交记录 ({} 笔):", all_trades.len());
        println!(
            "  {:<14} {:>12} {:>12} {:>10} {:>6}",
            "交易对", "买入", "卖出", "手续费", "笔数"
        );
        println!("  {}", "-".repeat(56));
        for (sym, (buy, sell, fee, count)) in &by_symbol {
            println!(
                "  {sym:<14} ${buy:>10.2} ${sell:>10.2} ${fee:>8.4} {count:>5}"
            );
        }
        println!("\n  总手续费: ${total_fee:.4}");
    } else {
        println!("\n  最近 {hours}h 无成交记录");
    }

    // Current positions
    let positions = exchange.get_positions().await?;
    if !positions.is_empty() {
        println!("\n  当前持仓:");
        println!(
            "  {:<14} {:<6} {:>8} {:>12} {:>12} {:>12}",
            "交易对", "方向", "数量", "开仓价", "标记价", "未实现盈亏"
        );
        println!("  {}", "-".repeat(68));
        let mut total_unrealized = 0.0f64;
        for p in &positions {
            let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
            let amt: f64 = p
                .get("positionAmt")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let entry_price: f64 = p
                .get("entryPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let mark_price: f64 = p
                .get("markPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let upnl: f64 = p
                .get("unrealizedProfit")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            total_unrealized += upnl;
            let sign = if upnl >= 0.0 { "+" } else { "" };
            println!(
                "  {sym:<14} {side:<6} {amt:>8.4} ${entry_price:>10.2} ${mark_price:>10.2} {sign}${upnl:>10.4}"
            );
        }
        let sign = if total_unrealized >= 0.0 { "+" } else { "" };
        println!("\n  未实现总计: {sign}${total_unrealized:.4}");
    } else {
        println!("\n  无持仓");
    }

    println!();
    Ok(())
}
