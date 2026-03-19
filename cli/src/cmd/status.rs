use chrono::{Local, Utc, DateTime, FixedOffset};
use colored::Colorize;
use clawchat_shared::exchange::Exchange;
use clawchat_shared::paths::{strategies_dir, records_dir};
use clawchat_shared::config_util::normalize_symbol;
use std::collections::HashMap;

const STALE_MINUTES: i64 = 10;

fn section(title: &str) {
    println!("\n  {}", "─".repeat(50));
    println!("  {title}");
    println!("  {}", "─".repeat(50));
}

fn is_process_alive(name: &str) -> bool {
    std::process::Command::new("pgrep")
        .args(["-f", name])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn load_signals_by_strategy() -> HashMap<String, u32> {
    let mut counts = HashMap::new();
    let path = records_dir().join("signals.jsonl");
    if !path.exists() {
        return counts;
    }
    if let Ok(content) = std::fs::read_to_string(&path) {
        for line in content.lines() {
            if line.is_empty() {
                continue;
            }
            if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
                let strat = rec
                    .get("strategy")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                *counts.entry(strat).or_insert(0) += 1;
            }
        }
    }
    counts
}

fn load_last_trade_by_strategy() -> HashMap<String, String> {
    let mut last = HashMap::new();
    let path = records_dir().join("trades.jsonl");
    if !path.exists() {
        return last;
    }
    if let Ok(content) = std::fs::read_to_string(&path) {
        for line in content.lines() {
            if line.is_empty() {
                continue;
            }
            if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
                let strat = rec
                    .get("strategy")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let ts = rec
                    .get("ts")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if !strat.is_empty() && !ts.is_empty() {
                    last.insert(strat, ts);
                }
            }
        }
    }
    last
}

fn format_updated(updated: &str) -> String {
    if updated.is_empty() || updated == "?" {
        return "?".red().to_string();
    }
    let parsed = updated
        .replace("Z", "+00:00");
    match DateTime::parse_from_rfc3339(&parsed).or_else(|_| {
        chrono::NaiveDateTime::parse_from_str(&updated[..19.min(updated.len())], "%Y-%m-%dT%H:%M:%S")
            .map(|ndt| DateTime::<FixedOffset>::from_naive_utc_and_offset(ndt, FixedOffset::east_opt(0).unwrap()))
    }) {
        Ok(dt) => {
            let age = Utc::now().signed_duration_since(dt);
            let age_min = age.num_minutes();
            let short_ts = dt.format("%m-%d %H:%M").to_string();
            if age_min >= STALE_MINUTES {
                format!("{} ({}m ago)", short_ts, age_min).red().to_string()
            } else {
                format!("{} ({}m ago)", short_ts, age_min).green().to_string()
            }
        }
        Err(_) => updated.to_string(),
    }
}

fn today_realized_pnl() -> f64 {
    let path = records_dir().join("trades.jsonl");
    if !path.exists() {
        return 0.0;
    }
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return 0.0,
    };

    let mut trades_by_key: HashMap<(String, String), Vec<serde_json::Value>> = HashMap::new();
    for line in content.lines() {
        if line.is_empty() {
            continue;
        }
        if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
            let ts = rec.get("ts").and_then(|v| v.as_str()).unwrap_or("");
            if !ts.starts_with(&today) {
                continue;
            }
            let strat = rec.get("strategy").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let sym = rec.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            trades_by_key.entry((strat, sym)).or_default().push(rec);
        }
    }

    let mut total_pnl = 0.0;
    for (_key, today_trades) in &trades_by_key {
        let mut pos: Option<(String, f64, f64)> = None; // (side, price, qty)
        for t in today_trades {
            let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let price: f64 = t.get("price").and_then(|v| v.as_str().or(v.as_f64().map(|_| "")).and_then(|s| if s.is_empty() { v.as_f64() } else { s.parse().ok() })).unwrap_or(0.0);
            let qty: f64 = t.get("qty").and_then(|v| v.as_str().or(v.as_f64().map(|_| "")).and_then(|s| if s.is_empty() { v.as_f64() } else { s.parse().ok() })).unwrap_or(0.0);
            if price == 0.0 {
                continue;
            }
            match pos {
                None => {
                    pos = Some((side, price, qty));
                }
                Some((ref ps, pp, pq)) if *ps == side => {
                    let total_qty = pq + qty;
                    if total_qty > 0.0 {
                        let new_price = (pp * pq + price * qty) / total_qty;
                        pos = Some((side, new_price, total_qty));
                    }
                }
                Some((ref ps, pp, pq)) => {
                    let close_qty = pq.min(qty);
                    if *ps == "buy" {
                        total_pnl += (price - pp) * close_qty;
                    } else {
                        total_pnl += (pp - price) * close_qty;
                    }
                    let remaining = pq - close_qty;
                    if remaining > 0.0 {
                        pos = Some((ps.clone(), pp, remaining));
                    } else if qty > close_qty {
                        pos = Some((side, price, qty - close_qty));
                    } else {
                        pos = None;
                    }
                }
            }
        }
    }
    total_pnl
}

