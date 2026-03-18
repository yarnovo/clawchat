pub mod config;
pub mod exchange;
pub mod risk;
pub mod strategy;
pub mod types;
pub mod ws_feed;

use config::Config;
use exchange::Exchange;
use strategy::{CandleAggregator, MarketMaker, Signal, Strategy, TrendFollower};
use types::{MarketEvent, OrderType as StratOrderType, Side as StratSide};

use crate::ws_feed::{start_feed, FeedConfig};

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

/// 根据 config.strategy 创建策略实例
fn create_strategy(config: &Config) -> Box<dyn Strategy> {
    let qty = default_order_qty(&config.symbol);
    tracing::info!(symbol = %config.symbol, order_qty = qty, "order qty for symbol");

    match config.strategy.as_str() {
        "market_maker" | "mm" => {
            tracing::info!("using MarketMaker strategy");
            Box::new(MarketMaker::new(&config.symbol, 0.0004, qty))
        }
        _ => {
            // 默认使用 TrendFollower
            tracing::info!("using TrendFollower strategy");
            Box::new(TrendFollower::new(&config.symbol, qty))
        }
    }
}

/// 将策略信号转为交易所下单
async fn execute_signal(signal: &Signal, exchange: &Exchange) {
    let Signal::Order(req) = signal else { return };

    let side = match req.side {
        StratSide::Buy => exchange::Side::Buy,
        StratSide::Sell => exchange::Side::Sell,
    };
    // 简化：Buy → Long, Sell → Short
    let pos_side = match req.side {
        StratSide::Buy => exchange::PositionSide::Long,
        StratSide::Sell => exchange::PositionSide::Short,
    };

    let result = match req.order_type {
        StratOrderType::Market => {
            exchange.market_order(side, pos_side, req.qty).await
        }
        StratOrderType::Limit => {
            let price = req.price.unwrap_or(0.0);
            exchange.limit_order(side, pos_side, req.qty, price).await
        }
    };

    match result {
        Ok(resp) => tracing::info!(?resp, "order executed"),
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
    tracing::info!("symbol={} leverage={} strategy={} dry_run={}", config.symbol, config.leverage, config.strategy, config.dry_run);

    let exchange = Exchange::new(&config);

    if let Err(e) = exchange.set_leverage(config.leverage).await {
        tracing::error!("failed to set leverage: {e}");
    }

    let mut strategy = create_strategy(&config);
    let mut aggregator = CandleAggregator::new(300_000); // 5 分钟 K 线

    tracing::info!("strategy={} candle_interval=5m", strategy.name());

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
                            execute_signal(&signal, &exchange).await;
                        }
                    }
                }

                // 也把 tick 直接给策略（高频策略用）
                if let Some(signal) = strategy.on_tick(tick) {
                    if signal != Signal::None {
                        tracing::info!(?signal, "tick signal");
                        execute_signal(&signal, &exchange).await;
                    }
                }
            }
            MarketEvent::Depth(depth) => {
                if let Some(signal) = strategy.on_depth(depth) {
                    if signal != Signal::None {
                        tracing::info!(?signal, "depth signal");
                        execute_signal(&signal, &exchange).await;
                    }
                }
            }
            _ => {
                tracing::debug!(?event, "unhandled event");
            }
        }
    }
}
