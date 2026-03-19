use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// hft-engine 运行时状态，持久化到 strategies/{name}/state.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub last_updated: String,
    #[serde(default)]
    pub indicators: serde_json::Value,
    #[serde(default)]
    pub candle_aggregator: Option<CandleAggregatorState>,
    #[serde(default)]
    pub trade_stats: TradeStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandleAggregatorState {
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
    pub window_start: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TradeStats {
    pub total: u32,
    pub wins: u32,
    pub losses: u32,
    pub realized_pnl: f64,
}

impl TradeStats {
    pub fn record(&mut self, pnl: f64) {
        self.total += 1;
        self.realized_pnl += pnl;
        if pnl >= 0.0 {
            self.wins += 1;
        } else {
            self.losses += 1;
        }
    }
}

impl EngineState {
    pub fn load(path: &Path) -> Option<Self> {
        let contents = std::fs::read_to_string(path).ok()?;
        match serde_json::from_str(&contents) {
            Ok(state) => {
                tracing::info!("restored engine state from {}", path.display());
                Some(state)
            }
            Err(e) => {
                tracing::warn!("failed to parse state.json: {e}");
                None
            }
        }
    }

    pub fn save(&self, path: &Path) {
        let json = match serde_json::to_string_pretty(self) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("failed to serialize state: {e}");
                return;
            }
        };
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Err(e) = std::fs::write(path, json) {
            tracing::warn!("failed to write state.json: {e}");
        }
    }
}

// ── risk-engine 持久化状态 ──────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StrategyRiskState {
    pub daily_realized_pnl: f64,
    pub daily_trades: u32,
    pub consecutive_losses: u32,
    pub day_start_ts: u64,
}

impl StrategyRiskState {
    pub fn maybe_reset_day(&mut self, today_ts: u64) {
        if today_ts > self.day_start_ts {
            self.daily_realized_pnl = 0.0;
            self.daily_trades = 0;
            self.day_start_ts = today_ts;
        }
    }

    pub fn record_close(&mut self, pnl: f64) {
        self.daily_realized_pnl += pnl;
        self.daily_trades += 1;
        if pnl < 0.0 {
            self.consecutive_losses += 1;
        } else {
            self.consecutive_losses = 0;
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RiskEngineState {
    pub last_updated: String,
    #[serde(default)]
    pub strategies: HashMap<String, StrategyRiskState>,
}

impl RiskEngineState {
    pub fn load(path: &Path) -> Self {
        match std::fs::read_to_string(path) {
            Ok(contents) => match serde_json::from_str(&contents) {
                Ok(state) => {
                    tracing::info!("restored risk-engine state from {}", path.display());
                    state
                }
                Err(e) => {
                    tracing::warn!("failed to parse risk-engine state: {e}");
                    Self::default()
                }
            },
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self, path: &Path) {
        let json = match serde_json::to_string_pretty(self) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("failed to serialize risk-engine state: {e}");
                return;
            }
        };
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Err(e) = std::fs::write(path, json) {
            tracing::warn!("failed to write risk-engine state: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trade_stats_record() {
        let mut ts = TradeStats::default();
        ts.record(10.0);
        ts.record(-3.0);
        ts.record(5.0);
        assert_eq!(ts.total, 3);
        assert_eq!(ts.wins, 2);
        assert_eq!(ts.losses, 1);
        assert!((ts.realized_pnl - 12.0).abs() < f64::EPSILON);
    }

    #[test]
    fn engine_state_save_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");

        let state = EngineState {
            last_updated: "2026-03-18T19:45:00Z".to_string(),
            indicators: serde_json::json!({"ema_fast": 0.118}),
            candle_aggregator: Some(CandleAggregatorState {
                open: 0.118,
                high: 0.119,
                low: 0.117,
                close: 0.118,
                volume: 500.0,
                window_start: 1773829500000,
            }),
            trade_stats: TradeStats {
                total: 28,
                wins: 18,
                losses: 10,
                realized_pnl: 12.34,
            },
        };

        state.save(&path);

        let loaded = EngineState::load(&path).unwrap();
        assert_eq!(loaded.last_updated, "2026-03-18T19:45:00Z");
        assert_eq!(loaded.trade_stats.total, 28);
    }

    #[test]
    fn engine_state_load_missing_file() {
        let result = EngineState::load(Path::new("/nonexistent/state.json"));
        assert!(result.is_none());
    }

    #[test]
    fn strategy_risk_state_record_loss() {
        let mut s = StrategyRiskState::default();
        s.record_close(-5.0);
        assert_eq!(s.consecutive_losses, 1);
        assert_eq!(s.daily_trades, 1);
    }

    #[test]
    fn strategy_risk_state_day_reset() {
        let mut s = StrategyRiskState {
            daily_realized_pnl: -10.0,
            daily_trades: 5,
            consecutive_losses: 3,
            day_start_ts: 1000,
        };
        s.maybe_reset_day(2000);
        assert_eq!(s.daily_trades, 0);
        assert!((s.daily_realized_pnl).abs() < f64::EPSILON);
        assert_eq!(s.consecutive_losses, 3); // persists across days
    }

    /// 读取 strategies/ 下所有 state.json 并验证反序列化 + roundtrip
    #[test]
    fn parse_all_state_json_files() {
        let strategies_dir = crate::paths::strategies_dir();
        assert!(
            strategies_dir.exists(),
            "strategies/ dir not found at {}",
            strategies_dir.display()
        );

        let mut count = 0;
        for entry in std::fs::read_dir(&strategies_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path().join("state.json");
            if !path.exists() {
                continue;
            }
            let contents = std::fs::read_to_string(&path)
                .unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
            let parsed: EngineState = serde_json::from_str(&contents)
                .unwrap_or_else(|e| panic!("parse {}: {e}", path.display()));

            // roundtrip
            let json = serde_json::to_string_pretty(&parsed).unwrap();
            let reparsed: EngineState = serde_json::from_str(&json)
                .unwrap_or_else(|e| panic!("roundtrip {}: {e}", path.display()));

            assert_eq!(
                parsed.last_updated, reparsed.last_updated,
                "last_updated mismatch in {}",
                path.display()
            );
            assert_eq!(
                parsed.trade_stats, reparsed.trade_stats,
                "trade_stats mismatch in {}",
                path.display()
            );
            count += 1;
        }

        if count == 0 {
            eprintln!("no state.json files found (runtime artifacts), skipping");
            return;
        }
        eprintln!("validated {count} state.json files");
    }
}
