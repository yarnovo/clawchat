use colored::Colorize;
use clawchat_shared::correlation::{align_daily_pnl, check_correlation_exposure, compute_correlation_matrix};
use clawchat_shared::strategy::StrategyFile;
use crate::Ctx;
use std::collections::HashMap;
use std::path::Path;

const WARN_THRESHOLD: f64 = 0.7;
const EXPOSURE_LIMIT: f64 = 0.40;

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

fn load_trades(records_dir: &Path) -> Vec<serde_json::Value> {
    let path = records_dir.join("trades.jsonl");
    if !path.exists() { return Vec::new(); }
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return Vec::new() };
    content.lines().filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

fn extract_date(ts_str: &str) -> String {
    if ts_str.is_empty() { return "unknown".to_string(); }
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

/// 从 strategies 目录读取各策略的 capital 配置
fn load_strategy_exposures(strategies_dir: &Path) -> HashMap<String, f64> {
    let mut exposures = HashMap::new();
    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let signal_path = entry.path().join("signal.json");
            if !signal_path.exists() { continue; }
            if let Ok(sf) = StrategyFile::load(&signal_path) {
                let name = sf.name.unwrap_or_else(|| {
                    entry.file_name().to_string_lossy().to_string()
                });
                let capital = sf.capital.unwrap_or(0.0);
                if capital > 0.0 {
                    exposures.insert(name, capital);
                }
            }
        }
    }
    exposures
}

/// 策略相关性矩阵 — 分析策略间收益相关度 + 敞口风险
pub fn correlation(ctx: &Ctx, _days: u32) -> Result<(), Box<dyn std::error::Error>> {
    let trades = load_trades(&ctx.records_dir);
    if trades.is_empty() {
        println!("\n  (无交易记录，records/trades.jsonl 为空或不存在)");
        return Ok(());
    }

    let daily_pnl = trades_to_daily_pnl(&trades);
    if daily_pnl.len() < 2 {
        println!("\n  策略数不足（{} 个），需要至少 2 个策略才能计算相关性", daily_pnl.len());
        return Ok(());
    }

    // 用 shared::correlation 计算矩阵
    let aligned = align_daily_pnl(&daily_pnl);
    let corr_matrix = compute_correlation_matrix(&aligned);

    if ctx.json {
        let mut json_matrix: HashMap<String, HashMap<String, Option<f64>>> = HashMap::new();
        for (i, s1) in corr_matrix.strategies.iter().enumerate() {
            let mut row = HashMap::new();
            for (j, s2) in corr_matrix.strategies.iter().enumerate() {
                row.insert(s2.clone(), corr_matrix.matrix[i][j]);
            }
            json_matrix.insert(s1.clone(), row);
        }
        println!("{}", serde_json::to_string_pretty(&json_matrix)?);
        return Ok(());
    }

    let strategies = &corr_matrix.strategies;

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
            let val = corr_matrix.matrix[i][j];
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
    let high_pairs = corr_matrix.high_correlation_pairs(WARN_THRESHOLD);

    if !high_pairs.is_empty() {
        println!("\n  {}", "高相关性警告:".red().bold());
        for pair in &high_pairs {
            println!("  {}", format!("  {} <-> {}: {:+.2}", pair.strategy_a, pair.strategy_b, pair.correlation).red());
        }
    } else {
        println!("\n  各策略相关性均 < {WARN_THRESHOLD}，分散度良好");
    }

    // ── 敞口风险分析 ──────────────────────────────────────────
    let exposures = load_strategy_exposures(&ctx.strategies_dir);
    let total_portfolio: f64 = exposures.values().sum();

    if total_portfolio > 0.0 && !high_pairs.is_empty() {
        let exposure_warnings = check_correlation_exposure(
            &corr_matrix,
            &exposures,
            total_portfolio,
            WARN_THRESHOLD,
        );

        if !exposure_warnings.is_empty() {
            println!("\n  {}", "敞口风险分析:".yellow().bold());
            println!("  {:>20}  {:>10}  {:>12}  {:>8}", "策略组", "相关系数", "合计敞口", "状态");
            println!("  {}", "─".repeat(54));

            for (strats, corr, exp) in &exposure_warnings {
                let group = strats.join(" + ");
                let display_group = if group.len() > 20 { format!("{}…", &group[..19]) } else { group };
                let status = if *exp > EXPOSURE_LIMIT {
                    "超限".red().bold().to_string()
                } else {
                    "正常".green().to_string()
                };
                println!(
                    "  {:>20}  {:>+10.2}  {:>11.1}%  {:>8}",
                    display_group,
                    corr,
                    exp * 100.0,
                    status,
                );
            }
            println!("\n  敞口限制: 高相关策略组合计不超过 {:.0}% portfolio", EXPOSURE_LIMIT * 100.0);
        }
    }

    println!();
    Ok(())
}
