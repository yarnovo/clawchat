//! Gateway — WS 连接池 + 行情广播
//!
//! 每个 unique symbol 一个 WS 连接，通过 broadcast channel 广播 MarketEvent。
//! 复用 ws_feed.rs 的连接/重连模式（指数退避，max 30s）。

use std::collections::HashMap;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::broadcast;
use tokio_tungstenite::connect_async;
use tracing::{error, info, warn};

use crate::types::{
    BinanceAggTrade, BinanceCombinedStream, BinanceDepthUpdate, BinanceMarkPrice, MarketEvent,
};
use crate::ws_feed::FeedConfig;

const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com/stream";

/// broadcast channel 容量
const CHANNEL_CAPACITY: usize = 4096;

// ── UserEvent ────────────────────────────────────────────────

/// 用户数据流事件
#[derive(Debug, Clone)]
pub enum UserEvent {
    /// 标记价格更新（含资金费率）
    MarkPrice {
        symbol: String,
        mark_price: f64,
        funding_rate: f64,
    },
    /// 持仓更新（ACCOUNT_UPDATE）
    PositionUpdate {
        symbol: String,
        position_side: String,
        position_amt: f64,
        entry_price: f64,
        unrealized_pnl: f64,
    },
    /// 余额更新
    BalanceUpdate {
        wallet_balance: f64,
    },
    /// 订单更新（ORDER_TRADE_UPDATE）— 用于 PnL 归因
    OrderUpdate {
        symbol: String,
        client_order_id: String,
        side: String,
        status: String,
        qty: f64,
        price: f64,
        commission: f64,
        realized_pnl: f64,
    },
}

// ── Gateway ──────────────────────────────────────────────────

/// 行情广播器：per-symbol broadcast channel
pub struct Gateway {
    /// symbol (大写, e.g. "BTCUSDT") → broadcast sender
    channels: HashMap<String, broadcast::Sender<MarketEvent>>,
    /// 用户数据流 sender
    user_tx: broadcast::Sender<UserEvent>,
}

impl Gateway {
    /// 创建 Gateway 并为每个 unique symbol 建立 broadcast channel
    pub fn new(symbols: &[String]) -> Self {
        let mut channels = HashMap::new();
        for sym in symbols {
            let upper = sym.to_uppercase();
            if !channels.contains_key(&upper) {
                let (tx, _) = broadcast::channel(CHANNEL_CAPACITY);
                channels.insert(upper, tx);
            }
        }
        let (user_tx, _) = broadcast::channel(CHANNEL_CAPACITY);
        Self { channels, user_tx }
    }

    /// 订阅某个 symbol 的行情（symbol 大写）
    pub fn subscribe_market(&self, symbol: &str) -> Option<broadcast::Receiver<MarketEvent>> {
        self.channels.get(symbol).map(|tx| tx.subscribe())
    }

    /// 订阅用户数据流
    pub fn subscribe_user(&self) -> broadcast::Receiver<UserEvent> {
        self.user_tx.subscribe()
    }

    /// 启动所有 WS 连接（每个 unique symbol 一个 combined stream task）
    ///
    /// `feed_configs` 用于确定每个 symbol 订阅哪些流（aggTrade/depth/markPrice）。
    /// 返回 JoinHandle 列表。
    pub async fn start(
        &self,
        feed_configs: Vec<FeedConfig>,
    ) -> Vec<tokio::task::JoinHandle<()>> {
        let mut handles = Vec::new();

        for config in feed_configs {
            // FeedConfig 的 symbols 可能包含多个 symbol，但 Gateway 设计是 per-symbol
            // 为兼容，遍历 config 中每个 symbol，克隆 config 并单独启动
            for sym in &config.symbols {
                let upper = sym.to_uppercase();
                if let Some(tx) = self.channels.get(&upper) {
                    let tx = tx.clone();
                    let single_config = FeedConfig {
                        symbols: vec![sym.clone()],
                        agg_trade: config.agg_trade,
                        depth: config.depth,
                        depth_speed: config.depth_speed.clone(),
                        mark_price: config.mark_price,
                    };
                    handles.push(tokio::spawn(async move {
                        feed_loop(single_config, tx).await;
                    }));
                }
            }
        }

        handles
    }

