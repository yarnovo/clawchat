use chrono::Utc;
use clawchat_shared::config_util::normalize_symbol;
use crate::Ctx;
use std::path::Path;

fn load_strategy_symbols(strategies_dir: &Path) -> std::collections::HashMap<String, String> {
    let mut mapping = std::collections::HashMap::new();
    let sdir = strategies_dir;
    if !sdir.exists() {
        return mapping;
    }
    if let Ok(entries) = std::fs::read_dir(sdir) {
        for entry in entries.flatten() {
            let cfg_path = entry.path().join("signal.json");
            if !cfg_path.exists() {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&cfg_path) {
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(sym) = cfg.get("symbol").and_then(|v| v.as_str()) {
                        let name = entry
                            .path()
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string();
                        mapping.insert(name, normalize_symbol(sym));
                    }
                }
            }
        }
    }
    mapping
}

fn log_risk_event(records_dir: &Path, strategy: &str, symbol: &str, detail: &str) {
    let ts = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let record = serde_json::json!({
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "rule": "emergency_close",
        "pnl": 0,
        "verdict": "emergency_close",
        "detail": detail,
    });
    let rdir = records_dir;
    let _ = std::fs::create_dir_all(rdir);
    let log_path = rdir.join("risk_events.jsonl");
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        use std::io::Write;
        let _ = writeln!(f, "{}", serde_json::to_string(&record).unwrap_or_default());
    }
}

/// 紧急全平 — 关闭所有或指定策略的持仓
pub async fn emergency_close(
    ctx: &Ctx,
    strategy: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let exchange = &ctx.exchange;
    let positions = exchange.get_positions().await?;

    if positions.is_empty() {
        println!("  无持仓，无需平仓");
        return Ok(());
    }

    // Filter by strategy if specified
    let target_symbols: Option<std::collections::HashSet<String>> = strategy.as_ref().map(|s| {
        let mapping = load_strategy_symbols(&ctx.strategies_dir);
        if let Some(sym) = mapping.get(s) {
            let mut set = std::collections::HashSet::new();
            set.insert(sym.clone());
            set
        } else {
            println!("  错误: 策略 '{s}' 未找到或无 symbol 配置");
            std::collections::HashSet::new()
        }
    });

    if let Some(ref ts) = target_symbols {
        if ts.is_empty() {
            return Ok(());
        }
        if let Some(ref s) = strategy {
            let syms: Vec<&String> = ts.iter().collect();
            println!("  目标策略: {s} -> symbol: {}", syms.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(", "));
        }
    }

    println!("\n  === 紧急全平 ===\n");

    let mut results: Vec<(String, String, String)> = Vec::new(); // (symbol, side, status)

    for pos in &positions {
        let sym = pos
            .get("symbol")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        let normalized = normalize_symbol(sym);

        if let Some(ref ts) = target_symbols {
            if !ts.contains(&normalized) {
                continue;
            }
        }

        let amt: f64 = pos
            .get("positionAmt")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let side_str = pos
            .get("positionSide")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        let pnl: f64 = pos
            .get("unrealizedProfit")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        println!("  平仓: {sym} {side_str} x{} (未实现PnL: {pnl:+.4})", amt.abs());

        let close_result = exchange
            .close_position(sym, amt)
            .await;

        match close_result {
            Ok(resp) => {
                let status = resp
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("ok")
                    .to_string();
                println!("    结果: {status}");
                results.push((sym.to_string(), side_str.to_string(), status.clone()));

                let strat = strategy.as_deref().unwrap_or("all");
                log_risk_event(&ctx.records_dir,
                    strat,
                    &normalized,
                    &format!(
                        "emergency close {side_str} x{} pnl={pnl:+.4} status={status}",
                        amt.abs()
                    ),
                );
            }
            Err(e) => {
                println!("    失败: {e}");
                results.push((sym.to_string(), side_str.to_string(), format!("error: {e}")));
            }
        }
    }

    if results.is_empty() {
        if strategy.is_some() {
            println!(
                "  策略 '{}' 无持仓",
                strategy.as_deref().unwrap_or("?")
            );
        } else {
            println!("  无持仓需要平仓");
        }
    } else {
        println!("\n  共平仓 {} 笔", results.len());
        let success = results.iter().filter(|(_, _, s)| !s.starts_with("error")).count();
        let failed = results.len() - success;
        if failed > 0 {
            println!("  成功: {success}, 失败: {failed}");
        }
    }
    println!();

    Ok(())
}