fn engine_health_counts() -> (u32, u32) {
    let sdir = strategies_dir();
    if !sdir.exists() {
        return (0, 0);
    }
    let now_utc = Utc::now();
    let mut online = 0u32;
    let mut stale = 0u32;

    if let Ok(entries) = std::fs::read_dir(&sdir) {
        for entry in entries.flatten() {
            let d = entry.path();
            let sf = d.join("signal.json");
            let st = d.join("state.json");
            if !sf.exists() || !st.exists() {
                continue;
            }
            let cfg_ok = std::fs::read_to_string(&sf)
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                .and_then(|v| {
                    let s = v.get("status")?.as_str()?;
                    if s == "approved" || s == "active" {
                        Some(())
                    } else {
                        None
                    }
                });
            if cfg_ok.is_none() {
                continue;
            }
            let state_ok = std::fs::read_to_string(&st)
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok());
            match state_ok {
                Some(state) => {
                    let updated = state
                        .get("last_updated")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if updated.is_empty() {
                        stale += 1;
                        continue;
                    }
                    let parsed = updated.replace("Z", "+00:00");
                    match DateTime::parse_from_rfc3339(&parsed) {
                        Ok(dt) => {
                            let age_min = now_utc.signed_duration_since(dt).num_minutes();
                            if age_min >= STALE_MINUTES {
                                stale += 1;
                            } else {
                                online += 1;
                            }
                        }
                        Err(_) => stale += 1,
                    }
                }
                None => stale += 1,
            }
        }
    }
    (online, stale)
}