    /// 获取用户数据流的 broadcast sender（供外部 user data stream task 使用）
    pub fn user_sender(&self) -> broadcast::Sender<UserEvent> {
        self.user_tx.clone()
    }
}

// ── 内部：行情 WS 循环 ──────────────────────────────────────

/// 构建组合流 URL
fn build_stream_url(config: &FeedConfig) -> String {
    let mut streams = Vec::new();
    for sym in &config.symbols {
        let s = sym.to_lowercase();
        if config.agg_trade {
            streams.push(format!("{s}@aggTrade"));
        }
        if config.depth {
            streams.push(format!("{s}@depth@{}", config.depth_speed));
        }
        if config.mark_price {
            streams.push(format!("{s}@markPrice@1s"));
        }
    }
    format!("{}?streams={}", BINANCE_FSTREAM_WS, streams.join("/"))
}

/// 解析组合流消息
fn parse_combined_message(raw: &str) -> Option<MarketEvent> {
    let combined: BinanceCombinedStream = serde_json::from_str(raw).ok()?;
    let stream = &combined.stream;

    if stream.ends_with("@aggTrade") {
        match serde_json::from_value::<BinanceAggTrade>(combined.data) {
            Ok(agg) => Some(MarketEvent::Tick(agg.into_tick())),
            Err(e) => {
                warn!(%stream, %e, "failed to parse aggTrade");
                None
            }
        }
    } else if stream.contains("@depth") {
        match serde_json::from_value::<BinanceDepthUpdate>(combined.data) {
            Ok(depth) => Some(MarketEvent::Depth(depth.into_depth())),
            Err(e) => {
                warn!(%stream, %e, "failed to parse depth");
                None
            }
        }
    } else if stream.contains("@markPrice") {
        match serde_json::from_value::<BinanceMarkPrice>(combined.data) {
            Ok(mp) => Some(MarketEvent::MarkPrice(mp.into_mark_price())),
            Err(e) => {
                warn!(%stream, %e, "failed to parse markPrice");
                None
            }
        }
    } else {
        warn!(stream, "unknown stream type, skipping");
        None
    }
}

