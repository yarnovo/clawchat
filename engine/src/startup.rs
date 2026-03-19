//! Engine startup logic: config loading, Ledger init, reconciliation, strategy scanning.

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use tokio::sync::{broadcast, mpsc};
use tokio::task::JoinHandle;
use tracing::{error, info, warn};

use clawchat_shared::account::{AccountConfig, PortfolioConfig};
use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::{Exchange, ExchangeClient, PositionRisk};
use clawchat_shared::paths;
use clawchat_shared::risk::RiskConfig;
use clawchat_shared::strategy::StrategyFile;
use clawchat_shared::types::SizingMode;

use hft_engine::filter::SignalFilter;
use hft_engine::global_risk::{GlobalRiskConfig, GlobalRiskGuard};
use hft_engine::ledger::Ledger;
use hft_engine::order_router::OrderRouter;
use hft_engine::risk::EngineRiskGuard;
use hft_engine::state::{EngineState, TradeStats};
use hft_engine::strategy::{
    BollingerReversionStrategy, BollingerStrategy, BreakoutStrategy, CandleAggregator,
    GridStrategy, MACDStrategy, MarketMaker, MeanReversionStrategy, RSIStrategy,
    ScalpingStrategy, Strategy, TrendFollower,
};
use hft_engine::gateway::{Gateway, UserEvent};
use hft_engine::trade::TradeOverride;
use hft_engine::worker::{self, WorkerConfig};
use hft_engine::ws_feed::FeedConfig;

use super::config_watcher::{self, ConfigChange};
use super::event_loop;
use super::worker_manager;

// ── Per-strategy runtime state ─────────────────────────────────

#[allow(dead_code)]
pub struct StrategyRuntime {
    pub name: String,
    pub portfolio: String,
    pub symbol: String,
    pub dir: PathBuf,
    pub leverage: u32,
    pub capital: f64,
    pub position_size: Option<f64>,
    pub sizing_mode: SizingMode,
    pub order_qty: Option<f64>,
    pub engine_strategy: String,
    pub params: HashMap<String, f64>,

    // Runtime state
    /// Per-strategy dry-run mode (true = log only, no orders)
    pub dry_run: bool,
    pub trade_override: TradeOverride,
    pub risk_config: RiskConfig,
    pub risk_guard: EngineRiskGuard,
    pub trade_stats: TradeStats,
    pub last_price: f64,
    pub last_funding_rate: f64,
    pub last_funding_log_nft: u64,
}

// ── Scan approved strategies ───────────────────────────────────

/// Scan result: (strategy_name, portfolio_name, StrategyFile)
pub fn scan_approved_strategies_multi(account: &str) -> Vec<(String, String, StrategyFile)> {
    let portfolios_dir = paths::portfolios_dir(account);
    let mut strategies = Vec::new();

    let portfolio_entries = match std::fs::read_dir(&portfolios_dir) {
        Ok(e) => e,
        Err(e) => {
            error!("failed to read portfolios dir {}: {e}", portfolios_dir.display());
            return strategies;
        }
    };

    for portfolio_entry in portfolio_entries.flatten() {
        let portfolio_path = portfolio_entry.path();
        if !portfolio_path.is_dir() {
            continue;
        }
        let portfolio_name = portfolio_entry.file_name().to_string_lossy().to_string();
        let strats_dir = portfolio_path.join("strategies");
        let entries = match std::fs::read_dir(&strats_dir) {
            Ok(e) => e,
            Err(_) => continue, // no strategies/ subdir
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
                    portfolio = %portfolio_name,
                    status,
                    "skipping non-approved strategy"
                );
                continue;
            }
            let name = sf
                .name
                .clone()
                .unwrap_or_else(|| entry.file_name().to_string_lossy().to_string());
            strategies.push((name, portfolio_name.clone(), sf));
        }
    }

    strategies
}

// ── Create strategy instance ───────────────────────────────────

