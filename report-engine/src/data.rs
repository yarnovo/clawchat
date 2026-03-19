use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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

/// Strategy info gathered from signal.json configs
#[derive(Debug, Clone)]
pub struct StrategyInfo {
    pub name: String,
    pub symbol: String,
    pub timeframe: String,
    pub capital: f64,
    pub leverage: u32,
    pub status: String,
}

// ── Ledger types (matching engine's ledger.rs serialization) ──────

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LedgerSnapshot {
    pub strategies: std::collections::HashMap<String, StrategyAllocation>,
    pub total_capital: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StrategyAllocation {
    pub strategy_name: String,
    pub allocated_capital: f64,
    pub realized_pnl: f64,
    pub unrealized_pnl: f64,
    pub fees_paid: f64,
    pub funding_paid: f64,
    pub peak_equity: f64,
    pub positions: std::collections::HashMap<String, VirtualPosition>,
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
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VirtualPosition {
    pub symbol: String,
    pub side: String,
    pub qty: f64,
    pub entry_price: f64,
    pub unrealized_pnl: f64,
    pub opened_at: String,
}

// ── Data reading functions ────────────────────────────────────────

fn parse_ts(ts: &str) -> Option<DateTime<Utc>> {
    // Try RFC3339 first, then fallback to common formats
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
            // First parse as Value to extract ts, then parse fully
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

/// Read trades.jsonl filtered by date range
pub fn read_trades(records_dir: &Path, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<TradeRecord> {
    read_jsonl(&records_dir.join("trades.jsonl"), from, to)
}

/// Read pnl_by_strategy.jsonl filtered by date range
pub fn read_pnl(records_dir: &Path, from: DateTime<Utc>, to: DateTime<Utc>) -> Vec<PnlRecord> {
    read_jsonl(&records_dir.join("pnl_by_strategy.jsonl"), from, to)
}

/// Read risk_events.jsonl filtered by date range
pub fn read_risk_events(
    records_dir: &Path,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> Vec<RiskEvent> {
    read_jsonl(&records_dir.join("risk_events.jsonl"), from, to)
}

/// Read signals.jsonl filtered by date range
pub fn read_signals(
    records_dir: &Path,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> Vec<SignalRecord> {
    read_jsonl(&records_dir.join("signals.jsonl"), from, to)
}

/// Read ledger.json snapshot
pub fn read_ledger(records_dir: &Path) -> Option<LedgerSnapshot> {
    let path = records_dir.join("ledger.json");
    let content = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Scan all approved strategy configs from strategies dir
pub fn read_strategy_configs(strategies_dir: &Path) -> Vec<StrategyInfo> {
    let entries = match std::fs::read_dir(strategies_dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    let mut configs = Vec::new();
    for entry in entries.flatten() {
        let signal_path = entry.path().join("signal.json");
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

        let status = val
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if status != "approved" {
            continue;
        }

        let name = val
            .get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                entry
                    .path()
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            });

        configs.push(StrategyInfo {
            name,
            symbol: val
                .get("symbol")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            timeframe: val
                .get("timeframe")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            capital: val
                .get("capital")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            leverage: val
                .get("leverage")
                .and_then(|v| v.as_u64())
                .unwrap_or(1) as u32,
            status,
        });
    }

    configs.sort_by(|a, b| a.name.cmp(&b.name));
    configs
}