/// 主循环：连接 → 读取 → 广播 → 断开 → 重连（指数退避，max 30s）
async fn feed_loop(config: FeedConfig, tx: broadcast::Sender<MarketEvent>) {
    let url_str = build_stream_url(&config);
    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);
    let read_timeout = std::time::Duration::from_secs(30);

    loop {
        info!(url = %url_str, "gateway: connecting to binance ws");

        match connect_async(&url_str).await {
            Ok((ws_stream, _)) => {
                info!("gateway: ws connected");
                retry_delay = std::time::Duration::from_secs(1);
                let mut msg_count: u64 = 0;

                let (mut write, mut read) = ws_stream.split();

                loop {
                    match tokio::time::timeout(read_timeout, read.next()).await {
                        Ok(Some(msg)) => match msg {
                            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                                msg_count += 1;
                                if msg_count <= 5 {
                                    if let Ok(v) =
                                        serde_json::from_str::<serde_json::Value>(&text)
                                    {
                                        let stream_name = v
                                            .get("stream")
                                            .and_then(|s| s.as_str())
                                            .unwrap_or("?");
                                        info!(msg_count, stream = stream_name, "gateway: ws feed received");
                                    }
                                }
                                if let Some(event) = parse_combined_message(&text) {
                                    // broadcast: 如果没有 receiver 也不 panic
                                    let _ = tx.send(event);
                                }
                                if msg_count % 500 == 0 {
                                    info!(msg_count, "gateway: ws feed messages received");
                                }
                            }
                            Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                                if let Err(e) = write
                                    .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                    .await
                                {
                                    error!(%e, "gateway: failed to send pong");
                                    break;
                                }
                            }
                            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                                warn!("gateway: ws server sent close frame");
                                break;
                            }
                            Err(e) => {
                                error!(%e, "gateway: ws read error");
                                break;
                            }
                            _ => {}
                        },
                        Ok(None) => {
                            warn!("gateway: ws stream ended");
                            break;
                        }
                        Err(_) => {
                            warn!(
                                timeout_secs = read_timeout.as_secs(),
                                msg_count, "gateway: ws read timeout, reconnecting"
                            );
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                error!(%e, "gateway: ws connect failed");
            }
        }

        // 如果没有订阅者了，停止
        if tx.receiver_count() == 0 {
            info!("gateway: no receivers left, stopping feed");
            return;
        }

        warn!(delay_secs = retry_delay.as_secs(), "gateway: reconnecting after delay");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gateway_creates_channels_for_each_symbol() {
        let gw = Gateway::new(&[
            "BTCUSDT".to_string(),
            "ETHUSDT".to_string(),
            "btcusdt".to_string(), // 重复（大小写不同）
        ]);
        // 去重后应该只有 2 个 channel
        assert_eq!(gw.channels.len(), 2);
        assert!(gw.channels.contains_key("BTCUSDT"));
        assert!(gw.channels.contains_key("ETHUSDT"));
    }

    #[test]
    fn subscribe_market_returns_receiver() {
        let gw = Gateway::new(&["BTCUSDT".to_string()]);
        let rx = gw.subscribe_market("BTCUSDT");
        assert!(rx.is_some());
    }

    #[test]
    fn subscribe_nonexistent_symbol_returns_none() {
        let gw = Gateway::new(&["BTCUSDT".to_string()]);
        let rx = gw.subscribe_market("SOLUSDT");
        assert!(rx.is_none());
    }

    #[test]
    fn subscribe_user_returns_receiver() {
        let gw = Gateway::new(&["BTCUSDT".to_string()]);
        let _rx = gw.subscribe_user();
        // 不 panic 即可
    }

    #[tokio::test]
    async fn broadcast_market_event_reaches_subscriber() {
        let gw = Gateway::new(&["BTCUSDT".to_string()]);
        let mut rx = gw.subscribe_market("BTCUSDT").unwrap();

        // 直接通过 sender 发送（模拟 feed_loop 行为）
        let tx = gw.channels.get("BTCUSDT").unwrap();
        let tick = crate::types::TickData {
            symbol: "BTCUSDT".to_string(),
            price: 42000.0,
            qty: 0.1,
            timestamp: 1000,
            is_buyer_maker: false,
        };
        tx.send(MarketEvent::Tick(tick)).unwrap();

        let event = rx.recv().await.unwrap();
        match event {
            MarketEvent::Tick(t) => {
                assert_eq!(t.symbol, "BTCUSDT");
                assert!((t.price - 42000.0).abs() < 0.01);
            }
            _ => panic!("expected Tick event"),
        }
    }

    #[tokio::test]
    async fn broadcast_user_event_reaches_subscriber() {
        let gw = Gateway::new(&[]);
        let mut rx = gw.subscribe_user();

        gw.user_tx
            .send(UserEvent::BalanceUpdate {
                wallet_balance: 1000.0,
            })
            .unwrap();

        let event = rx.recv().await.unwrap();
        match event {
            UserEvent::BalanceUpdate { wallet_balance } => {
                assert!((wallet_balance - 1000.0).abs() < 0.01);
            }
            _ => panic!("expected BalanceUpdate"),
        }
    }

    #[test]
    fn multiple_subscribers_receive_same_event() {
        let gw = Gateway::new(&["ETHUSDT".to_string()]);
        let mut rx1 = gw.subscribe_market("ETHUSDT").unwrap();
        let mut rx2 = gw.subscribe_market("ETHUSDT").unwrap();

        let tx = gw.channels.get("ETHUSDT").unwrap();
        let tick = crate::types::TickData {
            symbol: "ETHUSDT".to_string(),
            price: 3000.0,
            qty: 1.0,
            timestamp: 2000,
            is_buyer_maker: true,
        };
        tx.send(MarketEvent::Tick(tick)).unwrap();

        // 两个 receiver 都应该能拿到
        assert!(rx1.try_recv().is_ok());
        assert!(rx2.try_recv().is_ok());
    }
}
