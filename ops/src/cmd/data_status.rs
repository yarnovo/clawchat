use colored::Colorize;
use chrono::{TimeZone, Utc};
use clawchat_shared::data::DataStore;
use crate::Ctx;

/// 数据引擎状态 — 展示每个 symbol 的数据范围和大小
pub fn run(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = clawchat_shared::paths::data_dir();
    let store = DataStore::new(&data_dir);
    let symbols = store.list_symbols();

    if ctx.json {
        let mut entries = Vec::new();
        for sym in &symbols {
            let intervals = store.list_intervals(sym);
            let mut interval_info = Vec::new();
            for intv in &intervals {
                let range = store.available_range(sym, intv);
                let (start, end, count) = match range {
                    Some((s, e)) => {
                        let candles = store.read_candles(sym, intv, None, None).unwrap_or_default();
                        (s, e, candles.len())
                    }
                    None => (0, 0, 0),
                };
                interval_info.push(serde_json::json!({
                    "interval": intv,
                    "start_ts": start,
                    "end_ts": end,
                    "candles": count,
                }));
            }
            entries.push(serde_json::json!({
                "symbol": sym,
                "intervals": interval_info,
            }));
        }
        println!("{}", serde_json::to_string_pretty(&entries)?);
        return Ok(());
    }

    if symbols.is_empty() {
        println!("\n  数据目录为空 ({})", data_dir.display());
        return Ok(());
    }

    println!("\n  {}", "数据状态".bold());
    println!("  {}", "=".repeat(70));
    println!(
        "  {:<16} {:<8} {:>10} {:>22} {:>22}",
        "币种", "周期", "K线数", "起始时间", "结束时间"
    );
    println!("  {}", "─".repeat(70));

    for sym in &symbols {
        let intervals = store.list_intervals(sym);
        for intv in &intervals {
            let range = store.available_range(sym, intv);
            match range {
                Some((start_ts, end_ts)) => {
                    let candles = store.read_candles(sym, intv, None, None).unwrap_or_default();
                    let start_str = Utc
                        .timestamp_millis_opt(start_ts as i64)
                        .single()
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_else(|| start_ts.to_string());
                    let end_str = Utc
                        .timestamp_millis_opt(end_ts as i64)
                        .single()
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_else(|| end_ts.to_string());
                    println!(
                        "  {:<16} {:<8} {:>10} {:>22} {:>22}",
                        sym, intv, candles.len(), start_str, end_str
                    );
                }
                None => {
                    println!(
                        "  {:<16} {:<8} {:>10} {:>22} {:>22}",
                        sym, intv, 0, "-", "-"
                    );
                }
            }
        }
    }

    println!("\n  共 {} 个币种", symbols.len());
    println!();
    Ok(())
}
