use clawchat_shared::candle::Candle;
use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::Exchange;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio_tungstenite::connect_async;
use tracing::{debug, error, info, warn};

const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com/stream";
const GAP_CHECK_INTERVAL_SECS: u64 = 300; // 5 minutes
const GAP_CHECK_HOURS: u64 = 1;
const REQUEST_DELAY_MS: u64 = 100;

// ── Binance kline WS message types ──────────────────────────

#[derive(Deserialize)]
struct BinanceCombinedKline {
    #[allow(dead_code)]
    stream: String,
    data: BinanceKlineEvent,
}

#[derive(Deserialize)]
struct BinanceKlineEvent {
    #[serde(rename = "e")]
    #[allow(dead_code)]
    event_type: String,
    #[serde(rename = "s")]
    symbol: String,
    k: BinanceKline,
}

#[derive(Deserialize)]
struct BinanceKline {
    #[serde(rename = "t")]
    open_time: u64,
    #[serde(rename = "o")]
    open: String,
    #[serde(rename = "h")]
    high: String,
    #[serde(rename = "l")]
    low: String,
    #[serde(rename = "c")]
    close: String,
    #[serde(rename = "v")]
    volume: String,
    #[serde(rename = "i")]
    interval: String,
    #[serde(rename = "x")]
    is_closed: bool,
}

// ── Public API ──────────────────────────────────────────────