pub fn default_order_qty(symbol: &str) -> f64 {
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

pub fn create_strategy_instance(
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
        "bollinger_reversion" => {
            if has_params { Box::new(BollingerReversionStrategy::from_params(symbol, order_qty, params)) }
            else { Box::new(BollingerReversionStrategy::new(symbol, order_qty)) }
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

// ── Warmup: compute max indicator period from params ──────────

/// 从策略参数中提取最大指标周期
/// trend: max(ema_fast, ema_slow, atr_period)
/// breakout: max(lookback, atr_period)
/// rsi: rsi_period
/// bollinger: bb_period
/// macd: max(macd_slow, signal_period)
/// 其他: 取所有 period/lookback 相关参数的最大值
pub fn max_indicator_period(params: &HashMap<String, f64>) -> u64 {
    let period_keys = [
        "ema_fast", "ema_slow", "atr_period", "lookback",
        "rsi_period", "bb_period", "macd_fast", "macd_slow",
        "signal_period", "ma_period", "period",
    ];
    let max = params
        .iter()
        .filter(|(k, _)| period_keys.contains(&k.as_str()))
        .map(|(_, &v)| v as u64)
        .max()
        .unwrap_or(0);
    // 至少 20，避免无参数策略完全不预热
    max.max(20)
}

/// 从 DataStore 加载历史 1m K 线并聚合到目标 timeframe
pub fn load_warmup_candles(
    data_store: &DataStore,
    symbol: &str,
    timeframe_ms: u64,
    max_period: u64,
) -> Vec<clawchat_shared::candle::Candle> {
    // 需要 max_period × 2 根目标 timeframe K 线
    // 每根目标 K 线 = timeframe_ms / 60_000 根 1m K 线
    let tf_minutes = timeframe_ms / 60_000;
    let candles_needed_1m = max_period * 2 * tf_minutes;

    // 读取最新的 N 根 1m K 线
    let all_1m = match data_store.read_candles(symbol, "1m", None, None) {
        Ok(candles) => candles,
        Err(e) => {
            warn!(symbol, "warmup: failed to read 1m candles: {e}");
            return Vec::new();
        }
    };

    if all_1m.is_empty() {
        warn!(symbol, "warmup: no 1m candles available");
        return Vec::new();
    }

    // 取最后 candles_needed_1m 根
    let start = if all_1m.len() > candles_needed_1m as usize {
        all_1m.len() - candles_needed_1m as usize
    } else {
        0
    };
    let recent_1m = &all_1m[start..];

    // 聚合到目标 timeframe
    let aggregated = DataStore::aggregate_candles(recent_1m, timeframe_ms);

    info!(
        symbol,
        timeframe_ms,
        candles_1m = recent_1m.len(),
        candles_aggregated = aggregated.len(),
        max_period,
        "warmup: loaded historical candles"
    );

    aggregated
}

// ── Build worker config from StrategyFile ──────────────────────

pub fn build_worker_config(
    name: &str,
    sf: &StrategyFile,
    signal_filter: SignalFilter,
    data_store: &DataStore,
) -> Option<WorkerConfig> {
    let symbol = sf.normalized_symbol()?;
    let engine_strategy = sf.engine_strategy.as_deref().unwrap_or("default");
    let order_qty = sf.order_qty.unwrap_or_else(|| default_order_qty(&symbol));
    let params = sf.numeric_params();
    let timeframe_ms = sf.timeframe_ms().unwrap_or(300_000);

    let strategy = create_strategy_instance(engine_strategy, &symbol, order_qty, &params);

    // 加载预热用的历史 K 线
    let max_period = max_indicator_period(&params);
    let warmup_candles = load_warmup_candles(data_store, &symbol, timeframe_ms, max_period);

    Some(WorkerConfig {
        strategy_name: name.to_string(),
        symbol,
        timeframe_ms,
        strategy,
        filter: signal_filter,
        warmup_candles,
    })
}

// ── Order sizing ───────────────────────────────────────────────

pub fn compute_order_qty(
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

// ── State persistence ──────────────────────────────────────────

#[allow(dead_code)]
pub fn save_state(
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

// ── Startup reconciliation ─────────────────────────────────────

/// Reconcile ledger virtual positions against exchange real positions.
/// Fixes any discrepancies (ghost positions, missing positions, qty mismatches)
/// and logs all differences to records/reconcile_events.jsonl.
pub async fn reconcile_positions(exchange: &dyn ExchangeClient, ledger: &mut Ledger) {
    info!("starting position reconciliation with exchange");

    // 1. Fetch real positions from exchange
    let exchange_positions = match exchange.get_position_risk(None).await {
        Ok(positions) => positions,
        Err(e) => {
            error!("reconciliation failed: cannot fetch positionRisk: {e}");
            return;
        }
    };

    // Build a map of exchange positions: symbol → Vec<PositionRisk>
    let mut exchange_map: HashMap<String, Vec<PositionRisk>> = HashMap::new();
    for pos in &exchange_positions {
        exchange_map
            .entry(pos.symbol.clone())
            .or_default()
            .push(pos.clone());
    }

    info!(
        exchange_positions = exchange_positions.len(),
        "fetched exchange positions for reconciliation"
    );

    let mut events: Vec<serde_json::Value> = Vec::new();
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

    // 2. Check ledger positions against exchange
    // Collect all ledger positions first to avoid borrow issues
    let mut ledger_positions: Vec<(String, String, String, f64)> = Vec::new(); // (strategy, symbol, side, qty)
    for alloc in ledger.all_strategies() {
        for (symbol, vp) in &alloc.positions {
            ledger_positions.push((
                alloc.strategy_name.clone(),
                symbol.clone(),
                vp.side.clone(),
                vp.qty,
            ));
        }
    }

    // Track which exchange symbols we've matched
    let mut matched_exchange_symbols: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (strategy_name, symbol, side, qty) in &ledger_positions {
        let exchange_amt = exchange_map
            .get(symbol)
            .map(|positions| {
                positions.iter().map(|p| p.position_amt).sum::<f64>()
            })
            .unwrap_or(0.0);

        matched_exchange_symbols.insert(symbol.clone());

        let expected_amt = if side == "long" { *qty } else { -qty };

        if exchange_amt.abs() < f64::EPSILON {
            // Ghost position: ledger has it, exchange doesn't
            warn!(
                strategy = %strategy_name,
                symbol = %symbol,
                ledger_side = %side,
                ledger_qty = %qty,
                "RECONCILE: ghost position — clearing from ledger"
            );
            events.push(serde_json::json!({
                "ts": ts,
                "type": "ghost_position",
                "strategy": strategy_name,
                "symbol": symbol,
                "ledger_side": side,
                "ledger_qty": qty,
                "action": "cleared_from_ledger"
            }));

            // Clear from ledger
            if let Some(alloc) = ledger.get_mut(strategy_name) {
                alloc.positions.remove(symbol);
                alloc.recalc_unrealized();
            }
        } else if (exchange_amt - expected_amt).abs() > f64::EPSILON * 100.0 {
            // Quantity mismatch
            warn!(
                strategy = %strategy_name,
                symbol = %symbol,
                ledger_amt = expected_amt,
                exchange_amt = exchange_amt,
                "RECONCILE: position qty mismatch — adjusting to exchange"
            );
            events.push(serde_json::json!({
                "ts": ts,
                "type": "qty_mismatch",
                "strategy": strategy_name,
                "symbol": symbol,
                "ledger_amt": expected_amt,
                "exchange_amt": exchange_amt,
                "action": "adjusted_to_exchange"
            }));

            // Adjust ledger to match exchange
            if let Some(alloc) = ledger.get_mut(strategy_name) {
                if let Some(pos) = alloc.positions.get_mut(symbol) {
                    let new_side = if exchange_amt > 0.0 { "long" } else { "short" };
                    pos.side = new_side.to_string();
                    pos.qty = exchange_amt.abs();
                    // Update entry price from exchange if available
                    if let Some(ex_positions) = exchange_map.get(symbol) {
                        if let Some(ex_pos) = ex_positions.first() {
                            pos.entry_price = ex_pos.entry_price;
                        }
                    }
                }
                alloc.recalc_unrealized();
            }
        }
    }

    // 3. Check for unrecorded exchange positions (exchange has, ledger doesn't)
    for (symbol, ex_positions) in &exchange_map {
        if matched_exchange_symbols.contains(symbol) {
            continue;
        }
        let total_amt: f64 = ex_positions.iter().map(|p| p.position_amt).sum();
        if total_amt.abs() < f64::EPSILON {
            continue;
        }

        warn!(
            symbol = %symbol,
            exchange_amt = total_amt,
            "RECONCILE: unrecorded position on exchange — no matching ledger strategy"
        );
        events.push(serde_json::json!({
            "ts": ts,
            "type": "unrecorded_position",
            "symbol": symbol,
            "exchange_amt": total_amt,
            "entry_price": ex_positions.first().map(|p| p.entry_price).unwrap_or(0.0),
            "action": "logged_only"
        }));
    }

    // 4. Write reconciliation events to records/reconcile_events.jsonl
    if !events.is_empty() {
        let log_path = paths::records_dir().join("reconcile_events.jsonl");
        if let Some(parent) = log_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
            for event in &events {
                let _ = writeln!(file, "{}", event);
            }
        }
        warn!(
            discrepancies = events.len(),
            "reconciliation complete — discrepancies found and logged"
        );
    } else {
        info!("reconciliation complete — all positions match");
    }
}

// ── Load portfolio configs ─────────────────────────────────────

pub fn load_portfolio_configs(account_name: &str) -> HashMap<String, PortfolioConfig> {
    let portfolios_base = paths::portfolios_dir(account_name);
    let mut configs: HashMap<String, PortfolioConfig> = HashMap::new();
    if let Ok(entries) = std::fs::read_dir(&portfolios_base) {
        for entry in entries.flatten() {
            if !entry.path().is_dir() { continue; }
            let pname = entry.file_name().to_string_lossy().to_string();
            let ppath = entry.path().join("portfolio.json");
            match PortfolioConfig::load(&ppath) {
                Ok(pc) => {
                    info!(portfolio = %pname, capital = pc.allocated_capital, "portfolio loaded");
                    configs.insert(pname, pc);
                }
                Err(e) => {
                    warn!(portfolio = %pname, "failed to load portfolio.json: {e}, skipping");
                }
            }
        }
    }
    configs
}

// ── Init Ledger ────────────────────────────────────────────────

pub fn init_ledger(
    account: &AccountConfig,
    portfolio_configs: &HashMap<String, PortfolioConfig>,
) -> Ledger {
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
                    "main",
                    portfolio_configs.get("main").map(|p| p.allocated_capital).unwrap_or(0.0),
                    portfolio_configs.get("main").and_then(|p| p.reserve).unwrap_or(0.0),
                )
            }
        }
    } else {
        Ledger::new_single(
            &account.name,
            &account.exchange,
            account.total_capital,
            "main",
            portfolio_configs.get("main").map(|p| p.allocated_capital).unwrap_or(0.0),
            portfolio_configs.get("main").and_then(|p| p.reserve).unwrap_or(0.0),
        )
    };

    // Ensure all discovered portfolios exist in the ledger
    for (pname, pc) in portfolio_configs {
        ledger.add_portfolio(
            &account.name,
            pname,
            pc.allocated_capital,
            pc.reserve.unwrap_or(0.0),
        );
    }

    ledger
}

