use hft_engine::config::{Config, SizingMode, StrategyFile};
use hft_engine::exchange::{self, Exchange};
use hft_engine::state::{EngineState, TradeStats};
use hft_engine::strategy::{
    BollingerStrategy, BreakoutStrategy, CandleAggregator, GridStrategy, MACDStrategy,
    MarketMaker, MeanReversionStrategy, RSIStrategy, ScalpingStrategy, Signal, Strategy,
    TrendFollower,
};
use hft_engine::trade::{decision_gate_allows_signal, TradeAction, TradeOverride};
use hft_engine::types::{MarketEvent, OrderType as StratOrderType, Side as StratSide};
use hft_engine::ws_feed::{start_feed, FeedConfig};

use notify::{EventKind, RecursiveMode, Watcher};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use tokio::sync::mpsc as tokio_mpsc;

const ENGINE_REGISTRY: &str = "/tmp/hft-engines.json";
const TRADES_LOG: &str = "reports/trades.jsonl";

/// Append a trade record to reports/trades.jsonl
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

    // Ensure reports/ directory exists
    let log_path = std::path::Path::new(TRADES_LOG);
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    match OpenOptions::new().create(true).append(true).open(log_path) {
        Ok(mut file) => {
            if let Err(e) = writeln!(file, "{}", record) {
                tracing::warn!("failed to write trade log: {e}");
            }
        }
        Err(e) => tracing::warn!("failed to open trades.jsonl: {e}"),
    }
}

/// Register this engine instance in shared registry file.
/// Key = strategy config name (e.g. "pippin-macd-5m"), value = {symbol, strategy, pid}.
fn register_engine(name: &str, symbol: &str, strategy: &str) {
    let mut map: serde_json::Map<String, serde_json::Value> =
        std::fs::read_to_string(ENGINE_REGISTRY)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

    let pid = std::process::id();
    map.insert(
        name.to_string(),
        serde_json::json!({
            "symbol": symbol,
            "strategy": strategy,
            "pid": pid,
        }),
    );

    if let Err(e) = std::fs::write(
        ENGINE_REGISTRY,
        serde_json::to_string_pretty(&map).unwrap_or_default(),
    ) {
        tracing::warn!("failed to write engine registry: {e}");
    } else {
        tracing::info!("registered {name} → {symbol}/{strategy} pid={pid} in {ENGINE_REGISTRY}");
    }
}

/// 根据 symbol 返回合适的下单数量（满足交易所精度要求）
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

/// 根据 config 创建策略实例（优先使用 config file 中的参数）
fn create_strategy(config: &Config) -> Box<dyn Strategy> {
    // order_qty: config file > symbol default
    let qty = config.order_qty.unwrap_or_else(|| default_order_qty(&config.symbol));
    let has_params = !config.params.is_empty();
    tracing::info!(symbol = %config.symbol, order_qty = qty, has_params, "creating strategy");

    let sym = &config.symbol;
    let p = &config.params;

    match config.strategy.as_str() {
        "market_maker" | "mm" => {
            tracing::info!("using MarketMaker strategy");
            if has_params {
                Box::new(MarketMaker::from_params(sym, qty, p))
            } else {
                Box::new(MarketMaker::new(sym, 0.0004, qty))
            }
        }
        "scalping" => {
            tracing::info!("using Scalping strategy");
            if has_params {
                Box::new(ScalpingStrategy::from_params(sym, qty, p))
            } else {
                Box::new(ScalpingStrategy::new(sym, qty))
            }
        }
        "breakout" => {
            tracing::info!("using Breakout strategy");
            if has_params {
                Box::new(BreakoutStrategy::from_params(sym, qty, p))
            } else {
                Box::new(BreakoutStrategy::new(sym, qty))
            }
        }
        "rsi" => {
            tracing::info!("using RSI strategy");
            if has_params {
                Box::new(RSIStrategy::from_params(sym, qty, p))
            } else {
                Box::new(RSIStrategy::new(sym, qty))
            }
        }
        "bollinger" => {
            tracing::info!("using Bollinger strategy");
            if has_params {
                Box::new(BollingerStrategy::from_params(sym, qty, p))
            } else {
                Box::new(BollingerStrategy::new(sym, qty))
            }
        }
        "macd" => {
            tracing::info!("using MACD strategy");
            if has_params {
                Box::new(MACDStrategy::from_params(sym, qty, p))
            } else {
                Box::new(MACDStrategy::new(sym, qty))
            }
        }
        "mean_reversion" => {
            tracing::info!("using MeanReversion strategy");
            if has_params {
                Box::new(MeanReversionStrategy::from_params(sym, qty, p))
            } else {
                Box::new(MeanReversionStrategy::new(sym, qty))
            }
        }
        "grid" => {
            tracing::info!("using Grid strategy");
            if has_params {
                Box::new(GridStrategy::from_params(sym, qty, p))
            } else {
                Box::new(GridStrategy::new(sym, qty))
            }
        }
        _ => {
            tracing::info!("using TrendFollower strategy");
            if has_params {
                Box::new(TrendFollower::from_params(sym, qty, p))
            } else {
                Box::new(TrendFollower::new(sym, qty))
            }
        }
    }
}

