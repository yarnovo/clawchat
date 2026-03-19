use chrono::{Local, Utc, DateTime, FixedOffset};
use colored::Colorize;
use clawchat_shared::config_util::normalize_symbol;
use crate::Ctx;
use std::collections::HashMap;
use std::path::Path;

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

fn load_signals_by_strategy(records_dir: &Path) -> HashMap<String, u32> {
    let mut counts = HashMap::new();
    let path = records_dir.join("signals.jsonl");
    if !path.exists() { return counts; }
    if let Ok(content) = std::fs::read_to_string(&path) {
        for line in content.lines() {
            if line.is_empty() { continue; }
            if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
                let strat = rec.get("strategy").and_then(|v| v.as_str()).unwrap_or("").to_string();
                *counts.entry(strat).or_insert(0) += 1;
            }
        }
    }
    counts
}

fn load_last_trade_by_strategy(records_dir: &Path) -> HashMap<String, String> {
    let mut last = HashMap::new();
    let path = records_dir.join("trades.jsonl");
    if !path.exists() { return last; }
    if let Ok(content) = std::fs::read_to_string(&path) {
        for line in content.lines() {
            if line.is_empty() { continue; }
            if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
                let strat = rec.get("strategy").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let ts = rec.get("ts").and_then(|v| v.as_str()).unwrap_or("").to_string();
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
    let parsed = updated.replace("Z", "+00:00");
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

fn today_realized_pnl(records_dir: &Path) -> f64 {
    let path = records_dir.join("trades.jsonl");
    if !path.exists() { return 0.0; }
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return 0.0 };

    let mut trades_by_key: HashMap<(String, String), Vec<serde_json::Value>> = HashMap::new();
    for line in content.lines() {
        if line.is_empty() { continue; }
        if let Ok(rec) = serde_json::from_str::<serde_json::Value>(line) {
            let ts = rec.get("ts").and_then(|v| v.as_str()).unwrap_or("");
            if !ts.starts_with(&today) { continue; }
            let strat = rec.get("strategy").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let sym = rec.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            trades_by_key.entry((strat, sym)).or_default().push(rec);
        }
    }

    let mut total_pnl = 0.0;
    for (_key, today_trades) in &trades_by_key {
        let mut pos: Option<(String, f64, f64)> = None;
        for t in today_trades {
            let side = t.get("side").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let price = parse_num(t.get("price"));
            let qty = parse_num(t.get("qty"));
            if price == 0.0 { continue; }
            match pos {
                None => { pos = Some((side, price, qty)); }
                Some((ref ps, pp, pq)) if *ps == side => {
                    let total_qty = pq + qty;
                    if total_qty > 0.0 {
                        pos = Some((side, (pp * pq + price * qty) / total_qty, total_qty));
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

fn engine_health_counts(strategies_dir: &Path) -> (u32, u32) {
    if !strategies_dir.exists() { return (0, 0); }
    let now_utc = Utc::now();
    let mut online = 0u32;
    let mut stale = 0u32;

    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let d = entry.path();
            let sf = d.join("signal.json");
            let st = d.join("state.json");
            if !sf.exists() || !st.exists() { continue; }
            let cfg_ok = std::fs::read_to_string(&sf)
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                .and_then(|v| {
                    let s = v.get("status")?.as_str()?;
                    if s == "approved" || s == "active" { Some(()) } else { None }
                });
            if cfg_ok.is_none() { continue; }
            let state_ok = std::fs::read_to_string(&st)
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok());
            match state_ok {
                Some(state) => {
                    let updated = state.get("last_updated").and_then(|v| v.as_str()).unwrap_or("");
                    if updated.is_empty() { stale += 1; continue; }
                    let parsed = updated.replace("Z", "+00:00");
                    match DateTime::parse_from_rfc3339(&parsed) {
                        Ok(dt) => {
                            if now_utc.signed_duration_since(dt).num_minutes() >= STALE_MINUTES { stale += 1; }
                            else { online += 1; }
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

// ── Risk check (merged from check.rs) ──

const MAX_LOSS_PER_TRADE: f64 = 0.05;
const MAX_DAILY_LOSS: f64 = 0.10;
const MAX_PROFIT_PER_TRADE: f64 = 0.10;
const MAX_PROFIT_TOTAL: f64 = 0.20;
const MAX_POSITION_RATIO: f64 = 0.30;
const MIN_LIQUIDATION_DISTANCE: f64 = 0.10;
const MAX_LEVERAGE: f64 = 20.0;
const MAX_DRAWDOWN_WARNING: f64 = 0.20;
const MAX_DRAWDOWN_STOP: f64 = 0.30;

struct RiskResult {
    status: String, // PASS / WARN / FAIL
    alerts: Vec<String>,
    warnings: Vec<String>,
    total_unrealized: f64,
}

fn run_risk_checks(positions: &[serde_json::Value], total_equity: f64) -> RiskResult {
    let mut alerts = Vec::new();
    let mut warnings = Vec::new();
    let mut total_unrealized = 0.0f64;

    for p in positions {
        let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
        let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
        let amt: f64 = p.get("positionAmt").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let entry_price: f64 = p.get("entryPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let mark_price: f64 = p.get("markPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let pnl: f64 = p.get("unrealizedProfit").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        let notional: f64 = p.get("notional").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or_else(|| (amt * mark_price).abs());
        let leverage_val: f64 = p.get("leverage").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(1.0);
        let liq_price: f64 = p.get("liquidationPrice").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);

        total_unrealized += pnl;
        let is_long = side == "LONG" || amt > 0.0;

        if total_equity > 0.0 {
            let loss_ratio = pnl / total_equity;
            if loss_ratio < -MAX_LOSS_PER_TRADE {
                alerts.push(format!("STOP LOSS: {sym} {side} 亏损 {:.1}%", loss_ratio * 100.0));
            }
            let profit_ratio = pnl / total_equity;
            if profit_ratio > MAX_PROFIT_PER_TRADE {
                alerts.push(format!("TAKE PROFIT: {sym} {side} 盈利 +{:.1}%", profit_ratio * 100.0));
            }
            let position_ratio = notional.abs() / total_equity;
            if position_ratio > MAX_POSITION_RATIO {
                warnings.push(format!("仓位过大: {sym} 占比 {:.0}%", position_ratio * 100.0));
            }
        }

        if liq_price > 0.0 && mark_price > 0.0 {
            let liq_distance = if is_long { (mark_price - liq_price) / mark_price } else { (liq_price - mark_price) / mark_price };
            if liq_distance < MIN_LIQUIDATION_DISTANCE {
                alerts.push(format!("爆仓风险: {sym} 距强平 {:.1}%", liq_distance * 100.0));
            }
        }

        if leverage_val > MAX_LEVERAGE {
            warnings.push(format!("杠杆过高: {sym} {leverage_val}x > {MAX_LEVERAGE}x"));
        }

        if entry_price > 0.0 && mark_price > 0.0 {
            let dd = if is_long { (entry_price - mark_price) / entry_price } else { (mark_price - entry_price) / entry_price };
            if dd > 0.0 {
                if dd >= MAX_DRAWDOWN_STOP {
                    alerts.push(format!("回撤止损: {sym} {side} 回撤 {:.1}%", dd * 100.0));
                } else if dd >= MAX_DRAWDOWN_WARNING {
                    warnings.push(format!("回撤预警: {sym} {side} 回撤 {:.1}%", dd * 100.0));
                }
            }
        }
    }

    if total_equity > 0.0 {
        let total_loss_ratio = total_unrealized / total_equity;
        if total_loss_ratio < -MAX_DAILY_LOSS {
            alerts.push(format!("总亏损触发: {:.1}%", total_loss_ratio * 100.0));
        }
        let total_profit_ratio = total_unrealized / total_equity;
        if total_profit_ratio > MAX_PROFIT_TOTAL {
            alerts.push(format!("总止盈触发: +{:.1}%", total_profit_ratio * 100.0));
        }
    }

    let status = if !alerts.is_empty() { "FAIL" } else if !warnings.is_empty() { "WARN" } else { "PASS" };
    RiskResult { status: status.to_string(), alerts, warnings, total_unrealized }
}

// ── Single strategy detail ──

async fn single_strategy_status(ctx: &Ctx, strategy_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let exchange = &ctx.exchange;
    let strategy_dir = ctx.strategies_dir.join(strategy_name);
    if !strategy_dir.exists() {
        eprintln!("  错误: 策略目录不存在 {}", strategy_dir.display());
        return Ok(());
    }

    let cfg_path = strategy_dir.join("signal.json");
    let cfg: serde_json::Value = match std::fs::read_to_string(&cfg_path)
        .ok().and_then(|c| serde_json::from_str(&c).ok())
    {
        Some(c) => c,
        None => { eprintln!("  错误: signal.json 不存在或无法解析"); return Ok(()); }
    };

    if ctx.json {
        let state_path = strategy_dir.join("state.json");
        let state: Option<serde_json::Value> = std::fs::read_to_string(&state_path)
            .ok().and_then(|c| serde_json::from_str(&c).ok());
        let result = serde_json::json!({
            "strategy": strategy_name,
            "config": cfg,
            "state": state,
        });
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    println!("\n  === {} ===\n", strategy_name.bold());

    let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("?");
    let symbol = cfg.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
    let strat_type = cfg.get("engine_strategy").or_else(|| cfg.get("strategy")).and_then(|v| v.as_str()).unwrap_or("?");
    println!("  状态: {status}  币种: {symbol}  类型: {strat_type}");

    // State
    let state_path = strategy_dir.join("state.json");
    if state_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&state_path) {
            if let Ok(state) = serde_json::from_str::<serde_json::Value>(&content) {
                let updated = state.get("last_updated").and_then(|v| v.as_str()).unwrap_or("?");
                println!("  最近更新: {}", format_updated(updated));
                let ts = state.get("trade_stats").cloned().unwrap_or_default();
                let total = ts.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
                let wins = ts.get("wins").and_then(|v| v.as_u64()).unwrap_or(0);
                let losses = ts.get("losses").and_then(|v| v.as_u64()).unwrap_or(0);
                let pnl = ts.get("realized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
                println!("  交易: {}轮 ({}W/{}L)  PnL: {:+.4}", total, wins, losses, pnl);
            }
        }
    }

    // Positions from exchange matching this strategy's symbol
    let norm_sym = normalize_symbol(symbol);
    match exchange.get_positions().await {
        Ok(positions) => {
            let matching: Vec<_> = positions.iter()
                .filter(|p| {
                    let ps = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    normalize_symbol(ps) == norm_sym
                })
                .collect();
            if matching.is_empty() {
                println!("  持仓: (无)");
            } else {
                println!("  持仓:");
                for p in &matching {
                    let s = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
                    let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
                    let amt: f64 = p.get("positionAmt").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    let pnl: f64 = p.get("unrealizedProfit").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    println!("    {s} {side} x{} {:+.4}", amt.abs(), pnl);
                }
            }
        }
        Err(e) => println!("  持仓查询失败: {e}"),
    }

    println!();
    Ok(())
}

/// 全局状态面板 — 账户 + 持仓 + 策略状态 + 风控一览
pub async fn status(ctx: &Ctx, strategy: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
    // Single strategy mode
    if let Some(ref name) = strategy {
        return single_strategy_status(ctx, name).await;
    }

    let exchange = &ctx.exchange;

    // JSON mode: structured output
    if ctx.json {
        let account = exchange.get_account().await.ok();
        let positions = exchange.get_positions().await.unwrap_or_default();
        let risk = if !positions.is_empty() {
            let equity: f64 = account.as_ref()
                .and_then(|a| a.get("totalWalletBalance").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()))
                .unwrap_or(0.0);
            let r = run_risk_checks(&positions, equity);
            serde_json::json!({ "status": r.status, "alerts": r.alerts, "warnings": r.warnings })
        } else {
            serde_json::json!({ "status": "PASS", "alerts": [], "warnings": [] })
        };
        let (online, stale_count) = engine_health_counts(&ctx.strategies_dir);
        let result = serde_json::json!({
            "account": account,
            "positions": positions,
            "risk": risk,
            "engine": { "online": online, "stale": stale_count },
        });
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n  ClawChat 全局状态  {now}");
    println!("  {}", "=".repeat(50));

    // ── 今日概览 ──
    section("今日概览");
    let realized = today_realized_pnl(&ctx.records_dir);

    let mut unrealized = 0.0f64;
    let mut equity_now = 0.0f64;
    let equity_path = ctx.records_dir.join("equity.csv");
    let mut equity_hwm = 0.0f64;
    if equity_path.exists() {
        if let Ok(mut rdr) = csv::Reader::from_path(&equity_path) {
            for result in rdr.records() {
                if let Ok(record) = result {
                    let eq: f64 = record.get(1).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    let upnl: f64 = record.get(2).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if eq > equity_hwm { equity_hwm = eq; }
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
    println!("  今日 PnL: {pnl_color} (realized {sign_r}${realized:.2}, unrealized {sign_u}${unrealized:.2})");

    if equity_hwm > 0.0 && equity_now > 0.0 {
        let drawdown_pct = if equity_now < equity_hwm { (equity_now - equity_hwm) / equity_hwm * 100.0 } else { 0.0 };
        let dd_str = if drawdown_pct < -5.0 {
            format!("{drawdown_pct:.2}%").red().to_string()
        } else if drawdown_pct < 0.0 {
            format!("{drawdown_pct:.2}%").yellow().to_string()
        } else {
            format!("{drawdown_pct:.2}%").green().to_string()
        };
        println!("  高水位: ${equity_hwm:.2}  当前: ${equity_now:.2}  回撤: {dd_str}");
    } else if equity_now > 0.0 {
        println!("  当前权益: ${equity_now:.2}");
    } else {
        println!("  (权益数据不足)");
    }

    let (online, stale_count) = engine_health_counts(&ctx.strategies_dir);
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
    let mut total_equity = 0.0f64;
    match exchange.get_account().await {
        Ok(acct) => {
            let total: f64 = acct.get("totalWalletBalance").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let free: f64 = acct.get("availableBalance").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
            let used = total - free;
            total_equity = total;
            println!("  总额: ${total:.2}  可用: ${free:.2}  占用: ${used:.2}");
        }
        Err(e) => println!("  查询失败: {e}"),
    }

    // ── 持仓 ──
    section("持仓");
    let positions = match exchange.get_positions().await {
        Ok(positions) if !positions.is_empty() => {
            let sym_map = strategy_symbol_map(&ctx.strategies_dir);
            let mut total_pos_pnl = 0.0f64;
            for p in &positions {
                let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
                let raw = normalize_symbol(sym);
                let strat_name = sym_map.get(&raw).cloned().unwrap_or_else(|| "?".to_string());
                let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
                let amt: f64 = p.get("positionAmt").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let pnl: f64 = p.get("unrealizedProfit").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let lev: &str = p.get("leverage").and_then(|v| v.as_str()).unwrap_or("?");
                total_pos_pnl += pnl;
                let sign = if pnl >= 0.0 { "+" } else { "" };
                println!("  {sym:<18} {side:<6} x{amt:<10} {sign}${pnl:<10.4} {lev}x  [{strat_name}]");
            }
            let sign = if total_pos_pnl >= 0.0 { "+" } else { "" };
            println!("  {:>36} 合计: {sign}${total_pos_pnl:.4}", "");
            positions
        }
        Ok(_) => { println!("  (无持仓)"); Vec::new() }
        Err(e) => { println!("  查询失败: {e}"); Vec::new() }
    };

    // ── 风控 (merged from check.rs) ──
    section("风控");
    if positions.is_empty() {
        println!("  [PASS] 无持仓");
    } else {
        let risk = run_risk_checks(&positions, total_equity);
        let status_colored = match risk.status.as_str() {
            "PASS" => risk.status.green().to_string(),
            "WARN" => risk.status.yellow().to_string(),
            _ => risk.status.red().to_string(),
        };
        println!("  状态: [{status_colored}]  持仓: {}  权益: ${total_equity:.2}", positions.len());

        if !risk.alerts.is_empty() {
            for a in &risk.alerts {
                println!("  {} {a}", "[!]".red());
            }
        }
        if !risk.warnings.is_empty() {
            for w in &risk.warnings {
                println!("  {} {w}", "[?]".yellow());
            }
        }
        if risk.alerts.is_empty() && risk.warnings.is_empty() {
            println!("  所有检查通过");
        }
    }

    // ── 策略表现 ──
    section("策略表现");
    show_performance(&ctx.records_dir);

    // ── 策略 ──
    section("策略");
    show_strategies(&ctx.strategies_dir, &ctx.records_dir);

    println!("\n  {}", "=".repeat(50));
    println!();

    Ok(())
}

fn strategy_symbol_map(strategies_dir: &Path) -> HashMap<String, String> {
    let mut m = HashMap::new();
    if !strategies_dir.exists() { return m; }
    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let sf = entry.path().join("signal.json");
            if !sf.exists() { continue; }
            if let Ok(content) = std::fs::read_to_string(&sf) {
                if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    if status != "approved" && status != "active" { continue; }
                    let sym = cfg.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    let strat = cfg.get("engine_strategy").or_else(|| cfg.get("strategy")).and_then(|v| v.as_str()).unwrap_or("?");
                    if !sym.is_empty() {
                        m.insert(normalize_symbol(sym), strat.to_string());
                    }
                }
            }
        }
    }
    m
}

fn show_performance(records_dir: &Path) {
    let trades_path = records_dir.join("trades.jsonl");
    if !trades_path.exists() { println!("  (无交易记录)"); return; }
    let content = match std::fs::read_to_string(&trades_path) { Ok(c) => c, Err(_) => { println!("  (无交易记录)"); return; } };

    let mut trades: Vec<serde_json::Value> = Vec::new();
    for line in content.lines() {
        if line.is_empty() { continue; }
        if let Ok(rec) = serde_json::from_str(line) { trades.push(rec); }
    }
    if trades.is_empty() { println!("  (无交易记录)"); return; }

    let mut by_strategy: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in &trades {
        let strat = t.get("strategy").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        by_strategy.entry(strat).or_default().push(t);
    }

    let mut strat_names: Vec<_> = by_strategy.keys().cloned().collect();
    strat_names.sort();

    for strat in &strat_names {
        let strades = &by_strategy[strat];
        let mut by_symbol: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
        for t in strades {
            let sym = t.get("symbol").and_then(|v| v.as_str()).unwrap_or("?").to_string();
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
                if price == 0.0 { continue; }
                match pos {
                    None => pos = Some((side, price, qty)),
                    Some((ref ps, pp, pq)) if *ps == side => {
                        let tq = pq + qty;
                        if tq > 0.0 { pos = Some((side, (pp * pq + price * qty) / tq, tq)); }
                    }
                    Some((ref ps, pp, pq)) => {
                        let cq = pq.min(qty);
                        let pnl = if *ps == "buy" { (price - pp) * cq } else { (pp - price) * cq };
                        total_pnl += pnl;
                        if pnl >= 0.0 { wins += 1; } else { losses += 1; }
                        let rem = pq - cq;
                        if rem > 0.0 { pos = Some((ps.clone(), pp, rem)); }
                        else if qty > cq { pos = Some((side, price, qty - cq)); }
                        else { pos = None; }
                    }
                }
            }
        }

        let rounds = wins + losses;
        let wr = if rounds > 0 { format!("{:.0}%", wins as f64 / rounds as f64 * 100.0) } else { "N/A".to_string() };
        let sign = if total_pnl >= 0.0 { "+" } else { "" };
        println!("  {strat:<16} {sign}${total_pnl:<10.4} {rounds}轮 {wr} ({wins}W/{losses}L)  [{}笔]", strades.len());
    }
    println!("  {:>16} 共 {} 笔交易记录", "", trades.len());
}

fn show_strategies(strategies_dir: &Path, records_dir: &Path) {
    if !strategies_dir.exists() { println!("  (无策略目录)"); return; }

    let signal_counts = load_signals_by_strategy(records_dir);
    let last_trades = load_last_trade_by_strategy(records_dir);

    let mut strategies: Vec<serde_json::Value> = Vec::new();
    if let Ok(mut entries) = std::fs::read_dir(strategies_dir) {
        let mut dirs: Vec<_> = entries.by_ref().filter_map(|e| e.ok()).collect();
        dirs.sort_by_key(|e| e.path());

        for entry in &dirs {
            let sf = entry.path().join("signal.json");
            if !sf.exists() { continue; }
            if let Ok(content) = std::fs::read_to_string(&sf) {
                if let Ok(mut cfg) = serde_json::from_str::<serde_json::Value>(&content) {
                    cfg.as_object_mut().map(|o| {
                        o.insert("_dir".to_string(), serde_json::Value::String(entry.path().to_string_lossy().to_string()))
                    });
                    strategies.push(cfg);
                }
            }
        }
    }

    if strategies.is_empty() { println!("  (无策略)"); return; }

    let approved: Vec<_> = strategies.iter().filter(|s| {
        let st = s.get("status").and_then(|v| v.as_str()).unwrap_or("");
        st == "approved" || st == "active"
    }).collect();
    let suspended: Vec<_> = strategies.iter().filter(|s| s.get("status").and_then(|v| v.as_str()) == Some("suspended")).collect();
    let other: Vec<_> = strategies.iter().filter(|s| {
        let st = s.get("status").and_then(|v| v.as_str()).unwrap_or("");
        st != "approved" && st != "active" && st != "suspended"
    }).collect();

    if !approved.is_empty() {
        println!("  running ({}):", approved.len());
        for s in &approved {
            let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let sym = s.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let strat = s.get("engine_strategy").or_else(|| s.get("strategy")).and_then(|v| v.as_str()).unwrap_or("?");
            println!("    {name:<28} {sym:<14} {strat}");

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
            let reason = s.get("suspend_reason").and_then(|v| v.as_str()).unwrap_or("");
            let short = if reason.len() > 50 { format!("{}...", &reason[..50]) } else { reason.to_string() };
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
    if !state_file.exists() { return None; }
    let content = std::fs::read_to_string(&state_file).ok()?;
    let state: serde_json::Value = serde_json::from_str(&content).ok()?;

    let updated = state.get("last_updated").and_then(|v| v.as_str()).unwrap_or("?");
    let updated_fmt = format_updated(updated);

    let candle_count = state.get("indicators").and_then(|v| v.get("candle_count")).and_then(|v| v.as_u64())
        .map(|n| n.to_string()).unwrap_or_else(|| "?".to_string());

    let ts = state.get("trade_stats").cloned().unwrap_or_default();
    let total = ts.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
    let wins = ts.get("wins").and_then(|v| v.as_u64()).unwrap_or(0);
    let losses = ts.get("losses").and_then(|v| v.as_u64()).unwrap_or(0);
    let pnl = ts.get("realized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let sign = if pnl >= 0.0 { "+" } else { "" };
    let wr = if total > 0 { format!("{:.0}%", wins as f64 / total as f64 * 100.0) } else { "N/A".to_string() };

    let sig_count = signal_counts.get(strategy_name).copied().unwrap_or(0);

    let last_trade = last_trades.get(strategy_name).map(|lt| {
        let parsed = lt.replace("Z", "+00:00");
        DateTime::parse_from_rfc3339(&parsed)
            .map(|dt| dt.format("%m-%d %H:%M").to_string())
            .unwrap_or_else(|_| lt[..16.min(lt.len())].to_string())
    }).unwrap_or_else(|| "-".to_string());

    Some(format!(
        "tick={}  candles={}  signals={}  trades={}({}W/{}L {})  pnl={sign}${pnl:.4}  last_trade={last_trade}",
        updated_fmt, candle_count, sig_count, total, wins, losses, wr
    ))
}

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))).unwrap_or(0.0)
}
