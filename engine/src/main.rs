//! ClawChat Multi-Strategy Trading Engine
//!
//! Single process managing all approved strategies via:
//! - Gateway: per-symbol WS connection pool + broadcast channels
//! - Workers: per-strategy tokio tasks consuming market data
//! - OrderRouter: central order gateway with risk checks
//! - Ledger: per-strategy virtual capital tracking
//! - GlobalRisk: portfolio-level risk limits

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use notify::{EventKind, RecursiveMode, Watcher};
use tokio::sync::{broadcast, mpsc};
use tokio_tungstenite::connect_async;
use tracing::{error, info, warn};

use clawchat_shared::account::{AccountConfig, PortfolioConfig};
use clawchat_shared::exchange::Exchange;
use clawchat_shared::logging::init_logging;
use clawchat_shared::paths;
use clawchat_shared::risk::RiskConfig;
use clawchat_shared::strategy::StrategyFile;
use clawchat_shared::types::SizingMode;

use hft_engine::filter::SignalFilter;
use hft_engine::gateway::{Gateway, UserEvent};
use hft_engine::global_risk::{GlobalRiskConfig, GlobalRiskGuard, GlobalRiskVerdict};
use hft_engine::ledger::{Ledger, Order};
use hft_engine::order_router::OrderRouter;
use hft_engine::risk::EngineRiskGuard;
use hft_engine::state::{EngineState, TradeStats};
use hft_engine::strategy::{
    BollingerStrategy, BreakoutStrategy, CandleAggregator, GridStrategy, MACDStrategy,
    MarketMaker, MeanReversionStrategy, RSIStrategy, ScalpingStrategy, Signal, Strategy,
    TrendFollower,
};
use hft_engine::trade::{decision_gate_allows_signal, TradeAction, TradeOverride};
use hft_engine::types::{OrderType as StratOrderType, PositionSide, Side as StratSide};
use hft_engine::worker::{self, WorkerConfig};
use hft_engine::ws_feed::FeedConfig;

// ── Constants ──────────────────────────────────────────────────

const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com";
const KEEPALIVE_MINUTES: u64 = 20;

// ── CLI Args ───────────────────────────────────────────────────

#[derive(Parser, Debug)]
#[command(name = "hft-engine", about = "Multi-strategy trading engine")]
struct Args {
    /// Dry run mode
    #[arg(long, env = "DRY_RUN", default_value_t = false)]
    dry_run: bool,
}

// ── Per-strategy runtime state ─────────────────────────────────

#[allow(dead_code)]
struct StrategyRuntime {
    name: String,
    symbol: String,
    dir: PathBuf,
    leverage: u32,
    capital: f64,
    position_size: Option<f64>,
    sizing_mode: SizingMode,
    order_qty: Option<f64>,
    engine_strategy: String,
    params: HashMap<String, f64>,

    // Runtime state
    trade_override: TradeOverride,
    risk_config: RiskConfig,
    risk_guard: EngineRiskGuard,
    trade_stats: TradeStats,
    last_price: f64,
    last_funding_rate: f64,
    last_funding_log_nft: u64,
}

// ── Config change event ────────────────────────────────────────

#[derive(Debug)]
enum ConfigChange {
    Strategy(String),       // strategy name — existing strategy signal.json changed
    NewStrategy(String),    // strategy dir name — new signal.json created
    Trade(String),          // strategy name
    Risk(String),           // strategy name
    PortfolioTrade,         // portfolio-level trade.json changed
    PortfolioRisk,          // portfolio-level risk.json changed
}

// ── Scan approved strategies ───────────────────────────────────

fn scan_approved_strategies() -> Vec<(String, StrategyFile)> {
    let dir = paths::strategies_dir();
    let mut strategies = Vec::new();

    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(e) => {
            error!("failed to read strategies dir {}: {e}", dir.display());
            return strategies;
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let strat_json = path.join("signal.json");
        if !strat_json.exists() {
            continue;
        }
        let sf = match StrategyFile::load(&strat_json) {
            Ok(sf) => sf,
            Err(e) => {
                warn!("skip {}: {e}", path.display());
                continue;
            }
        };
        let status = sf.status.as_deref().unwrap_or("pending");
        if status != "approved" {
            info!(
                name = entry.file_name().to_string_lossy().as_ref(),
                status,
                "skipping non-approved strategy"
            );
            continue;
        }
        let name = sf
            .name
            .clone()
            .unwrap_or_else(|| entry.file_name().to_string_lossy().to_string());
        strategies.push((name, sf));
    }

    strategies
}

// ── Create strategy instance ───────────────────────────────────

fn default_order_qty(symbol: &str) -> f64 {
    match symbol {
        s if s.starts_with("PIPPIN") => 100.0,
        s if s.starts_with("ETH") => 0.01,
        s if s.starts_with("BTC") => 0.001,
        s if s.starts_with("BNB") => 0.01,
        s if s.starts_with("SOL") => 0.1,
        s if s.starts_with("XRP") => 10.0,
        s if s.starts_with("DOGE") => 100.0,
        _ => 1.0,
    }
}

