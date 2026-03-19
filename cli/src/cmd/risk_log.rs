use colored::Colorize;
use chrono::{Utc, Duration};
use clawchat_shared::paths::records_dir;
use std::collections::HashMap;

fn load_events(
    strategy: Option<&str>,
    days: Option<u32>,
) -> Vec<serde_json::Value> {
    let path = records_dir().join("risk_events.jsonl");
    if !path.exists() {
        return Vec::new();
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let cutoff = days.map(|d| {
        (Utc::now() - Duration::days(d as i64))
            .to_rfc3339()
    });

    content
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str::<serde_json::Value>(l).ok())
        .filter(|rec| {
            if let Some(s) = strategy {
                if rec.get("strategy").and_then(|v| v.as_str()) != Some(s) {
                    return false;
                }
            }
            if let Some(ref cut) = cutoff {
                let ts = rec.get("ts").and_then(|v| v.as_str()).unwrap_or("");
                if ts < cut.as_str() {
                    return false;
                }
            }
            true
        })
        .collect()
}

fn format_event(rec: &serde_json::Value) -> String {
    let ts = rec.get("ts").and_then(|v| v.as_str()).unwrap_or("?");
    let ts_short = &ts[..19.min(ts.len())];
    let strat = rec.get("strategy").and_then(|v| v.as_str()).unwrap_or("?");
    let symbol = rec.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
    let rule = rec.get("rule").and_then(|v| v.as_str()).unwrap_or("?");
    let pnl: f64 = rec
        .get("pnl")
        .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0);
    let detail = rec.get("detail").and_then(|v| v.as_str()).unwrap_or("");

    let sign = if pnl >= 0.0 { "+" } else { "-" };
    let rule_str = if rule == "close_position" {
        rule.red().to_string()
    } else {
        rule.yellow().to_string()
    };
    format!(
        "  {ts_short}  {strat:<26} {symbol:<14} {rule_str:<16} pnl={sign}${:.4}  {detail}",
        pnl.abs()
    )
}

/// 风控事件查询 — 查看触发的风控规则日志
pub fn risk_log(
    strategy: Option<String>,
    days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let strat_ref = strategy.as_deref();
    let days_opt = if days > 0 { Some(days) } else { None };
    let events = load_events(strat_ref, days_opt);

    let mut title = "风控事件".to_string();
    if let Some(s) = &strategy {
        title.push_str(&format!(" [{s}]"));
    }
    if let Some(d) = days_opt {
        title.push_str(&format!(" (最近 {d} 天)"));
    }

    println!("\n  {title}");
    println!("  {}", "─".repeat(60));

    if events.is_empty() {
        println!("  (无事件)");
        return Ok(());
    }

    for e in &events {
        println!("{}", format_event(e));
    }

    println!("\n  共 {} 条事件", events.len());

    // Stats
    println!("\n  --- 统计 ---");
    let mut by_rule: HashMap<String, u32> = HashMap::new();
    let mut by_strat: HashMap<String, u32> = HashMap::new();
    for e in &events {
        let rule = e.get("rule").and_then(|v| v.as_str()).unwrap_or("?").to_string();
        let strat = e.get("strategy").and_then(|v| v.as_str()).unwrap_or("?").to_string();
        *by_rule.entry(rule).or_insert(0) += 1;
        *by_strat.entry(strat).or_insert(0) += 1;
    }

    let mut rules: Vec<_> = by_rule.iter().collect();
    rules.sort_by(|a, b| b.1.cmp(a.1));
    for (rule, count) in &rules {
        println!("    {rule:<20} {count}次");
    }

    if by_strat.len() > 1 {
        println!();
        let mut strats: Vec<_> = by_strat.iter().collect();
        strats.sort_by(|a, b| b.1.cmp(a.1));
        for (strat, count) in &strats {
            println!("    {strat:<26} {count}次");
        }
    }

    println!();
    Ok(())
}
