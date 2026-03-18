use serde::{Deserialize, Serialize};
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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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
    /// 从文件加载状态，失败返回 None
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

    /// 写入状态到文件
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
            indicators: serde_json::json!({"ema_fast": 0.118, "ema_slow": 0.115}),
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
        assert_eq!(loaded.indicators["ema_fast"].as_f64(), Some(0.118));
        assert_eq!(loaded.indicators["ema_slow"].as_f64(), Some(0.115));

        let agg = loaded.candle_aggregator.unwrap();
        assert!((agg.open - 0.118).abs() < f64::EPSILON);
        assert!((agg.high - 0.119).abs() < f64::EPSILON);
        assert_eq!(agg.window_start, 1773829500000);

        assert_eq!(loaded.trade_stats.total, 28);
        assert_eq!(loaded.trade_stats.wins, 18);
        assert_eq!(loaded.trade_stats.losses, 10);
        assert!((loaded.trade_stats.realized_pnl - 12.34).abs() < f64::EPSILON);
    }

    #[test]
    fn engine_state_load_missing_file() {
        let result = EngineState::load(std::path::Path::new("/nonexistent/state.json"));
        assert!(result.is_none());
    }

    #[test]
    fn engine_state_load_minimal() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");
        std::fs::write(&path, r#"{"last_updated": "2026-03-18T00:00:00Z"}"#).unwrap();

        let loaded = EngineState::load(&path).unwrap();
        assert_eq!(loaded.last_updated, "2026-03-18T00:00:00Z");
        assert!(loaded.candle_aggregator.is_none());
        assert_eq!(loaded.trade_stats.total, 0);
    }
}