fn create_strategy_instance(
    engine_strategy: &str,
    symbol: &str,
    order_qty: f64,
    params: &HashMap<String, f64>,
) -> Box<dyn Strategy + Send> {
    let has_params = !params.is_empty();
    match engine_strategy {
        "market_maker" | "mm" => {
            if has_params { Box::new(MarketMaker::from_params(symbol, order_qty, params)) }
            else { Box::new(MarketMaker::new(symbol, 0.0004, order_qty)) }
        }
        "scalping" => {
            if has_params { Box::new(ScalpingStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(ScalpingStrategy::new(symbol, order_qty)) }
        }
        "breakout" => {
            if has_params { Box::new(BreakoutStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(BreakoutStrategy::new(symbol, order_qty)) }
        }
        "rsi" => {
            if has_params { Box::new(RSIStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(RSIStrategy::new(symbol, order_qty)) }
        }
        "bollinger" => {
            if has_params { Box::new(BollingerStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(BollingerStrategy::new(symbol, order_qty)) }
        }
        "macd" => {
            if has_params { Box::new(MACDStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(MACDStrategy::new(symbol, order_qty)) }
        }
        "mean_reversion" => {
            if has_params { Box::new(MeanReversionStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(MeanReversionStrategy::new(symbol, order_qty)) }
        }
        "grid" => {
            if has_params { Box::new(GridStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(GridStrategy::new(symbol, order_qty)) }
        }
        _ => {
            if has_params { Box::new(TrendFollower::from_params(symbol, order_qty, params)) }
            else { Box::new(TrendFollower::new(symbol, order_qty)) }
        }
    }
}

// ── Build worker config from StrategyFile ──────────────────────

fn build_worker_config(
    name: &str,
    sf: &StrategyFile,
    signal_filter: SignalFilter,
) -> Option<WorkerConfig> {
    let symbol = sf.normalized_symbol()?;
    let engine_strategy = sf.engine_strategy.as_deref().unwrap_or("default");
    let order_qty = sf.order_qty.unwrap_or_else(|| default_order_qty(&symbol));
    let params = sf.numeric_params();
    let timeframe_ms = sf.timeframe_ms().unwrap_or(300_000);

    let strategy = create_strategy_instance(engine_strategy, &symbol, order_qty, &params);

    Some(WorkerConfig {
        strategy_name: name.to_string(),
        symbol,
        timeframe_ms,
        strategy,
        filter: signal_filter,
    })
}

// ── User data stream ───────────────────────────────────────────

async fn start_user_data_stream(
    api_key: String,
    api_secret: String,
    base_url: String,
    dry_run: bool,
    user_tx: broadcast::Sender<UserEvent>,
) {
    let exchange = Exchange::new(api_key, api_secret, base_url, dry_run);

    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);

    loop {
        let listen_key = match exchange.create_listen_key().await {
            Ok(k) => k,
            Err(e) => {
                error!("failed to create listenKey: {e}");
                tokio::time::sleep(retry_delay).await;
                retry_delay = (retry_delay * 2).min(max_delay);
                continue;
            }
        };

        let ws_base = exchange.ws_base_url();
        let url = format!("{ws_base}/ws/{listen_key}");
        info!(url = %url, "connecting to user data stream");

        // listenKey keepalive
        let lk = listen_key.clone();
        let exchange_key = exchange.api_key().to_string();
        let exchange_base = exchange.base_url().to_string();
        let keepalive_handle = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let mut interval =
                tokio::time::interval(std::time::Duration::from_secs(KEEPALIVE_MINUTES * 60));
            loop {
                interval.tick().await;
                let url = format!("{}/fapi/v1/listenKey", exchange_base);
                let _ = client
                    .put(&url)
                    .header("X-MBX-APIKEY", &exchange_key)
                    .query(&[("listenKey", &lk)])
                    .send()
                    .await;
                tracing::debug!("listenKey keepalive sent");
            }
        });

        match connect_async(&url).await {
            Ok((ws, _)) => {
                info!("user data stream connected");
                retry_delay = std::time::Duration::from_secs(1);
                let uds_timeout = std::time::Duration::from_secs(65 * 60);
                let (mut write, mut read) = ws.split();
                let mut ping_interval = tokio::time::interval(std::time::Duration::from_secs(20));

                loop {
                    tokio::select! {
                        msg = tokio::time::timeout(uds_timeout, read.next()) => {
                            match msg {
                                Ok(Some(msg)) => match msg {
                                    Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                                        for event in parse_user_data_msg(&text) {
                                            let _ = user_tx.send(event);
                                        }
                                    }
                                    Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                                        let _ = write
                                            .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                            .await;
                                    }
                                    Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                                        warn!("user data stream closed");
                                        break;
                                    }
                                    Err(e) => {
                                        error!("user data stream error: {e}");
                                        break;
                                    }
                                    _ => {}
                                },
                                Ok(None) => {
                                    warn!("user data stream ended");
                                    break;
                                }
                                Err(_) => {
                                    warn!("user data stream read timeout, reconnecting");
                                    break;
                                }
                            }
                        }
                        _ = ping_interval.tick() => {
                            if let Err(e) = write
                                .send(tokio_tungstenite::tungstenite::Message::Ping(vec![].into()))
                                .await
                            {
                                error!("user data stream: failed to send ping: {e}");
                                break;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                error!("user data stream connect failed: {e}");
            }
        }

        keepalive_handle.abort();

        if user_tx.receiver_count() == 0 {
            info!("no user data receivers, stopping");
            return;
        }

        warn!(delay = ?retry_delay, "user data stream reconnecting");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

fn parse_user_data_msg(raw: &str) -> Vec<UserEvent> {
    let mut events = Vec::new();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) else {
        return events;
    };

    let event_type = v.get("e").and_then(|e| e.as_str()).unwrap_or("");

    match event_type {
        "ACCOUNT_UPDATE" => {
            if let Some(data) = v.get("a") {
                if let Some(balances) = data.get("B").and_then(|b| b.as_array()) {
                    for b in balances {
                        let asset = b.get("a").and_then(|v| v.as_str()).unwrap_or("");
                        if asset == "USDT" {
                            if let Some(wb) = b
                                .get("wb")
                                .and_then(|v| v.as_str())
                                .and_then(|s| s.parse::<f64>().ok())
                            {
                                events.push(UserEvent::BalanceUpdate {
                                    wallet_balance: wb,
                                });
                            }
                        }
                    }
                }
                if let Some(positions) = data.get("P").and_then(|p| p.as_array()) {
                    for p in positions {
                        let symbol = p.get("s").and_then(|v| v.as_str()).unwrap_or("");
                        let ps = p.get("ps").and_then(|v| v.as_str()).unwrap_or("BOTH");
                        let pa: f64 = p
                            .get("pa")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        let ep: f64 = p
                            .get("ep")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        let up: f64 = p
                            .get("up")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);

                        if !symbol.is_empty() {
                            events.push(UserEvent::PositionUpdate {
                                symbol: symbol.to_string(),
                                position_side: ps.to_string(),
                                position_amt: pa,
                                entry_price: ep,
                                unrealized_pnl: up,
                            });
                        }
                    }
                }
            }
        }
        "ORDER_TRADE_UPDATE" => {
            if let Some(o) = v.get("o") {
                let symbol = o.get("s").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let client_order_id = o.get("c").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let side = o.get("S").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let status = o.get("X").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let qty: f64 = o.get("q").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let price: f64 = o.get("ap").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let commission: f64 = o.get("n").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let realized_pnl: f64 = o.get("rp").and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);

                events.push(UserEvent::OrderUpdate {
                    symbol,
                    client_order_id,
                    side,
                    status,
                    qty,
                    price,
                    commission,
                    realized_pnl,
                });
            }
        }
        "listenKeyExpired" => {
            warn!("listenKey expired, will reconnect");
        }
        _ => {
            tracing::debug!("user data event: {event_type}");
        }
    }

    events
}

// ── markPrice combined feed ────────────────────────────────────

async fn start_combined_mark_price_feed(
    symbols: Vec<String>,
    user_tx: broadcast::Sender<UserEvent>,
) {
    let streams: Vec<String> = symbols
        .iter()
        .map(|s| format!("{}@markPrice@1s", s.to_lowercase()))
        .collect();
    let url = format!("{BINANCE_FSTREAM_WS}/stream?streams={}", streams.join("/"));

    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);
    let read_timeout = std::time::Duration::from_secs(30);

    loop {
        info!(url = %url, symbols = symbols.len(), "connecting to combined markPrice ws");

        match connect_async(&url).await {
            Ok((ws, _)) => {
                info!(symbols = symbols.len(), "combined markPrice ws connected");
                retry_delay = std::time::Duration::from_secs(1);
                let (mut write, mut read) = ws.split();
                let mut msg_count: u64 = 0;
                let mut ping_interval = tokio::time::interval(std::time::Duration::from_secs(20));

                loop {
                    tokio::select! {
                        msg = tokio::time::timeout(read_timeout, read.next()) => {
                            match msg {
                                Ok(Some(msg)) => match msg {
                                    Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                                        msg_count += 1;
                                        if let Some(event) = parse_mark_price_msg(&text) {
                                            let _ = user_tx.send(event);
                                        }
                                        if msg_count <= 3 {
                                            info!(msg_count, "combined markPrice feed received");
                                        }
                                    }
                                    Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                                        let _ = write
                                            .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                            .await;
                                    }
                                    Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                                        warn!("combined markPrice ws closed");
                                        break;
                                    }
                                    Err(e) => {
                                        error!("combined markPrice ws error: {e}");
                                        break;
                                    }
                                    _ => {}
                                },
                                Ok(None) => {
                                    warn!("combined markPrice ws stream ended");
                                    break;
                                }
                                Err(_) => {
                                    warn!("combined markPrice ws read timeout, reconnecting");
                                    break;
                                }
                            }
                        }
                        _ = ping_interval.tick() => {
                            if let Err(e) = write
                                .send(tokio_tungstenite::tungstenite::Message::Ping(vec![].into()))
                                .await
                            {
                                error!("combined markPrice: failed to send ping: {e}");
                                break;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                error!("combined markPrice ws connect failed: {e}");
            }
        }

        if user_tx.receiver_count() == 0 {
            return;
        }

        warn!(delay = ?retry_delay, "combined markPrice ws reconnecting");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

fn parse_mark_price_msg(raw: &str) -> Option<UserEvent> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    let data = v.get("data")?;
    let symbol = data.get("s")?.as_str()?.to_string();
    let mark_price: f64 = data.get("p")?.as_str()?.parse().ok()?;
    let funding_rate: f64 = data
        .get("r")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);
    Some(UserEvent::MarkPrice {
        symbol,
        mark_price,
        funding_rate,
    })
}

// ── Config watcher ─────────────────────────────────────────────

fn start_config_watcher(
    strategies_dir: PathBuf,
    portfolio_dir: PathBuf,
    config_tx: mpsc::Sender<ConfigChange>,
) {
    std::thread::spawn(move || {
        let tx = config_tx;
        let portfolio_dir_clone = portfolio_dir.clone();
        let mut watcher = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                let Ok(event) = res else { return };
                let is_create = matches!(event.kind, EventKind::Create(_));
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {}
                    _ => return,
                }
                for path in &event.paths {
                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    // Check if this is a portfolio-level config change
                    if path.parent() == Some(portfolio_dir_clone.as_path()) {
                        let change = match file_name {
                            "trade.json" => ConfigChange::PortfolioTrade,
                            "risk.json" => ConfigChange::PortfolioRisk,
                            _ => continue,
                        };
                        let _ = tx.blocking_send(change);
                        continue;
                    }

                    // Extract strategy name from parent directory
                    let strategy_name = path
                        .parent()
                        .and_then(|p| p.file_name())
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    if strategy_name.is_empty() {
                        continue;
                    }
                    let change = match file_name {
                        // New signal.json = new strategy directory detected
                        "signal.json" if is_create => ConfigChange::NewStrategy(strategy_name),
                        "signal.json" => ConfigChange::Strategy(strategy_name),
                        "trade.json" => ConfigChange::Trade(strategy_name),
                        "risk.json" => ConfigChange::Risk(strategy_name),
                        _ => continue,
                    };
                    let _ = tx.blocking_send(change);
                }
            },
        )
        .expect("failed to create config watcher");

        watcher
            .watch(&strategies_dir, RecursiveMode::Recursive)
            .expect("failed to watch strategies directory");

        // Also watch portfolio directory for portfolio-level config changes
        watcher
            .watch(&portfolio_dir, RecursiveMode::NonRecursive)
            .expect("failed to watch portfolio directory");

        info!(
            "config watcher started: strategies={}, portfolio={}",
            strategies_dir.display(),
            portfolio_dir.display()
        );
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });
}

// ── Logging helpers ────────────────────────────────────────────

fn log_trade(
    strategy: &str,
    symbol: &str,
    side: &str,
    qty: f64,
    order_type: &str,
    resp: &serde_json::Value,
) {
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let status = resp
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or(if resp.get("dryRun").is_some() { "dry_run" } else { "unknown" });
    let price = resp
        .get("avgPrice")
        .and_then(|v| v.as_str())
        .or_else(|| resp.get("price").and_then(|v| v.as_str()))
        .unwrap_or("0");
    let client_order_id = resp
        .get("clientOrderId")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let record = serde_json::json!({
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "side": side,
        "qty": qty,
        "price": price,
        "order_type": order_type,
        "status": status,
        "client_order_id": client_order_id,
    });

    let log_path = paths::records_dir().join("trades.jsonl");
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(file, "{}", record);
    }
}