/// 根据 sizing_mode 计算下单量
/// - Percent: order_qty = (equity × position_size × leverage) / price
/// - Fixed: 直接用 order_qty
async fn compute_order_qty(
    exchange: &Exchange,
    sizing_mode: SizingMode,
    position_size: Option<f64>,
    leverage: u32,
    current_price: f64,
    fallback_qty: f64,
) -> f64 {
    if sizing_mode == SizingMode::Fixed {
        return fallback_qty;
    }
    // Percent mode
    let ps = position_size.unwrap_or(0.3);
    if current_price <= 0.0 {
        tracing::warn!("current_price <= 0, using fallback qty");
        return fallback_qty;
    }
    match exchange.get_balance().await {
        Ok(equity) => {
            let qty = (equity * ps * leverage as f64) / current_price;
            tracing::info!(
                equity = format!("{equity:.2}"),
                position_size = ps,
                leverage,
                price = format!("{current_price:.6}"),
                qty = format!("{qty:.4}"),
                "percent-based order qty"
            );
            qty
        }
        Err(e) => {
            tracing::warn!("failed to get equity: {e}, using fallback qty");
            fallback_qty
        }
    }
}

/// 将策略信号转为交易所下单，成功后写交易日志
async fn execute_signal(
    signal: &Signal,
    exchange: &Exchange,
    strategy_name: &str,
    sizing_mode: SizingMode,
    position_size: Option<f64>,
    leverage: u32,
    current_price: f64,
) {
    let Signal::Order(req) = signal else { return };

    let qty = compute_order_qty(
        exchange, sizing_mode, position_size, leverage, current_price, req.qty,
    ).await;

    let side = match req.side {
        StratSide::Buy => exchange::Side::Buy,
        StratSide::Sell => exchange::Side::Sell,
    };
    let pos_side = match req.side {
        StratSide::Buy => exchange::PositionSide::Long,
        StratSide::Sell => exchange::PositionSide::Short,
    };

    let side_str = match req.side {
        StratSide::Buy => "buy",
        StratSide::Sell => "sell",
    };
    let order_type_str = match req.order_type {
        StratOrderType::Market => "market",
        StratOrderType::Limit => "limit",
    };

    let result = match req.order_type {
        StratOrderType::Market => {
            exchange.market_order(side, pos_side, qty).await
        }
        StratOrderType::Limit => {
            let price = req.price.unwrap_or(0.0);
            exchange.limit_order(side, pos_side, qty, price).await
        }
    };

    match result {
        Ok(resp) => {
            tracing::info!(?resp, "order executed");
            log_trade(strategy_name, &exchange.symbol, side_str, qty, order_type_str, &resp);
        }
        Err(e) => tracing::error!("order failed: {e}"),
    }
}

