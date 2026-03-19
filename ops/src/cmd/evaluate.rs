use colored::Colorize;
use chrono::Utc;
use crate::Ctx;
use std::collections::HashMap;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_all_trades(records_dir: &std::path::Path) -> Vec<serde_json::Value> {
    let path = records_dir.join("trades.jsonl");
    if !path.exists() { return Vec::new(); }
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return Vec::new() };
    content.lines().filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

fn get_reviewable_strategies(strategies_dir: &std::path::Path) -> Vec<String> {
    if !strategies_dir.exists() { return Vec::new(); }
    let mut results = Vec::new();
    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        let mut dirs: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        dirs.sort_by_key(|e| e.path());
        for entry in dirs {
            let sj = entry.path().join("signal.json");
            if !sj.exists() { continue; }
            if let Ok(content) = std::fs::read_to_string(&sj) {
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    if status == "approved" || status == "active" {
                        if let Some(name) = entry.path().file_name().and_then(|n| n.to_str()) {
                            results.push(name.to_string());
                        }
                    }
                }
            }
        }
    }
    results
}

struct LiveMetrics {
    roi: f64,
    total_pnl: f64,
    trades: usize,
    round_trips: u32,
    wins: u32,
    losses: u32,
    win_rate: f64,
    profit_factor: f64,
    max_drawdown_pct: f64,
    sharpe: f64,
}

fn compute_live_metrics(trades: &[serde_json::Value], capital: f64) -> LiveMetrics {
    let mut by_symbol: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in trades {
        let sym = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("?").to_string();
        by_symbol.entry(sym).or_default().push(t);
    }

    let mut total_pnl = 0.0f64;
    let mut wins = 0u32;
    let mut losses = 0u32;
    let mut total_win_pnl = 0.0f64;
    let mut total_loss_pnl = 0.0f64;
    let mut pnl_series: Vec<f64> = Vec::new();

    for (_sym, sym_trades) in &by_symbol {
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
                    let cq = pq.min(qty);
                    let pnl = if *ps == "buy" { (price - pp) * cq } else { (pp - price) * cq };
                    total_pnl += pnl;
                    pnl_series.push(pnl);
                    if pnl > 0.0 { wins += 1; total_win_pnl += pnl; }
                    else { losses += 1; total_loss_pnl += pnl.abs(); }
                    let rem = pq - cq;
                    if rem > 0.0 { pos = Some((ps.clone(), pp, rem)); }
                    else if qty > cq { pos = Some((side, price, qty - cq)); }
                    else { pos = None; }
                }
            }
        }
    }

    let round_trips = wins + losses;
    let roi = if capital > 0.0 { (total_pnl / capital) * 100.0 } else { 0.0 };
    let win_rate = if round_trips > 0 { (wins as f64 / round_trips as f64) * 100.0 } else { 0.0 };
    let profit_factor = if total_loss_pnl > 0.0 { total_win_pnl / total_loss_pnl } else { f64::INFINITY };

    // Max drawdown
    let mut max_dd_pct = 0.0f64;
    let mut cumulative = 0.0f64;
    let mut peak = 0.0f64;
    for &pnl in &pnl_series {
        cumulative += pnl;
        if cumulative > peak { peak = cumulative; }
        if peak > 0.0 {
            let dd = (peak - cumulative) / peak;
            if dd > max_dd_pct { max_dd_pct = dd; }
        }
    }

    // Sharpe
    let mut sharpe = 0.0f64;
    if pnl_series.len() > 1 && capital > 0.0 {
        let returns: Vec<f64> = pnl_series.iter().map(|p| p / capital).collect();
        let mean_r: f64 = returns.iter().sum::<f64>() / returns.len() as f64;
        let std_r: f64 = (returns.iter().map(|r| (r - mean_r).powi(2)).sum::<f64>() / returns.len() as f64).sqrt();
        if std_r > 0.0 {
            sharpe = (mean_r / std_r) * (pnl_series.len() as f64).sqrt();
        }
    }

    LiveMetrics {
        roi: (roi * 100.0).round() / 100.0,
        total_pnl: (total_pnl * 10000.0).round() / 10000.0,
        trades: trades.len(),
        round_trips,
        wins,
        losses,
        win_rate: (win_rate * 10.0).round() / 10.0,
        profit_factor: if profit_factor.is_infinite() { f64::INFINITY } else { (profit_factor * 100.0).round() / 100.0 },
        max_drawdown_pct: (max_dd_pct * 10000.0).round() / 100.0,
        sharpe: (sharpe * 100.0).round() / 100.0,
    }
}

fn assess_health(live: &LiveMetrics, backtest: Option<&serde_json::Value>) -> String {
    let bt = match backtest {
        Some(bt) => bt,
        None => return "no_backtest".to_string(),
    };

    let mut warnings = 0;
    let bt_return = parse_num(bt.get("return_pct"));
    let bt_win_rate = parse_num(bt.get("win_rate")) * 100.0;
    let bt_pf = parse_num(bt.get("profit_factor"));

    if bt_return > 0.0 && live.roi / bt_return < 0.3 { warnings += 1; }
    if bt_win_rate > 0.0 && live.win_rate / bt_win_rate < 0.5 { warnings += 1; }
    let pf = if live.profit_factor.is_infinite() { 999.0 } else { live.profit_factor };
    if bt_pf > 0.0 && !bt_pf.is_infinite() && pf / bt_pf < 0.5 { warnings += 1; }
    if live.max_drawdown_pct > 30.0 { warnings += 1; }

    if warnings >= 2 { "degraded".to_string() }
    else if warnings >= 1 { "warning".to_string() }
    else { "healthy".to_string() }
}