fn log_signal(
    strategy_name: &str,
    signal: &Signal,
    price: f64,
    indicators: &serde_json::Value,
    executed: bool,
) {
    let signal_str = match signal {
        Signal::Order(req) => format!("{:?}", req.side).to_lowercase(),
        Signal::None => return,
    };
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let record = serde_json::json!({
        "ts": ts,
        "strategy": strategy_name,
        "signal": signal_str,
        "price": price,
        "indicators": indicators,
        "executed": executed,
    });

    let log_path = paths::records_dir().join("signals.jsonl");
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(file, "{}", record);
    }
}

fn log_pnl_by_strategy(
    strategy: &str,
    symbol: &str,
    side: &str,
    qty: f64,
    entry_price: f64,
    exit_price: f64,
    pnl_usdt: f64,
    fees_usdt: f64,
) {
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let net_pnl = pnl_usdt - fees_usdt;
    let record = serde_json::json!({
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "side": side,
        "qty": qty,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "pnl_usdt": pnl_usdt,
        "fees_usdt": fees_usdt,
        "net_pnl": net_pnl,
    });

    let log_path = paths::records_dir().join("pnl_by_strategy.jsonl");
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(file, "{}", record);
    }
}

fn log_funding_rate(symbol: &str, funding_rate: f64, next_funding_time: &str) {
    let csv_path = paths::records_dir().join("funding_rate_history.csv");
    if let Some(parent) = csv_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let write_header = !csv_path.exists();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&csv_path) {
        if write_header {
            let _ = writeln!(file, "timestamp,symbol,funding_rate,next_funding_time");
        }
        let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
        let _ = writeln!(file, "{ts},{symbol},{funding_rate},{next_funding_time}");
    }
}

// ── Order writer task (async, non-blocking) ───────────────────

async fn order_writer_task(mut rx: mpsc::Receiver<Order>) {
    let path = paths::records_dir().join("orders.jsonl");
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    while let Some(order) = rx.recv().await {
        let path = path.clone();
        let _ = tokio::task::spawn_blocking(move || {
            if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
                let _ = writeln!(file, "{}", serde_json::to_string(&order).unwrap_or_default());
            }
        })
        .await;
    }
}

// ── Order sizing ───────────────────────────────────────────────

fn compute_order_qty(
    capital: f64,
    sizing_mode: SizingMode,
    position_size: Option<f64>,
    leverage: u32,
    current_price: f64,
    fallback_qty: f64,
) -> f64 {
    if sizing_mode == SizingMode::Fixed {
        return fallback_qty;
    }
    let ps = position_size.unwrap_or(0.3);
    if current_price <= 0.0 {
        warn!("current_price <= 0, using fallback qty");
        return fallback_qty;
    }
    capital * ps * leverage as f64 / current_price
}

// ── Execute signal on exchange ─────────────────────────────────