/// 确定 state.json 路径：strategies/{name}/state.json
fn state_json_path(config: &Config) -> Option<PathBuf> {
    let config_path = config.config.as_ref()?;
    let dir = config_path.parent()?;
    Some(dir.join("state.json"))
}

/// 确定 trade.json 路径：strategies/{name}/trade.json
fn trade_json_path(config: &Config) -> Option<PathBuf> {
    let config_path = config.config.as_ref()?;
    let dir = config_path.parent()?;
    Some(dir.join("trade.json"))
}

/// 保存引擎状态
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

/// 监听 strategy.json 文件变化，发送通知到 channel
fn start_strategy_watcher(config_path: PathBuf, tx: tokio_mpsc::Sender<()>) {
    std::thread::spawn(move || {
        let watched_path = config_path.clone();
        let tx_clone = tx.clone();
        let mut watcher = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                let Ok(event) = res else { return };
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {}
                    _ => return,
                }
                // 只响应被监听的文件
                let dominated = event.paths.iter().any(|p| p == &watched_path);
                if !dominated {
                    return;
                }
                tracing::info!("strategy.json changed, reloading params");
                let _ = tx_clone.blocking_send(());
            },
        )
        .expect("failed to create strategy file watcher");

        // 监听 strategy.json 所在目录（notify 需要目录级监听）
        let watch_dir = config_path.parent().unwrap_or(&config_path);
        watcher
            .watch(watch_dir, RecursiveMode::NonRecursive)
            .expect("failed to watch strategy directory");

        tracing::info!("strategy file watcher started: {:?}", config_path);
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });
}

/// 监听 trade.json 文件变化，发送通知到 channel
fn start_trade_watcher(trade_path: PathBuf, tx: tokio_mpsc::Sender<()>) {
    std::thread::spawn(move || {
        let watched_path = trade_path.clone();
        let tx_clone = tx.clone();
        let mut watcher = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                let Ok(event) = res else { return };
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {}
                    _ => return,
                }
                let dominated = event.paths.iter().any(|p| p == &watched_path);
                if !dominated {
                    return;
                }
                tracing::info!("trade.json changed, reloading override");
                let _ = tx_clone.blocking_send(());
            },
        )
        .expect("failed to create trade file watcher");

        let watch_dir = trade_path.parent().unwrap_or(&trade_path);
        watcher
            .watch(watch_dir, RecursiveMode::NonRecursive)
            .expect("failed to watch trade directory");

        tracing::info!("trade file watcher started: {:?}", trade_path);
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });
}

/// 从 strategy.json 重新加载参数，创建新策略实例并恢复旧状态
fn reload_strategy(config: &mut Config, strategy: &mut Box<dyn Strategy>) {
    let Some(ref path) = config.config else { return };
    let contents = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!("failed to read strategy.json for reload: {e}");
            return;
        }
    };
    let sf: StrategyFile = match serde_json::from_str(&contents) {
        Ok(sf) => sf,
        Err(e) => {
            tracing::warn!("failed to parse strategy.json for reload: {e}");
            return;
        }
    };

    // 保存旧策略的指标状态
    let saved_state = strategy.export_state();

    // 应用新参数到 config
    config.apply_strategy_file(sf);

    // 创建新策略实例（使用新参数）
    let mut new_strategy = create_strategy(config);

    // 恢复旧指标状态（价格历史等），新参数（周期/阈值）生效
    new_strategy.restore_state(&saved_state);

    tracing::info!(
        strategy = new_strategy.name(),
        params = ?config.params,
        "strategy hot-reloaded with new params"
    );
    *strategy = new_strategy;
}

