use colored::Colorize;
use crate::Ctx;
use std::collections::HashMap;
use std::path::Path;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_trades(records_dir: &Path, strategy_name: &str) -> Vec<serde_json::Value> {
    let path = records_dir.join("trades.jsonl");
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
        .filter_map(|l| serde_json::from_str::<serde_json::Value>(l).ok())
        .filter(|t| {
            t.get("strategy")
                .and_then(|v| v.as_str())
                .map(|s| s == strategy_name)
                .unwrap_or(false)
        })
        .collect()
}

fn load_backtest(strategies_dir: &Path, strategy_name: &str) -> Option<serde_json::Value> {
    let path = strategies_dir.join(strategy_name).join("signal.json");
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(&path).ok()?;
    let data: serde_json::Value = serde_json::from_str(&content).ok()?;
    data.get("backtest").cloned()
}

struct LiveStats {
    return_pct: f64,
    total_pnl: f64,
    trades: usize,
    round_trips: u32,
    win_rate: f64,
    profit_factor: f64,
    max_drawdown_pct: f64,
}

fn compute_live_stats(trades: &[serde_json::Value], strategies_dir: &Path, strategy_name: &str) -> LiveStats {
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
    let mut capital_path: Vec<f64> = Vec::new();

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
                    if tq > 0.0 {
                        pos = Some((side, (pp * pq + price * qty) / tq, tq));
                    }
                }
                Some((ref ps, pp, pq)) => {
                    let cq = pq.min(qty);
                    let pnl = if *ps == "buy" {
                        (price - pp) * cq
                    } else {
                        (pp - price) * cq
                    };
                    total_pnl += pnl;
                    capital_path.push(total_pnl);
                    if pnl >= 0.0 {
                        wins += 1;
                        total_win_pnl += pnl;
                    } else {
                        losses += 1;
                        total_loss_pnl += pnl.abs();
                    }
                    let rem = pq - cq;
                    if rem > 0.0 {
                        pos = Some((ps.clone(), pp, rem));
                    } else if qty > cq {
                        pos = Some((side, price, qty - cq));
                    } else {
                        pos = None;
                    }
                }
            }
        }
    }

    let round_trips = wins + losses;
    let win_rate = if round_trips > 0 { wins as f64 / round_trips as f64 } else { 0.0 };
    let profit_factor = if total_loss_pnl > 0.0 { total_win_pnl / total_loss_pnl } else { f64::INFINITY };

    // Max drawdown
    let mut max_dd_pct = 0.0f64;
    if !capital_path.is_empty() {
        let mut peak = capital_path[0];
        for &val in &capital_path {
            if val > peak { peak = val; }
            if peak > 0.0 {
                let dd = (peak - val) / peak;
                if dd > max_dd_pct { max_dd_pct = dd; }
            }
        }
    }

    // Read capital from signal.json
    let mut capital = 200.0f64;
    let strategy_json = strategies_dir.join(strategy_name).join("signal.json");
    if strategy_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&strategy_json) {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                capital = parse_num(cfg.get("capital")).max(200.0);
            }
        }
    }

    let return_pct = if capital > 0.0 { (total_pnl / capital) * 100.0 } else { 0.0 };

    LiveStats {
        return_pct,
        total_pnl,
        trades: trades.len(),
        round_trips,
        win_rate,
        profit_factor,
        max_drawdown_pct: max_dd_pct * 100.0,
    }
}

fn fmt_pct(val: f64) -> String {
    format!("{val:.2}%")
}

fn fmt_ratio(val: f64) -> String {
    if val.is_infinite() { "inf".to_string() } else { format!("{val:.2}") }
}

fn compare_metric(name: &str, live_val: f64, bt_val: f64, higher_is_better: bool) -> String {
    let live_str = if name.contains("pct") || name.contains("rate") || name.contains("drawdown") {
        fmt_pct(live_val)
    } else {
        fmt_ratio(live_val)
    };
    let bt_str = if name.contains("pct") || name.contains("rate") || name.contains("drawdown") {
        fmt_pct(bt_val)
    } else {
        fmt_ratio(bt_val)
    };

    let (ratio_str, warn) = if bt_val == 0.0 {
        ("N/A".to_string(), false)
    } else if higher_is_better {
        let ratio = live_val / bt_val;
        (format!("{:.0}%", ratio * 100.0), ratio < 0.5)
    } else {
        let ratio = live_val / bt_val;
        (format!("{:.0}%", ratio * 100.0), ratio > 2.0)
    };

    if warn {
        format!(
            "  {} {name:<20} 实盘: {live_str:<12} 回测: {bt_str:<12} ({ratio_str})",
            "!".red().bold()
        )
    } else {
        format!("    {name:<20} 实盘: {live_str:<12} 回测: {bt_str:<12} ({ratio_str})")
    }
}