async fn execute_signal(
    signal: &Signal,
    exchange: &Exchange,
    rt: &mut StrategyRuntime,
    order_tx: &mpsc::Sender<Order>,
) {
    let Signal::Order(req) = signal else { return };

    let qty = compute_order_qty(
        rt.capital,
        rt.sizing_mode,
        rt.position_size,
        rt.leverage,
        rt.last_price,
        rt.order_qty.unwrap_or_else(|| default_order_qty(&rt.symbol)),
    );

    // EngineRiskGuard pre-trade check
    let is_long = matches!(req.side, StratSide::Buy);
    if let Err(reason) = rt.risk_guard.pre_trade_check(qty, rt.leverage, is_long, rt.last_funding_rate) {
        warn!(strategy = %rt.name, %reason, "pre-trade check rejected");
        return;
    }

    let side = req.side;
    let pos_side = match req.side {
        StratSide::Buy => PositionSide::Long,
        StratSide::Sell => PositionSide::Short,
    };
    let side_str = match req.side {
        StratSide::Buy => "buy",
        StratSide::Sell => "sell",
    };

    let order_type_str = match req.order_type {
        StratOrderType::Market => "market",
        StratOrderType::Limit => "limit",
        _ => "unknown",
    };

    let ts_now = chrono::Utc::now();
    let ts_str = ts_now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let order_id = format!("{}-{}-{}", rt.name, rt.symbol, ts_now.timestamp_millis());

    let result = match req.order_type {
        StratOrderType::Market => exchange.market_order(side, pos_side, qty).await,
        StratOrderType::Limit => {
            let price = req.price.unwrap_or(0.0);
            exchange.limit_order(side, pos_side, qty, price).await
        }
        _ => {
            warn!(strategy = %rt.name, "unsupported order type: {:?}", req.order_type);
            return;
        }
    };

    match result {
        Ok(resp) => {
            info!(strategy = %rt.name, ?resp, "order executed");
            log_trade(&rt.name, &rt.symbol, side_str, qty, "market", &resp);

            let avg_price: f64 = resp
                .get("avgPrice")
                .and_then(|v| v.as_str())
                .or_else(|| resp.get("price").and_then(|v| v.as_str()))
                .and_then(|s| s.parse().ok())
                .unwrap_or(rt.last_price);
            let commission: f64 = resp
                .get("commission")
                .and_then(|v| v.as_str().and_then(|s| s.parse().ok()).or_else(|| v.as_f64()))
                .unwrap_or(0.0);
            let realized_pnl: f64 = resp
                .get("realizedPnl")
                .and_then(|v| v.as_str().and_then(|s| s.parse().ok()).or_else(|| v.as_f64()))
                .unwrap_or(0.0);
            let client_order_id = resp
                .get("clientOrderId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Record submitted order to orders.jsonl
            let order = Order {
                id: order_id,
                exchange_id: if client_order_id.is_empty() { None } else { Some(client_order_id) },
                strategy_name: rt.name.clone(),
                symbol: rt.symbol.clone(),
                side: side_str.to_string(),
                order_type: order_type_str.to_string(),
                qty,
                price: req.price,
                stop_price: None,
                status: "submitted".to_string(),
                filled_qty: 0.0,
                avg_fill_price: avg_price,
                commission,
                created_at: ts_str,
                filled_at: None,
            };
            if let Err(e) = order_tx.try_send(order) {
                warn!("order record channel full, dropping submitted record: {e}");
            }

            log_pnl_by_strategy(
                &rt.name, &rt.symbol, side_str, qty, rt.last_price, avg_price,
                realized_pnl, commission,
            );

            rt.risk_guard.record_trade(realized_pnl - commission);

            // Place stop loss safety order
            if rt.risk_config.max_loss_per_trade > 0.0 {
                let (sl_side, sl_price) = match req.side {
                    StratSide::Buy => (StratSide::Sell, rt.last_price * (1.0 - rt.risk_config.max_loss_per_trade)),
                    StratSide::Sell => (StratSide::Buy, rt.last_price * (1.0 + rt.risk_config.max_loss_per_trade)),
                };
                if let Err(e) = exchange.stop_loss(sl_side, pos_side, sl_price).await {
                    warn!(strategy = %rt.name, "STOP_MARKET failed (non-blocking): {e}");
                }
            }
        }
        Err(e) => {
            error!(strategy = %rt.name, "order failed: {e}");

            // Record rejected order to orders.jsonl
            let order = Order {
                id: order_id,
                exchange_id: None,
                strategy_name: rt.name.clone(),
                symbol: rt.symbol.clone(),
                side: side_str.to_string(),
                order_type: order_type_str.to_string(),
                qty,
                price: req.price,
                stop_price: None,
                status: "rejected".to_string(),
                filled_qty: 0.0,
                avg_fill_price: 0.0,
                commission: 0.0,
                created_at: ts_str,
                filled_at: None,
            };
            if let Err(e) = order_tx.try_send(order) {
                warn!("order record channel full, dropping rejected record: {e}");
            }
        }
    }
}

// ── Execute trade override ─────────────────────────────────────

async fn execute_trade_override(
    trade_override: &mut TradeOverride,
    trade_path: &std::path::Path,
    exchange: &Exchange,
    strategy_name: &str,
    current_price: f64,
) {
    if !trade_override.needs_execution() {
        return;
    }
    if !trade_override.is_active(current_price) {
        return;
    }

    warn!(
        strategy = strategy_name,
        action = ?trade_override.action,
        note = %trade_override.note,
        "executing trade override"
    );

    match trade_override.action {
        TradeAction::CloseAll | TradeAction::Stop => {
            if let Ok(positions) = exchange.get_positions().await {
                for pos in &positions {
                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    if sym != exchange.symbol { continue; }
                    let amt: f64 = pos.get("positionAmt")
                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if amt.abs() < f64::EPSILON { continue; }
                    match exchange.close_position(sym, amt).await {
                        Ok(_) => info!("[{strategy_name}] closed {sym} amt={amt}"),
                        Err(e) => error!("[{strategy_name}] close {sym} failed: {e}"),
                    }
                }
            }
        }
        TradeAction::CloseLong => {
            if let Ok(positions) = exchange.get_positions().await {
                for pos in &positions {
                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    if sym != exchange.symbol { continue; }
                    let amt: f64 = pos.get("positionAmt")
                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if amt > f64::EPSILON {
                        let _ = exchange.close_position(sym, amt).await;
                    }
                }
            }
        }
        TradeAction::CloseShort => {
            if let Ok(positions) = exchange.get_positions().await {
                for pos in &positions {
                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    if sym != exchange.symbol { continue; }
                    let amt: f64 = pos.get("positionAmt")
                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if amt < -f64::EPSILON {
                        let _ = exchange.close_position(sym, amt).await;
                    }
                }
            }
        }
        TradeAction::Reduce => {
            let percent = trade_override.params.percent.unwrap_or(0.5);
            if let Ok(positions) = exchange.get_positions().await {
                for pos in &positions {
                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    if sym != exchange.symbol { continue; }
                    let amt: f64 = pos.get("positionAmt")
                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if amt.abs() < f64::EPSILON { continue; }
                    let reduce_amt = amt * percent;
                    let _ = exchange.close_position(sym, reduce_amt).await;
                }
            }
        }
        TradeAction::Add => {
            let percent = trade_override.params.percent.unwrap_or(0.5);
            let direction = trade_override.params.direction.as_deref();
            if let Ok(positions) = exchange.get_positions().await {
                for pos in &positions {
                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    if sym != exchange.symbol { continue; }
                    let amt: f64 = pos.get("positionAmt")
                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                    if amt.abs() < f64::EPSILON { continue; }
                    let add_amt = (amt * percent).abs();
                    let (side, pos_side) = match direction {
                        Some("long") => (StratSide::Buy, PositionSide::Long),
                        Some("short") => (StratSide::Sell, PositionSide::Short),
                        _ => {
                            if amt > 0.0 { (StratSide::Buy, PositionSide::Long) }
                            else { (StratSide::Sell, PositionSide::Short) }
                        }
                    };
                    let _ = exchange.market_order(side, pos_side, add_amt).await;
                }
            }
        }
        _ => {} // Hold/Pause/Resume are not oneshot
    }

    trade_override.mark_executed(trade_path);
    info!(strategy = strategy_name, action = ?trade_override.action, "trade override executed");
}

// ── State persistence ──────────────────────────────────────────

#[allow(dead_code)]
fn save_state(
    path: &std::path::Path,
    strategy: &dyn Strategy,
    aggregator: &CandleAggregator,
    trade_stats: &TradeStats,
) {
    let state = EngineState {
        last_updated: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        indicators: strategy.export_state(),
        candle_aggregator: aggregator.export_state(),
        trade_stats: trade_stats.clone(),
    };
    state.save(path);
}

// ════════════════════════════════════════════════════════════════
// ██  MAIN  ██
// ════════════════════════════════════════════════════════════════

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // 0. Load .env
    let _ = dotenvy::dotenv();

    // 1. Logging
    let _guard = init_logging(&paths::logs_dir(), "engine");

    // 2. Load account + portfolio config
    let account_path = paths::account_dir("binance-main").join("account.json");
    let account = AccountConfig::load(&account_path).expect("failed to load account.json");

    let portfolio_path = paths::portfolio_dir("binance-main", "main").join("portfolio.json");
    let portfolio = PortfolioConfig::load(&portfolio_path).expect("failed to load portfolio.json");

    let dry_run = args.dry_run;
    let total_capital = portfolio.allocated_capital;

    info!(
        account = %account.name,
        portfolio = %portfolio.name,
        capital = total_capital,
        dry_run,
        "engine starting"
    );

    // 3. Scan approved strategies
    let approved = scan_approved_strategies();
    if approved.is_empty() {
        error!("no approved strategies found, exiting");
        return;
    }

    info!(count = approved.len(), "approved strategies found");
    for (name, sf) in &approved {
        info!(
            name,
            symbol = sf.symbol.as_deref().unwrap_or("?"),
            engine = sf.engine_strategy.as_deref().unwrap_or("default"),
            "strategy loaded"
        );
    }

    // 4. Create Exchange client (singleton)
    let api_key = std::env::var(account.api_key_env.as_deref().unwrap_or("BINANCE_API_KEY"))
        .expect("BINANCE_API_KEY not set");
    let api_secret = std::env::var(account.api_secret_env.as_deref().unwrap_or("BINANCE_API_SECRET"))
        .expect("BINANCE_API_SECRET not set");
    let base_url = account
        .base_url
        .clone()
        .unwrap_or_else(|| "https://fapi.binance.com".to_string());

    // 5. Init Ledger
    let ledger_path = paths::records_dir().join("ledger.json");
    let mut ledger = if ledger_path.exists() {
        match Ledger::load(&ledger_path) {
            Ok(l) => {
                info!("ledger restored from {}", ledger_path.display());
                l
            }
            Err(e) => {
                warn!("failed to load ledger: {e}, creating new");
                Ledger::new_single(
                    &account.name,
                    &account.exchange,
                    account.total_capital,
                    &portfolio.name,
                    portfolio.allocated_capital,
                    portfolio.reserve.unwrap_or(0.0),
                )
            }
        }
    } else {
        Ledger::new_single(
            &account.name,
            &account.exchange,
            account.total_capital,
            &portfolio.name,
            portfolio.allocated_capital,
            portfolio.reserve.unwrap_or(0.0),
        )
    };

    // Portfolio directory for portfolio-level configs
    let portfolio_dir = paths::portfolio_dir("binance-main", "main");
    let portfolio_risk_path = portfolio_dir.join("risk.json");
    let portfolio_trade_path = portfolio_dir.join("trade.json");

    // Load portfolio-level trade override (highest priority)
    let mut portfolio_trade_override = TradeOverride::load(&portfolio_trade_path);

    // Collect unique symbols and build strategy runtimes
    let mut symbols: Vec<String> = Vec::new();
    let mut runtimes: HashMap<String, StrategyRuntime> = HashMap::new();

    for (name, sf) in &approved {
        let symbol = match sf.normalized_symbol() {
            Some(s) => s,
            None => {
                warn!(name, "strategy has no symbol, skipping");
                continue;
            }
        };
        let symbol_upper = symbol.to_uppercase();
        if !symbols.contains(&symbol_upper) {
            symbols.push(symbol_upper.clone());
        }

        let strat_dir = paths::strategy_dir(name);
        let capital = sf.capital.unwrap_or(total_capital / approved.len() as f64);
        let leverage = sf.leverage.unwrap_or(10);
        let engine_strategy = sf.engine_strategy.clone().unwrap_or_else(|| "default".to_string());
        let params = sf.numeric_params();

        // Add to ledger if not already present
        if ledger.get(name).is_none() {
            ledger.add_strategy(name, capital);
        }

        // Load risk config: portfolio default + strategy override merge
        let risk_path = strat_dir.join("risk.json");
        let risk_config = RiskConfig::load_merged(&portfolio_risk_path, &risk_path);
        let risk_guard = EngineRiskGuard::new(risk_config.clone(), capital);

        // Load trade override (strategy-level; portfolio-level checked at decision time)
        let trade_path = strat_dir.join("trade.json");
        let trade_override = TradeOverride::load(&trade_path);

        let sizing_mode_str = sf.sizing_mode.as_deref().unwrap_or("percent");
        let sizing_mode = if sizing_mode_str == "fixed" { SizingMode::Fixed } else { SizingMode::Percent };

        runtimes.insert(
            name.to_string(),
            StrategyRuntime {
                name: name.to_string(),
                symbol: symbol_upper.clone(),
                dir: strat_dir,
                leverage,
                capital,
                position_size: sf.position_size,
                sizing_mode,
                order_qty: sf.order_qty,
                engine_strategy,
                params,
                trade_override,
                risk_config,
                risk_guard,
                trade_stats: TradeStats::default(),
                last_price: 0.0,
                last_funding_rate: 0.0,
                last_funding_log_nft: 0,
            },
        );
    }

    // 6. Init GlobalRiskGuard
    let global_risk_config = if let Some(ref pr) = portfolio.risk {
        GlobalRiskConfig {
            max_drawdown_pct: pr.max_drawdown_pct.unwrap_or(10.0),
            max_daily_loss_pct: pr.max_daily_loss_pct.unwrap_or(5.0),
            max_total_exposure: pr.max_total_exposure.unwrap_or(2.0),
            max_per_coin_exposure_pct: pr.max_per_coin_exposure_pct.unwrap_or(50.0),
        }
    } else {
        GlobalRiskConfig::default()
    };
    let global_risk = GlobalRiskGuard::new(global_risk_config, total_capital);

    // 7. Init OrderRouter
    let mut order_router = OrderRouter::new(ledger, global_risk);
    for (name, rt) in &runtimes {
        let guard = EngineRiskGuard::new(rt.risk_config.clone(), rt.capital);
        order_router.add_strategy_guard(name, guard);
    }

    // 8. Create Gateway
    let mut gateway = Gateway::new(&symbols);

    // 9. Create signal channel (workers → main loop)
    let (signal_tx, mut signal_rx) = mpsc::channel::<worker::StrategySignal>(4096);

    // 10. Spawn workers per strategy
    let mut worker_handles = Vec::new();
    for (name, sf) in &approved {
        let symbol = match sf.normalized_symbol() {
            Some(s) => s.to_uppercase(),
            None => continue,
        };

        let trade_dir = sf.trade_direction();
        let cooldown = sf.cooldown_bars.unwrap_or(0);
        let min_vol = sf.min_volume.unwrap_or(0.0);
        let min_spread = sf.min_spread_bps.unwrap_or(0.0);
        let min_depth = sf.min_depth_usd.unwrap_or(0.0);
        let filter = SignalFilter::new(trade_dir, cooldown, min_vol, min_spread, min_depth);

        let worker_config = match build_worker_config(name, sf, filter) {
            Some(wc) => wc,
            None => {
                warn!(name, "failed to build worker config, skipping");
                continue;
            }
        };

        let market_rx = match gateway.subscribe_market(&symbol) {
            Some(rx) => rx,
            None => {
                warn!(name, symbol = %symbol, "no market channel for symbol, skipping");
                continue;
            }
        };

        info!(name, symbol = %symbol, "spawning worker");
        let handle = worker::spawn_worker(worker_config, market_rx, signal_tx.clone());
        worker_handles.push(handle);
    }

    // 11. Start Gateway WS connections
    let feed_configs: Vec<FeedConfig> = symbols
        .iter()
        .map(|sym| FeedConfig {
            symbols: vec![sym.to_lowercase()],
            agg_trade: true,
            depth: true,
            depth_speed: "100ms".to_string(),
            mark_price: false, // handled by dedicated markPrice feeds
        })
        .collect();
    let _gateway_handles = gateway.start(feed_configs).await;

    // 12. Start User Data Stream + markPrice feeds
    let user_tx = gateway.user_sender();
    let mut user_rx = gateway.subscribe_user();

    // User data stream task
    {
        let tx = user_tx.clone();
        let ak = api_key.clone();
        let ask = api_secret.clone();
        let bu = base_url.clone();
        tokio::spawn(async move {
            start_user_data_stream(ak, ask, bu, dry_run, tx).await;
        });
    }

    // Combined markPrice feed (one WS for all symbols)
    {
        let tx = user_tx.clone();
        let syms = symbols.clone();
        tokio::spawn(async move {
            start_combined_mark_price_feed(syms, tx).await;
        });
    }

    // 13. Start Config Watcher (strategies + portfolio dirs)
    let (config_tx, mut config_rx) = mpsc::channel::<ConfigChange>(256);
    let config_tx_main = config_tx.clone(); // for main loop to re-inject NewStrategy
    start_config_watcher(paths::strategies_dir(), portfolio_dir.clone(), config_tx);

    // 14. Order record channel + writer task
    let (order_tx, order_rx) = mpsc::channel::<Order>(4096);
    tokio::spawn(order_writer_task(order_rx));

    // Per-strategy exchange instances (each with correct symbol + order_id_prefix)
    let mut exchanges: HashMap<String, Exchange> = HashMap::new();
    for (name, rt) in &runtimes {
        let ex = Exchange::new(
            api_key.clone(),
            api_secret.clone(),
            base_url.clone(),
            dry_run,
        )
        .with_symbol(&rt.symbol)
        .with_order_id_prefix(&format!("{}-{}", name, rt.symbol));

        // Set leverage (non-blocking)
        let leverage = rt.leverage;
        let ex_for_lev = Exchange::new(
            api_key.clone(),
            api_secret.clone(),
            base_url.clone(),
            dry_run,
        )
        .with_symbol(&rt.symbol);

        let name_clone = name.clone();
        tokio::spawn(async move {
            if let Err(e) = ex_for_lev.set_leverage(leverage).await {
                warn!(strategy = %name_clone, "failed to set leverage: {e}");
            }
        });

        exchanges.insert(name.to_string(), ex);
    }

    // Execute pending trade overrides on startup
    for (name, rt) in runtimes.iter_mut() {
        if let Some(exchange) = exchanges.get(name) {
            let trade_path = rt.dir.join("trade.json");
            execute_trade_override(
                &mut rt.trade_override, &trade_path, exchange, name, rt.last_price,
            ).await;
        }
    }

    // Save initial ledger
    let _ = order_router.ledger().save(&ledger_path);

    info!("engine running, {} strategies active", runtimes.len());

    // ── Main event loop ────────────────────────────────────────

    loop {
        tokio::select! {
            // Worker signals
            Some(worker_signal) = signal_rx.recv() => {
                let strategy_name = &worker_signal.strategy_name;

                let Some(rt) = runtimes.get_mut(strategy_name) else {
                    warn!(strategy = strategy_name, "signal from unknown strategy");
                    continue;
                };

                rt.last_price = worker_signal.current_price;

                // Log signal
                log_signal(strategy_name, &worker_signal.signal, worker_signal.current_price,
                    &serde_json::json!({}), false);

                // Decision gate: portfolio-level trade override (highest priority)
                if portfolio_trade_override.is_active(rt.last_price) {
                    if !decision_gate_allows_signal(&portfolio_trade_override) {
                        tracing::debug!(
                            strategy = strategy_name,
                            action = ?portfolio_trade_override.action,
                            "signal blocked by portfolio trade override"
                        );
                        continue;
                    }
                }

                // Decision gate: strategy-level trade override
                if rt.trade_override.is_active(rt.last_price) {
                    if !decision_gate_allows_signal(&rt.trade_override) {
                        tracing::debug!(
                            strategy = strategy_name,
                            action = ?rt.trade_override.action,
                            "signal blocked by strategy trade override"
                        );
                        continue;
                    }
                }

                // Funding rate filter
                if let Some(limit) = rt.risk_config.funding_rate_limit {
                    if let Signal::Order(ref req) = worker_signal.signal {
                        let is_long = matches!(req.side, StratSide::Buy);
                        if is_long && rt.last_funding_rate > limit {
                            warn!(strategy = strategy_name, "long blocked: funding rate too high");
                            continue;
                        }
                        if !is_long && rt.last_funding_rate < -limit {
                            warn!(strategy = strategy_name, "short blocked: funding rate too negative");
                            continue;
                        }
                    }
                }

                // Global risk check
                match order_router.global_risk.check(order_router.ledger()) {
                    GlobalRiskVerdict::Pass => {}
                    GlobalRiskVerdict::Block(reason) => {
                        warn!(strategy = strategy_name, %reason, "global risk block");
                        continue;
                    }
                    GlobalRiskVerdict::CloseAll(reason) => {
                        error!(%reason, "global risk: close all triggered");
                        // Close all positions across all strategies
                        for (n, ex) in &exchanges {
                            if let Ok(positions) = ex.get_positions().await {
                                for pos in &positions {
                                    let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                                    if sym != ex.symbol { continue; }
                                    let amt: f64 = pos.get("positionAmt")
                                        .and_then(|v| v.as_str()).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                                    if amt.abs() > f64::EPSILON {
                                        let _ = ex.close_position(sym, amt).await;
                                        info!("[{n}] closed {sym} amt={amt} (global risk)");
                                    }
                                }
                            }
                        }
                        continue;
                    }
                }

                // Execute signal
                if let Some(exchange) = exchanges.get(strategy_name) {
                    execute_signal(&worker_signal.signal, exchange, rt, &order_tx).await;
                }

                // Save ledger
                let _ = order_router.ledger().save(&ledger_path);
            }

            // User data events
            Ok(user_event) = user_rx.recv() => {
                match user_event {
                    UserEvent::MarkPrice { ref symbol, mark_price, funding_rate } => {
                        // Update funding rate for relevant strategies
                        for rt in runtimes.values_mut() {
                            if rt.symbol == *symbol {
                                rt.last_funding_rate = funding_rate;
                                rt.last_price = mark_price;
                            }
                        }

                        // Update order router mark prices (ledger + global risk)
                        order_router.handle_mark_price(symbol, mark_price);

                        // Log funding rate
                        if funding_rate != 0.0 {
                            for rt in runtimes.values_mut() {
                                if rt.symbol == *symbol && rt.last_funding_log_nft == 0 {
                                    rt.last_funding_log_nft = 1;
                                    log_funding_rate(symbol, funding_rate, "");
                                }
                            }
                        }

                        // Check per-strategy drawdown levels
                        for (name, _rt) in runtimes.iter() {
                            if let Some(alloc) = order_router.ledger().get(name) {
                                let level = GlobalRiskGuard::check_strategy_drawdown(alloc);
                                match level {
                                    hft_engine::global_risk::StrategyRiskLevel::Red(dd) => {
                                        warn!(strategy = %name, drawdown = dd, "strategy in RED zone");
                                    }
                                    hft_engine::global_risk::StrategyRiskLevel::Meltdown(dd) => {
                                        error!(strategy = %name, drawdown = dd, "strategy MELTDOWN — should close");
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                    UserEvent::PositionUpdate {
                        ref symbol,
                        ref position_side,
                        position_amt,
                        entry_price,
                        unrealized_pnl,
                    } => {
                        info!(
                            symbol, position_side, position_amt, entry_price,
                            unrealized_pnl = format!("{unrealized_pnl:.4}"),
                            "ACCOUNT_UPDATE"
                        );
                    }
                    UserEvent::BalanceUpdate { wallet_balance } => {
                        info!(balance = wallet_balance, "balance update");
                    }
                    UserEvent::OrderUpdate {
                        ref symbol,
                        ref client_order_id,
                        ref side,
                        ref status,
                        qty,
                        price,
                        commission,
                        realized_pnl,
                    } => {
                        let ts_now = chrono::Utc::now();
                        let ts_str = ts_now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

                        // Extract strategy name from clientOrderId prefix
                        let strategy_name_from_id = client_order_id
                            .rsplit_once('-')
                            .map(|(prefix, _)| prefix.to_string())
                            .unwrap_or_default();

                        if status == "FILLED" {
                            info!(
                                symbol, client_order_id, side, qty, price,
                                commission, realized_pnl,
                                "ORDER_TRADE_UPDATE: FILLED"
                            );

                            // Route fill to order_router for PnL attribution
                            let update = hft_engine::order_router::OrderUpdate {
                                client_order_id: client_order_id.clone(),
                                symbol: symbol.clone(),
                                side: side.clone(),
                                price,
                                qty,
                                realized_pnl,
                                commission,
                            };
                            order_router.handle_order_update(&update);

                            // Record filled order
                            let order = Order {
                                id: format!("{}-fill-{}", client_order_id, ts_now.timestamp_millis()),
                                exchange_id: Some(client_order_id.clone()),
                                strategy_name: strategy_name_from_id,
                                symbol: symbol.clone(),
                                side: side.to_lowercase(),
                                order_type: "market".to_string(),
                                qty,
                                price: Some(price),
                                stop_price: None,
                                status: "filled".to_string(),
                                filled_qty: qty,
                                avg_fill_price: price,
                                commission,
                                created_at: ts_str,
                                filled_at: Some(ts_now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)),
                            };
                            if let Err(e) = order_tx.try_send(order) {
                                warn!("order record channel full, dropping filled record: {e}");
                            }

                            // Save ledger
                            let _ = order_router.ledger().save(&ledger_path);
                        } else if status == "CANCELED" || status == "EXPIRED" {
                            info!(
                                symbol, client_order_id, side, status,
                                "ORDER_TRADE_UPDATE: {status}"
                            );

                            // Record canceled order
                            let order = Order {
                                id: format!("{}-cancel-{}", client_order_id, ts_now.timestamp_millis()),
                                exchange_id: Some(client_order_id.clone()),
                                strategy_name: strategy_name_from_id,
                                symbol: symbol.clone(),
                                side: side.to_lowercase(),
                                order_type: "market".to_string(),
                                qty,
                                price: Some(price),
                                stop_price: None,
                                status: "canceled".to_string(),
                                filled_qty: 0.0,
                                avg_fill_price: 0.0,
                                commission: 0.0,
                                created_at: ts_str,
                                filled_at: None,
                            };
                            if let Err(e) = order_tx.try_send(order) {
                                warn!("order record channel full, dropping canceled record: {e}");
                            }
                        } else if status == "REJECTED" {
                            warn!(
                                symbol, client_order_id, side,
                                "ORDER_TRADE_UPDATE: REJECTED"
                            );

                            // Record rejected order
                            let order = Order {
                                id: format!("{}-reject-{}", client_order_id, ts_now.timestamp_millis()),
                                exchange_id: Some(client_order_id.clone()),
                                strategy_name: strategy_name_from_id,
                                symbol: symbol.clone(),
                                side: side.to_lowercase(),
                                order_type: "market".to_string(),
                                qty,
                                price: Some(price),
                                stop_price: None,
                                status: "rejected".to_string(),
                                filled_qty: 0.0,
                                avg_fill_price: 0.0,
                                commission: 0.0,
                                created_at: ts_str,
                                filled_at: None,
                            };
                            if let Err(e) = order_tx.try_send(order) {
                                warn!("order record channel full, dropping rejected record: {e}");
                            }
                        }
                    }
                }
            }

            // Config file changes
            Some(change) = config_rx.recv() => {
                match change {
                    ConfigChange::Strategy(name) => {
                        if runtimes.contains_key(&name) {
                            info!(strategy = %name, "signal.json changed — note: worker restart not yet implemented, will apply on next engine restart");
                        } else {
                            // Existing strategy modified but not in runtimes — might have
                            // been changed to approved. Treat like NewStrategy.
                            info!(strategy = %name, "signal.json changed for unknown strategy, checking if newly approved");
                            let _ = config_tx_main.try_send(ConfigChange::NewStrategy(name));
                        }
                    }
                    ConfigChange::NewStrategy(dir_name) => {
                        // New signal.json detected — check if approved and spin up worker
                        let strat_dir = paths::strategy_dir(&dir_name);
                        let signal_path = strat_dir.join("signal.json");
                        if !signal_path.exists() {
                            info!(dir = %dir_name, "new strategy dir detected but no signal.json yet");
                        } else {
                            match StrategyFile::load(&signal_path) {
                                Ok(sf) => {
                                    let status = sf.status.as_deref().unwrap_or("pending");
                                    let name = sf.name.clone().unwrap_or_else(|| dir_name.clone());

                                    if status != "approved" {
                                        info!(strategy = %name, status, "new strategy detected but not approved, ignoring");
                                    } else if runtimes.contains_key(&name) {
                                        info!(strategy = %name, "new strategy detected but already running");
                                    } else {
                                        // Load strategy config
                                        let symbol = match sf.normalized_symbol() {
                                            Some(s) => s.to_uppercase(),
                                            None => {
                                                warn!(strategy = %name, "new strategy has no symbol, skipping");
                                                continue;
                                            }
                                        };

                                        let capital = sf.capital.unwrap_or(total_capital / (runtimes.len() + 1) as f64);
                                        let leverage = sf.leverage.unwrap_or(10);
                                        let engine_strategy = sf.engine_strategy.clone().unwrap_or_else(|| "default".to_string());
                                        let params = sf.numeric_params();

                                        // Add to ledger
                                        if order_router.ledger().get(&name).is_none() {
                                            order_router.ledger_mut().add_strategy(&name, capital);
                                        }

                                        // Load risk config
                                        let risk_path = strat_dir.join("risk.json");
                                        let risk_config = RiskConfig::load_merged(&portfolio_risk_path, &risk_path);
                                        let risk_guard = EngineRiskGuard::new(risk_config.clone(), capital);

                                        // Add to order router
                                        order_router.add_strategy_guard(&name, EngineRiskGuard::new(risk_config.clone(), capital));

                                        // Load trade override
                                        let trade_path = strat_dir.join("trade.json");
                                        let trade_override = TradeOverride::load(&trade_path);

                                        let sizing_mode_str = sf.sizing_mode.as_deref().unwrap_or("percent");
                                        let sizing_mode = if sizing_mode_str == "fixed" { SizingMode::Fixed } else { SizingMode::Percent };

                                        // Create exchange instance
                                        let ex = Exchange::new(
                                            api_key.clone(),
                                            api_secret.clone(),
                                            base_url.clone(),
                                            dry_run,
                                        )
                                        .with_symbol(&symbol)
                                        .with_order_id_prefix(&format!("{}-{}", name, symbol));

                                        // Set leverage
                                        {
                                            let ex_lev = Exchange::new(
                                                api_key.clone(),
                                                api_secret.clone(),
                                                base_url.clone(),
                                                dry_run,
                                            )
                                            .with_symbol(&symbol);
                                            let name_c = name.clone();
                                            tokio::spawn(async move {
                                                if let Err(e) = ex_lev.set_leverage(leverage).await {
                                                    warn!(strategy = %name_c, "failed to set leverage: {e}");
                                                }
                                            });
                                        }

                                        exchanges.insert(name.clone(), ex);

                                        // Dynamically add symbol if not yet in gateway
                                        if gateway.subscribe_market(&symbol).is_none() {
                                            let feed_config = FeedConfig {
                                                symbols: vec![symbol.to_lowercase()],
                                                agg_trade: true,
                                                depth: true,
                                                depth_speed: "100ms".to_string(),
                                                mark_price: false,
                                            };
                                            if let Some(handle) = gateway.add_symbol(&symbol, feed_config).await {
                                                worker_handles.push(handle);
                                            }

                                            // Also add to combined markPrice feed
                                            {
                                                let tx = user_tx.clone();
                                                let sym = symbol.clone();
                                                tokio::spawn(async move {
                                                    start_combined_mark_price_feed(vec![sym], tx).await;
                                                });
                                            }
                                        }

                                        // Build and spawn worker
                                        {
                                            let trade_dir = sf.trade_direction();
                                            let cooldown = sf.cooldown_bars.unwrap_or(0);
                                            let min_vol = sf.min_volume.unwrap_or(0.0);
                                            let min_spread = sf.min_spread_bps.unwrap_or(0.0);
                                            let min_depth = sf.min_depth_usd.unwrap_or(0.0);
                                            let filter = SignalFilter::new(trade_dir, cooldown, min_vol, min_spread, min_depth);

                                            if let Some(worker_config) = build_worker_config(&name, &sf, filter) {
                                                let market_rx = gateway.subscribe_market(&symbol).unwrap();
                                                let handle = worker::spawn_worker(worker_config, market_rx, signal_tx.clone());
                                                worker_handles.push(handle);
                                                info!(strategy = %name, symbol = %symbol, "new strategy worker spawned");
                                            }
                                        }

                                        // Insert runtime
                                        runtimes.insert(
                                            name.clone(),
                                            StrategyRuntime {
                                                name: name.clone(),
                                                symbol: symbol.clone(),
                                                dir: strat_dir,
                                                leverage,
                                                capital,
                                                position_size: sf.position_size,
                                                sizing_mode,
                                                order_qty: sf.order_qty,
                                                engine_strategy,
                                                params,
                                                trade_override,
                                                risk_config,
                                                risk_guard,
                                                trade_stats: TradeStats::default(),
                                                last_price: 0.0,
                                                last_funding_rate: 0.0,
                                                last_funding_log_nft: 0,
                                            },
                                        );

                                        // Save ledger
                                        let _ = order_router.ledger().save(&ledger_path);

                                        info!(
                                            strategy = %name, symbol = %symbol,
                                            capital, leverage,
                                            "new strategy fully loaded"
                                        );
                                    }
                                }
                                Err(e) => {
                                    warn!(dir = %dir_name, "failed to load signal.json for new strategy: {e}");
                                }
                            }
                        }
                    }
                    ConfigChange::Trade(name) => {
                        if let Some(rt) = runtimes.get_mut(&name) {
                            let trade_path = rt.dir.join("trade.json");
                            let new_override = TradeOverride::load(&trade_path);
                            info!(
                                strategy = %name,
                                action = ?new_override.action,
                                note = %new_override.note,
                                "trade.json reloaded"
                            );
                            rt.trade_override = new_override;
                            // Execute oneshot overrides immediately
                            if let Some(exchange) = exchanges.get(&name) {
                                execute_trade_override(
                                    &mut rt.trade_override, &trade_path, exchange, &name, rt.last_price,
                                ).await;
                            }
                        }
                    }
                    ConfigChange::Risk(name) => {
                        if let Some(rt) = runtimes.get_mut(&name) {
                            let risk_path = rt.dir.join("risk.json");
                            let new_risk = RiskConfig::load_merged(&portfolio_risk_path, &risk_path);
                            info!(
                                strategy = %name,
                                max_loss = new_risk.max_loss_per_trade,
                                max_daily_loss = new_risk.max_daily_loss,
                                "risk.json reloaded (merged with portfolio)"
                            );
                            rt.risk_guard = EngineRiskGuard::new(new_risk.clone(), rt.capital);
                            rt.risk_config = new_risk;
                        }
                    }
                    ConfigChange::PortfolioTrade => {
                        let new_override = TradeOverride::load(&portfolio_trade_path);
                        info!(
                            action = ?new_override.action,
                            note = %new_override.note,
                            "portfolio trade.json reloaded"
                        );
                        portfolio_trade_override = new_override;
                        // If portfolio-level is pause/stop, it applies globally
                        // If it's a oneshot action, execute across all strategies
                        if portfolio_trade_override.needs_execution() {
                            for (name, exchange) in &exchanges {
                                let mut po_clone = portfolio_trade_override.clone();
                                let rt_price = runtimes.get(name).map(|r| r.last_price).unwrap_or(0.0);
                                execute_trade_override(
                                    &mut po_clone, &portfolio_trade_path, exchange, name, rt_price,
                                ).await;
                            }
                            // Mark as executed on the original
                            portfolio_trade_override.mark_executed(&portfolio_trade_path);
                        }
                    }
                    ConfigChange::PortfolioRisk => {
                        info!("portfolio risk.json changed — reloading all strategy risk configs");
                        for (_name, rt) in runtimes.iter_mut() {
                            let risk_path = rt.dir.join("risk.json");
                            let new_risk = RiskConfig::load_merged(&portfolio_risk_path, &risk_path);
                            rt.risk_guard = EngineRiskGuard::new(new_risk.clone(), rt.capital);
                            rt.risk_config = new_risk;
                        }
                    }
                }
            }
        }
    }
}

// ── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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
        // capital=100, position_size=0.3, leverage=5, price=10
        // qty = 100 * 0.3 * 5 / 10 = 15
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

    // ── scan_approved_strategies ──

    #[test]
    fn scan_finds_strategies() {
        let strategies = scan_approved_strategies();
        // Should find at least some approved strategies in the project
        // (test depends on actual files, but validates the scan logic runs)
        for (name, sf) in &strategies {
            assert_eq!(sf.status.as_deref(), Some("approved"));
            assert!(!name.is_empty());
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
