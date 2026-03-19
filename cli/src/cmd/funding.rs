use colored::Colorize;
use chrono::{Utc, TimeZone};
use clawchat_shared::exchange::Exchange;
use clawchat_shared::paths::strategies_dir;

fn get_strategy_symbols() -> Vec<String> {
    let mut symbols = std::collections::BTreeSet::new();
    let sdir = strategies_dir();
    if !sdir.exists() { return Vec::new(); }
    if let Ok(entries) = std::fs::read_dir(&sdir) {
        for entry in entries.flatten() {
            let cfg_path = entry.path().join("signal.json");
            if !cfg_path.exists() { continue; }
            if let Ok(content) = std::fs::read_to_string(&cfg_path) {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(sym) = data.get("symbol").and_then(|v| v.as_str()) {
                        let mut s = sym.to_uppercase().replace("-", "");
                        if !s.contains('/') && s.ends_with("USDT") {
                            s = format!("{}/USDT", &s[..s.len() - 4]);
                        }
                        // Normalize to Binance futures format (no /)
                        let normalized = s.replace("/", "");
                        symbols.insert(normalized);
                    }
                }
            }
        }
    }
    symbols.into_iter().collect()
}

fn format_rate(rate: f64) -> String {
    let pct = rate * 100.0;
    if rate > 0.0005 {
        format!("{pct:+.4}%").red().to_string()
    } else if rate < -0.0005 {
        format!("{pct:+.4}%").green().to_string()
    } else {
        format!("{pct:+.4}%")
    }
}

fn format_timestamp(ts: Option<&serde_json::Value>) -> String {
    match ts {
        None => "N/A".to_string(),
        Some(v) => {
            if let Some(ms) = v.as_u64().or_else(|| v.as_i64().map(|i| i as u64)) {
                Utc.timestamp_millis_opt(ms as i64)
                    .single()
                    .map(|dt| dt.format("%Y-%m-%d %H:%M UTC").to_string())
                    .unwrap_or_else(|| ms.to_string())
            } else if let Some(s) = v.as_str() {
                s.to_string()
            } else {
                "N/A".to_string()
            }
        }
    }
}

/// 资金费率查看 — 当前费率 + 历史趋势
pub async fn funding(
    exchange: &Exchange,
    symbol: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbols: Vec<String> = if let Some(sym) = symbol {
        let mut s = sym.to_uppercase().replace("-", "").replace("/", "");
        if !s.ends_with("USDT") {
            s.push_str("USDT");
        }
        vec![s]
    } else {
        let syms = get_strategy_symbols();
        if syms.is_empty() {
            println!("\n  无策略，请指定币种：clawchat funding NTRN/USDT");
            return Ok(());
        }
        syms
    };

    println!("\n  {}", "当前资金费率".bold());
    println!("  {}", "=".repeat(60));
    println!("  {:<14} {:>10} {:>14} {:>22}", "币种", "费率", "标记价", "下次结算");
    println!("  {}", "─".repeat(60));

    for sym in &symbols {
        match exchange.fetch_premium_index(Some(sym)).await {
            Ok(info) => {
                let rate: f64 = info
                    .get("lastFundingRate")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                let mark: f64 = info
                    .get("markPrice")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                let next_time = format_timestamp(info.get("nextFundingTime"));
                let rate_str = format_rate(rate);
                let mark_str = if mark > 0.0 {
                    format!("${mark:.6}")
                } else {
                    "N/A".to_string()
                };
                println!("  {sym:<14} {rate_str:>20} {mark_str:>14} {next_time:>22}");
            }
            Err(e) => {
                println!("  {sym:<14} {}", format!("获取失败: {e}").dimmed());
            }
        }
    }
    println!();

    // If single symbol, show history
    if symbols.len() == 1 {
        match exchange.fetch_funding_rate_history(&symbols[0], 20).await {
            Ok(history) if !history.is_empty() => {
                println!("  {} {} 历史资金费率", "".bold(), symbols[0]);
                println!("  {}", "=".repeat(50));
                println!("  {:>22} {:>12}", "时间", "费率");
                println!("  {}", "─".repeat(50));

                let mut rates: Vec<f64> = Vec::new();
                for h in &history {
                    let ts = format_timestamp(h.get("fundingTime"));
                    let rate: f64 = h
                        .get("fundingRate")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0.0);
                    rates.push(rate);
                    let rate_str = format_rate(rate);
                    println!("  {ts:>22} {rate_str:>22}");
                }

                if !rates.is_empty() {
                    let avg = rates.iter().sum::<f64>() / rates.len() as f64;
                    println!(
                        "\n  {}",
                        format!("平均费率: {:+.4}% ({} 条记录)", avg * 100.0, rates.len()).dimmed()
                    );
                }
                println!();
            }
            _ => {}
        }
    }

    Ok(())
}
