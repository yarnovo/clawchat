use chrono::{Duration, Utc};
use clawchat_shared::alerts::{read_alerts, AlertLevel};
use colored::Colorize;

use crate::Ctx;

/// 告警查询 — 显示最近告警事件
pub fn run(
    ctx: &Ctx,
    level: Option<String>,
    hours: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut events = read_alerts(&ctx.records_dir);

    // Filter by time window
    if hours > 0 {
        let cutoff = (Utc::now() - Duration::hours(hours as i64)).to_rfc3339();
        events.retain(|e| e.timestamp.as_str() >= cutoff.as_str());
    }

    // Filter by level
    if let Some(ref lvl) = level {
        let filter_level = match lvl.to_lowercase().as_str() {
            "red" => Some(AlertLevel::Red),
            "yellow" => Some(AlertLevel::Yellow),
            "info" => Some(AlertLevel::Info),
            _ => {
                eprintln!("未知级别: {lvl} (可选: red, yellow, info)");
                return Ok(());
            }
        };
        if let Some(fl) = filter_level {
            events.retain(|e| e.level == fl);
        }
    }

    // JSON output
    if ctx.json {
        println!("{}", serde_json::to_string_pretty(&events)?);
        return Ok(());
    }

    // Human-readable output
    let mut title = format!("告警事件 (最近 {hours}h)");
    if let Some(ref lvl) = level {
        title.push_str(&format!(" [{}]", lvl.to_uppercase()));
    }
    println!("\n  {title}");
    println!("  {}", "─".repeat(70));

    if events.is_empty() {
        println!("  (无告警)");
        println!();
        return Ok(());
    }

    for e in &events {
        let ts = &e.timestamp[..19.min(e.timestamp.len())];
        let level_str = match e.level {
            AlertLevel::Red => "RED".red().bold().to_string(),
            AlertLevel::Yellow => "YELLOW".yellow().to_string(),
            AlertLevel::Info => "INFO".dimmed().to_string(),
        };
        let strat = e
            .strategy
            .as_deref()
            .unwrap_or("-");
        println!(
            "  {ts}  {level_str:<18} {strat:<26} {}",
            e.message
        );
    }

    // Summary
    let red_count = events.iter().filter(|e| e.level == AlertLevel::Red).count();
    let yellow_count = events.iter().filter(|e| e.level == AlertLevel::Yellow).count();
    let info_count = events.iter().filter(|e| e.level == AlertLevel::Info).count();

    println!("\n  共 {} 条", events.len());
    if red_count > 0 {
        println!("    {} RED: {red_count}", "●".red());
    }
    if yellow_count > 0 {
        println!("    {} YELLOW: {yellow_count}", "●".yellow());
    }
    if info_count > 0 {
        println!("    {} INFO: {info_count}", "●".dimmed());
    }
    println!();

    Ok(())
}
