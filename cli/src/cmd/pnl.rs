use chrono::Local;
use crate::Ctx;
use std::collections::HashMap;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_trades(records_dir: &std::path::Path) -> Vec<serde_json::Value> {
    let path = records_dir.join("trades.jsonl");
    if !path.exists() { return Vec::new(); }
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return Vec::new() };
    content.lines().filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

struct PnlResult {
    total_pnl: f64,
    trades: usize,
    round_trips: u32,
    wins: u32,
    losses: u32,
    win_rate: f64,
    avg_win: f64,
    avg_loss: f64,
    profit_factor: f64,
}

fn compute_pnl(trades: &[serde_json::Value]) -> HashMap<String, PnlResult> {
    let mut by_strategy: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in trades {
        let strat = t.get("strategy").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        by_strategy.entry(strat).or_default().push(t);
    }

    let mut results = HashMap::new();
    for (strategy, strades) in &by_strategy {
        let mut by_symbol: HashMap<String, Vec<&&serde_json::Value>> = HashMap::new();
        for t in strades {
            let sym = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("?").to_string();
            by_symbol.entry(sym).or_default().push(t);
        }

        let mut total_pnl = 0.0f64;
        let mut wins = 0u32;
        let mut losses = 0u32;
        let mut total_win_pnl = 0.0f64;
        let mut total_loss_pnl = 0.0f64;

        for (_symbol, sym_trades) in &by_symbol {
            let mut pos: Option<(String, f64, f64)> = None;
            for t in sym_trades {
                let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                let price = parse_num(t.get("price"));
                let qty = parse_num(t.get("qty"));
                if price == 0.0 { continue; }
                match pos {
                    None => { pos = Some((side, price, qty)); }
                    Some((ref ps, pp, pq)) if *ps == side => {
                        let tq = pq + qty;
                        if tq > 0.0 { pos = Some((side, (pp * pq + price * qty) / tq, tq)); }
                    }
                    Some((ref ps, pp, pq)) => {
                        let close_qty = pq.min(qty);
                        let pnl = if *ps == "buy" { (price - pp) * close_qty } else { (pp - price) * close_qty };
                        total_pnl += pnl;
                        if pnl >= 0.0 { wins += 1; total_win_pnl += pnl; }
                        else { losses += 1; total_loss_pnl += pnl.abs(); }
                        let remaining = pq - close_qty;
                        if remaining > 0.0 { pos = Some((ps.clone(), pp, remaining)); }
                        else if qty > close_qty { pos = Some((side, price, qty - close_qty)); }
                        else { pos = None; }
                    }
                }
            }
        }

        let round_trips = wins + losses;
        let win_rate = if round_trips > 0 { wins as f64 / round_trips as f64 } else { 0.0 };
        let avg_win = if wins > 0 { total_win_pnl / wins as f64 } else { 0.0 };
        let avg_loss = if losses > 0 { total_loss_pnl / losses as f64 } else { 0.0 };
        let profit_factor = if total_loss_pnl > 0.0 { total_win_pnl / total_loss_pnl } else { f64::INFINITY };

        results.insert(strategy.clone(), PnlResult {
            total_pnl, trades: strades.len(), round_trips, wins, losses,
            win_rate, avg_win, avg_loss, profit_factor,
        });
    }
    results
}

