use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

// ── Record types (matching engine's JSONL output) ─────────────────

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TradeRecord {
    pub ts: String,
    pub strategy: String,
    #[serde(default)]
    pub symbol: String,
    #[serde(default)]
    pub side: String,
    #[serde(default)]
    pub qty: f64,
    #[serde(default)]
    pub price: String,
    #[serde(default)]
    pub order_type: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub client_order_id: String,
    #[serde(default)]
    pub pnl: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PnlRecord {
    pub ts: String,
    pub strategy: String,
    #[serde(default)]
    pub symbol: String,
    #[serde(default)]
    pub side: String,
    #[serde(default)]
    pub qty: f64,
    #[serde(default)]
    pub entry_price: f64,
    #[serde(default)]
    pub exit_price: f64,
    #[serde(default)]
    pub pnl_usdt: f64,
    #[serde(default)]
    pub fees_usdt: f64,
    #[serde(default)]
    pub net_pnl: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RiskEvent {
    pub ts: String,
    #[serde(default)]
    pub strategy: String,
    #[serde(default)]
    pub symbol: String,
    #[serde(default)]
    pub rule: String,
    #[serde(default)]
    pub verdict: String,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub pnl: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SignalRecord {
    pub ts: String,
    #[serde(default)]
    pub strategy: String,
    #[serde(default)]
    pub signal: String,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub executed: bool,
}

/// Enriched strategy info from signal.json + risk.json + trade.json
#[derive(Debug, Clone)]
pub struct StrategyInfo {
    pub name: String,
    pub symbol: String,
    pub timeframe: String,
    pub engine_strategy: String,
    pub capital: f64,
    pub leverage: u32,
    pub status: String,
    pub mode: String,
    // backtest reference
    pub bt_sharpe: f64,
    pub bt_roi: f64,
    pub bt_dd: f64,
    // risk config
    pub risk_max_loss: f64,
    pub risk_max_profit: f64,
    // trade.json action
    pub trade_action: String,
}

// ── Ledger types (matching engine's ledger.json structure) ──────

#[derive(Debug, Clone, Deserialize)]
pub struct LedgerRoot {
    pub accounts: HashMap<String, LedgerAccount>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LedgerAccount {
    pub total_capital: f64,
    pub portfolios: HashMap<String, LedgerPortfolio>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LedgerPortfolio {
    pub allocated_capital: f64,
    pub strategies: HashMap<String, StrategyAllocation>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StrategyAllocation {
    pub strategy_name: String,
    pub allocated_capital: f64,
    #[serde(default)]
    pub realized_pnl: f64,
    #[serde(default)]
    pub unrealized_pnl: f64,
    #[serde(default)]
    pub fees_paid: f64,
    #[serde(default)]
    pub funding_paid: f64,
    #[serde(default)]
    pub peak_equity: f64,
    #[serde(default)]
    pub positions: HashMap<String, VirtualPosition>,
}

impl StrategyAllocation {
    pub fn virtual_equity(&self) -> f64 {
        self.allocated_capital + self.realized_pnl + self.unrealized_pnl
            - self.fees_paid
            - self.funding_paid
    }

    pub fn drawdown_pct(&self) -> f64 {
        let equity = self.virtual_equity();
        if self.peak_equity <= 0.0 {
            return 0.0;
        }
        ((self.peak_equity - equity) / self.peak_equity * 100.0).max(0.0)
    }

    pub fn total_pnl(&self) -> f64 {
        self.realized_pnl + self.unrealized_pnl - self.fees_paid - self.funding_paid
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VirtualPosition {
    pub symbol: String,
    pub side: String,
    pub qty: f64,
    pub entry_price: f64,
    #[serde(default)]
    pub unrealized_pnl: f64,
    #[serde(default)]
    pub opened_at: String,
}

/// Flattened ledger data for reporting
pub struct FlatLedger {
    pub total_capital: f64,
    pub strategies: HashMap<String, StrategyAllocation>,
}

impl FlatLedger {
    pub fn total_equity(&self) -> f64 {
        self.strategies.values().map(|s| s.virtual_equity()).sum()
    }

    pub fn total_allocated(&self) -> f64 {
        self.strategies.values().map(|s| s.allocated_capital).sum()
    }

    pub fn total_pnl(&self) -> f64 {
        self.strategies.values().map(|s| s.total_pnl()).sum()
    }

    pub fn global_drawdown_pct(&self) -> f64 {
        let allocated = self.total_allocated();
        let equity = self.total_equity();
        if allocated > 0.0 && equity < allocated {
            (allocated - equity) / allocated * 100.0
        } else {
            0.0
        }
    }
}

// ── Data reading functions ────────────────────────────────────────

fn parse_ts(ts: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = ts.parse::<DateTime<Utc>>() {
        return Some(dt);
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, "%Y-%m-%dT%H:%M:%SZ") {
        return Some(dt.and_utc());
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, "%Y-%m-%dT%H:%M:%S") {
        return Some(dt.and_utc());
    }
    None
}

fn read_jsonl<T: serde::de::DeserializeOwned>(
    path: &Path,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> Vec<T> {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            let val: serde_json::Value = serde_json::from_str(line).ok()?;
            let ts_str = val.get("ts")?.as_str()?;
            let ts = parse_ts(ts_str)?;
            if ts >= from && ts < to {
                serde_json::from_value(val).ok()
            } else {
                None
            }
        })
        .collect()
}

pub fn read_trades(records_dir: &Path, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<TradeRecord> {
    read_jsonl(&records_dir.join("trades.jsonl"), from, to)
}

pub fn read_pnl(records_dir: &Path, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<PnlRecord> {
    read_jsonl(&records_dir.join("pnl_by_strategy.jsonl"), from, to)
}

pub fn read_risk_events(
    records_dir: &Path,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> Vec<RiskEvent> {
    read_jsonl(&records_dir.join("risk_events.jsonl"), from, to)
}

pub fn read_signals(
    records_dir: &Path,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> Vec<SignalRecord> {
    read_jsonl(&records_dir.join("signals.jsonl"), from, to)
}

/// Read ledger.json and flatten into FlatLedger
pub fn read_ledger(records_dir: &Path) -> Option<FlatLedger> {
    let path = records_dir.join("ledger.json");
    let content = std::fs::read_to_string(&path).ok()?;
    let root: LedgerRoot = serde_json::from_str(&content).ok()?;

    let mut strategies = HashMap::new();
    let mut total_capital = 0.0;

    for account in root.accounts.values() {
        total_capital += account.total_capital;
        for portfolio in account.portfolios.values() {
            for (name, strat) in &portfolio.strategies {
                strategies.insert(name.clone(), strat.clone());
            }
        }
    }

    Some(FlatLedger {
        total_capital,
        strategies,
    })
}

/// Scan all approved strategy configs from strategies dir (enriched)
pub fn read_strategy_configs(strategies_dir: &Path) -> Vec<StrategyInfo> {
    let entries = match std::fs::read_dir(strategies_dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    let mut configs = Vec::new();
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }

        let signal_path = dir.join("signal.json");
        if !signal_path.exists() {
            continue;
        }
        let content = match std::fs::read_to_string(&signal_path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let val: serde_json::Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let status = val.get("status").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if status != "approved" {
            continue;
        }

        let name = val.get("name").and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                dir.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string()
            });

        // Read backtest
        let bt = val.get("backtest");
        let bt_sharpe = bt.and_then(|b| b.get("sharpe")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let bt_roi = bt.and_then(|b| b.get("return_pct")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let bt_dd = bt.and_then(|b| b.get("max_drawdown_pct")).and_then(|v| v.as_f64()).unwrap_or(0.0);

        // Read risk.json
        let risk_path = dir.join("risk.json");
        let (risk_max_loss, risk_max_profit) = if let Ok(rc) = std::fs::read_to_string(&risk_path) {
            let rv: serde_json::Value = serde_json::from_str(&rc).unwrap_or_default();
            (
                rv.get("max_loss_per_trade").and_then(|v| v.as_f64()).unwrap_or(0.05),
                rv.get("max_profit_per_trade").and_then(|v| v.as_f64()).unwrap_or(0.10),
            )
        } else {
            (0.05, 0.10)
        };

        // Read trade.json
        let trade_path = dir.join("trade.json");
        let trade_action = if let Ok(tc) = std::fs::read_to_string(&trade_path) {
            let tv: serde_json::Value = serde_json::from_str(&tc).unwrap_or_default();
            tv.get("action").and_then(|v| v.as_str()).unwrap_or("hold").to_string()
        } else {
            "hold".to_string()
        };

        configs.push(StrategyInfo {
            name,
            symbol: val.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            timeframe: val.get("timeframe").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            engine_strategy: val.get("engine_strategy").and_then(|v| v.as_str()).unwrap_or("default").to_string(),
            capital: val.get("capital").and_then(|v| v.as_f64()).unwrap_or(0.0),
            leverage: val.get("leverage").and_then(|v| v.as_u64()).unwrap_or(1) as u32,
            status,
            mode: val.get("mode").and_then(|v| v.as_str()).unwrap_or("dry-run").to_string(),
            bt_sharpe,
            bt_roi,
            bt_dd,
            risk_max_loss,
            risk_max_profit,
            trade_action,
        });
    }

    configs.sort_by(|a, b| a.name.cmp(&b.name));
    configs
}

/// Get Binance balance using Exchange API
pub async fn get_binance_balance() -> Option<f64> {
    let account_path = clawchat_shared::paths::account_dir("binance-main").join("account.json");
    let content = std::fs::read_to_string(&account_path).ok()?;
    let val: serde_json::Value = serde_json::from_str(&content).ok()?;

    let api_key_env = val.get("api_key_env")?.as_str()?;
    let api_secret_env = val.get("api_secret_env")?.as_str()?;
    let base_url = val.get("base_url")?.as_str()?;

    let api_key = std::env::var(api_key_env).ok()?;
    let api_secret = std::env::var(api_secret_env).ok()?;

    let exchange = clawchat_shared::exchange::Exchange::new(
        api_key,
        api_secret,
        base_url.to_string(),
        true, // dry_run — we're only reading balance
    );

    match exchange.get_balance().await {
        Ok(balance) => Some(balance),
        Err(e) => {
            tracing::warn!("failed to get Binance balance: {e:?}");
            None
        }
    }
}

/// Read last N autopilot decision lines from logs/autopilot.log
pub fn read_autopilot_log(n: usize) -> Vec<String> {
    let log_path = clawchat_shared::paths::logs_dir().join("autopilot.log");
    let content = match std::fs::read_to_string(&log_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(n);
    lines[start..].iter().map(|l| l.to_string()).collect()
}

// ── Engine status helpers ─────────────────────────────────────────

/// Service status info
pub struct ServiceStatus {
    pub pid: u32,
    pub running: bool,
    pub uptime_secs: Option<u64>,
}

/// Read PID file and check if process is alive, return status
pub fn get_service_status(pid_filename: &str) -> Option<ServiceStatus> {
    let pid_path = clawchat_shared::paths::project_root().join(".pid").join(pid_filename);
    let content = std::fs::read_to_string(&pid_path).ok()?;
    let pid: u32 = content.trim().parse().ok()?;

    // Check if process is alive via kill -0
    let alive = unsafe { libc::kill(pid as i32, 0) == 0 };

    // Try to get process start time from sysctl (macOS) or /proc (Linux)
    let uptime = if alive {
        get_process_uptime(pid)
    } else {
        None
    };

    Some(ServiceStatus {
        pid,
        running: alive,
        uptime_secs: uptime,
    })
}

#[cfg(target_os = "macos")]
fn get_process_uptime(pid: u32) -> Option<u64> {
    use std::process::Command;
    // ps -o etime= gives elapsed time like "02:30:15" or "1-02:30:15"
    let output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "etime="])
        .output()
        .ok()?;
    let etime = String::from_utf8_lossy(&output.stdout).trim().to_string();
    parse_etime(&etime)
}

#[cfg(not(target_os = "macos"))]
fn get_process_uptime(pid: u32) -> Option<u64> {
    use std::process::Command;
    let output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "etime="])
        .output()
        .ok()?;
    let etime = String::from_utf8_lossy(&output.stdout).trim().to_string();
    parse_etime(&etime)
}

/// Parse ps etime format: [[DD-]HH:]MM:SS → seconds
fn parse_etime(s: &str) -> Option<u64> {
    if s.is_empty() {
        return None;
    }
    let (days, rest) = if let Some(idx) = s.find('-') {
        let d: u64 = s[..idx].parse().ok()?;
        (d, &s[idx + 1..])
    } else {
        (0, s)
    };
    let parts: Vec<&str> = rest.split(':').collect();
    let (hours, minutes, seconds) = match parts.len() {
        3 => {
            let h: u64 = parts[0].trim().parse().ok()?;
            let m: u64 = parts[1].trim().parse().ok()?;
            let s: u64 = parts[2].trim().parse().ok()?;
            (h, m, s)
        }
        2 => {
            let m: u64 = parts[0].trim().parse().ok()?;
            let s: u64 = parts[1].trim().parse().ok()?;
            (0, m, s)
        }
        _ => return None,
    };
    Some(days * 86400 + hours * 3600 + minutes * 60 + seconds)
}

/// Format seconds as human-readable uptime
pub fn format_uptime(secs: u64) -> String {
    let hours = secs / 3600;
    let minutes = (secs % 3600) / 60;
    if hours > 0 {
        format!("{hours}h{minutes:02}m")
    } else {
        format!("{minutes}m{:02}s", secs % 60)
    }
}

/// Count "candle aggregated" log entries per strategy from engine.log files
pub fn count_candles_per_strategy() -> HashMap<String, u32> {
    let logs_dir = clawchat_shared::paths::logs_dir();
    let mut counts: HashMap<String, u32> = HashMap::new();

    // Read both engine.log and any rotated engine.log.* files
    let entries = match std::fs::read_dir(&logs_dir) {
        Ok(e) => e,
        Err(_) => return counts,
    };

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("engine.log") {
            continue;
        }
        let content = match std::fs::read_to_string(entry.path()) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for line in content.lines() {
            if !line.contains("candle aggregated") {
                continue;
            }
            // Strip ANSI codes and extract strategy name
            let clean = strip_ansi(line);
            if let Some(strategy) = extract_field(&clean, "strategy=") {
                *counts.entry(strategy).or_insert(0) += 1;
            }
        }
    }

    counts
}

/// Get the last "candle stored" timestamp from data-engine.log
pub fn get_data_engine_last_collect() -> Option<String> {
    let log_path = clawchat_shared::paths::logs_dir().join("data-engine.log");
    let content = std::fs::read_to_string(&log_path).ok()?;

    // Find last line with "candle stored" and extract timestamp
    content.lines().rev()
        .find(|line| line.contains("candle stored"))
        .and_then(|line| {
            let clean = strip_ansi(line);
            // Timestamp format: 2026-03-19T08:45:01.230566Z
            clean.find("20").and_then(|start| {
                clean.get(start..start + 19).map(|s| s.to_string())
            })
        })
}

/// Calculate warmup candles needed from signal.json params
pub fn warmup_candles_needed(strategies_dir: &Path) -> HashMap<String, u32> {
    let mut result = HashMap::new();

    let entries = match std::fs::read_dir(strategies_dir) {
        Ok(e) => e,
        Err(_) => return result,
    };

    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }

        let signal_path = dir.join("signal.json");
        let content = match std::fs::read_to_string(&signal_path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let val: serde_json::Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let status = val.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status != "approved" {
            continue;
        }

        let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }

        // Extract all numeric params and take the max as warmup requirement
        let mut max_param: u32 = 14; // minimum default (atr_period)
        if let Some(params) = val.get("params").and_then(|p| p.as_object()) {
            for (key, value) in params {
                // Only consider period/lookback style params
                if key.contains("period") || key.contains("slow") || key == "lookback" {
                    if let Some(n) = value.as_u64() {
                        max_param = max_param.max(n as u32);
                    }
                }
            }
        }

        result.insert(name, max_param);
    }

    result
}

/// Strip ANSI escape codes from a string
fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // Skip until 'm' (end of ANSI sequence)
            for c2 in chars.by_ref() {
                if c2 == 'm' {
                    break;
                }
            }
        } else {
            result.push(c);
        }
    }
    result
}

/// Extract value after a key= pattern in a log line
fn extract_field(line: &str, prefix: &str) -> Option<String> {
    let start = line.find(prefix)? + prefix.len();
    let rest = &line[start..];
    let end = rest.find(' ').unwrap_or(rest.len());
    Some(rest[..end].to_string())
}