// ── Init GlobalRiskGuards per portfolio ────────────────────────

pub fn init_portfolio_risk_guards(
    portfolio_configs: &HashMap<String, PortfolioConfig>,
) -> HashMap<String, GlobalRiskGuard> {
    let mut guards = HashMap::new();
    for (pname, pc) in portfolio_configs {
        let grc = if let Some(ref pr) = pc.risk {
            GlobalRiskConfig {
                max_drawdown_pct: pr.max_drawdown_pct.unwrap_or(10.0),
                max_daily_loss_pct: pr.max_daily_loss_pct.unwrap_or(5.0),
                max_total_exposure: pr.max_total_exposure.unwrap_or(2.0),
                max_per_coin_exposure_pct: pr.max_per_coin_exposure_pct.unwrap_or(50.0),
                drawdown_yellow_pct: pr.drawdown_yellow_pct.unwrap_or(3.0),
                drawdown_orange_pct: pr.drawdown_orange_pct.unwrap_or(6.0),
                recovery_threshold_pct: pr.recovery_threshold_pct.unwrap_or(2.0),
            }
        } else {
            GlobalRiskConfig::default()
        };
        let guard = GlobalRiskGuard::new(grc, pc.allocated_capital);
        info!(
            portfolio = %pname,
            max_dd = %guard.config().max_drawdown_pct,
            yellow = %guard.config().drawdown_yellow_pct,
            orange = %guard.config().drawdown_orange_pct,
            max_daily = %guard.config().max_daily_loss_pct,
            "portfolio risk guard initialized (graded drawdown)"
        );
        guards.insert(pname.clone(), guard);
    }
    guards
}