/// 策略健康评估 — 纯计算输出，不写文件
pub fn run(ctx: &Ctx, strategy: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
    let all_trades = load_all_trades(&ctx.records_dir);

    let names = match strategy {
        Some(s) => vec![s],
        None => {
            let n = get_reviewable_strategies(&ctx.strategies_dir);
            if n.is_empty() {
                if ctx.json {
                    println!("[]");
                } else {
                    println!("\n  无 approved/active 策略");
                }
                return Ok(());
            }
            n
        }
    };

    // JSON mode: build structured output
    if ctx.json {
        let mut results_json = Vec::new();
        for name in &names {
            let cfg_path = ctx.strategies_dir.join(name).join("signal.json");
            let cfg: serde_json::Value = match std::fs::read_to_string(&cfg_path)
                .ok()
                .and_then(|c| serde_json::from_str(&c).ok())
            {
                Some(c) => c,
                None => continue,
            };

            let capital = parse_num(cfg.get("capital")).max(200.0);
            let backtest = cfg.get("backtest");

            let strades: Vec<serde_json::Value> = all_trades
                .iter()
                .filter(|t| t.get("strategy").and_then(|v| v.as_str()) == Some(name.as_str()))
                .cloned()
                .collect();

            let live = compute_live_metrics(&strades, capital);
            let health = if strades.is_empty() { "no_data".to_string() } else { assess_health(&live, backtest) };

            results_json.push(serde_json::json!({
                "strategy": name,
                "health": health,
                "evaluated_at": Utc::now().to_rfc3339(),
                "live": {
                    "roi": live.roi,
                    "total_pnl": live.total_pnl,
                    "trades": live.trades,
                    "round_trips": live.round_trips,
                    "wins": live.wins,
                    "losses": live.losses,
                    "win_rate": live.win_rate,
                    "profit_factor": if live.profit_factor.is_infinite() { serde_json::Value::String("inf".to_string()) } else { serde_json::json!(live.profit_factor) },
                    "max_drawdown_pct": live.max_drawdown_pct,
                    "sharpe": live.sharpe,
                }
            }));
        }
        println!("{}", serde_json::to_string_pretty(&results_json)?);
        return Ok(());
    }

    // Table mode
    println!("\n  {}", "=".repeat(62));
    println!("  {} ({} 笔交易记录)", "策略健康评估".bold(), all_trades.len());
    println!("  {}", "=".repeat(62));

    let mut healths: HashMap<String, String> = HashMap::new();

    for name in &names {
        let cfg_path = ctx.strategies_dir.join(name).join("signal.json");
        let cfg: serde_json::Value = match std::fs::read_to_string(&cfg_path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
        {
            Some(c) => c,
            None => {
                println!("  {}", format!("[{name}] signal.json 不存在").red());
                continue;
            }
        };

        let capital = parse_num(cfg.get("capital")).max(200.0);
        let backtest = cfg.get("backtest");

        let strades: Vec<serde_json::Value> = all_trades
            .iter()
            .filter(|t| t.get("strategy").and_then(|v| v.as_str()) == Some(name.as_str()))
            .cloned()
            .collect();

        let (live, health) = if strades.is_empty() {
            println!("  {}", format!("[{name}] 无实盘交易记录").yellow());
            (compute_live_metrics(&[], capital), "no_data".to_string())
        } else {
            let l = compute_live_metrics(&strades, capital);
            let h = assess_health(&l, backtest);
            (l, h)
        };

        let health_color = match health.as_str() {
            "healthy" => health.to_uppercase().green().to_string(),
            "warning" | "no_data" | "no_backtest" => health.to_uppercase().yellow().to_string(),
            "degraded" => health.to_uppercase().red().to_string(),
            _ => health.to_uppercase(),
        };

        println!("\n  [{}]  {health_color}", name.bold());

        if live.trades > 0 {
            let pf_str = if live.profit_factor.is_infinite() {
                "inf".to_string()
            } else {
                format!("{:.2}", live.profit_factor)
            };
            let sign = if live.total_pnl >= 0.0 { "+" } else { "" };
            println!(
                "    实盘: ROI={:.1}%  WR={:.0}%  PF={pf_str}  DD={:.1}%  Sharpe={:.2}",
                live.roi, live.win_rate, live.max_drawdown_pct, live.sharpe
            );
            println!(
                "    交易: {} 笔 ({} 轮)  P&L: {sign}${:.4}",
                live.trades, live.round_trips, live.total_pnl
            );

            if let Some(bt) = backtest {
                let bt_wr = parse_num(bt.get("win_rate")) * 100.0;
                let bt_pf = parse_num(bt.get("profit_factor"));
                println!(
                    "    回测: ROI={:.1}%  WR={:.0}%  PF={:.2}  DD={:.1}%",
                    parse_num(bt.get("return_pct")),
                    bt_wr,
                    bt_pf,
                    parse_num(bt.get("max_drawdown_pct"))
                );
            }
        } else {
            println!("    (无实盘数据)");
        }

        // NO fs::write here (unlike review.rs)

        healths.insert(name.clone(), health);
    }

    // Summary
    println!("\n  {}", "─".repeat(62));
    let healthy = healths.values().filter(|h| *h == "healthy").count();
    let warning = healths.values().filter(|h| *h == "warning").count();
    let degraded = healths.values().filter(|h| *h == "degraded").count();
    let no_data = healths.values().filter(|h| *h == "no_data" || *h == "no_backtest").count();
    println!(
        "  合计: {} 策略  {}  {}  {}  no_data={no_data}",
        healths.len(),
        format!("healthy={healthy}").green(),
        format!("warning={warning}").yellow(),
        format!("degraded={degraded}").red()
    );

    println!();
    Ok(())
}