/// P&L 查询 — 支持整体/单策略/单币种模式
pub async fn pnl(
    ctx: &Ctx,
    strategy: Option<String>,
    symbol: Option<String>,
    days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // If strategy is specified, show strategy PnL from local trades.jsonl
    if strategy.is_some() || symbol.is_none() {
        return strategy_pnl(ctx, strategy, days);
    }

    // Symbol-specific: query exchange
    let exchange = &ctx.exchange;
    let hours = days * 24;
    let symbols: Vec<String> = if let Some(sym) = symbol {
        vec![sym]
    } else {
        let positions = exchange.get_positions().await?;
        let syms: Vec<String> = positions.iter()
            .filter_map(|p| p.get("symbol").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();
        if syms.is_empty() { vec!["BTCUSDT".to_string(), "ETHUSDT".to_string()] } else { syms }
    };

    let mut all_trades: Vec<serde_json::Value> = Vec::new();
    for sym in &symbols {
        match exchange.fetch_my_trades(sym, 100).await {
            Ok(trades) => all_trades.extend(trades),
            Err(e) => println!("  获取 {sym} 成交记录失败: {e}"),
        }
    }
    all_trades.sort_by_key(|t| t.get("time").and_then(|v| v.as_u64()).unwrap_or(0));

    if ctx.json {
        let result = serde_json::json!({
            "trades": all_trades.len(),
            "hours": hours,
            "symbols": symbols,
        });
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n{}", "=".repeat(60));
    println!("  P&L 报告  {now}  (最近 {hours}h)");
    println!("{}", "=".repeat(60));

    if !all_trades.is_empty() {
        let mut by_symbol: HashMap<String, (f64, f64, f64, u32)> = HashMap::new();
        let mut total_fee = 0.0f64;

        for t in &all_trades {
            let sym = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("?").to_string();
            let fee: f64 = t.get("commission").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let cost: f64 = t.get("quoteQty").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("");
            total_fee += fee;
            let entry = by_symbol.entry(sym).or_insert((0.0, 0.0, 0.0, 0));
            entry.2 += fee;
            entry.3 += 1;
            if side == "BUY" { entry.0 += cost; } else { entry.1 += cost; }
        }

        println!("\n  已成交记录 ({} 笔):", all_trades.len());
        println!("  {:<14} {:>12} {:>12} {:>10} {:>6}", "交易对", "买入", "卖出", "手续费", "笔数");
        println!("  {}", "-".repeat(56));
        for (sym, (buy, sell, fee, count)) in &by_symbol {
            println!("  {sym:<14} ${buy:>10.2} ${sell:>10.2} ${fee:>8.4} {count:>5}");
        }
        println!("\n  总手续费: ${total_fee:.4}");
    } else {
        println!("\n  最近 {hours}h 无成交记录");
    }

    // Current positions
    let positions = exchange.get_positions().await?;
    if !positions.is_empty() {
        println!("\n  当前持仓:");
        println!("  {:<14} {:<6} {:>8} {:>12} {:>12} {:>12}", "交易对", "方向", "数量", "开仓价", "标记价", "未实现盈亏");
        println!("  {}", "-".repeat(68));
        let mut total_unrealized = 0.0f64;
        for p in &positions {
            let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
            let amt: f64 = p.get("positionAmt").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let entry_price: f64 = p.get("entryPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let mark_price: f64 = p.get("markPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let upnl: f64 = p.get("unrealizedProfit").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            total_unrealized += upnl;
            let sign = if upnl >= 0.0 { "+" } else { "" };
            println!("  {sym:<14} {side:<6} {amt:>8.4} ${entry_price:>10.2} ${mark_price:>10.2} {sign}${upnl:>10.4}");
        }
        let sign = if total_unrealized >= 0.0 { "+" } else { "" };
        println!("\n  未实现总计: {sign}${total_unrealized:.4}");
    } else {
        println!("\n  无持仓");
    }

    println!();
    Ok(())
}

/// 策略级 PnL (merged from strategy_pnl.rs)
fn strategy_pnl(ctx: &Ctx, strategy: Option<String>, _days: u32) -> Result<(), Box<dyn std::error::Error>> {
    let all_trades = load_trades(&ctx.records_dir);
    if all_trades.is_empty() {
        if ctx.json {
            println!("[]");
        } else {
            println!("\n  (无交易记录，records/trades.jsonl 为空或不存在)");
        }
        return Ok(());
    }

    // Filter by strategy if specified
    let trades: Vec<serde_json::Value> = if let Some(ref name) = strategy {
        all_trades.into_iter()
            .filter(|t| t.get("strategy").and_then(|v| v.as_str()) == Some(name.as_str()))
            .collect()
    } else {
        all_trades
    };

    if trades.is_empty() {
        if ctx.json {
            println!("[]");
        } else {
            println!("\n  策略 '{}' 无交易记录", strategy.as_deref().unwrap_or("?"));
        }
        return Ok(());
    }

    let results = compute_pnl(&trades);

    if ctx.json {
        let mut json_results = Vec::new();
        for (strategy_name, r) in &results {
            json_results.push(serde_json::json!({
                "strategy": strategy_name,
                "total_pnl": r.total_pnl,
                "trades": r.trades,
                "round_trips": r.round_trips,
                "wins": r.wins,
                "losses": r.losses,
                "win_rate": r.win_rate,
                "avg_win": r.avg_win,
                "avg_loss": r.avg_loss,
                "profit_factor": if r.profit_factor.is_infinite() { serde_json::Value::String("inf".to_string()) } else { serde_json::json!(r.profit_factor) },
            }));
        }
        println!("{}", serde_json::to_string_pretty(&json_results)?);
        return Ok(());
    }

    println!("\n  {}", "=".repeat(60));
    println!("  策略 P&L 聚合  ({} 笔交易)", trades.len());
    println!("  {}", "=".repeat(60));

    let mut strats: Vec<_> = results.keys().cloned().collect();
    strats.sort();

    for strat_name in &strats {
        let r = &results[strat_name];
        let sign = if r.total_pnl >= 0.0 { "+" } else { "" };
        println!("\n  [{strat_name}]");
        println!("    P&L:       {sign}${:.4}", r.total_pnl);
        println!("    交易:      {} 笔 ({} 轮完整)", r.trades, r.round_trips);
        println!("    胜率:      {:.0}% ({}W/{}L)", r.win_rate * 100.0, r.wins, r.losses);
        if r.profit_factor.is_infinite() {
            println!("    盈亏比:    inf (无亏损)");
        } else {
            println!("    盈亏比:    {:.2}", r.profit_factor);
        }
        println!("    平均盈利:  +${:.4}", r.avg_win);
        println!("    平均亏损:  -${:.4}", r.avg_loss);
    }

    let total: f64 = results.values().map(|r| r.total_pnl).sum();
    let total_trades: usize = results.values().map(|r| r.trades).sum();
    let sign = if total >= 0.0 { "+" } else { "" };
    println!("\n  {}", "─".repeat(60));
    println!("  合计: {sign}${total:.4}  ({total_trades} 笔)");
    println!();

    Ok(())
}
