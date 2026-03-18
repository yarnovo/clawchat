use hft_engine::config::Config;
use hft_engine::exchange::{self, Exchange};
use hft_engine::strategy::{
    BollingerStrategy, BreakoutStrategy, CandleAggregator, MACDStrategy, MarketMaker,
    RSIStrategy, ScalpingStrategy, Signal, Strategy, TrendFollower,
};
use hft_engine::types::{MarketEvent, OrderType as StratOrderType, Side as StratSide};
use hft_engine::ws_feed::{start_feed, FeedConfig};

use std::fs::OpenOptions;
use std::io::Write;

const ENGINE_REGISTRY: &str = "/tmp/hft-engines.json";
const TRADES_LOG: &str = "reports/trades.jsonl";
const DYNAMIC_QTY_FILE: &str = "/tmp/dynamic_qty.json";

/// 从 /tmp/dynamic_qty.json 读取动态 order_qty（复利）
/// 如果文件不存在或解析失败，返回 None
fn read_dynamic_qty(symbol: &str) -> Option<f64> {
    let contents = std::fs::read_to_string(DYNAMIC_QTY_FILE).ok()?;
    let map: serde_json::Value = serde_json::from_str(&contents).ok()?;
    map.get(symbol)?
        .get("dynamic_qty")?
        .as_f64()
}

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

/// 将策略信号转为交易所下单，成功后写交易日志
async fn execute_signal(signal: &Signal, exchange: &Exchange, strategy_name: &str) {
    let Signal::Order(req) = signal else { return };

    // 复利：优先使用 risk-engine 计算的动态 order_qty
    let qty = read_dynamic_qty(&exchange.symbol).unwrap_or(req.qty);
    if (qty - req.qty).abs() > f64::EPSILON {
        tracing::info!(base_qty = req.qty, dynamic_qty = qty, "using compound qty");
    }

    let side = match req.side {
        StratSide::Buy => exchange::Side::Buy,
        StratSide::Sell => exchange::Side::Sell,
    };
    // 简化：Buy → Long, Sell → Short
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

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("hft_engine=debug".parse().unwrap()),
        )
        .init();

    let config = Config::load();
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

    // 注册引擎到 /tmp/hft-engines.json（供 risk_guard 读取策略映射）
    register_engine(&registry_name, &config.symbol, &strategy_name);

    let candle_ms = config.timeframe_ms.unwrap_or(300_000); // default 5m
    let mut aggregator = CandleAggregator::new(candle_ms);

    tracing::info!("strategy={} candle_interval={}ms", strategy.name(), candle_ms);

    // 启动行情 WebSocket 流
    let feed_config = FeedConfig {
        symbols: vec![config.symbol.to_lowercase()],
        ..FeedConfig::default()
    };
    let mut rx = start_feed(feed_config, 4096).await;

    // 策略驱动的事件循环
    while let Some(event) = rx.recv().await {
        match &event {
            MarketEvent::Tick(tick) => {
                // Tick → CandleAggregator，产出 K 线时调策略
                if let Some(candle) = aggregator.update(tick) {
                    tracing::info!(
                        o = candle.open, h = candle.high, l = candle.low,
                        c = candle.close, v = candle.volume,
                        "candle closed"
                    );
                    if let Some(signal) = strategy.on_candle(&candle) {
                        if signal != Signal::None {
                            tracing::info!(?signal, "candle signal");
                            execute_signal(&signal, &exchange, &strategy_name).await;
                        }
                    }
                }

                // 也把 tick 直接给策略（高频策略用）
                if let Some(signal) = strategy.on_tick(tick) {
                    if signal != Signal::None {
                        tracing::info!(?signal, "tick signal");
                        execute_signal(&signal, &exchange, &strategy_name).await;
                    }
                }
            }
            MarketEvent::Depth(depth) => {
                if let Some(signal) = strategy.on_depth(depth) {
                    if signal != Signal::None {
                        tracing::info!(?signal, "depth signal");
                        execute_signal(&signal, &exchange, &strategy_name).await;
                    }
                }
            }
            _ => {
                tracing::debug!(?event, "unhandled event");
            }
        }
    }
}
