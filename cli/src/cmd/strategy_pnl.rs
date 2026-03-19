use clawchat_shared::paths::records_dir;
use std::collections::HashMap;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_trades() -> Vec<serde_json::Value> {
    let path = records_dir().join("trades.jsonl");
    if !path.exists() {
        return Vec::new();
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    content
        .lines()
        .filter(|l| !l.is_empty())
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
        let strat = t
            .get("strategy")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        by_strategy.entry(strat).or_default().push(t);
    }

    let mut results = HashMap::new();
    for (strategy, strades) in &by_strategy {
        let mut by_symbol: HashMap<String, Vec<&&serde_json::Value>> = HashMap::new();
        for t in strades {
            let sym = t
                .get("symbol")
                .and_then(|v| v.as_str())
                .unwrap_or("?")
                .to_string();
            by_symbol.entry(sym).or_default().push(t);
        }

        let mut total_pnl = 0.0f64;
        let mut wins = 0u32;
        let mut losses = 0u32;
        let mut total_win_pnl = 0.0f64;
        let mut total_loss_pnl = 0.0f64;

        for (_symbol, sym_trades) in &by_symbol {
            let mut pos: Option<(String, f64, f64)> = None; // (side, price, qty)
            for t in sym_trades {
                let side = t
                    .get("side")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                let price = parse_num(t.get("price"));
                let qty = parse_num(t.get("qty"));
                if price == 0.0 {
                    continue;
                }
                match pos {
                    None => {
                        pos = Some((side, price, qty));
                    }
                    Some((ref ps, pp, pq)) if *ps == side => {
                        let tq = pq + qty;
                        if tq > 0.0 {
                            let np = (pp * pq + price * qty) / tq;
                            pos = Some((side, np, tq));
                        }
                    }
                    Some((ref ps, pp, pq)) => {
                        let close_qty = pq.min(qty);
                        let pnl = if *ps == "buy" {
                            (price - pp) * close_qty
                        } else {
                            (pp - price) * close_qty
                        };
                        total_pnl += pnl;
                        if pnl >= 0.0 {
                            wins += 1;
                            total_win_pnl += pnl;
                        } else {
                            losses += 1;
                            total_loss_pnl += pnl.abs();
                        }
                        let remaining = pq - close_qty;
                        if remaining > 0.0 {
                            pos = Some((ps.clone(), pp, remaining));
                        } else if qty > close_qty {
                            pos = Some((side, price, qty - close_qty));
                        } else {
                            pos = None;
                        }
                    }
                }
            }
        }

        let round_trips = wins + losses;
        let win_rate = if round_trips > 0 {
            wins as f64 / round_trips as f64
        } else {
            0.0
        };
        let avg_win = if wins > 0 {
            total_win_pnl / wins as f64
        } else {
            0.0
        };
        let avg_loss = if losses > 0 {
            total_loss_pnl / losses as f64
        } else {
            0.0
        };
        let profit_factor = if total_loss_pnl > 0.0 {
            total_win_pnl / total_loss_pnl
        } else {
            f64::INFINITY
        };

        results.insert(
            strategy.clone(),
            PnlResult {
                total_pnl,
                trades: strades.len(),
                round_trips,
                wins,
                losses,
                win_rate,
                avg_win,
                avg_loss,
                profit_factor,
            },
        );
    }
    results
}

/// 按策略 P&L — 从交易日志聚合每个策略收益
pub fn strategy_pnl(_days: u32) -> Result<(), Box<dyn std::error::Error>> {
    let trades = load_trades();
    if trades.is_empty() {
        println!("\n  (无交易记录，records/trades.jsonl 为空或不存在)");
        return Ok(());
    }

    let results = compute_pnl(&trades);

    println!("\n  {}", "=".repeat(60));
    println!("  策略 P&L 聚合  ({} 笔交易)", trades.len());
    println!("  {}", "=".repeat(60));

    let mut strats: Vec<_> = results.keys().cloned().collect();
    strats.sort();

    for strategy in &strats {
        let r = &results[strategy];
        let sign = if r.total_pnl >= 0.0 { "+" } else { "" };
        println!("\n  [{strategy}]");
        println!("    P&L:       {sign}${:.4}", r.total_pnl);
        println!(
            "    交易:      {} 笔 ({} 轮完整)",
            r.trades, r.round_trips
        );
        println!(
            "    胜率:      {:.0}% ({}W/{}L)",
            r.win_rate * 100.0,
            r.wins,
            r.losses
        );
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