/// 实盘 vs 回测对比 — 检查策略表现偏差
pub fn compare(ctx: &Ctx, strategy: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
    let strategy_name = match strategy {
        Some(s) => s,
        None => {
            println!("\n  用法: clawchat compare --strategy <name>");
            return Ok(());
        }
    };

    let strategy_dir = ctx.strategies_dir.join(&strategy_name);
    if !strategy_dir.exists() {
        println!("\n  {}", format!("错误: 策略目录不存在 strategies/{strategy_name}/").red());
        return Ok(());
    }

    let backtest = match load_backtest(&ctx.strategies_dir, &strategy_name) {
        Some(bt) => bt,
        None => {
            println!("\n  {}", "错误: signal.json 无 backtest 字段".red());
            return Ok(());
        }
    };

    let trades = load_trades(&ctx.records_dir, &strategy_name);
    if trades.is_empty() {
        println!("\n  {}", format!("警告: 无实盘交易记录 (records/trades.jsonl 中无 strategy={strategy_name})").yellow());
        println!("\n  回测指标（仅供参考）:");
        println!("    收益率:     {}", fmt_pct(parse_num(backtest.get("return_pct"))));
        println!("    胜率:       {}", fmt_pct(parse_num(backtest.get("win_rate")) * 100.0));
        println!("    盈亏比:     {}", fmt_ratio(parse_num(backtest.get("profit_factor"))));
        println!("    最大回撤:   {}", fmt_pct(parse_num(backtest.get("max_drawdown_pct"))));
        println!("    交易笔数:   {}", backtest.get("trades").and_then(|v| v.as_u64()).unwrap_or(0));
        println!();
        return Ok(());
    }

    let live = compute_live_stats(&trades, &ctx.strategies_dir, &strategy_name);

    let bt_return = parse_num(backtest.get("return_pct"));
    let bt_win_rate = parse_num(backtest.get("win_rate")) * 100.0;
    let bt_profit_factor = parse_num(backtest.get("profit_factor"));
    let bt_max_dd = parse_num(backtest.get("max_drawdown_pct"));
    let bt_trades = backtest.get("trades").and_then(|v| v.as_u64()).unwrap_or(0);

    if ctx.json {
        let pf = if live.profit_factor.is_infinite() { serde_json::Value::String("inf".to_string()) } else { serde_json::json!(live.profit_factor) };
        let result = serde_json::json!({
            "strategy": strategy_name,
            "live": {
                "return_pct": live.return_pct,
                "win_rate": live.win_rate * 100.0,
                "profit_factor": pf,
                "max_drawdown_pct": live.max_drawdown_pct,
                "total_pnl": live.total_pnl,
                "trades": live.trades,
                "round_trips": live.round_trips,
            },
            "backtest": {
                "return_pct": bt_return,
                "win_rate": bt_win_rate,
                "profit_factor": bt_profit_factor,
                "max_drawdown_pct": bt_max_dd,
                "trades": bt_trades,
            },
        });
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    println!("\n  {}", "=".repeat(62));
    println!("  {} {strategy_name}", "实盘 vs 回测对比:".bold());
    println!("  {}", "=".repeat(62));
    println!("    实盘交易: {} 笔 ({} 轮完整)", live.trades, live.round_trips);
    println!("    回测交易: {bt_trades} 笔");
    println!("  {}", "─".repeat(62));

    println!("{}", compare_metric("return_pct (收益率)", live.return_pct, bt_return, true));
    println!("{}", compare_metric("win_rate (胜率)", live.win_rate * 100.0, bt_win_rate, true));
    println!("{}", compare_metric("profit_factor (盈亏比)", live.profit_factor, bt_profit_factor, true));
    println!("{}", compare_metric("max_drawdown_pct (回撤)", live.max_drawdown_pct, bt_max_dd, false));

    println!("  {}", "─".repeat(62));
    let sign = if live.total_pnl >= 0.0 { "+" } else { "" };
    println!("    实盘累计 P&L: {sign}${:.4}", live.total_pnl);

    // Overall assessment
    let mut warn_count = 0;
    if bt_return > 0.0 && live.return_pct / bt_return < 0.5 { warn_count += 1; }
    if bt_win_rate > 0.0 && (live.win_rate * 100.0) / bt_win_rate < 0.5 { warn_count += 1; }
    if bt_profit_factor > 0.0 && !bt_profit_factor.is_infinite() && live.profit_factor / bt_profit_factor < 0.5 { warn_count += 1; }

    if warn_count > 0 {
        println!("\n  {}", format!("! 警告: {warn_count} 项指标实盘表现低于回测 50%，建议检查策略或暂停运行").red().bold());
    } else if live.round_trips < 5 {
        println!("\n  {}", format!("提示: 实盘完整交易仅 {} 轮，样本不足，对比仅供参考", live.round_trips).yellow());
    } else {
        println!("\n  {}", "策略表现正常".green());
    }

    println!();
    Ok(())
}
