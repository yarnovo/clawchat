//! Main event loop: tokio::select! loop, user data stream, mark price feed, signal execution.

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, mpsc};
use tokio::task::JoinHandle;
use tokio_tungstenite::connect_async;
use tracing::{error, info, warn};

use clawchat_shared::account::PortfolioConfig;
use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::Exchange;
use clawchat_shared::paths;
use clawchat_shared::risk::RiskConfig;
use clawchat_shared::strategy::StrategyFile;

use super::config_watcher::ConfigChange;
use super::startup::{StrategyRuntime, compute_order_qty, default_order_qty};

use hft_engine::gateway::{Gateway, UserEvent};
use hft_engine::global_risk::{GlobalRiskConfig, GlobalRiskGuard, GlobalRiskVerdict, StrategyRiskLevel};
use hft_engine::ledger::Order;
use hft_engine::order_router::{OrderRouter, OrderUpdate};
use hft_engine::risk::EngineRiskGuard;
use hft_engine::strategy::Signal;
use hft_engine::trade::{decision_gate_allows_signal, TradeAction, TradeOverride};
use hft_engine::types::{OrderType as StratOrderType, PositionSide, Side as StratSide};
use hft_engine::worker;

const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com";
const KEEPALIVE_MINUTES: u64 = 20;

// ── User data stream ───────────────────────────────────────────

