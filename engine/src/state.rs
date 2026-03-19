pub use clawchat_shared::state::*;

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

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

    // ── StrategyRiskState tests ──

    #[test]
    fn strategy_risk_state_record_loss() {
        let mut s = StrategyRiskState::default();
        s.record_close(-5.0);
        assert_eq!(s.consecutive_losses, 1);
        assert_eq!(s.daily_trades, 1);
        assert!((s.daily_realized_pnl - (-5.0)).abs() < f64::EPSILON);
    }

    #[test]
    fn strategy_risk_state_record_win_resets_consecutive() {
        let mut s = StrategyRiskState::default();
        s.record_close(-5.0);
        s.record_close(-3.0);
        assert_eq!(s.consecutive_losses, 2);
        s.record_close(10.0);
        assert_eq!(s.consecutive_losses, 0);
        assert_eq!(s.daily_trades, 3);
        assert!((s.daily_realized_pnl - 2.0).abs() < f64::EPSILON);
    }

    #[test]
    fn strategy_risk_state_day_reset() {
        let mut s = StrategyRiskState {
            daily_realized_pnl: -10.0,
            daily_trades: 5,
            consecutive_losses: 3,
            day_start_ts: 1000,
        };
        // Same day → no reset
        s.maybe_reset_day(1000);
        assert_eq!(s.daily_trades, 5);
        assert_eq!(s.consecutive_losses, 3);

        // New day → reset daily fields, keep consecutive_losses
        s.maybe_reset_day(2000);
        assert_eq!(s.daily_trades, 0);
        assert!((s.daily_realized_pnl).abs() < f64::EPSILON);
        // consecutive_losses persists across days
        assert_eq!(s.consecutive_losses, 3);
    }

    // ── RiskEngineState tests ──

    #[test]
    fn risk_engine_state_save_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("risk_state.json");

        let mut state = RiskEngineState {
            last_updated: "2026-03-18T12:00:00Z".to_string(),
            strategies: HashMap::new(),
        };
        state.strategies.insert(
            "ntrn-trend-5m".to_string(),
            StrategyRiskState {
                daily_realized_pnl: -8.5,
                daily_trades: 3,
                consecutive_losses: 2,
                day_start_ts: 1773849600000,
            },
        );

        state.save(&path);

        let loaded = RiskEngineState::load(&path);
        assert_eq!(loaded.last_updated, "2026-03-18T12:00:00Z");
        let s = loaded.strategies.get("ntrn-trend-5m").unwrap();
        assert!((s.daily_realized_pnl - (-8.5)).abs() < f64::EPSILON);
        assert_eq!(s.daily_trades, 3);
        assert_eq!(s.consecutive_losses, 2);
        assert_eq!(s.day_start_ts, 1773849600000);
    }

    #[test]
    fn risk_engine_state_load_missing_returns_default() {
        let loaded = RiskEngineState::load(std::path::Path::new("/nonexistent/risk_state.json"));
        assert!(loaded.strategies.is_empty());
    }
}
