use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tracing::{error, info, warn};

use crate::types::{
    BinanceAggTrade, BinanceCombinedStream, BinanceDepthUpdate, BinanceMarkPrice, MarketEvent,
};

const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com/stream";

/// WebSocket 行情源配置
#[derive(Debug, Clone)]
pub struct FeedConfig {
    /// 交易对列表（小写），如 ["btcusdt", "ethusdt"]
    pub symbols: Vec<String>,
    /// 是否订阅 aggTrade
    pub agg_trade: bool,
    /// 是否订阅 depth（增量深度）
    pub depth: bool,
    /// depth 推送频率："100ms" | "250ms" | "500ms"
    pub depth_speed: String,
    /// 是否订阅 markPrice
    pub mark_price: bool,
}

impl Default for FeedConfig {
    fn default() -> Self {
        Self {
            symbols: vec!["btcusdt".into()],
            agg_trade: true,
            depth: true,
            depth_speed: "100ms".into(),
            mark_price: true,
        }
    }
}

/// 构建组合流 URL
/// 格式: wss://fstream.binance.com/stream?streams=btcusdt@aggTrade/btcusdt@depth@100ms
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

/// 解析组合流消息，转换为 MarketEvent
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

/// 启动 WebSocket 行情流
///
/// 返回一个 mpsc::Receiver，策略层从中读取 MarketEvent。
/// 内部自动处理重连（指数退避，最大 30 秒）。
pub async fn start_feed(
    config: FeedConfig,
    buffer_size: usize,
) -> mpsc::Receiver<MarketEvent> {
    let (tx, rx) = mpsc::channel(buffer_size);

    tokio::spawn(async move {
        feed_loop(config, tx).await;
    });

    rx
}

/// 主循环：连接 → 读取 → 断开 → 重连
async fn feed_loop(config: FeedConfig, tx: mpsc::Sender<MarketEvent>) {
    let url_str = build_stream_url(&config);
    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);
    // markPrice 每 1 秒推送，30 秒无消息 = 连接已死
    let read_timeout = std::time::Duration::from_secs(30);

    loop {
        info!(url = %url_str, "connecting to binance ws");

        match connect_async(&url_str).await {
            Ok((ws_stream, _)) => {
                info!("ws connected");
                retry_delay = std::time::Duration::from_secs(1); // 重置退避
                let mut msg_count: u64 = 0;

                let (mut write, mut read) = ws_stream.split();

                // 读取消息循环（带超时检测死连接）
                loop {
                    match tokio::time::timeout(read_timeout, read.next()).await {
                        Ok(Some(msg)) => match msg {
                            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                                msg_count += 1;
                                // 前 5 条消息打印 stream 类型，帮助诊断
                                if msg_count <= 5 {
                                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                                        let stream_name = v.get("stream").and_then(|s| s.as_str()).unwrap_or("?");
                                        info!(msg_count, stream = stream_name, "ws feed received");
                                    }
                                }
                                if let Some(event) = parse_combined_message(&text) {
                                    // 如果 channel 满了，丢弃旧数据（HFT 不等待）
                                    if tx.try_send(event).is_err() {
                                        warn!("event channel full, dropping event");
                                    }
                                }
                                // 每 500 条消息记录一次统计
                                if msg_count % 500 == 0 {
                                    info!(msg_count, "ws feed messages received");
                                }
                            }
                            Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                                if let Err(e) = write
                                    .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                    .await
                                {
                                    error!(%e, "failed to send pong");
                                    break;
                                }
                            }
                            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                                warn!("ws server sent close frame");
                                break;
                            }
                            Err(e) => {
                                error!(%e, "ws read error");
                                break;
                            }
                            _ => {} // Binary, Frame 等忽略
                        },
                        Ok(None) => {
                            // stream 结束
                            warn!("ws stream ended");
                            break;
                        }
                        Err(_) => {
                            // 超时：连接可能已死
                            warn!(timeout_secs = read_timeout.as_secs(), msg_count, "ws read timeout, reconnecting");
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                error!(%e, "ws connect failed");
            }
        }

        // 检查接收端是否还活着
        if tx.is_closed() {
            info!("event receiver dropped, stopping feed");
            return;
        }

        warn!(delay_secs = retry_delay.as_secs(), "reconnecting after delay");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_stream_url() {
        let config = FeedConfig {
            symbols: vec!["btcusdt".into(), "ethusdt".into()],
            agg_trade: true,
            depth: true,
            depth_speed: "100ms".into(),
            mark_price: false,
        };

        let url = build_stream_url(&config);
        assert!(url.contains("btcusdt@aggTrade"));
        assert!(url.contains("ethusdt@depth@100ms"));
        assert!(!url.contains("markPrice"));
    }

    #[test]
    fn test_parse_agg_trade() {
        let raw = r#"{"stream":"btcusdt@aggTrade","data":{"e":"aggTrade","E":1700000000000,"s":"BTCUSDT","p":"42000.50","q":"0.001","T":1700000000000,"m":false}}"#;
        let event = parse_combined_message(raw);
        assert!(matches!(event, Some(MarketEvent::Tick(_))));
        if let Some(MarketEvent::Tick(tick)) = event {
            assert_eq!(tick.symbol, "BTCUSDT");
            assert!((tick.price - 42000.50).abs() < 0.01);
        }
    }

    #[test]
    fn test_parse_depth() {
        let raw = r#"{"stream":"btcusdt@depth@100ms","data":{"e":"depthUpdate","E":1700000000000,"s":"BTCUSDT","b":[["42000.00","1.5"]],"a":[["42001.00","0.8"]]}}"#;
        let event = parse_combined_message(raw);
        assert!(matches!(event, Some(MarketEvent::Depth(_))));
        if let Some(MarketEvent::Depth(depth)) = event {
            assert_eq!(depth.bids.len(), 1);
            assert_eq!(depth.asks.len(), 1);
            assert!((depth.bids[0].price - 42000.0).abs() < 0.01);
        }
    }

    #[test]
    fn test_parse_mark_price() {
        let raw = r#"{"stream":"btcusdt@markPrice@1s","data":{"e":"markPriceUpdate","E":1700000000000,"s":"BTCUSDT","p":"42000.50","r":"0.00010000","T":1700000100000}}"#;
        let event = parse_combined_message(raw);
        assert!(matches!(event, Some(MarketEvent::MarkPrice(_))));
        if let Some(MarketEvent::MarkPrice(mp)) = event {
            assert!((mp.mark_price - 42000.50).abs() < 0.01);
            assert!((mp.funding_rate - 0.0001).abs() < 0.00001);
        }
    }
}