/// 尝试执行信号，先经过 DecisionGate 过滤
async fn try_execute_signal(
    signal: &Signal,
    trade_override: &TradeOverride,
    exchange: &Exchange,
    strategy_name: &str,
    sizing_mode: SizingMode,
    position_size: Option<f64>,
    leverage: u32,
    current_price: f64,
) {
    if *signal == Signal::None {
        return;
    }
    // DecisionGate: trade override 过滤
    if !decision_gate_allows_signal(trade_override) {
        tracing::debug!(
            action = ?trade_override.action,
            "signal blocked by trade override"
        );
        return;
    }
    tracing::info!(?signal, "signal passed decision gate");
    execute_signal(
        signal, exchange, strategy_name,
        sizing_mode, position_size, leverage, current_price,
    ).await;
}

/// 执行一次性 trade override 指令（close_all/close_long/close_short/stop/reduce/add）
async fn execute_trade_override(
    trade_override: &mut TradeOverride,
    trade_path: &std::path::Path,
    exchange: &Exchange,
    strategy_name: &str,
) {
    if !trade_override.needs_execution() {
        return;
    }

    tracing::warn!(
        action = ?trade_override.action,
        note = %trade_override.note,
        "executing trade override"
    );

    match trade_override.action {
        TradeAction::CloseAll | TradeAction::Stop => {
            match exchange.get_positions().await {
                Ok(positions) => {
                    for pos in &positions {
                        let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                        if sym != exchange.symbol {
                            continue;
                        }
                        let amt: f64 = pos.get("positionAmt")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        if amt.abs() < f64::EPSILON {
                            continue;
                        }
                        match exchange.close_position(sym, amt).await {
                            Ok(_) => tracing::info!("[{strategy_name}] closed {sym} amt={amt}"),
                            Err(e) => tracing::error!("[{strategy_name}] close {sym} failed: {e}"),
                        }
                    }
                }
                Err(e) => tracing::error!("failed to get positions for close_all: {e}"),
            }
        }
        TradeAction::CloseLong => {
            match exchange.get_positions().await {
                Ok(positions) => {
                    for pos in &positions {
                        let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                        if sym != exchange.symbol {
                            continue;
                        }
                        let amt: f64 = pos.get("positionAmt")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        if amt > f64::EPSILON {
                            match exchange.close_position(sym, amt).await {
                                Ok(_) => tracing::info!("[{strategy_name}] closed long {sym} amt={amt}"),
                                Err(e) => tracing::error!("[{strategy_name}] close long {sym} failed: {e}"),
                            }
                        }
                    }
                }
                Err(e) => tracing::error!("failed to get positions for close_long: {e}"),
            }
        }
        TradeAction::CloseShort => {
            match exchange.get_positions().await {
                Ok(positions) => {
                    for pos in &positions {
                        let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                        if sym != exchange.symbol {
                            continue;
                        }
                        let amt: f64 = pos.get("positionAmt")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        if amt < -f64::EPSILON {
                            match exchange.close_position(sym, amt).await {
                                Ok(_) => tracing::info!("[{strategy_name}] closed short {sym} amt={amt}"),
                                Err(e) => tracing::error!("[{strategy_name}] close short {sym} failed: {e}"),
                            }
                        }
                    }
                }
                Err(e) => tracing::error!("failed to get positions for close_short: {e}"),
            }
        }
        TradeAction::Reduce => {
            let ratio = trade_override.params.ratio.unwrap_or(0.5);
            match exchange.get_positions().await {
                Ok(positions) => {
                    for pos in &positions {
                        let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                        if sym != exchange.symbol {
                            continue;
                        }
                        let amt: f64 = pos.get("positionAmt")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        if amt.abs() < f64::EPSILON {
                            continue;
                        }
                        let reduce_amt = amt * ratio;
                        match exchange.close_position(sym, reduce_amt).await {
                            Ok(_) => tracing::info!("[{strategy_name}] reduced {sym} by {ratio:.0}%: {reduce_amt}"),
                            Err(e) => tracing::error!("[{strategy_name}] reduce {sym} failed: {e}"),
                        }
                    }
                }
                Err(e) => tracing::error!("failed to get positions for reduce: {e}"),
            }
        }
        TradeAction::Add => {
            let ratio = trade_override.params.ratio.unwrap_or(0.5);
            match exchange.get_positions().await {
                Ok(positions) => {
                    for pos in &positions {
                        let sym = pos.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                        if sym != exchange.symbol {
                            continue;
                        }
                        let amt: f64 = pos.get("positionAmt")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        if amt.abs() < f64::EPSILON {
                            continue;
                        }
                        let add_amt = (amt * ratio).abs();
                        let (side, pos_side) = if amt > 0.0 {
                            (exchange::Side::Buy, exchange::PositionSide::Long)
                        } else {
                            (exchange::Side::Sell, exchange::PositionSide::Short)
                        };
                        match exchange.market_order(side, pos_side, add_amt).await {
                            Ok(_) => tracing::info!("[{strategy_name}] added {sym} by {ratio:.0}%: {add_amt}"),
                            Err(e) => tracing::error!("[{strategy_name}] add {sym} failed: {e}"),
                        }
                    }
                }
                Err(e) => tracing::error!("failed to get positions for add: {e}"),
            }
        }
        _ => {} // Hold/Pause/Resume are not oneshot
    }

    // 标记已执行
    trade_override.mark_executed(trade_path);
    tracing::info!(action = ?trade_override.action, "trade override executed and marked");
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("hft_engine=debug".parse().unwrap()),
        )
        .init();

    let mut config = Config::load();
    let display_name = config.strategy_name.as_deref().unwrap_or(&config.strategy);
    tracing::info!("symbol={} leverage={} strategy={} name={} dry_run={}",
        config.symbol, config.leverage, config.strategy, display_name, config.dry_run);

    let mut exchange = Exchange::new(&config);

    if let Err(e) = exchange.set_leverage(config.leverage).await {
        tracing::error!("failed to set leverage: {e}");
    }

    let mut strategy = create_strategy(&config);

    // 设置 clientOrderId 前缀: "{strategy}-{SYMBOL}"
    let strategy_name = strategy.name().to_lowercase();
    let registry_name = config.strategy_name.clone().unwrap_or_else(|| {
        format!("{}-{}", strategy_name, config.symbol.to_lowercase())
    });
    exchange.order_id_prefix = format!("{}-{}", strategy_name, config.symbol);

    // 注册引擎到 /tmp/hft-engines.json（供 risk-engine 读取策略映射）
    register_engine(&registry_name, &config.symbol, &strategy_name);

    let candle_ms = config.timeframe_ms.unwrap_or(300_000); // default 5m
    let mut aggregator = CandleAggregator::new(candle_ms);

    // state.json 路径
    let state_path = state_json_path(&config);

    // trade.json 路径 + 初始加载
    let trade_path = trade_json_path(&config);
    let mut trade_override = trade_path
        .as_ref()
        .map(|p| TradeOverride::load(p))
        .unwrap_or_default();
    if trade_override.action != TradeAction::Hold {
        tracing::info!(action = ?trade_override.action, "loaded trade override");
    }

    // 恢复状态（如果存在）
    let mut trade_stats = TradeStats::default();
    if let Some(ref sp) = state_path {
        if let Some(saved) = EngineState::load(sp) {
            // 恢复策略指标
            strategy.restore_state(&saved.indicators);
            // 恢复 K 线聚合器
            if let Some(ref agg_state) = saved.candle_aggregator {
                aggregator.restore_state(agg_state);
            }
            // 恢复交易统计
            trade_stats = saved.trade_stats;
            tracing::info!(
                total = trade_stats.total,
                wins = trade_stats.wins,
                losses = trade_stats.losses,
                pnl = trade_stats.realized_pnl,
                "trade stats restored"
            );
        }
    }

    tracing::info!("strategy={} candle_interval={}ms", strategy.name(), candle_ms);

    // 启动行情 WebSocket 流
    let feed_config = FeedConfig {
        symbols: vec![config.symbol.to_lowercase()],
        ..FeedConfig::default()
    };
    let mut rx = start_feed(feed_config, 4096).await;

    // 启动 strategy.json 文件监听（热更新参数）
    let (config_tx, mut config_rx) = tokio_mpsc::channel::<()>(16);
    if let Some(ref path) = config.config {
        start_strategy_watcher(path.clone(), config_tx);
    }

    // 启动 trade.json 文件监听
    let (trade_tx, mut trade_rx) = tokio_mpsc::channel::<()>(16);
    if let Some(ref path) = trade_path {
        start_trade_watcher(path.clone(), trade_tx);
    }

    // 最新市价（从 tick 更新，用于百分比下单量计算）
    let mut last_price: f64 = 0.0;

    // 启动时执行待处理的一次性指令
    if let Some(ref tp) = trade_path {
        execute_trade_override(
            &mut trade_override, tp, &exchange, &strategy_name,
        ).await;
    }

    // 策略驱动的事件循环
    loop {
        tokio::select! {
            Some(event) = rx.recv() => {
                match &event {
                    MarketEvent::Tick(tick) => {
                        last_price = tick.price;

                        // Tick → CandleAggregator，产出 K 线时调策略
                        if let Some(candle) = aggregator.update(tick) {
                            tracing::info!(
                                o = candle.open, h = candle.high, l = candle.low,
                                c = candle.close, v = candle.volume,
                                "candle closed"
                            );
                            if let Some(signal) = strategy.on_candle(&candle) {
                                try_execute_signal(
                                    &signal, &trade_override, &exchange, &strategy_name,
                                    config.sizing_mode, config.position_size, config.leverage, last_price,
                                ).await;
                                // 成交后保存状态
                                if signal != Signal::None && decision_gate_allows_signal(&trade_override) {
                                    if let Some(ref sp) = state_path {
                                        save_state(sp, strategy.as_ref(), &aggregator, &trade_stats);
                                    }
                                }
                            }
                            // K 线收盘后保存状态（指标更新了）
                            if let Some(ref sp) = state_path {
                                save_state(sp, strategy.as_ref(), &aggregator, &trade_stats);
                            }
                        }

                        // 也把 tick 直接给策略（高频策略用）
                        if let Some(signal) = strategy.on_tick(tick) {
                            try_execute_signal(
                                &signal, &trade_override, &exchange, &strategy_name,
                                config.sizing_mode, config.position_size, config.leverage, last_price,
                            ).await;
                            if signal != Signal::None && decision_gate_allows_signal(&trade_override) {
                                if let Some(ref sp) = state_path {
                                    save_state(sp, strategy.as_ref(), &aggregator, &trade_stats);
                                }
                            }
                        }
                    }
                    MarketEvent::Depth(depth) => {
                        if let Some(signal) = strategy.on_depth(depth) {
                            try_execute_signal(
                                &signal, &trade_override, &exchange, &strategy_name,
                                config.sizing_mode, config.position_size, config.leverage, last_price,
                            ).await;
                            if signal != Signal::None && decision_gate_allows_signal(&trade_override) {
                                if let Some(ref sp) = state_path {
                                    save_state(sp, strategy.as_ref(), &aggregator, &trade_stats);
                                }
                            }
                        }
                    }
                    _ => {
                        tracing::debug!(?event, "unhandled event");
                    }
                }
            }
            Some(()) = config_rx.recv() => {
                // strategy.json 文件变化 → 热更新策略参数
                reload_strategy(&mut config, &mut strategy);
            }
            Some(()) = trade_rx.recv() => {
                // trade.json 文件变化 → 重新加载 trade override
                if let Some(ref tp) = trade_path {
                    let new_override = TradeOverride::load(tp);
                    tracing::info!(
                        action = ?new_override.action,
                        note = %new_override.note,
                        executed_at = ?new_override.executed_at,
                        "trade.json reloaded"
                    );
                    trade_override = new_override;
                    // 立即执行一次性指令
                    execute_trade_override(
                        &mut trade_override, tp, &exchange, &strategy_name,
                    ).await;
                }
            }
        }
    }
}
