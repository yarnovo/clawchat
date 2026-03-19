//! Worker lifecycle management: spawn, stop, and dynamic strategy loading.

use std::collections::HashMap;

use tokio::sync::{broadcast, mpsc};
use tokio::task::JoinHandle;
use tracing::{info, warn};

use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::{BinanceClient, Exchange};
use clawchat_shared::paths;
use clawchat_shared::risk::RiskConfig;
use clawchat_shared::strategy::StrategyFile;
use clawchat_shared::types::SizingMode;

use super::startup::{StrategyRuntime, build_worker_config};

use hft_engine::filter::SignalFilter;
use hft_engine::gateway::{Gateway, UserEvent};
use hft_engine::order_router::OrderRouter;
use hft_engine::risk::EngineRiskGuard;
use hft_engine::state::TradeStats;
use hft_engine::trade::TradeOverride;
use hft_engine::worker;
use hft_engine::ws_feed::FeedConfig;

/// Spawn workers for all initially approved strategies.
pub fn spawn_initial_workers(
    approved: &[(String, String, StrategyFile)],
    gateway: &mut Gateway,
    signal_tx: mpsc::Sender<worker::StrategySignal>,
    data_store: &DataStore,
) -> Vec<JoinHandle<()>> {
    let mut handles = Vec::new();

    for (name, _portfolio_name, sf) in approved {
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

        let worker_config = match build_worker_config(name, sf, filter, data_store) {
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
        handles.push(handle);
    }

    handles
}

/// Create per-strategy Exchange instances with correct symbol + order_id_prefix.
pub fn create_strategy_exchanges(
    runtimes: &HashMap<String, StrategyRuntime>,
    api_key: &str,
    api_secret: &str,
    base_url: &str,
) -> HashMap<String, Exchange> {
    let mut exchanges = HashMap::new();

    for (name, rt) in runtimes {
        let ex = Exchange::new(
            api_key.to_string(),
            api_secret.to_string(),
            base_url.to_string(),
            false,
        )
        .with_symbol(&rt.symbol)
        .with_order_id_prefix(&format!("{}-{}", name, rt.symbol));

        // Set leverage (non-blocking)
        let leverage = rt.leverage;
        let ex_for_lev = Exchange::new(
            api_key.to_string(),
            api_secret.to_string(),
            base_url.to_string(),
            false,
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

    exchanges
}

/// Dynamically load a new strategy at runtime (hot-load from config watcher).
/// Returns the new StrategyRuntime if successfully loaded.
#[allow(clippy::too_many_arguments)]
pub async fn hot_load_new_strategy(
    dir_name: &str,
    account_name: &str,
    found_portfolio: &str,
    sf: &StrategyFile,
    api_key: &str,
    api_secret: &str,
    base_url: &str,
    portfolio_risk_paths: &HashMap<String, std::path::PathBuf>,
    runtimes: &mut HashMap<String, StrategyRuntime>,
    exchanges: &mut HashMap<String, Exchange>,
    gateway: &mut Gateway,
    signal_tx: mpsc::Sender<worker::StrategySignal>,
    user_tx: broadcast::Sender<UserEvent>,
    order_router: &mut OrderRouter,
    worker_handles: &mut Vec<JoinHandle<()>>,
    data_store: &DataStore,
) -> bool {
    let name = sf.name.clone().unwrap_or_else(|| dir_name.to_string());

    if runtimes.contains_key(&name) {
        info!(strategy = %name, "new strategy detected but already running");
        return false;
    }

    let symbol = match sf.normalized_symbol() {
        Some(s) => s.to_uppercase(),
        None => {
            warn!(strategy = %name, "new strategy has no symbol, skipping");
            return false;
        }
    };

    let strat_dir = paths::strategy_dir_in(account_name, found_portfolio, &name);
    let capital = sf.capital.unwrap_or(10.0); // safe default
    let leverage = sf.leverage.unwrap_or(10);
    let engine_strategy = sf.engine_strategy.clone().unwrap_or_else(|| "default".to_string());
    let params = sf.numeric_params();

    // Add to ledger (specific portfolio)
    if order_router.ledger().get(&name).is_none() {
        order_router.ledger_mut().add_strategy_to(account_name, found_portfolio, &name, capital);
    }

    // Load risk config (using the correct portfolio's risk.json)
    let p_risk_path = portfolio_risk_paths.get(found_portfolio).cloned()
        .unwrap_or_else(|| strat_dir.join("risk.json"));
    let risk_path = strat_dir.join("risk.json");
    let risk_config = RiskConfig::load_merged(&p_risk_path, &risk_path);
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
        api_key.to_string(),
        api_secret.to_string(),
        base_url.to_string(),
        false,
    )
    .with_symbol(&symbol)
    .with_order_id_prefix(&format!("{}-{}", name, symbol));

    // Set leverage
    {
        let ex_lev = Exchange::new(
            api_key.to_string(),
            api_secret.to_string(),
            base_url.to_string(),
            false,
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
                super::event_loop::start_combined_mark_price_feed(vec![sym], tx).await;
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

        if let Some(worker_config) = build_worker_config(&name, sf, filter, data_store) {
            let market_rx = gateway.subscribe_market(&symbol).unwrap();
            let handle = worker::spawn_worker(worker_config, market_rx, signal_tx.clone());
            worker_handles.push(handle);
            info!(strategy = %name, symbol = %symbol, "new strategy worker spawned");
        }
    }

    // Insert runtime
    let strategy_dry_run = sf.is_dry_run();
    runtimes.insert(
        name.clone(),
        StrategyRuntime {
            name: name.clone(),
            portfolio: found_portfolio.to_string(),
            symbol: symbol.clone(),
            dir: strat_dir,
            leverage,
            capital,
            position_size: sf.position_size,
            sizing_mode,
            order_qty: sf.order_qty,
            engine_strategy,
            params,
            dry_run: strategy_dry_run,
            trade_override,
            risk_config,
            risk_guard,
            trade_stats: TradeStats::default(),
            last_price: 0.0,
            last_funding_rate: 0.0,
            last_funding_log_nft: 0,
        },
    );

    info!(
        strategy = %name, symbol = %symbol,
        portfolio = %found_portfolio,
        capital, leverage,
        mode = if strategy_dry_run { "dry-run" } else { "live" },
        "new strategy fully loaded"
    );

    true
}