pub async fn start_user_data_stream(
    api_key: String,
    api_secret: String,
    base_url: String,
    user_tx: broadcast::Sender<UserEvent>,
) {
    let exchange = Exchange::new(api_key, api_secret, base_url, false);

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

pub fn parse_user_data_msg(raw: &str) -> Vec<UserEvent> {
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

pub async fn start_combined_mark_price_feed(
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

pub fn parse_mark_price_msg(raw: &str) -> Option<UserEvent> {
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

// ── Logging helpers ────────────────────────────────────────────

pub fn log_trade(
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

pub fn log_signal(
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

pub fn log_pnl_by_strategy(
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

pub fn log_funding_rate(symbol: &str, funding_rate: f64, next_funding_time: &str) {
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

pub async fn order_writer_task(mut rx: mpsc::Receiver<Order>) {
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

// ── Execute signal on exchange ─────────────────────────────────

pub async fn execute_signal(
    signal: &Signal,
    exchange: &Exchange,
    rt: &mut StrategyRuntime,
    order_tx: &mpsc::Sender<Order>,
) {
    let Signal::Order(req) = signal else { return };

    // Per-strategy dry-run: log signal, skip order
    if rt.dry_run {
        let side_str = match req.side {
            StratSide::Buy => "buy",
            StratSide::Sell => "sell",
        };
        info!(
            strategy = %rt.name,
            symbol = %rt.symbol,
            side = side_str,
            price = rt.last_price,
            mode = "dry-run",
            "signal logged (dry-run, no order placed)"
        );
        log_signal(&rt.name, signal, rt.last_price, &serde_json::json!({"dry_run": true}), false);
        return;
    }

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

pub async fn execute_trade_override(
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

// ── Main event loop ────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn run_event_loop(
    mut signal_rx: mpsc::Receiver<worker::StrategySignal>,
    mut user_rx: broadcast::Receiver<UserEvent>,
    mut config_rx: mpsc::Receiver<ConfigChange>,
    config_tx_main: mpsc::Sender<ConfigChange>,
    order_tx: mpsc::Sender<Order>,
    ledger_path: PathBuf,
    account_name: String,
    api_key: String,
    api_secret: String,
    base_url: String,
    user_tx: broadcast::Sender<UserEvent>,
    signal_tx: mpsc::Sender<worker::StrategySignal>,
    mut runtimes: HashMap<String, StrategyRuntime>,
    mut exchanges: HashMap<String, Exchange>,
    mut order_router: OrderRouter,
    mut gateway: Gateway,
    mut worker_handles: Vec<JoinHandle<()>>,
    mut portfolio_configs: HashMap<String, PortfolioConfig>,
    mut portfolio_risk_paths: HashMap<String, PathBuf>,
    mut portfolio_trade_paths: HashMap<String, PathBuf>,
    mut portfolio_trade_overrides: HashMap<String, TradeOverride>,
    mut portfolio_risk_guards: HashMap<String, GlobalRiskGuard>,
    data_store: DataStore,
) {
    // Setup graceful shutdown signal handler (SIGTERM + SIGINT)
    let mut sigterm = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        .expect("failed to register SIGTERM handler");
    let mut sigint = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::interrupt())
        .expect("failed to register SIGINT handler");

    info!("engine running, {} strategies active", runtimes.len());

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
                if let Some(pto) = portfolio_trade_overrides.get(&rt.portfolio) {
                    if pto.is_active(rt.last_price) {
                        if !decision_gate_allows_signal(pto) {
                            tracing::debug!(
                                strategy = strategy_name,
                                portfolio = %rt.portfolio,
                                action = ?pto.action,
                                "signal blocked by portfolio trade override"
                            );
                            continue;
                        }
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

                // Global risk check (with alert emission)
                let records_dir = clawchat_shared::paths::records_dir();
                match order_router.global_risk.check_and_alert(order_router.ledger(), &records_dir) {
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
                        let records_dir = clawchat_shared::paths::records_dir();
                        for (name, _rt) in runtimes.iter() {
                            if let Some(alloc) = order_router.ledger().get(name) {
                                let level = GlobalRiskGuard::check_strategy_drawdown(alloc);
                                match level {
                                    StrategyRiskLevel::Red(dd) => {
                                        warn!(strategy = %name, drawdown = dd, "strategy in RED zone");
                                        clawchat_shared::alerts::emit_alert(
                                            &records_dir,
                                            &clawchat_shared::alerts::AlertEvent::new(
                                                clawchat_shared::alerts::AlertLevel::Yellow,
                                                "global_risk",
                                                Some(name.to_string()),
                                                format!("策略回撤 RED: {dd:.1}% >= 25%"),
                                            ),
                                        );
                                    }
                                    StrategyRiskLevel::Meltdown(dd) => {
                                        error!(strategy = %name, drawdown = dd, "strategy MELTDOWN — should close");
                                        clawchat_shared::alerts::emit_alert(
                                            &records_dir,
                                            &clawchat_shared::alerts::AlertEvent::new(
                                                clawchat_shared::alerts::AlertLevel::Red,
                                                "global_risk",
                                                Some(name.to_string()),
                                                format!("策略熔断 MELTDOWN: {dd:.1}% >= 35%"),
                                            ),
                                        );
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
                            let update = OrderUpdate {
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
                        if let Some(rt) = runtimes.get_mut(&name) {
                            // Hot-reload mode from signal.json
                            let signal_path = rt.dir.join("signal.json");
                            if let Ok(sf) = StrategyFile::load(&signal_path) {
                                let new_dry_run = sf.is_dry_run();
                                if new_dry_run != rt.dry_run {
                                    let old_mode = if rt.dry_run { "dry-run" } else { "live" };
                                    let new_mode = if new_dry_run { "dry-run" } else { "live" };
                                    info!(
                                        strategy = %name,
                                        old_mode, new_mode,
                                        "strategy mode changed (hot-reload)"
                                    );
                                    rt.dry_run = new_dry_run;
                                }
                            }
                            info!(strategy = %name, "signal.json reloaded");
                        } else {
                            // Existing strategy modified but not in runtimes — might have
                            // been changed to approved. Treat like NewStrategy.
                            info!(strategy = %name, "signal.json changed for unknown strategy, checking if newly approved");
                            let _ = config_tx_main.try_send(ConfigChange::NewStrategy(name));
                        }
                    }
                    ConfigChange::NewStrategy(dir_name) => {
                        // New signal.json detected — search all portfolios to find it
                        let mut found = None;
                        for pname in portfolio_configs.keys() {
                            let strat_dir = paths::strategy_dir_in(&account_name, pname, &dir_name);
                            let signal_path = strat_dir.join("signal.json");
                            if signal_path.exists() {
                                found = Some((pname.clone(), strat_dir));
                                break;
                            }
                        }
                        let Some((found_portfolio, _strat_dir)) = found else {
                            info!(dir = %dir_name, "new strategy dir detected but no signal.json found in any portfolio");
                            continue;
                        };
                        let strat_dir = paths::strategy_dir_in(&account_name, &found_portfolio, &dir_name);
                        let signal_path = strat_dir.join("signal.json");
                        match StrategyFile::load(&signal_path) {
                            Ok(sf) => {
                                let status = sf.status.as_deref().unwrap_or("pending");
                                let name = sf.name.clone().unwrap_or_else(|| dir_name.clone());

                                if status != "approved" {
                                    info!(strategy = %name, status, "new strategy detected but not approved, ignoring");
                                } else {
                                    super::worker_manager::hot_load_new_strategy(
                                        &dir_name,
                                        &account_name,
                                        &found_portfolio,
                                        &sf,
                                        &api_key,
                                        &api_secret,
                                        &base_url,
                                        &portfolio_risk_paths,
                                        &mut runtimes,
                                        &mut exchanges,
                                        &mut gateway,
                                        signal_tx.clone(),
                                        user_tx.clone(),
                                        &mut order_router,
                                        &mut worker_handles,
                                        &data_store,
                                    ).await;

                                    // Save ledger
                                    let _ = order_router.ledger().save(&ledger_path);
                                }
                            }
                            Err(e) => {
                                warn!(dir = %dir_name, "failed to load signal.json for new strategy: {e}");
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
                            let p_risk_path = portfolio_risk_paths.get(&rt.portfolio).cloned()
                                .unwrap_or_else(|| rt.dir.join("risk.json"));
                            let risk_path = rt.dir.join("risk.json");
                            let new_risk = RiskConfig::load_merged(&p_risk_path, &risk_path);
                            info!(
                                strategy = %name,
                                portfolio = %rt.portfolio,
                                max_loss = new_risk.max_loss_per_trade,
                                max_daily_loss = new_risk.max_daily_loss,
                                "risk.json reloaded (merged with portfolio)"
                            );
                            rt.risk_guard = EngineRiskGuard::new(new_risk.clone(), rt.capital);
                            rt.risk_config = new_risk;
                        }
                    }
                    ConfigChange::PortfolioTrade => {
                        // Reload all portfolio trade overrides
                        for (pname, trade_path) in &portfolio_trade_paths {
                            let new_override = TradeOverride::load(trade_path);
                            info!(
                                portfolio = %pname,
                                action = ?new_override.action,
                                note = %new_override.note,
                                "portfolio trade.json reloaded"
                            );
                            portfolio_trade_overrides.insert(pname.clone(), new_override);
                        }
                        // Execute oneshot overrides for affected portfolios
                        for (pname, pto) in portfolio_trade_overrides.iter_mut() {
                            if pto.needs_execution() {
                                let trade_path = portfolio_trade_paths.get(pname).unwrap();
                                for (name, exchange) in &exchanges {
                                    if runtimes.get(name).map(|r| &r.portfolio) == Some(pname) {
                                        let mut po_clone = pto.clone();
                                        let rt_price = runtimes.get(name).map(|r| r.last_price).unwrap_or(0.0);
                                        execute_trade_override(
                                            &mut po_clone, trade_path, exchange, name, rt_price,
                                        ).await;
                                    }
                                }
                                pto.mark_executed(trade_path);
                            }
                        }
                    }
                    ConfigChange::PortfolioRisk => {
                        info!("portfolio risk.json changed — reloading all strategy risk configs");
                        for (_name, rt) in runtimes.iter_mut() {
                            let p_risk_path = portfolio_risk_paths.get(&rt.portfolio).cloned()
                                .unwrap_or_else(|| rt.dir.join("risk.json"));
                            let risk_path = rt.dir.join("risk.json");
                            let new_risk = RiskConfig::load_merged(&p_risk_path, &risk_path);
                            rt.risk_guard = EngineRiskGuard::new(new_risk.clone(), rt.capital);
                            rt.risk_config = new_risk;
                        }
                        // Also reload per-portfolio GlobalRiskGuards
                        for (pname, pc) in &portfolio_configs {
                            let grc = if let Some(ref pr) = pc.risk {
                                GlobalRiskConfig {
                                    max_drawdown_pct: pr.max_drawdown_pct.unwrap_or(10.0),
                                    max_daily_loss_pct: pr.max_daily_loss_pct.unwrap_or(5.0),
                                    max_total_exposure: pr.max_total_exposure.unwrap_or(2.0),
                                    max_per_coin_exposure_pct: pr.max_per_coin_exposure_pct.unwrap_or(50.0),
                                }
                            } else {
                                GlobalRiskConfig::default()
                            };
                            portfolio_risk_guards.insert(pname.clone(), GlobalRiskGuard::new(grc, pc.allocated_capital));
                        }
                    }
                    ConfigChange::NewPortfolio(pname) => {
                        // New portfolio directory detected — register it
                        let pdir = paths::portfolio_dir(&account_name, &pname);
                        let ppath = pdir.join("portfolio.json");
                        if !ppath.exists() {
                            info!(portfolio = %pname, "new portfolio dir detected but no portfolio.json yet");
                        } else {
                            match PortfolioConfig::load(&ppath) {
                                Ok(pc) => {
                                    if portfolio_configs.contains_key(&pname) {
                                        info!(portfolio = %pname, "portfolio already registered");
                                    } else {
                                        info!(
                                            portfolio = %pname,
                                            capital = pc.allocated_capital,
                                            "new portfolio registered"
                                        );

                                        // Register risk/trade paths
                                        portfolio_risk_paths.insert(pname.clone(), pdir.join("risk.json"));
                                        portfolio_trade_paths.insert(pname.clone(), pdir.join("trade.json"));
                                        portfolio_trade_overrides.insert(
                                            pname.clone(),
                                            TradeOverride::load(&pdir.join("trade.json")),
                                        );

                                        // Create GlobalRiskGuard for this portfolio
                                        let grc = if let Some(ref pr) = pc.risk {
                                            GlobalRiskConfig {
                                                max_drawdown_pct: pr.max_drawdown_pct.unwrap_or(10.0),
                                                max_daily_loss_pct: pr.max_daily_loss_pct.unwrap_or(5.0),
                                                max_total_exposure: pr.max_total_exposure.unwrap_or(2.0),
                                                max_per_coin_exposure_pct: pr.max_per_coin_exposure_pct.unwrap_or(50.0),
                                            }
                                        } else {
                                            GlobalRiskConfig::default()
                                        };
                                        portfolio_risk_guards.insert(
                                            pname.clone(),
                                            GlobalRiskGuard::new(grc, pc.allocated_capital),
                                        );

                                        // Add portfolio to ledger
                                        order_router.ledger_mut().add_portfolio(
                                            &account_name,
                                            &pname,
                                            pc.allocated_capital,
                                            pc.reserve.unwrap_or(0.0),
                                        );

                                        // Save updated portfolio config
                                        portfolio_configs.insert(pname.clone(), pc);

                                        // Save ledger
                                        let _ = order_router.ledger().save(&ledger_path);

                                        info!(portfolio = %pname, "portfolio fully registered, watching for strategies");
                                    }
                                }
                                Err(e) => {
                                    warn!(portfolio = %pname, "failed to load portfolio.json: {e}");
                                }
                            }
                        }
                    }
                }
            }

            // Graceful shutdown on SIGTERM
            _ = sigterm.recv() => {
                warn!("received SIGTERM, initiating graceful shutdown");
                break;
            }

            // Graceful shutdown on SIGINT
            _ = sigint.recv() => {
                warn!("received SIGINT, initiating graceful shutdown");
                break;
            }
        }
    }

    // ── Graceful shutdown sequence ─────────────────────────────
    info!("shutting down: saving ledger");
    let _ = order_router.ledger().save(&ledger_path);

    // Cancel all open orders on exchange for each symbol
    info!("shutting down: canceling open orders");
    let cancel_exchange = Exchange::new(
        api_key.clone(),
        api_secret.clone(),
        base_url.clone(),
        false,
    );
    let mut canceled_symbols = std::collections::HashSet::new();
    for rt in runtimes.values() {
        if canceled_symbols.insert(rt.symbol.clone()) {
            match cancel_exchange.clone()
                .with_symbol(&rt.symbol)
                .cancel_all_open_orders(&rt.symbol)
                .await
            {
                Ok(_) => info!(symbol = %rt.symbol, "canceled open orders"),
                Err(e) => warn!(symbol = %rt.symbol, "failed to cancel open orders: {e}"),
            }
        }
    }

    // Final ledger save
    let _ = order_router.ledger().save(&ledger_path);
    info!("graceful shutdown complete");
}