// ── Build main global risk + order router ──────────────────────

pub fn build_order_router(
    portfolio_configs: &HashMap<String, PortfolioConfig>,
    account_total_capital: f64,
    ledger: Ledger,
    runtimes: &HashMap<String, StrategyRuntime>,
) -> OrderRouter {
    let main_risk_config = portfolio_configs.get("main")
        .and_then(|pc| pc.risk.as_ref())
        .map(|pr| GlobalRiskConfig {
            max_drawdown_pct: pr.max_drawdown_pct.unwrap_or(10.0),
            max_daily_loss_pct: pr.max_daily_loss_pct.unwrap_or(5.0),
            max_total_exposure: pr.max_total_exposure.unwrap_or(2.0),
            max_per_coin_exposure_pct: pr.max_per_coin_exposure_pct.unwrap_or(50.0),
            drawdown_yellow_pct: pr.drawdown_yellow_pct.unwrap_or(3.0),
            drawdown_orange_pct: pr.drawdown_orange_pct.unwrap_or(6.0),
            recovery_threshold_pct: pr.recovery_threshold_pct.unwrap_or(2.0),
        })
        .unwrap_or_default();
    let global_risk = GlobalRiskGuard::new(main_risk_config, account_total_capital);

    let mut order_router = OrderRouter::new(ledger, global_risk);
    for (name, rt) in runtimes {
        let guard = EngineRiskGuard::new(rt.risk_config.clone(), rt.capital);
        order_router.add_strategy_guard(name, guard);
    }
    order_router
}

