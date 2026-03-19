use colored::Colorize;
use clawchat_shared::capacity;
use clawchat_shared::config_util::normalize_symbol;
use crate::Ctx;
use std::collections::HashMap;

/// 显示各在线策略的容量利用率
pub async fn run(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    let strategies_dir = &ctx.strategies_dir;

    // 1. 收集 approved 策略信息
    let mut strategies: Vec<StrategyInfo> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let sf = entry.path().join("signal.json");
            if !sf.exists() { continue; }
            let content = match std::fs::read_to_string(&sf) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let cfg: serde_json::Value = match serde_json::from_str(&content) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("");
            if status != "approved" && status != "active" { continue; }

            let name = entry.path().file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            let symbol = cfg.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let leverage = cfg.get("leverage").and_then(|v| v.as_u64()).unwrap_or(1) as f64;
            let capital = cfg.get("capital").and_then(|v| v.as_f64()).unwrap_or(0.0);

            strategies.push(StrategyInfo {
                name,
                symbol: normalize_symbol(&symbol),
                leverage,
                capital,
            });
        }
    }

    if strategies.is_empty() {
        if ctx.json {
            println!("[]");
        } else {
            println!("\n  无 approved/active 策略");
        }
        return Ok(());
    }

    strategies.sort_by(|a, b| a.name.cmp(&b.name));

    // 2. 拉取 24h ticker 数据
    let tickers = ctx.exchange.fetch_tickers().await.unwrap_or_default();
    let volume_map: HashMap<String, f64> = tickers.iter().filter_map(|t| {
        let sym = t.get("symbol").and_then(|v| v.as_str())?;
        let quote_vol = t.get("quoteVolume")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<f64>().ok())?;
        Some((normalize_symbol(sym), quote_vol))
    }).collect();

    // 3. 计算容量并输出
    let mut results: Vec<CapacityRow> = Vec::new();
    for s in &strategies {
        let adv_24h = volume_map.get(&s.symbol).copied().unwrap_or(0.0);
        let max_cap = capacity::max_capacity(adv_24h, s.leverage);
        let util = capacity::utilization(s.capital, max_cap);
        let status = capacity::CapacityStatus::from_utilization(util);
        results.push(CapacityRow {
            name: s.name.clone(),
            symbol: s.symbol.clone(),
            leverage: s.leverage,
            capital: s.capital,
            adv_24h,
            max_capacity: max_cap,
            utilization: util,
            status,
        });
    }

    if ctx.json {
        let json_output: Vec<serde_json::Value> = results.iter().map(|r| {
            serde_json::json!({
                "strategy": r.name,
                "symbol": r.symbol,
                "leverage": r.leverage,
                "capital": r.capital,
                "adv_24h": r.adv_24h,
                "max_capacity": r.max_capacity,
                "utilization": r.utilization,
                "status": r.status.label(),
            })
        }).collect();
        println!("{}", serde_json::to_string_pretty(&json_output)?);
        return Ok(());
    }

    // Table output
    println!("\n  {}", "=".repeat(100));
    println!("  {}", "策略容量利用率".bold());
    println!("  {}", "=".repeat(100));
    println!(
        "  {:<28} {:<12} {:<5} {:>10} {:>14} {:>12} {:>8} {}",
        "策略", "币种", "杠杆", "配额", "24h ADV", "最大容量", "利用率", "状态"
    );
    println!("  {}", "─".repeat(100));

    let mut overcap_count = 0u32;
    let mut warning_count = 0u32;
    let mut expandable_count = 0u32;

    for r in &results {
        let util_str = if r.utilization.is_infinite() {
            "inf".to_string()
        } else {
            format!("{:.0}%", r.utilization * 100.0)
        };

        let status_str = match &r.status {
            capacity::CapacityStatus::Overcapacity => {
                overcap_count += 1;
                format!("[{}]", "OVERCAP".red())
            }
            capacity::CapacityStatus::Warning => {
                warning_count += 1;
                format!("[{}]", "WARNING".yellow())
            }
            capacity::CapacityStatus::Expandable => {
                expandable_count += 1;
                format!("[{}]", "EXPAND".green())
            }
            capacity::CapacityStatus::Normal => {
                "[OK]".to_string()
            }
        };

        println!(
            "  {:<28} {:<12} {:>3}x {:>9.0} {:>13.0} {:>11.0} {:>7} {}",
            r.name, r.symbol, r.leverage as u32, r.capital, r.adv_24h, r.max_capacity, util_str, status_str
        );
    }

    println!("  {}", "─".repeat(100));
    println!(
        "  合计: {} 策略  {}  {}  {}",
        results.len(),
        if overcap_count > 0 { format!("overcap={overcap_count}").red().to_string() } else { format!("overcap={overcap_count}") },
        if warning_count > 0 { format!("warning={warning_count}").yellow().to_string() } else { format!("warning={warning_count}") },
        if expandable_count > 0 { format!("expandable={expandable_count}").green().to_string() } else { format!("expandable={expandable_count}") },
    );
    println!();

    Ok(())
}

struct StrategyInfo {
    name: String,
    symbol: String,
    leverage: f64,
    capital: f64,
}

struct CapacityRow {
    name: String,
    symbol: String,
    leverage: f64,
    capital: f64,
    adv_24h: f64,
    max_capacity: f64,
    utilization: f64,
    status: capacity::CapacityStatus,
}