/// 全局状态面板 — 账户 + 持仓 + 策略状态一览
pub async fn status(exchange: &Exchange) -> Result<(), Box<dyn std::error::Error>> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n  ClawChat 全局状态  {now}");
    println!("  {}", "=".repeat(50));

    // ── 今日概览 ──
    section("今日概览");
    let realized = today_realized_pnl();

    // Equity from equity.csv
    let mut unrealized = 0.0f64;
    let mut equity_now = 0.0f64;
    let equity_path = records_dir().join("equity.csv");
    let mut equity_hwm = 0.0f64;
    if equity_path.exists() {
        if let Ok(mut rdr) = csv::Reader::from_path(&equity_path) {
            for result in rdr.records() {
                if let Ok(record) = result {
                    let eq: f64 = record.get(1).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    let upnl: f64 = record.get(2).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if eq > equity_hwm {
                        equity_hwm = eq;
                    }
                    equity_now = eq;
                    unrealized = upnl;
                }
            }
        }
    }

    let total_pnl = realized + unrealized;
    let sign_t = if total_pnl >= 0.0 { "+" } else { "" };
    let sign_r = if realized >= 0.0 { "+" } else { "" };
    let sign_u = if unrealized >= 0.0 { "+" } else { "" };
    let pnl_color = if total_pnl >= 0.0 {
        format!("{sign_t}${total_pnl:.2}").green().to_string()
    } else {
        format!("{sign_t}${total_pnl:.2}").red().to_string()
    };
    println!(
        "  今日 PnL: {pnl_color} (realized {sign_r}${realized:.2}, unrealized {sign_u}${unrealized:.2})"
    );

    if equity_hwm > 0.0 && equity_now > 0.0 {
        let drawdown_pct = if equity_now < equity_hwm {
            (equity_now - equity_hwm) / equity_hwm * 100.0
        } else {
            0.0
        };
        let dd_str = if drawdown_pct < -5.0 {
            format!("{drawdown_pct:.2}%").red().to_string()
        } else if drawdown_pct < 0.0 {
            format!("{drawdown_pct:.2}%").yellow().to_string()
        } else {
            format!("{drawdown_pct:.2}%").green().to_string()
        };
        println!(
            "  高水位: ${equity_hwm:.2}  当前: ${equity_now:.2}  回撤: {dd_str}"
        );
    } else if equity_now > 0.0 {
        println!("  当前权益: ${equity_now:.2}");
    } else {
        println!("  (权益数据不足)");
    }

    let (online, stale_count) = engine_health_counts();
    let mut engine_str = format!("  引擎: {online} 在线");
    if stale_count > 0 {
        engine_str.push_str(&format!(", {}", format!("{stale_count} 超时").red()));
    }
    println!("{engine_str}");

    // ── 引擎 ──
    section("引擎");
    let hft_alive = is_process_alive("hft-engine");
    let status_str = if hft_alive { "RUNNING" } else { "STOPPED" };
    println!("  hft-engine: [{status_str}]");

    // ── 账户 ──
    section("账户");
    match exchange.get_account().await {
        Ok(acct) => {
            let total: f64 = acct
                .get("totalWalletBalance")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let free: f64 = acct
                .get("availableBalance")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let used = total - free;
            println!("  总额: ${total:.2}  可用: ${free:.2}  占用: ${used:.2}");
        }
        Err(e) => println!("  查询失败: {e}"),
    }

    // ── 持仓 ──
    section("持仓");
    match exchange.get_positions().await {
        Ok(positions) if !positions.is_empty() => {
            // Build strategy symbol map
            let sym_map = strategy_symbol_map();
            let mut total_pnl = 0.0f64;
            for p in &positions {
                let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
                let raw = normalize_symbol(sym);
                let strategy = sym_map.get(&raw).cloned().unwrap_or_else(|| "?".to_string());
                let side = p
                    .get("positionSide")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let amt: f64 = p
                    .get("positionAmt")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                let pnl: f64 = p
                    .get("unrealizedProfit")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                let lev: &str = p
                    .get("leverage")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                total_pnl += pnl;
                let sign = if pnl >= 0.0 { "+" } else { "" };
                println!(
                    "  {sym:<18} {side:<6} x{amt:<10} {sign}${pnl:<10.4} {lev}x  [{strategy}]"
                );
            }
            let sign = if total_pnl >= 0.0 { "+" } else { "" };
            println!("  {:>36} 合计: {sign}${total_pnl:.4}", "");
        }
        Ok(_) => println!("  (无持仓)"),
        Err(e) => println!("  查询失败: {e}"),
    }

    // ── 策略表现 ──
    section("策略表现");
    show_performance();

    // ── 风控 ──
    section("风控（hft-engine 内置）");
    println!("  风控已合并到 hft-engine 主进程（RiskGate 实时检查）");
    if equity_path.exists() {
        if let Ok(mut rdr) = csv::Reader::from_path(&equity_path) {
            let mut last_record: Option<csv::StringRecord> = None;
            for result in rdr.records() {
                if let Ok(record) = result {
                    last_record = Some(record);
                }
            }
            if let Some(last) = last_record {
                let ts = last.get(0).unwrap_or("?");
                let eq = last.get(1).unwrap_or("?");
                let pnl = last.get(2).unwrap_or("?");
                let pos = last.get(3).unwrap_or("?");
                println!("  最近检查: {ts}  equity=${eq}  pnl=${pnl}  positions={pos}");
            } else {
                println!("  (无检查记录)");
            }
        }
    } else {
        println!("  (无检查记录)");
    }

    // ── Watcher ──
    section("Watcher");
    let watcher_alive = is_process_alive("strategy_watcher");
    let wstatus = if watcher_alive { "RUNNING" } else { "STOPPED" };
    println!("  策略监听: [{wstatus}]");

    // ── 策略 ──
    section("策略");
    show_strategies();

    println!("\n  {}", "=".repeat(50));
    println!();

    Ok(())
}

