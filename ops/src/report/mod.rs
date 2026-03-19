use chrono::{DateTime, Duration, TimeZone, Utc};
use clawchat_shared::paths::{records_dir, reports_dir, strategies_dir};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

const CHECK_INTERVAL_SECS: u64 = 60;

// ── Data loading ─────────────────────────────────────────────────

fn load_trades() -> Vec<serde_json::Value> {
    let path = records_dir().join("trades.jsonl");
    if !path.exists() { return Vec::new(); }
    let content = match std::fs::read_to_string(&path) { Ok(c) => c, Err(_) => return Vec::new() };
    content.lines().filter(|l| !l.is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

fn load_equity() -> Vec<HashMap<String, String>> {
    let path = records_dir().join("equity.csv");
    if !path.exists() { return Vec::new(); }
    let mut rows = Vec::new();
    if let Ok(mut rdr) = csv::Reader::from_path(&path) {
        let headers: Vec<String> = rdr.headers().ok()
            .map(|h| h.iter().map(|s| s.to_string()).collect())
            .unwrap_or_default();
        for result in rdr.records() {
            if let Ok(record) = result {
                let mut map = HashMap::new();
                for (i, val) in record.iter().enumerate() {
                    if let Some(key) = headers.get(i) {
                        map.insert(key.clone(), val.to_string());
                    }
                }
                rows.push(map);
            }
        }
    }
    rows
}

fn load_strategy_configs() -> HashMap<String, serde_json::Value> {
    let mut configs = HashMap::new();
    let sdir = strategies_dir();
    if !sdir.exists() { return configs; }
    if let Ok(entries) = std::fs::read_dir(&sdir) {
        let mut dirs: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        dirs.sort_by_key(|e| e.path());
        for entry in dirs {
            let sj = entry.path().join("signal.json");
            if sj.exists() {
                if let Ok(content) = std::fs::read_to_string(&sj) {
                    if let Ok(cfg) = serde_json::from_str(&content) {
                        let name = entry.path().file_name().and_then(|n| n.to_str()).unwrap_or("?").to_string();
                        configs.insert(name, cfg);
                    }
                }
            }
        }
    }
    configs
}

fn parse_num(v: Option<&serde_json::Value>) -> f64 {
    v.and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0.0)
}

// ── Trade filtering and PnL computation ─────────────────────────

fn filter_trades_by_date(trades: &[serde_json::Value], start: DateTime<Utc>, end: DateTime<Utc>) -> Vec<serde_json::Value> {
    trades.iter().filter(|t| {
        let ts_str = t.get("ts").and_then(|v| v.as_str()).unwrap_or("");
        if ts_str.is_empty() { return false; }
        let parsed = ts_str.replace("Z", "+00:00");
        DateTime::parse_from_rfc3339(&parsed)
            .map(|dt| dt >= start && dt < end)
            .unwrap_or(false)
    }).cloned().collect()
}

fn compute_pnl_by_strategy(trades: &[serde_json::Value]) -> HashMap<String, StratPnl> {
    let mut by_strat: HashMap<String, Vec<&serde_json::Value>> = HashMap::new();
    for t in trades {
        let strat = t.get("strategy").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        by_strat.entry(strat).or_default().push(t);
    }

    let mut results = HashMap::new();
    for (strat, strades) in &by_strat {
        let mut by_symbol: HashMap<String, Vec<&&serde_json::Value>> = HashMap::new();
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

        let round_trips = wins + losses;
        let win_rate = if round_trips > 0 { wins as f64 / round_trips as f64 } else { 0.0 };
        results.insert(strat.clone(), StratPnl {
            pnl: total_pnl, trades: strades.len(), round_trips, wins, losses, win_rate,
        });
    }
    results
}

struct StratPnl {
    pnl: f64, trades: usize, round_trips: u32, wins: u32, losses: u32, win_rate: f64,
}

fn compute_equity_stats(rows: &[HashMap<String, String>], start: DateTime<Utc>, end: DateTime<Utc>) -> EquityStats {
    let mut filtered: Vec<f64> = Vec::new();
    for row in rows {
        let ts_str = row.get("timestamp").map(|s| s.as_str()).unwrap_or("");
        if ts_str.is_empty() { continue; }
        let parsed = ts_str.replace("Z", "+00:00");
        let ok = DateTime::parse_from_rfc3339(&parsed)
            .map(|dt| dt >= start && dt < end)
            .unwrap_or(false);
        if ok {
            let eq: f64 = row.get("equity").and_then(|s| s.parse().ok()).unwrap_or(0.0);
            filtered.push(eq);
        }
    }
    if filtered.is_empty() {
        return EquityStats { start_equity: 0.0, end_equity: 0.0, peak: 0.0, trough: 0.0, max_drawdown_pct: 0.0 };
    }
    let start_eq = filtered[0];
    let end_eq = *filtered.last().unwrap();
    let peak_val = filtered.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let trough_val = filtered.iter().cloned().fold(f64::INFINITY, f64::min);
    let mut peak = filtered[0];
    let mut max_dd_pct = 0.0f64;
    for &eq in &filtered {
        if eq > peak { peak = eq; }
        if peak > 0.0 { let dd = (peak - eq) / peak * 100.0; if dd > max_dd_pct { max_dd_pct = dd; } }
    }
    EquityStats { start_equity: start_eq, end_equity: end_eq, peak: peak_val, trough: trough_val, max_drawdown_pct: max_dd_pct }
}

struct EquityStats { start_equity: f64, end_equity: f64, peak: f64, trough: f64, max_drawdown_pct: f64 }

// ── Report generation ────────────────────────────────────────────

pub fn generate_daily_report(date: DateTime<Utc>) -> String {
    let day_start = date.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let day_start = Utc.from_utc_datetime(&day_start);
    let day_end = day_start + Duration::days(1);
    let date_str = day_start.format("%Y-%m-%d").to_string();

    let trades = load_trades();
    let day_trades = filter_trades_by_date(&trades, day_start, day_end);
    let pnl_by_strat = compute_pnl_by_strategy(&day_trades);
    let equity_rows = load_equity();
    let eq_stats = compute_equity_stats(&equity_rows, day_start, day_end);
    let configs = load_strategy_configs();

    let total_pnl: f64 = pnl_by_strat.values().map(|s| s.pnl).sum();
    let total_trades: usize = pnl_by_strat.values().map(|s| s.trades).sum();

    let mut lines = vec![
        format!("# 日报 {date_str}"), String::new(),
        "## 总览".to_string(), String::new(),
        "| 指标 | 值 |".to_string(), "|------|-----|".to_string(),
        format!("| 日期 | {date_str} |"),
        format!("| 交易笔数 | {total_trades} |"),
        format!("| 总 PnL | ${total_pnl:+.4} |"),
        format!("| 起始权益 | ${:.2} |", eq_stats.start_equity),
        format!("| 结束权益 | ${:.2} |", eq_stats.end_equity),
        format!("| 最大回撤 | {:.2}% |", eq_stats.max_drawdown_pct),
        String::new(), "## 策略表现".to_string(), String::new(),
    ];

    if !pnl_by_strat.is_empty() {
        lines.push("| 策略 | PnL | 交易 | 胜率 |".to_string());
        lines.push("|------|-----|------|------|".to_string());
        let mut strats: Vec<_> = pnl_by_strat.iter().collect();
        strats.sort_by(|a, b| b.1.pnl.partial_cmp(&a.1.pnl).unwrap_or(std::cmp::Ordering::Equal));
        for (strat, s) in strats {
            let wr = if s.round_trips > 0 { format!("{:.0}%", s.win_rate * 100.0) } else { "N/A".to_string() };
            lines.push(format!("| {strat} | ${:+.4} | {} | {wr} |", s.pnl, s.trades));
        }
    } else {
        lines.push("(无交易)".to_string());
    }

    lines.extend(vec![
        String::new(), "## 策略状态".to_string(), String::new(),
        "| 策略 | 状态 | 币种 | 周期 |".to_string(),
        "|------|------|------|------|".to_string(),
    ]);
    let mut config_names: Vec<_> = configs.keys().cloned().collect();
    config_names.sort();
    for name in &config_names {
        let cfg = &configs[name];
        let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("?");
        let symbol = cfg.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
        let tf = cfg.get("timeframe").and_then(|v| v.as_str()).unwrap_or("?");
        lines.push(format!("| {name} | {status} | {symbol} | {tf} |"));
    }

    lines.push(String::new());
    lines.push(format!("---\n*生成时间: {} UTC*", Utc::now().format("%Y-%m-%d %H:%M:%S")));
    lines.push(String::new());
    lines.join("\n")
}

pub fn generate_weekly_report(end_date: DateTime<Utc>) -> String {
    let week_end_naive = end_date.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let week_end = Utc.from_utc_datetime(&week_end_naive) + Duration::days(1);
    let week_start = week_end - Duration::days(7);
    let start_str = week_start.format("%Y-%m-%d").to_string();
    let end_str = (week_end - Duration::days(1)).format("%Y-%m-%d").to_string();

    let trades = load_trades();
    let week_trades = filter_trades_by_date(&trades, week_start, week_end);
    let pnl_by_strat = compute_pnl_by_strategy(&week_trades);
    let equity_rows = load_equity();
    let eq_stats = compute_equity_stats(&equity_rows, week_start, week_end);
    let configs = load_strategy_configs();

    let total_pnl: f64 = pnl_by_strat.values().map(|s| s.pnl).sum();
    let total_trades: usize = pnl_by_strat.values().map(|s| s.trades).sum();
    let total_rt: u32 = pnl_by_strat.values().map(|s| s.round_trips).sum();

    let mut lines = vec![
        format!("# 周报 {start_str} ~ {end_str}"), String::new(),
        "## 总览".to_string(), String::new(),
        "| 指标 | 值 |".to_string(), "|------|-----|".to_string(),
        format!("| 周期 | {start_str} ~ {end_str} |"),
        format!("| 交易笔数 | {total_trades} ({total_rt} 轮) |"),
        format!("| 总 PnL | ${total_pnl:+.4} |"),
        format!("| 起始权益 | ${:.2} |", eq_stats.start_equity),
        format!("| 结束权益 | ${:.2} |", eq_stats.end_equity),
        format!("| 最大回撤 | {:.2}% |", eq_stats.max_drawdown_pct),
        String::new(), "## 策略排名（按 PnL）".to_string(), String::new(),
    ];

    if !pnl_by_strat.is_empty() {
        lines.push("| # | 策略 | PnL | 交易 | 胜率 | 状态 |".to_string());
        lines.push("|---|------|-----|------|------|------|".to_string());
        let mut ranked: Vec<_> = pnl_by_strat.iter().collect();
        ranked.sort_by(|a, b| b.1.pnl.partial_cmp(&a.1.pnl).unwrap_or(std::cmp::Ordering::Equal));
        for (i, (strat, s)) in ranked.iter().enumerate() {
            let wr = if s.round_trips > 0 { format!("{:.0}%", s.win_rate * 100.0) } else { "N/A".to_string() };
            let status = configs.get(*strat).and_then(|c| c.get("status")).and_then(|v| v.as_str()).unwrap_or("?");
            lines.push(format!("| {} | {strat} | ${:+.4} | {} | {wr} | {status} |", i + 1, s.pnl, s.trades));
        }
    } else {
        lines.push("(无交易)".to_string());
    }

    // Equity summary
    lines.extend(vec![String::new(), "## 资金曲线".to_string(), String::new()]);
    if eq_stats.start_equity > 0.0 {
        let change = eq_stats.end_equity - eq_stats.start_equity;
        let change_pct = change / eq_stats.start_equity * 100.0;
        lines.push(format!("- 起始: ${:.2}", eq_stats.start_equity));
        lines.push(format!("- 结束: ${:.2} ({change_pct:+.2}%)", eq_stats.end_equity));
        lines.push(format!("- 峰值: ${:.2}", eq_stats.peak));
        lines.push(format!("- 谷值: ${:.2}", eq_stats.trough));
        lines.push(format!("- 最大回撤: {:.2}%", eq_stats.max_drawdown_pct));
    } else {
        lines.push("(无权益数据)".to_string());
    }

    lines.push(String::new());
    lines.push(format!("---\n*生成时间: {} UTC*", Utc::now().format("%Y-%m-%d %H:%M:%S")));
    lines.push(String::new());
    lines.join("\n")
}

fn run_report(report_type: &str, date: DateTime<Utc>) -> Result<String, Box<dyn std::error::Error>> {
    let rdir = reports_dir();
    let _ = std::fs::create_dir_all(&rdir);

    let (content, filename) = if report_type == "daily" {
        let report_date = date - Duration::days(1);
        let c = generate_daily_report(report_date);
        let f = format!("daily-{}.md", report_date.format("%Y-%m-%d"));
        (c, f)
    } else {
        let report_date = date - Duration::days(1);
        let c = generate_weekly_report(report_date);
        let f = format!("weekly-{}.md", report_date.format("%Y-%m-%d"));
        (c, f)
    };

    let out_path = rdir.join(&filename);
    std::fs::write(&out_path, &content)?;
    Ok(out_path.to_string_lossy().to_string())
}

/// Report scheduler - checks once per minute, generates daily at 09:00 UTC, weekly on Monday 09:00 UTC
pub async fn report_engine(once: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(report_type) = once {
        let now = Utc::now();
        let path = run_report(report_type, now)?;
        println!("\n  {report_type} 报告已生成: {path}");
        return Ok(());
    }

    let mut last_run: HashMap<String, DateTime<Utc>> = HashMap::new();
    println!("  报告引擎启动 (检查间隔 {CHECK_INTERVAL_SECS}s)");
    println!("  调度: 日报 09:00 UTC, 周报 周一 09:00 UTC");
    println!("  输出: {}", reports_dir().display());
    println!();

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    tokio::spawn(async move {
        let _ = tokio::signal::ctrl_c().await;
        r.store(false, Ordering::SeqCst);
    });

    while running.load(Ordering::SeqCst) {
        let now = Utc::now();

        // Daily at 09:00
        if now.format("%H:%M").to_string() == "09:00" {
            let key = "daily".to_string();
            let should = last_run.get(&key)
                .map(|lr| (now - *lr).num_seconds() >= CHECK_INTERVAL_SECS as i64)
                .unwrap_or(true);
            if should {
                println!("  [{}] 生成daily报告...", now.format("%H:%M:%S"));
                match run_report("daily", now) {
                    Ok(path) => {
                        println!("  [{}] 完成: {path}", now.format("%H:%M:%S"));
                        last_run.insert(key, now);
                    }
                    Err(e) => println!("  [{}] 错误: {e}", now.format("%H:%M:%S")),
                }
            }

            // Weekly on Monday
            if now.format("%u").to_string() == "1" {
                let wkey = "weekly".to_string();
                let should = last_run.get(&wkey)
                    .map(|lr| (now - *lr).num_seconds() >= CHECK_INTERVAL_SECS as i64)
                    .unwrap_or(true);
                if should {
                    println!("  [{}] 生成weekly报告...", now.format("%H:%M:%S"));
                    match run_report("weekly", now) {
                        Ok(path) => {
                            println!("  [{}] 完成: {path}", now.format("%H:%M:%S"));
                            last_run.insert(wkey, now);
                        }
                        Err(e) => println!("  [{}] 错误: {e}", now.format("%H:%M:%S")),
                    }
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(CHECK_INTERVAL_SECS)).await;
    }

    Ok(())
}