/// Start realtime kline collection via Binance WS.
///
/// Connects to combined kline streams for all symbols/intervals,
/// stores closed candles, and periodically runs gap detection.
pub async fn run_collector(
    exchange: &Exchange,
    store: &DataStore,
    symbols: &[String],
    intervals: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
    let url = build_kline_url(symbols, intervals);
    info!(url = %url, symbols = ?symbols, intervals = ?intervals, "starting realtime kline collector");

    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);
    let read_timeout = std::time::Duration::from_secs(60);
    let mut consecutive_failures: u32 = 0;
    let mut total_stored: u64 = 0;

    loop {
        info!(url = %url, "connecting to binance kline ws");

        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                info!("ws kline connected");
                retry_delay = std::time::Duration::from_secs(1);
                consecutive_failures = 0;

                let (mut write, mut read) = ws_stream.split();
                let mut msg_count: u64 = 0;
                let mut last_gap_check = std::time::Instant::now();

                loop {
                    // Periodic gap detection
                    if last_gap_check.elapsed().as_secs() >= GAP_CHECK_INTERVAL_SECS {
                        info!("running periodic gap detection");
                        run_gap_detection(exchange, store, symbols, intervals).await;
                        last_gap_check = std::time::Instant::now();
                    }

                    match tokio::time::timeout(read_timeout, read.next()).await {
                        Ok(Some(msg)) => match msg {
                            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                                msg_count += 1;

                                if msg_count <= 3 {
                                    info!(msg_count, "ws kline message received");
                                }

                                match serde_json::from_str::<BinanceCombinedKline>(&text) {
                                    Ok(combined) => {
                                        let event = combined.data;
                                        let kline = &event.k;

                                        if !kline.is_closed {
                                            continue;
                                        }

                                        // Parse prices
                                        let candle = match parse_ws_kline(kline, event.symbol.as_str()) {
                                            Some(c) => c,
                                            None => {
                                                warn!(symbol = %event.symbol, "failed to parse kline prices");
                                                continue;
                                            }
                                        };

                                        debug!(
                                            symbol = %event.symbol,
                                            interval = %kline.interval,
                                            ts = candle.timestamp,
                                            close = candle.close,
                                            "closed kline received"
                                        );

                                        match store.append_candles(
                                            &event.symbol,
                                            &kline.interval,
                                            &[candle],
                                        ) {
                                            Ok(n) => {
                                                if n > 0 {
                                                    total_stored += n as u64;
                                                    info!(
                                                        symbol = %event.symbol,
                                                        interval = %kline.interval,
                                                        total_stored,
                                                        "candle stored"
                                                    );
                                                }
                                            }
                                            Err(e) => {
                                                error!(
                                                    symbol = %event.symbol,
                                                    interval = %kline.interval,
                                                    %e,
                                                    "failed to store candle"
                                                );
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        debug!(%e, "failed to parse ws message as kline");
                                    }
                                }

                                if msg_count % 500 == 0 {
                                    info!(msg_count, total_stored, "ws kline stats");
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
                            _ => {} // Binary, Frame etc — ignore
                        },
                        Ok(None) => {
                            warn!("ws stream ended");
                            break;
                        }
                        Err(_) => {
                            warn!(
                                timeout_secs = read_timeout.as_secs(),
                                msg_count,
                                "ws read timeout, reconnecting"
                            );
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                error!(%e, "ws connect failed");
                consecutive_failures += 1;
            }
        }

        if consecutive_failures >= 10 {
            error!(
                consecutive_failures,
                "10+ consecutive connection failures — still retrying"
            );
        }

        // After reconnect, trigger gap detection to fill any missed data
        info!("post-reconnect gap detection");
        run_gap_detection(exchange, store, symbols, intervals).await;

        warn!(delay_secs = retry_delay.as_secs(), "reconnecting after delay");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

// ── Gap Detection ───────────────────────────────────────────

/// Detect and fill gaps in the last N hours of kline data via REST API.
///
/// Returns the number of candles filled.
async fn detect_and_fill_gaps(
    exchange: &Exchange,
    store: &DataStore,
    symbol: &str,
    interval: &str,
    hours: u64,
) -> Result<u32, Box<dyn std::error::Error>> {
    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let check_start = now_ms.saturating_sub(hours * 3600 * 1000);
    let interval_ms = interval_to_ms(interval);

    let candles = match store.read_candles(symbol, interval, Some(check_start), None) {
        Ok(c) => c,
        Err(_) => {
            // No data at all — fetch the full range
            debug!(symbol, interval, hours, "no data found, fetching full range");
            return fetch_and_store_range(exchange, store, symbol, interval, check_start, now_ms)
                .await;
        }
    };

    if candles.is_empty() {
        return fetch_and_store_range(exchange, store, symbol, interval, check_start, now_ms).await;
    }

    // Find gaps: walk expected timestamps and check for missing
    let mut gaps: Vec<(u64, u64)> = Vec::new(); // (gap_start, gap_end)
    let mut prev_ts = candles[0].timestamp;

    for c in &candles[1..] {
        let expected_next = prev_ts + interval_ms;
        if c.timestamp > expected_next {
            // Gap found: from expected_next to c.timestamp (exclusive)
            gaps.push((expected_next, c.timestamp));
        }
        prev_ts = c.timestamp;
    }

    // Also check if there's a gap between last candle and now
    let last_ts = candles.last().unwrap().timestamp;
    let expected_latest = now_ms - interval_ms; // Allow one interval of slack
    if last_ts + interval_ms < expected_latest {
        gaps.push((last_ts + interval_ms, now_ms));
    }

    if gaps.is_empty() {
        debug!(symbol, interval, "no gaps detected");
        return Ok(0);
    }

    info!(symbol, interval, gap_count = gaps.len(), "gaps detected, filling");

    let mut total_filled: u32 = 0;
    for (gap_start, gap_end) in gaps {
        match fetch_and_store_range(exchange, store, symbol, interval, gap_start, gap_end).await {
            Ok(n) => total_filled += n,
            Err(e) => {
                warn!(symbol, interval, %e, "failed to fill gap");
            }
        }
        // Rate limiting between gap fills
        tokio::time::sleep(std::time::Duration::from_millis(REQUEST_DELAY_MS)).await;
    }

    if total_filled > 0 {
        info!(symbol, interval, filled = total_filled, "gap fill complete");
    }

    Ok(total_filled)
}

/// Fetch klines for a time range via REST and store them.
async fn fetch_and_store_range(
    exchange: &Exchange,
    store: &DataStore,
    symbol: &str,
    interval: &str,
    start_ms: u64,
    end_ms: u64,
) -> Result<u32, Box<dyn std::error::Error>> {
    let mut cursor = start_ms;
    let mut total: u32 = 0;

    while cursor < end_ms {
        tokio::time::sleep(std::time::Duration::from_millis(REQUEST_DELAY_MS)).await;

        let batch = exchange
            .fetch_ohlcv(symbol, interval, 1000, Some(cursor), Some(end_ms))
            .await?;

        if batch.is_empty() {
            break;
        }

        let candles: Vec<Candle> = batch
            .iter()
            .filter_map(|v| {
                let arr = v.as_array()?;
                if arr.len() < 7 {
                    return None;
                }
                Some(Candle {
                    timestamp: arr[0].as_u64()?,
                    open: arr[1].as_str()?.parse().ok()?,
                    high: arr[2].as_str()?.parse().ok()?,
                    low: arr[3].as_str()?.parse().ok()?,
                    close: arr[4].as_str()?.parse().ok()?,
                    volume: arr[5].as_str()?.parse().ok()?,
                })
            })
            .collect();

        if candles.is_empty() {
            break;
        }

        // Advance cursor past the last candle's close time
        if let Some(last) = batch.last() {
            let close_time = last
                .as_array()
                .and_then(|arr| arr.get(6))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            cursor = close_time + 1;
        } else {
            break;
        }

        let count = candles.len() as u32;
        store.append_candles(symbol, interval, &candles)?;
        total += count;

        if (batch.len() as u32) < 1000 {
            break;
        }
    }

    Ok(total)
}

/// Run gap detection for all symbol/interval pairs. Errors are logged, not propagated.
async fn run_gap_detection(
    exchange: &Exchange,
    store: &DataStore,
    symbols: &[String],
    intervals: &[String],
) {
    for symbol in symbols {
        for interval in intervals {
            match detect_and_fill_gaps(exchange, store, symbol, interval, GAP_CHECK_HOURS).await {
                Ok(filled) => {
                    if filled > 0 {
                        info!(symbol, interval, filled, "gaps filled");
                    }
                }
                Err(e) => {
                    warn!(symbol, interval, %e, "gap detection failed");
                }
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────

/// Build combined kline stream URL.
fn build_kline_url(symbols: &[String], intervals: &[String]) -> String {
    let streams: Vec<String> = symbols
        .iter()
        .flat_map(|sym| {
            let s = sym.to_lowercase();
            intervals
                .iter()
                .map(move |intv| format!("{s}@kline_{intv}"))
        })
        .collect();

    format!("{}?streams={}", BINANCE_FSTREAM_WS, streams.join("/"))
}

/// Parse a WS kline into a Candle. Returns None if any price fails to parse.
fn parse_ws_kline(k: &BinanceKline, _symbol: &str) -> Option<Candle> {
    Some(Candle {
        timestamp: k.open_time,
        open: k.open.parse().ok()?,
        high: k.high.parse().ok()?,
        low: k.low.parse().ok()?,
        close: k.close.parse().ok()?,
        volume: k.volume.parse().ok()?,
    })
}

/// Convert interval string to milliseconds.
fn interval_to_ms(interval: &str) -> u64 {
    match interval {
        "1m" => 60_000,
        "3m" => 3 * 60_000,
        "5m" => 5 * 60_000,
        "15m" => 15 * 60_000,
        "1h" => 60 * 60_000,
        "4h" => 4 * 60 * 60_000,
        "1d" => 24 * 60 * 60_000,
        _ => 60_000,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_kline_url() {
        let symbols = vec!["NTRNUSDT".to_string(), "BARDUSDT".to_string()];
        let intervals = vec!["1m".to_string()];
        let url = build_kline_url(&symbols, &intervals);
        assert!(url.contains("ntrnusdt@kline_1m"));
        assert!(url.contains("bardusdt@kline_1m"));
        assert!(url.starts_with("wss://fstream.binance.com/stream?streams="));
    }

    #[test]
    fn test_build_kline_url_multi_interval() {
        let symbols = vec!["NTRNUSDT".to_string()];
        let intervals = vec!["1m".to_string(), "5m".to_string()];
        let url = build_kline_url(&symbols, &intervals);
        assert!(url.contains("ntrnusdt@kline_1m"));
        assert!(url.contains("ntrnusdt@kline_5m"));
    }

    #[test]
    fn test_parse_ws_kline() {
        let k = BinanceKline {
            open_time: 1711843200000,
            open: "1.2345".to_string(),
            high: "1.2400".to_string(),
            low: "1.2300".to_string(),
            close: "1.2380".to_string(),
            volume: "12345.6".to_string(),
            interval: "1m".to_string(),
            is_closed: true,
        };
        let candle = parse_ws_kline(&k, "NTRNUSDT").unwrap();
        assert_eq!(candle.timestamp, 1711843200000);
        assert!((candle.open - 1.2345).abs() < 0.0001);
        assert!((candle.close - 1.2380).abs() < 0.0001);
        assert!((candle.volume - 12345.6).abs() < 0.1);
    }

    #[test]
    fn test_parse_ws_kline_invalid() {
        let k = BinanceKline {
            open_time: 0,
            open: "not_a_number".to_string(),
            high: "1.0".to_string(),
            low: "1.0".to_string(),
            close: "1.0".to_string(),
            volume: "1.0".to_string(),
            interval: "1m".to_string(),
            is_closed: true,
        };
        assert!(parse_ws_kline(&k, "TEST").is_none());
    }

    #[test]
    fn test_interval_to_ms() {
        assert_eq!(interval_to_ms("1m"), 60_000);
        assert_eq!(interval_to_ms("5m"), 300_000);
        assert_eq!(interval_to_ms("15m"), 900_000);
        assert_eq!(interval_to_ms("1h"), 3_600_000);
        assert_eq!(interval_to_ms("1d"), 86_400_000);
    }

    #[test]
    fn test_deserialize_kline_message() {
        let raw = r#"{
            "stream": "ntrnusdt@kline_1m",
            "data": {
                "e": "kline",
                "s": "NTRNUSDT",
                "k": {
                    "t": 1711843200000,
                    "T": 1711843259999,
                    "s": "NTRNUSDT",
                    "i": "1m",
                    "o": "1.2345",
                    "h": "1.2400",
                    "l": "1.2300",
                    "c": "1.2380",
                    "v": "12345.6",
                    "x": true
                }
            }
        }"#;

        let msg: BinanceCombinedKline = serde_json::from_str(raw).unwrap();
        assert_eq!(msg.stream, "ntrnusdt@kline_1m");
        assert_eq!(msg.data.symbol, "NTRNUSDT");
        assert!(msg.data.k.is_closed);
        assert_eq!(msg.data.k.open_time, 1711843200000);
    }

    #[test]
    fn test_deserialize_unclosed_kline() {
        let raw = r#"{
            "stream": "ntrnusdt@kline_1m",
            "data": {
                "e": "kline",
                "s": "NTRNUSDT",
                "k": {
                    "t": 1711843200000,
                    "T": 1711843259999,
                    "s": "NTRNUSDT",
                    "i": "1m",
                    "o": "1.2345",
                    "h": "1.2400",
                    "l": "1.2300",
                    "c": "1.2380",
                    "v": "12345.6",
                    "x": false
                }
            }
        }"#;

        let msg: BinanceCombinedKline = serde_json::from_str(raw).unwrap();
        assert!(!msg.data.k.is_closed);
    }
}
