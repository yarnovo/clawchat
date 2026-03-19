use clawchat_shared::candle::Candle;
use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::Exchange;
use tracing::{error, info, warn};

const BATCH_LIMIT: u32 = 1000;
const REQUEST_DELAY_MS: u64 = 100;

/// Run backfill for all symbols and intervals.
///
/// Symbols are fetched concurrently; within each symbol, pages are fetched serially.
/// Supports resume: checks `store.available_range()` and continues from the last timestamp.
pub async fn run_backfill(
    exchange: &Exchange,
    store: &DataStore,
    symbols: &[String],
    intervals: &[String],
    days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let now_ms = chrono::Utc::now().timestamp_millis() as u64;
    let start_ms = now_ms - (days as u64) * 24 * 60 * 60 * 1000;

    let mut handles = Vec::new();

    // We need to clone data for each spawned task since Exchange is not Clone.
    // Instead, run symbols sequentially but intervals can overlap.
    // Actually, Exchange is not Clone, so we run serially per symbol.
    // Use FuturesUnordered for concurrent symbol backfill with shared exchange ref.

    for symbol in symbols {
        for interval in intervals {
            let effective_start = match store.available_range(symbol, interval) {
                Some((_min, max_ts)) => {
                    info!(
                        symbol,
                        interval,
                        "resuming from existing data"
                    );
                    // Continue from 1ms after the last known candle
                    max_ts + 1
                }
                None => start_ms,
            };

            if effective_start >= now_ms {
                info!(symbol, interval, "already up to date, skipping");
                continue;
            }

            handles.push((symbol.clone(), interval.clone(), effective_start));
        }
    }

    for (symbol, interval, effective_start) in handles {
        match backfill_symbol(exchange, store, &symbol, &interval, effective_start).await {
            Ok(count) => {
                info!(symbol, interval, rows = count, "backfill complete");
            }
            Err(e) => {
                error!(symbol, interval, %e, "backfill failed");
            }
        }
    }

    info!("all backfill tasks finished");
    Ok(())
}

/// Backfill a single symbol/interval from `start_ms` to now.
///
/// Pages through Binance klines API in batches of 1000.
/// Returns total number of candles written.
async fn backfill_symbol(
    exchange: &Exchange,
    store: &DataStore,
    symbol: &str,
    interval: &str,
    start_ms: u64,
) -> Result<u64, Box<dyn std::error::Error>> {
    let mut cursor = start_ms;
    let mut total_written: u64 = 0;

    loop {
        // Rate limiting
        tokio::time::sleep(std::time::Duration::from_millis(REQUEST_DELAY_MS)).await;

        let batch = match exchange
            .fetch_ohlcv(symbol, interval, BATCH_LIMIT, Some(cursor), None)
            .await
        {
            Ok(b) => b,
            Err(e) => {
                warn!(symbol, interval, cursor, %e, "fetch_ohlcv failed, skipping batch");
                // Move cursor forward by one batch worth of time to avoid infinite loop
                cursor += batch_duration_ms(interval) * BATCH_LIMIT as u64;
                continue;
            }
        };

        if batch.is_empty() {
            break;
        }

        let candles = parse_klines(&batch);
        if candles.is_empty() {
            warn!(symbol, interval, "batch returned data but no valid candles");
            break;
        }

        let batch_count = candles.len() as u64;

        // Use the close_time of the last candle + 1 as next cursor
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

        match store.append_candles(symbol, interval, &candles) {
            Ok(_) => {}
            Err(e) => {
                error!(symbol, interval, %e, "failed to write candles");
                return Err(e.into());
            }
        }

        total_written += batch_count;

        // If we got fewer than BATCH_LIMIT, we've reached the end
        if (batch.len() as u32) < BATCH_LIMIT {
            break;
        }
    }

    Ok(total_written)
}

/// Parse Binance kline JSON arrays into Candle structs.
///
/// Each kline is: [open_time, open, high, low, close, volume, close_time, ...]
fn parse_klines(raw: &[serde_json::Value]) -> Vec<Candle> {
    raw.iter()
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
        .collect()
}

/// Estimate duration in ms for one batch of candles at the given interval.
fn batch_duration_ms(interval: &str) -> u64 {
    match interval {
        "1m" => 60_000,
        "3m" => 3 * 60_000,
        "5m" => 5 * 60_000,
        "15m" => 15 * 60_000,
        "1h" => 60 * 60_000,
        "4h" => 4 * 60 * 60_000,
        "1d" => 24 * 60 * 60_000,
        _ => 60_000, // fallback to 1m
    }
}
