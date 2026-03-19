use crate::candle::Candle;
use arrow::array::{ArrayRef, Float64Array, UInt64Array};
use arrow::datatypes::{DataType, Field, Schema};
use arrow::record_batch::RecordBatch;
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use parquet::arrow::ArrowWriter;
use parquet::file::properties::WriterProperties;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[derive(Debug, thiserror::Error)]
pub enum DataError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Parquet error: {0}")]
    Parquet(#[from] parquet::errors::ParquetError),
    #[error("Arrow error: {0}")]
    Arrow(#[from] arrow::error::ArrowError),
    #[error("No data found for {symbol} {interval}")]
    NoData { symbol: String, interval: String },
}

#[derive(Clone)]
pub struct DataStore {
    base_dir: PathBuf,
}

impl DataStore {
    /// Create a DataStore rooted at `base_dir` (typically `data/`).
    pub fn new(base_dir: impl AsRef<Path>) -> Self {
        Self {
            base_dir: base_dir.as_ref().to_path_buf(),
        }
    }

    /// Read candles, optionally filtered by time range.
    pub fn read_candles(
        &self,
        symbol: &str,
        interval: &str,
        start_ts: Option<u64>,
        end_ts: Option<u64>,
    ) -> Result<Vec<Candle>, DataError> {
        let path = self.parquet_path(symbol, interval);
        if !path.exists() {
            return Err(DataError::NoData {
                symbol: symbol.to_string(),
                interval: interval.to_string(),
            });
        }

        let mut candles = Self::read_parquet(&path)?;

        if let Some(start) = start_ts {
            candles.retain(|c| c.timestamp >= start);
        }
        if let Some(end) = end_ts {
            candles.retain(|c| c.timestamp <= end);
        }

        Ok(candles)
    }

    /// Append candles, deduplicating by timestamp and keeping sorted order.
    /// Returns the number of new candles actually written.
    pub fn append_candles(
        &self,
        symbol: &str,
        interval: &str,
        candles: &[Candle],
    ) -> Result<usize, DataError> {
        if candles.is_empty() {
            return Ok(0);
        }

        let path = self.parquet_path(symbol, interval);

        let mut existing = if path.exists() {
            Self::read_parquet(&path)?
        } else {
            Vec::new()
        };

        let existing_count = existing.len();

        let existing_ts: HashSet<u64> = existing.iter().map(|c| c.timestamp).collect();

        for c in candles {
            if !existing_ts.contains(&c.timestamp) {
                existing.push(c.clone());
            }
        }

        let new_count = existing.len() - existing_count;
        if new_count == 0 {
            return Ok(0);
        }

        existing.sort_by_key(|c| c.timestamp);

        Self::write_parquet_atomic(&path, &existing)?;

        Ok(new_count)
    }

    /// Query the available timestamp range for a symbol/interval.
    pub fn available_range(&self, symbol: &str, interval: &str) -> Option<(u64, u64)> {
        let path = self.parquet_path(symbol, interval);
        if !path.exists() {
            return None;
        }
        let candles = Self::read_parquet(&path).ok()?;
        if candles.is_empty() {
            return None;
        }
        let min = candles.first().unwrap().timestamp;
        let max = candles.last().unwrap().timestamp;
        Some((min, max))
    }

    /// List all symbols that have data.
    pub fn list_symbols(&self) -> Vec<String> {
        let candles_dir = self.base_dir.join("candles");
        let mut symbols = Vec::new();
        if let Ok(entries) = fs::read_dir(&candles_dir) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    if let Some(name) = entry.file_name().to_str() {
                        symbols.push(name.to_string());
                    }
                }
            }
        }
        symbols.sort();
        symbols
    }

    /// List all intervals that have data for a given symbol.
    pub fn list_intervals(&self, symbol: &str) -> Vec<String> {
        let symbol_dir = self.base_dir.join("candles").join(symbol);
        let mut intervals = Vec::new();
        if let Ok(entries) = fs::read_dir(&symbol_dir) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if let Some(stem) = name.strip_suffix(".parquet") {
                        intervals.push(stem.to_string());
                    }
                }
            }
        }
        intervals.sort();
        intervals
    }

    /// Aggregate 1m candles into a higher timeframe.
    pub fn aggregate_candles(candles_1m: &[Candle], target_interval_ms: u64) -> Vec<Candle> {
        if candles_1m.is_empty() || target_interval_ms == 0 {
            return Vec::new();
        }

        let mut result: Vec<Candle> = Vec::new();

        for c in candles_1m {
            let bucket_ts = c.timestamp - (c.timestamp % target_interval_ms);

            if let Some(last) = result.last_mut() {
                if last.timestamp == bucket_ts {
                    if c.high > last.high {
                        last.high = c.high;
                    }
                    if c.low < last.low {
                        last.low = c.low;
                    }
                    last.close = c.close;
                    last.volume += c.volume;
                    continue;
                }
            }

            result.push(Candle {
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                timestamp: bucket_ts,
            });
        }

        result
    }

    // ── Internal helpers ────────────────────────────────────────

    fn parquet_path(&self, symbol: &str, interval: &str) -> PathBuf {
        self.base_dir
            .join("candles")
            .join(symbol)
            .join(format!("{interval}.parquet"))
    }

    fn candle_schema() -> Arc<Schema> {
        Arc::new(Schema::new(vec![
            Field::new("timestamp", DataType::UInt64, false),
            Field::new("open", DataType::Float64, false),
            Field::new("high", DataType::Float64, false),
            Field::new("low", DataType::Float64, false),
            Field::new("close", DataType::Float64, false),
            Field::new("volume", DataType::Float64, false),
        ]))
    }

    fn candles_to_batch(candles: &[Candle]) -> Result<RecordBatch, DataError> {
        let schema = Self::candle_schema();

        let timestamps: Vec<u64> = candles.iter().map(|c| c.timestamp).collect();
        let opens: Vec<f64> = candles.iter().map(|c| c.open).collect();
        let highs: Vec<f64> = candles.iter().map(|c| c.high).collect();
        let lows: Vec<f64> = candles.iter().map(|c| c.low).collect();
        let closes: Vec<f64> = candles.iter().map(|c| c.close).collect();
        let volumes: Vec<f64> = candles.iter().map(|c| c.volume).collect();

        let columns: Vec<ArrayRef> = vec![
            Arc::new(UInt64Array::from(timestamps)),
            Arc::new(Float64Array::from(opens)),
            Arc::new(Float64Array::from(highs)),
            Arc::new(Float64Array::from(lows)),
            Arc::new(Float64Array::from(closes)),
            Arc::new(Float64Array::from(volumes)),
        ];

        Ok(RecordBatch::try_new(schema, columns)?)
    }

    fn batch_to_candles(batch: &RecordBatch) -> Vec<Candle> {
        let timestamps = batch
            .column(0)
            .as_any()
            .downcast_ref::<UInt64Array>()
            .unwrap();
        let opens = batch
            .column(1)
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();
        let highs = batch
            .column(2)
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();
        let lows = batch
            .column(3)
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();
        let closes = batch
            .column(4)
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();
        let volumes = batch
            .column(5)
            .as_any()
            .downcast_ref::<Float64Array>()
            .unwrap();

        (0..batch.num_rows())
            .map(|i| Candle {
                timestamp: timestamps.value(i),
                open: opens.value(i),
                high: highs.value(i),
                low: lows.value(i),
                close: closes.value(i),
                volume: volumes.value(i),
            })
            .collect()
    }

    fn read_parquet(path: &Path) -> Result<Vec<Candle>, DataError> {
        let file = fs::File::open(path)?;
        let builder = ParquetRecordBatchReaderBuilder::try_new(file)?;
        let reader = builder.build()?;

        let mut candles = Vec::new();
        for batch in reader {
            let batch = batch?;
            candles.extend(Self::batch_to_candles(&batch));
        }
        Ok(candles)
    }

    fn write_parquet_atomic(path: &Path, candles: &[Candle]) -> Result<(), DataError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let batch = Self::candles_to_batch(candles)?;

        let tmp_path = path.with_extension("parquet.tmp");
        let file = fs::File::create(&tmp_path)?;
        let props = WriterProperties::builder().build();
        let mut writer = ArrowWriter::try_new(file, Self::candle_schema(), Some(props))?;
        writer.write(&batch)?;
        writer.close()?;

        fs::rename(&tmp_path, path)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn sample_candles() -> Vec<Candle> {
        vec![
            Candle { timestamp: 1000, open: 1.0, high: 1.5, low: 0.9, close: 1.2, volume: 100.0 },
            Candle { timestamp: 2000, open: 1.2, high: 1.8, low: 1.1, close: 1.6, volume: 200.0 },
            Candle { timestamp: 3000, open: 1.6, high: 2.0, low: 1.4, close: 1.9, volume: 150.0 },
        ]
    }

    #[test]
    fn write_then_read_consistency() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());

        let candles = sample_candles();
        let written = store.append_candles("TESTUSDT", "1m", &candles).unwrap();
        assert_eq!(written, 3);

        let read = store.read_candles("TESTUSDT", "1m", None, None).unwrap();
        assert_eq!(read.len(), 3);
        assert_eq!(read[0].timestamp, 1000);
        assert_eq!(read[0].open, 1.0);
        assert_eq!(read[2].close, 1.9);
    }

    #[test]
    fn append_deduplicates() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());

        store.append_candles("TESTUSDT", "1m", &sample_candles()).unwrap();

        let more = vec![
            Candle { timestamp: 2000, open: 9.9, high: 9.9, low: 9.9, close: 9.9, volume: 999.0 },
            Candle { timestamp: 4000, open: 2.0, high: 2.5, low: 1.8, close: 2.3, volume: 300.0 },
        ];
        let written = store.append_candles("TESTUSDT", "1m", &more).unwrap();
        assert_eq!(written, 1);

        let read = store.read_candles("TESTUSDT", "1m", None, None).unwrap();
        assert_eq!(read.len(), 4);
        assert_eq!(read[1].open, 1.2); // duplicate kept original values
    }

    #[test]
    fn time_range_filter() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());
        store.append_candles("TESTUSDT", "1m", &sample_candles()).unwrap();

        let filtered = store.read_candles("TESTUSDT", "1m", Some(1500), Some(2500)).unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].timestamp, 2000);
    }

    #[test]
    fn no_data_returns_error() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());

        let result = store.read_candles("NOPE", "1m", None, None);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DataError::NoData { .. }));
    }

    #[test]
    fn available_range_works() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());

        assert!(store.available_range("TESTUSDT", "1m").is_none());

        store.append_candles("TESTUSDT", "1m", &sample_candles()).unwrap();
        let range = store.available_range("TESTUSDT", "1m").unwrap();
        assert_eq!(range, (1000, 3000));
    }

    #[test]
    fn list_symbols_and_intervals() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());

        store.append_candles("BTCUSDT", "1m", &sample_candles()).unwrap();
        store.append_candles("BTCUSDT", "5m", &sample_candles()).unwrap();
        store.append_candles("ETHUSDT", "1m", &sample_candles()).unwrap();

        let symbols = store.list_symbols();
        assert_eq!(symbols, vec!["BTCUSDT", "ETHUSDT"]);

        let intervals = store.list_intervals("BTCUSDT");
        assert_eq!(intervals, vec!["1m", "5m"]);
    }

    #[test]
    fn aggregate_1m_to_5m() {
        let candles_1m: Vec<Candle> = (0..10)
            .map(|i| {
                let ts = i as u64 * 60_000;
                Candle {
                    timestamp: ts,
                    open: 100.0 + i as f64,
                    high: 105.0 + i as f64,
                    low: 95.0 + i as f64,
                    close: 101.0 + i as f64,
                    volume: 10.0,
                }
            })
            .collect();

        let agg = DataStore::aggregate_candles(&candles_1m, 5 * 60_000);
        assert_eq!(agg.len(), 2);

        assert_eq!(agg[0].timestamp, 0);
        assert_eq!(agg[0].open, 100.0);
        assert_eq!(agg[0].close, 105.0);
        assert_eq!(agg[0].high, 109.0);
        assert_eq!(agg[0].low, 95.0);
        assert_eq!(agg[0].volume, 50.0);

        assert_eq!(agg[1].timestamp, 300_000);
        assert_eq!(agg[1].open, 105.0);
        assert_eq!(agg[1].close, 110.0);
        assert_eq!(agg[1].volume, 50.0);
    }

    #[test]
    fn append_empty_returns_zero() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());
        let written = store.append_candles("TESTUSDT", "1m", &[]).unwrap();
        assert_eq!(written, 0);
    }

    #[test]
    fn append_all_duplicates_returns_zero() {
        let tmp = TempDir::new().unwrap();
        let store = DataStore::new(tmp.path());
        let candles = sample_candles();
        store.append_candles("TESTUSDT", "1m", &candles).unwrap();

        let written = store.append_candles("TESTUSDT", "1m", &candles).unwrap();
        assert_eq!(written, 0);
    }
}
