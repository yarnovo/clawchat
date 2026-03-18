pub mod config;
pub mod exchange;
pub mod risk;
pub mod strategy;
pub mod types;
pub mod ws_feed;

use config::Config;
use exchange::Exchange;

use crate::ws_feed::{start_feed, FeedConfig};

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

    // 启动行情 WebSocket 流
    let feed_config = FeedConfig {
        symbols: vec![config.symbol.to_lowercase()],
        ..FeedConfig::default()
    };
    let mut rx = start_feed(feed_config, 4096).await;

    // 事件循环（后续替换为策略分发）
    while let Some(event) = rx.recv().await {
        tracing::debug!(?event, "market event");
    }
}
