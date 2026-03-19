use colored::Colorize;
use clawchat_shared::indicators::pearson_correlation;
use clawchat_shared::paths::records_dir;
use std::collections::HashMap;

const WARN_THRESHOLD: f64 = 0.7;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_trades() -> Vec<serde_json::Value> {
    let path = records_dir().join("trades.jsonl");
    if !path.exists() { return Vec::new(); }
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return Vec::new() };
    content.lines().filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

fn extract_date(ts_str: &str) -> String {
    if ts_str.is_empty() { return "unknown".to_string(); }
    // Take first 10 chars as YYYY-MM-DD
    if ts_str.len() >= 10 {
        ts_str[..10].to_string()
    } else {
        "unknown".to_string()
    }
}

fn trades_to_daily_pnl(trades: &[serde_json::Value]) -> HashMap<String, HashMap<String, f64>> {
    let mut by_strat: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in trades {
        let strat = t.get("strategy").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        by_strat.entry(strat).or_default().push(t);
    }

    let mut result: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for (strat, strades) in &by_strat {
        let mut by_symbol: HashMap<String, Vec<&&serde_json::Value>> = HashMap::new();
        for t in strades {
            let sym = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("?").to_string();
            by_symbol.entry(sym).or_default().push(t);
        }

        let mut daily: HashMap<String, f64> = HashMap::new();
        for (_sym, sym_trades) in &by_symbol {
            let mut pos: Option<(String, f64, f64)> = None;
            for t in sym_trades {
                let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                let price = parse_num(t.get("price"));
                let qty = parse_num(t.get("qty"));
                let ts_str = t.get("ts").and_then(|v| v.as_str()).unwrap_or("");
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
                        let date_key = extract_date(ts_str);
                        *daily.entry(date_key).or_insert(0.0) += pnl;
                        let rem = pq - cq;
                        if rem > 0.0 { pos = Some((ps.clone(), pp, rem)); }
                        else if qty > cq { pos = Some((side, price, qty - cq)); }
                        else { pos = None; }
                    }
                }
            }
        }
        result.insert(strat.clone(), daily);
    }
    result
}

/// 策略相关性矩阵 — 分析策略间收益相关度
pub fn correlation(_days: u32) -> Result<(), Box<dyn std::error::Error>> {
    let trades = load_trades();
    if trades.is_empty() {
        println!("\n  (无交易记录，records/trades.jsonl 为空或不存在)");
        return Ok(());
    }

    let daily_pnl = trades_to_daily_pnl(&trades);
    if daily_pnl.len() < 2 {
        println!("\n  策略数不足（{} 个），需要至少 2 个策略才能计算相关性", daily_pnl.len());
        return Ok(());
    }

    let mut strategies: Vec<String> = daily_pnl.keys().cloned().collect();
    strategies.sort();

    // Collect all dates
    let mut all_dates: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    for pnl_map in daily_pnl.values() {
        for d in pnl_map.keys() {
            if d != "unknown" {
                all_dates.insert(d.clone());
            }
        }
    }
    let sorted_dates: Vec<String> = all_dates.into_iter().collect();

    // Build correlation matrix
    let mut matrix: HashMap<(usize, usize), Option<f64>> = HashMap::new();
    for i in 0..strategies.len() {
        for j in 0..strategies.len() {
            if i == j {
                matrix.insert((i, j), Some(1.0));
                continue;
            }
            if j < i {
                matrix.insert((i, j), matrix.get(&(j, i)).copied().flatten());
                continue;
            }
            let s1 = &strategies[i];
            let s2 = &strategies[j];
            let common_dates: Vec<&String> = sorted_dates
                .iter()
                .filter(|d| daily_pnl[s1].contains_key(*d) && daily_pnl[s2].contains_key(*d))
                .collect();
            if common_dates.len() < 3 {
                matrix.insert((i, j), None);
                continue;
            }
            let x: Vec<f64> = common_dates.iter().map(|d| daily_pnl[s1][*d]).collect();
            let y: Vec<f64> = common_dates.iter().map(|d| daily_pnl[s2][*d]).collect();
            matrix.insert((i, j), pearson_correlation(&x, &y));
        }
    }

    println!("\n  {}", "=".repeat(60));
    println!("  {}", "策略相关性矩阵 (Pearson)".bold());
    println!("  {}", "=".repeat(60));
    println!("  策略数: {}  |  相关性 > {WARN_THRESHOLD} 标红", strategies.len());
    println!();

    // Print matrix
    let max_name = 16;
    let col_w = max_name.max(7);
    let names: Vec<String> = strategies.iter().map(|s| {
        if s.len() > max_name { s[..max_name].to_string() } else { s.clone() }
    }).collect();

    // Header
    print!("  {:>width$}", "", width = col_w);
    for n in &names {
        print!("  {:>width$}", n, width = col_w);
    }
    println!();
    println!("  {}{}", "─".repeat(col_w + 1), "─".repeat((col_w + 2) * names.len()));

    // Data rows
    for (i, _s1) in strategies.iter().enumerate() {
        print!("  {:>width$}", names[i], width = col_w);
        for (j, _s2) in strategies.iter().enumerate() {
            let val = matrix.get(&(i, j)).copied().flatten();
            match val {
                None => print!("  {:>width$}", "N/A".dimmed(), width = col_w),
                Some(_v) if i == j => print!("  {:>width$}", "1.00".dimmed(), width = col_w),
                Some(v) if v.abs() >= WARN_THRESHOLD => {
                    print!("  {:>width$}", format!("{v:+.2}").red().bold(), width = col_w);
                }
                Some(v) => print!("  {:>width$}", format!("{v:+.2}"), width = col_w),
            }
        }
        println!();
    }

    // High correlation warnings
    let mut high_warnings: Vec<(String, String, f64)> = Vec::new();
    for i in 0..strategies.len() {
        for j in (i + 1)..strategies.len() {
            if let Some(Some(val)) = matrix.get(&(i, j)) {
                if val.abs() >= WARN_THRESHOLD {
                    high_warnings.push((strategies[i].clone(), strategies[j].clone(), *val));
                }
            }
        }
    }

    if !high_warnings.is_empty() {
        high_warnings.sort_by(|a, b| b.2.abs().partial_cmp(&a.2.abs()).unwrap_or(std::cmp::Ordering::Equal));
        println!("\n  {}", "高相关性警告:".red().bold());
        for (s1, s2, val) in &high_warnings {
            println!("  {}", format!("  {s1} <-> {s2}: {val:+.2}").red());
        }
        println!("\n  高相关策略同涨同跌，建议降低其中一个的仓位或替换");
    } else {
        println!("\n  各策略相关性均 < {WARN_THRESHOLD}，分散度良好");
    }

    println!();
    Ok(())
}
