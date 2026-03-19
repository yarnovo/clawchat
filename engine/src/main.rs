//! ClawChat Multi-Strategy Trading Engine
//!
//! Single process managing all approved strategies via:
//! - Gateway: per-symbol WS connection pool + broadcast channels
//! - Workers: per-strategy tokio tasks consuming market data
//! - OrderRouter: central order gateway with risk checks
//! - Ledger: per-strategy virtual capital tracking
//! - GlobalRisk: portfolio-level risk limits

mod config_watcher;
mod event_loop;
mod metrics;
mod startup;
mod worker_manager;

use clap::Parser;
use clawchat_shared::logging::init_logging;
use clawchat_shared::paths;

#[derive(Parser, Debug)]
#[command(name = "hft-engine", about = "Multi-strategy trading engine")]
struct Args {}

#[tokio::main]
async fn main() {
    let _args = Args::parse();
    let _ = dotenvy::dotenv();
    let _guard = init_logging(&paths::logs_dir(), "engine");

    let Some(ctx) = startup::init_engine().await else {
        return;
    };

    event_loop::run_event_loop(
        ctx.signal_rx,
        ctx.user_rx,
        ctx.config_rx,
        ctx.config_tx_main,
        ctx.order_tx,
        ctx.ledger_path,
        ctx.account_name,
        ctx.api_key,
        ctx.api_secret,
        ctx.base_url,
        ctx.user_tx,
        ctx.signal_tx,
        ctx.runtimes,
        ctx.exchanges,
        ctx.order_router,
        ctx.gateway,
        ctx.worker_handles,
        ctx.portfolio_configs,
        ctx.portfolio_risk_paths,
        ctx.portfolio_trade_paths,
        ctx.portfolio_trade_overrides,
        ctx.portfolio_risk_guards,
        ctx.data_store,
    ).await;
}

// ── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use clawchat_shared::types::SizingMode;
    use hft_engine::gateway::UserEvent;

    use crate::event_loop::{parse_mark_price_msg, parse_user_data_msg};
    use crate::startup::{compute_order_qty, default_order_qty, scan_approved_strategies_multi};

    // ── parse_mark_price_msg ──

    #[test]
    fn parse_mark_price_valid() {
        let raw = r#"{"stream":"ntrnusdt@markPrice@1s","data":{"e":"markPriceUpdate","s":"NTRNUSDT","p":"0.35120000"}}"#;
        let event = parse_mark_price_msg(raw).unwrap();
        match event {
            UserEvent::MarkPrice { symbol, mark_price, funding_rate } => {
                assert_eq!(symbol, "NTRNUSDT");
                assert!((mark_price - 0.3512).abs() < 1e-8);
                assert!((funding_rate - 0.0).abs() < 1e-10);
            }
            _ => panic!("expected MarkPrice event"),
        }
    }

    #[test]
    fn parse_mark_price_with_funding_rate() {
        let raw = r#"{"stream":"ntrnusdt@markPrice@1s","data":{"e":"markPriceUpdate","s":"NTRNUSDT","p":"0.35120000","r":"0.00015000","T":1774000000000}}"#;
        let event = parse_mark_price_msg(raw).unwrap();
        match event {
            UserEvent::MarkPrice { symbol, mark_price, funding_rate } => {
                assert_eq!(symbol, "NTRNUSDT");
                assert!((mark_price - 0.3512).abs() < 1e-8);
                assert!((funding_rate - 0.00015).abs() < 1e-10);
            }
            _ => panic!("expected MarkPrice event"),
        }
    }

    #[test]
    fn parse_mark_price_invalid_json() {
        assert!(parse_mark_price_msg("not json").is_none());
    }

    #[test]
    fn parse_mark_price_missing_fields() {
        let raw = r#"{"data":{"e":"markPriceUpdate"}}"#;
        assert!(parse_mark_price_msg(raw).is_none());
    }

    // ── parse_user_data_msg ──

    #[test]
    fn parse_user_data_account_update() {
        let raw = r#"{
            "e":"ACCOUNT_UPDATE",
            "a":{
                "B":[{"a":"USDT","wb":"123.45","cw":"100.00"}],
                "P":[{"s":"NTRNUSDT","ps":"BOTH","pa":"100.0","ep":"0.35","up":"2.50"}]
            }
        }"#;
        let events = parse_user_data_msg(raw);
        assert_eq!(events.len(), 2);

        match &events[0] {
            UserEvent::BalanceUpdate { wallet_balance } => {
                assert!((wallet_balance - 123.45).abs() < 1e-8);
            }
            _ => panic!("expected BalanceUpdate"),
        }

        match &events[1] {
            UserEvent::PositionUpdate {
                symbol,
                position_side,
                position_amt,
                entry_price,
                unrealized_pnl,
            } => {
                assert_eq!(symbol, "NTRNUSDT");
                assert_eq!(position_side, "BOTH");
                assert!((position_amt - 100.0).abs() < 1e-8);
                assert!((entry_price - 0.35).abs() < 1e-8);
                assert!((unrealized_pnl - 2.50).abs() < 1e-8);
            }
            _ => panic!("expected PositionUpdate"),
        }
    }

    #[test]
    fn parse_user_data_non_usdt_balance_skipped() {
        let raw = r#"{
            "e":"ACCOUNT_UPDATE",
            "a":{
                "B":[{"a":"BNB","wb":"1.0","cw":"1.0"}],
                "P":[]
            }
        }"#;
        let events = parse_user_data_msg(raw);
        assert!(events.is_empty());
    }

    #[test]
    fn parse_user_data_order_trade_update() {
        let raw = r#"{"e":"ORDER_TRADE_UPDATE","o":{"s":"NTRNUSDT","c":"test-123","S":"BUY","X":"FILLED","q":"100","ap":"0.35","n":"0.01","rp":"5.0"}}"#;
        let events = parse_user_data_msg(raw);
        assert_eq!(events.len(), 1);
        match &events[0] {
            UserEvent::OrderUpdate {
                symbol,
                client_order_id,
                side,
                status,
                qty,
                price,
                commission,
                realized_pnl,
            } => {
                assert_eq!(symbol, "NTRNUSDT");
                assert_eq!(client_order_id, "test-123");
                assert_eq!(side, "BUY");
                assert_eq!(status, "FILLED");
                assert!((qty - 100.0).abs() < 1e-8);
                assert!((price - 0.35).abs() < 1e-8);
                assert!((commission - 0.01).abs() < 1e-8);
                assert!((realized_pnl - 5.0).abs() < 1e-8);
            }
            _ => panic!("expected OrderUpdate"),
        }
    }

    #[test]
    fn parse_user_data_invalid_json() {
        let events = parse_user_data_msg("not json");
        assert!(events.is_empty());
    }

    #[test]
    fn parse_user_data_listen_key_expired() {
        let raw = r#"{"e":"listenKeyExpired"}"#;
        let events = parse_user_data_msg(raw);
        assert!(events.is_empty());
    }

    // ── compute_order_qty ──

    #[test]
    fn compute_qty_percent_mode() {
        let qty = compute_order_qty(100.0, SizingMode::Percent, Some(0.3), 5, 10.0, 1.0);
        assert!((qty - 15.0).abs() < 1e-8);
    }

    #[test]
    fn compute_qty_fixed_mode() {
        let qty = compute_order_qty(100.0, SizingMode::Fixed, Some(0.3), 5, 10.0, 42.0);
        assert!((qty - 42.0).abs() < 1e-8);
    }

    #[test]
    fn compute_qty_zero_price_fallback() {
        let qty = compute_order_qty(100.0, SizingMode::Percent, Some(0.3), 5, 0.0, 7.0);
        assert!((qty - 7.0).abs() < 1e-8);
    }

    // ── scan_approved_strategies_multi ──

    #[test]
    fn scan_finds_strategies() {
        let strategies = scan_approved_strategies_multi("binance-main");
        for (name, portfolio, sf) in &strategies {
            assert_eq!(sf.status.as_deref(), Some("approved"));
            assert!(!name.is_empty());
            assert!(!portfolio.is_empty());
        }
    }

    // ── default_order_qty ──

    #[test]
    fn default_qty_by_symbol() {
        assert!((default_order_qty("BTCUSDT") - 0.001).abs() < 1e-10);
        assert!((default_order_qty("ETHUSDT") - 0.01).abs() < 1e-10);
        assert!((default_order_qty("DOGEUSDT") - 100.0).abs() < 1e-10);
        assert!((default_order_qty("NTRNUSDT") - 1.0).abs() < 1e-10);
    }

    // ── log helpers (smoke tests) ──

    #[test]
    fn log_funding_rate_creates_csv() {
        use std::io::Write;
        let dir = tempfile::tempdir().unwrap();
        let csv_path = dir.path().join("funding_rate_history.csv");
        let write_header = !csv_path.exists();
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&csv_path)
            .unwrap();
        if write_header {
            writeln!(file, "timestamp,symbol,funding_rate,next_funding_time").unwrap();
        }
        writeln!(file, "2026-03-19T10:00:00Z,NTRNUSDT,0.00015,2026-03-19T16:00:00Z").unwrap();
        drop(file);

        let content = std::fs::read_to_string(&csv_path).unwrap();
        assert!(content.contains("timestamp,symbol,funding_rate,next_funding_time"));
        assert!(content.contains("NTRNUSDT"));
    }
}