// ── Build strategy runtimes ────────────────────────────────────

pub fn build_runtimes(
    account_name: &str,
    approved: &[(String, String, StrategyFile)],
    portfolio_configs: &HashMap<String, PortfolioConfig>,
    portfolio_risk_paths: &HashMap<String, PathBuf>,
    ledger: &mut Ledger,
) -> (HashMap<String, StrategyRuntime>, Vec<String>) {
    let mut symbols: Vec<String> = Vec::new();
    let mut runtimes: HashMap<String, StrategyRuntime> = HashMap::new();

    for (name, portfolio_name, sf) in approved {
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

        let pc = match portfolio_configs.get(portfolio_name) {
            Some(pc) => pc,
            None => {
                warn!(name, portfolio = %portfolio_name, "portfolio config not found, skipping");
                continue;
            }
        };

        let strat_dir = paths::strategy_dir_in(account_name, portfolio_name, name);
        let capital = sf.capital.unwrap_or(pc.allocated_capital / approved.iter().filter(|(_, p, _)| p == portfolio_name).count().max(1) as f64);
        let leverage = sf.leverage.unwrap_or(10);
        let engine_strategy = sf.engine_strategy.clone().unwrap_or_else(|| "default".to_string());
        let params = sf.numeric_params();

        // Add to ledger if not already present
        if ledger.get(name).is_none() {
            ledger.add_strategy_to(account_name, portfolio_name, name, capital);
        }

        // Load risk config: portfolio default + strategy override merge
        let portfolio_risk_path = portfolio_risk_paths.get(portfolio_name).cloned()
            .unwrap_or_else(|| strat_dir.join("risk.json"));
        let risk_path = strat_dir.join("risk.json");
        let risk_config = RiskConfig::load_merged(&portfolio_risk_path, &risk_path);
        let risk_guard = EngineRiskGuard::new(risk_config.clone(), capital);

        // Load trade override (strategy-level; portfolio-level checked at decision time)
        let trade_path = strat_dir.join("trade.json");
        let trade_override = TradeOverride::load(&trade_path);

        let sizing_mode_str = sf.sizing_mode.as_deref().unwrap_or("percent");
        let sizing_mode = if sizing_mode_str == "fixed" { SizingMode::Fixed } else { SizingMode::Percent };

        let strategy_dry_run = sf.is_dry_run();

        runtimes.insert(
            name.to_string(),
            StrategyRuntime {
                name: name.to_string(),
                portfolio: portfolio_name.to_string(),
                symbol: symbol_upper.clone(),
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
            name,
            portfolio = %portfolio_name,
            mode = if strategy_dry_run { "dry-run" } else { "live" },
            "strategy mode"
        );
    }

    (runtimes, symbols)
}

// ── Engine context (all state needed for event loop) ───────────

/// All state assembled during startup, passed to the event loop.
pub struct EngineContext {
    pub signal_rx: mpsc::Receiver<worker::StrategySignal>,
    pub user_rx: broadcast::Receiver<UserEvent>,
    pub config_rx: mpsc::Receiver<ConfigChange>,
    pub config_tx_main: mpsc::Sender<ConfigChange>,
    pub order_tx: mpsc::Sender<hft_engine::ledger::Order>,
    pub ledger_path: PathBuf,
    pub account_name: String,
    pub api_key: String,
    pub api_secret: String,
    pub base_url: String,
    pub user_tx: broadcast::Sender<UserEvent>,
    pub signal_tx: mpsc::Sender<worker::StrategySignal>,
    pub runtimes: HashMap<String, StrategyRuntime>,
    pub exchanges: HashMap<String, Exchange>,
    pub order_router: OrderRouter,
    pub gateway: Gateway,
    pub worker_handles: Vec<JoinHandle<()>>,
    pub portfolio_configs: HashMap<String, PortfolioConfig>,
    pub portfolio_risk_paths: HashMap<String, PathBuf>,
    pub portfolio_trade_paths: HashMap<String, PathBuf>,
    pub portfolio_trade_overrides: HashMap<String, TradeOverride>,
    pub portfolio_risk_guards: HashMap<String, GlobalRiskGuard>,
    pub data_store: DataStore,
}

/// Initialize the entire engine: load configs, reconcile positions, spawn workers.
/// Returns None if initialization fails (no portfolios or no approved strategies).
pub async fn init_engine() -> Option<EngineContext> {
    let account_name = "binance-main";
    let account_path = paths::account_dir(account_name).join("account.json");
    let account = AccountConfig::load(&account_path).expect("failed to load account.json");

    info!(account = %account.name, "engine starting (multi-portfolio mode)");

    // Load portfolios
    let portfolio_configs = load_portfolio_configs(account_name);
    if portfolio_configs.is_empty() {
        error!("no portfolios found, exiting");
        return None;
    }

    // Scan approved strategies
    let approved = scan_approved_strategies_multi(account_name);
    if approved.is_empty() {
        error!("no approved strategies found, exiting");
        return None;
    }

    info!(count = approved.len(), "approved strategies found");
    for (name, portfolio_name, sf) in &approved {
        info!(
            name,
            portfolio = %portfolio_name,
            symbol = sf.symbol.as_deref().unwrap_or("?"),
            engine = sf.engine_strategy.as_deref().unwrap_or("default"),
            "strategy loaded"
        );
    }

    // Exchange credentials
    let api_key = std::env::var(account.api_key_env.as_deref().unwrap_or("BINANCE_API_KEY"))
        .expect("BINANCE_API_KEY not set");
    let api_secret = std::env::var(account.api_secret_env.as_deref().unwrap_or("BINANCE_API_SECRET"))
        .expect("BINANCE_API_SECRET not set");
    let base_url = account
        .base_url
        .clone()
        .unwrap_or_else(|| "https://fapi.binance.com".to_string());

    // Init Ledger + reconciliation
    let mut ledger = init_ledger(&account, &portfolio_configs);
    let ledger_path = paths::records_dir().join("ledger.json");
    {
        let reconcile_exchange = Exchange::new(
            api_key.clone(), api_secret.clone(), base_url.clone(), false,
        );
        reconcile_positions(&reconcile_exchange, &mut ledger).await;
        let _ = ledger.save(&ledger_path);
    }

    // Per-portfolio risk/trade paths and overrides
    let mut portfolio_risk_paths = HashMap::new();
    let mut portfolio_trade_paths = HashMap::new();
    let mut portfolio_trade_overrides = HashMap::new();
    for pname in portfolio_configs.keys() {
        let pdir = paths::portfolio_dir(account_name, pname);
        portfolio_risk_paths.insert(pname.clone(), pdir.join("risk.json"));
        portfolio_trade_paths.insert(pname.clone(), pdir.join("trade.json"));
        portfolio_trade_overrides.insert(pname.clone(), TradeOverride::load(&pdir.join("trade.json")));
    }

    // Build strategy runtimes
    let (mut runtimes, symbols) = build_runtimes(
        account_name, &approved, &portfolio_configs, &portfolio_risk_paths, &mut ledger,
    );

    // Init risk guards
    let portfolio_risk_guards = init_portfolio_risk_guards(&portfolio_configs);

    // Init OrderRouter
    let order_router = build_order_router(
        &portfolio_configs, account.total_capital, ledger, &runtimes,
    );

    // Create Gateway + signal channel
    let mut gateway = Gateway::new(&symbols);
    let (signal_tx, signal_rx) = mpsc::channel::<worker::StrategySignal>(4096);
    let data_store = DataStore::new(paths::data_dir());

    // Spawn workers
    let worker_handles = worker_manager::spawn_initial_workers(
        &approved, &mut gateway, signal_tx.clone(), &data_store,
    );

    // Start Gateway WS connections
    let feed_configs: Vec<FeedConfig> = symbols
        .iter()
        .map(|sym| FeedConfig {
            symbols: vec![sym.to_lowercase()],
            agg_trade: true,
            depth: true,
            depth_speed: "100ms".to_string(),
            mark_price: false,
        })
        .collect();
    let _gateway_handles = gateway.start(feed_configs).await;

    // User Data Stream + markPrice feeds
    let user_tx = gateway.user_sender();
    let user_rx = gateway.subscribe_user();
    {
        let tx = user_tx.clone();
        let ak = api_key.clone();
        let ask = api_secret.clone();
        let bu = base_url.clone();
        tokio::spawn(async move {
            event_loop::start_user_data_stream(ak, ask, bu, tx).await;
        });
    }
    {
        let tx = user_tx.clone();
        let syms = symbols.clone();
        tokio::spawn(async move {
            event_loop::start_combined_mark_price_feed(syms, tx).await;
        });
    }

    // Config Watcher
    let (config_tx, config_rx) = mpsc::channel::<ConfigChange>(256);
    let config_tx_main = config_tx.clone();
    let watch_dirs: Vec<PathBuf> = portfolio_configs.keys()
        .map(|pname| paths::portfolio_dir(account_name, pname))
        .collect();
    config_watcher::start_config_watcher(paths::portfolios_dir(account_name), watch_dirs, config_tx);

    // Order record channel + writer task
    let (order_tx, order_rx) = mpsc::channel::<hft_engine::ledger::Order>(4096);
    tokio::spawn(event_loop::order_writer_task(order_rx));

    // Per-strategy exchange instances
    let exchanges = worker_manager::create_strategy_exchanges(
        &runtimes, &api_key, &api_secret, &base_url,
    );

    // Execute pending trade overrides on startup
    for (name, rt) in runtimes.iter_mut() {
        if let Some(exchange) = exchanges.get(name) {
            let trade_path = rt.dir.join("trade.json");
            event_loop::execute_trade_override(
                &mut rt.trade_override, &trade_path, exchange, name, rt.last_price,
            ).await;
        }
    }

    // Save initial ledger
    let _ = order_router.ledger().save(&ledger_path);

    Some(EngineContext {
        signal_rx,
        user_rx,
        config_rx,
        config_tx_main,
        order_tx,
        ledger_path,
        account_name: account_name.to_string(),
        api_key,
        api_secret,
        base_url,
        user_tx,
        signal_tx,
        runtimes,
        exchanges,
        order_router,
        gateway,
        worker_handles,
        portfolio_configs,
        portfolio_risk_paths,
        portfolio_trade_paths,
        portfolio_trade_overrides,
        portfolio_risk_guards,
        data_store,
    })
}