fn strategy_symbol_map() -> HashMap<String, String> {
    let mut m = HashMap::new();
    let sdir = strategies_dir();
    if !sdir.exists() {
        return m;
    }
    if let Ok(entries) = std::fs::read_dir(&sdir) {
        for entry in entries.flatten() {
            let sf = entry.path().join("signal.json");
            if !sf.exists() {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&sf) {
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    if status != "approved" && status != "active" {
                        continue;
                    }
                    let sym = cfg.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    let strat = cfg
                        .get("engine_strategy")
                        .or_else(|| cfg.get("strategy"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    if !sym.is_empty() {
                        m.insert(normalize_symbol(sym), strat.to_string());
                    }
                }
            }
        }
    }
    m
}

fn show_performance() {
    let trades_path = records_dir().join("trades.jsonl");
    if !trades_path.exists() {
        println!("  (无交易记录)");
        return;
    }
    let content = match std::fs::read_to_string(&trades_path) {
        Ok(c) => c,
        Err(_) => {
            println!("  (无交易记录)");
            return;
        }
    };

    let mut trades: Vec<serde_json::Value> = Vec::new();
    for line in content.lines() {
        if line.is_empty() {
            continue;
        }
        if let Ok(rec) = serde_json::from_str(line) {
            trades.push(rec);
        }
    }
    if trades.is_empty() {
        println!("  (无交易记录)");
        return;
    }

    let mut by_strategy: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in &trades {
        let strat = t
            .get("strategy")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        by_strategy.entry(strat).or_default().push(t);
    }

    let mut strat_names: Vec<_> = by_strategy.keys().cloned().collect();
    strat_names.sort();

    for strat in &strat_names {
        let strades = &by_strategy[strat];
        let mut by_symbol: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
        for t in strades {
            let sym = t
                .get("symbol")
                .and_then(|v| v.as_str())
                .unwrap_or("?")
                .to_string();
            by_symbol.entry(sym).or_default().push(t);
        }

        let mut total_pnl = 0.0;
        let mut wins = 0u32;
        let mut losses = 0u32;

        for (_sym, sym_trades) in &by_symbol {
            let mut pos: Option<(String, f64, f64)> = None;
            for t in sym_trades {
                let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                let price = parse_num(t.get("price"));
                let qty = parse_num(t.get("qty"));
                if price == 0.0 {
                    continue;
                }
                match pos {
                    None => pos = Some((side, price, qty)),
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
                        if pnl >= 0.0 { wins += 1; } else { losses += 1; }
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

        let rounds = wins + losses;
        let wr = if rounds > 0 {
            format!("{:.0}%", wins as f64 / rounds as f64 * 100.0)
        } else {
            "N/A".to_string()
        };
        let sign = if total_pnl >= 0.0 { "+" } else { "" };
        println!(
            "  {strat:<16} {sign}${total_pnl:<10.4} {rounds}轮 {wr} ({wins}W/{losses}L)  [{}笔]",
            strades.len()
        );
    }
    println!("  {:>16} 共 {} 笔交易记录", "", trades.len());
}

fn show_strategies() {
    let sdir = strategies_dir();
    if !sdir.exists() {
        println!("  (无策略目录)");
        return;
    }

    let signal_counts = load_signals_by_strategy();
    let last_trades = load_last_trade_by_strategy();

    let mut strategies: Vec<serde_json::Value> = Vec::new();
    if let Ok(mut entries) = std::fs::read_dir(&sdir) {
        let mut dirs: Vec<_> = entries
            .by_ref()
            .filter_map(|e| e.ok())
            .collect();
        dirs.sort_by_key(|e| e.path());

        for entry in &dirs {
            let sf = entry.path().join("signal.json");
            if !sf.exists() {
                continue;
            }
            if let Ok(content) = std::fs::read_to_string(&sf) {
                if let Ok(mut cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    cfg.as_object_mut().map(|o| {
                        o.insert(
                            "_dir".to_string(),
                            serde_json::Value::String(entry.path().to_string_lossy().to_string()),
                        )
                    });
                    strategies.push(cfg);
                }
            }
        }
    }

    if strategies.is_empty() {
        println!("  (无策略)");
        return;
    }

    let approved: Vec<_> = strategies
        .iter()
        .filter(|s| {
            let st = s.get("status").and_then(|v| v.as_str()).unwrap_or("");
            st == "approved" || st == "active"
        })
        .collect();
    let suspended: Vec<_> = strategies
        .iter()
        .filter(|s| s.get("status").and_then(|v| v.as_str()) == Some("suspended"))
        .collect();
    let other: Vec<_> = strategies
        .iter()
        .filter(|s| {
            let st = s.get("status").and_then(|v| v.as_str()).unwrap_or("");
            st != "approved" && st != "active" && st != "suspended"
        })
        .collect();

    if !approved.is_empty() {
        println!("  running ({}):", approved.len());
        for s in &approved {
            let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let sym = s.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let strat = s
                .get("engine_strategy")
                .or_else(|| s.get("strategy"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            println!("    {name:<28} {sym:<14} {strat}");

            // Read state summary
            let dir_str = s.get("_dir").and_then(|v| v.as_str()).unwrap_or("");
            if !dir_str.is_empty() {
                let dir = std::path::Path::new(dir_str);
                let strategy_name = dir.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if let Some(info) = read_state_summary(dir, strategy_name, &signal_counts, &last_trades) {
                    println!("      {info}");
                }
            }
        }
    }

    if !suspended.is_empty() {
        println!("  suspended ({}):", suspended.len());
        for s in &suspended {
            let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let reason = s
                .get("suspend_reason")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let short = if reason.len() > 50 {
                format!("{}...", &reason[..50])
            } else {
                reason.to_string()
            };
            println!("    {name:<28} {short}");
        }
    }

    if !other.is_empty() {
        println!("  other ({}):", other.len());
        for s in &other {
            let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let st = s.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("    {name:<28} status={st}");
        }
    }
}

fn read_state_summary(
    strategy_dir: &std::path::Path,
    strategy_name: &str,
    signal_counts: &HashMap<String, u32>,
    last_trades: &HashMap<String, String>,
) -> Option<String> {
    let state_file = strategy_dir.join("state.json");
    if !state_file.exists() {
        return None;
    }
    let content = std::fs::read_to_string(&state_file).ok()?;
    let state: serde_json::Value = serde_json::from_str(&content).ok()?;

    let updated = state
        .get("last_updated")
        .and_then(|v| v.as_str())
        .unwrap_or("?");
    let updated_fmt = format_updated(updated);

    let candle_count = state
        .get("indicators")
        .and_then(|v| v.get("candle_count"))
        .and_then(|v| v.as_u64())
        .map(|n| n.to_string())
        .unwrap_or_else(|| "?".to_string());

    let ts = state.get("trade_stats").cloned().unwrap_or_default();
    let total = ts.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
    let wins = ts.get("wins").and_then(|v| v.as_u64()).unwrap_or(0);
    let losses = ts.get("losses").and_then(|v| v.as_u64()).unwrap_or(0);
    let pnl = ts.get("realized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let sign = if pnl >= 0.0 { "+" } else { "" };
    let wr = if total > 0 {
        format!("{:.0}%", wins as f64 / total as f64 * 100.0)
    } else {
        "N/A".to_string()
    };

    let sig_count = signal_counts.get(strategy_name).copied().unwrap_or(0);

    let last_trade = last_trades
        .get(strategy_name)
        .map(|lt| {
            let parsed = lt.replace("Z", "+00:00");
            DateTime::parse_from_rfc3339(&parsed)
                .map(|dt| dt.format("%m-%d %H:%M").to_string())
                .unwrap_or_else(|_| lt[..16.min(lt.len())].to_string())
        })
        .unwrap_or_else(|| "-".to_string());

    Some(format!(
        "tick={}  candles={}  signals={}  trades={}({}W/{}L {})  pnl={sign}${pnl:.4}  last_trade={last_trade}",
        updated_fmt, candle_count, sig_count, total, wins, losses, wr
    ))
}

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| {
        v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))
    })
    .unwrap_or(0.0)
}
