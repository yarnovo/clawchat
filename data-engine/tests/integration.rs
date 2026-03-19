//! 数据引擎集成测试
//!
//! 覆盖：DataStore 读写、聚合、校验、断点续传逻辑

use clawchat_shared::candle::Candle;
use clawchat_shared::data::{DataError, DataStore};
use tempfile::TempDir;

// ── 辅助函数 ──────────────────────────────────────────────────

/// 生成 N 根连续 1m K 线（模拟真实行情走势）
fn generate_1m_candles(count: usize, base_ts: u64) -> Vec<Candle> {
    let mut candles = Vec::with_capacity(count);
    let mut price = 1.0;
    for i in 0..count {
        let open = price;
        let high = open * 1.005;
        let low = open * 0.995;
        let close = open + (i as f64 % 3.0 - 1.0) * 0.001; // 微幅波动
        let volume = 100.0 + (i as f64 * 7.0) % 50.0;
        candles.push(Candle {
            timestamp: base_ts + i as u64 * 60_000,
            open,
            high,
            low,
            close,
            volume,
        });
        price = close;
    }
    candles
}

fn new_store() -> (TempDir, DataStore) {
    let tmp = TempDir::new().unwrap();
    let store = DataStore::new(tmp.path());
    (tmp, store)
}

// ── DataStore 核心功能 ────────────────────────────────────────

#[test]
fn roundtrip_write_read() {
    let (_tmp, store) = new_store();
    let candles = generate_1m_candles(100, 1_000_000);

    let written = store.append_candles("TESTUSDT", "1m", &candles).unwrap();
    assert_eq!(written, 100);

    let read = store.read_candles("TESTUSDT", "1m", None, None).unwrap();
    assert_eq!(read.len(), 100);

    // 首尾 timestamp 一致
    assert_eq!(read.first().unwrap().timestamp, 1_000_000);
    assert_eq!(read.last().unwrap().timestamp, 1_000_000 + 99 * 60_000);
}

#[test]
fn append_dedup_preserves_original() {
    let (_tmp, store) = new_store();
    let candles = generate_1m_candles(10, 0);
    store.append_candles("TESTUSDT", "1m", &candles).unwrap();

    // 尝试写入重叠数据（timestamp 相同但价格不同）
    let dup = vec![Candle {
        timestamp: 0,
        open: 999.0,
        high: 999.0,
        low: 999.0,
        close: 999.0,
        volume: 999.0,
    }];
    let written = store.append_candles("TESTUSDT", "1m", &dup).unwrap();
    assert_eq!(written, 0); // 重复数据不写入

    let read = store.read_candles("TESTUSDT", "1m", None, None).unwrap();
    assert_eq!(read.len(), 10);
    assert_ne!(read[0].open, 999.0); // 保留原始值
}

#[test]
fn append_resume_adds_new_only() {
    let (_tmp, store) = new_store();

    // 第一批：0-9
    let batch1 = generate_1m_candles(10, 0);
    store.append_candles("TESTUSDT", "1m", &batch1).unwrap();

    // 第二批：5-14（有 5 根重叠）
    let batch2 = generate_1m_candles(10, 5 * 60_000);
    let written = store.append_candles("TESTUSDT", "1m", &batch2).unwrap();
    assert_eq!(written, 5); // 只写入 5 根新的

    let all = store.read_candles("TESTUSDT", "1m", None, None).unwrap();
    assert_eq!(all.len(), 15);

    // 排序正确
    for w in all.windows(2) {
        assert!(w[0].timestamp < w[1].timestamp);
    }
}

#[test]
fn time_range_filter_inclusive() {
    let (_tmp, store) = new_store();
    let candles = generate_1m_candles(100, 0);
    store.append_candles("TESTUSDT", "1m", &candles).unwrap();

    // 过滤第 10-19 根（timestamp 600_000 ~ 1_140_000）
    let filtered = store
        .read_candles("TESTUSDT", "1m", Some(600_000), Some(1_140_000))
        .unwrap();
    assert_eq!(filtered.len(), 10);
    assert_eq!(filtered[0].timestamp, 600_000);
    assert_eq!(filtered[9].timestamp, 1_140_000);
}

#[test]
fn no_data_returns_error() {
    let (_tmp, store) = new_store();
    let result = store.read_candles("NOPE", "1m", None, None);
    assert!(matches!(result, Err(DataError::NoData { .. })));
}

#[test]
fn available_range_correct() {
    let (_tmp, store) = new_store();
    assert!(store.available_range("TESTUSDT", "1m").is_none());

    let candles = generate_1m_candles(50, 1_000_000);
    store.append_candles("TESTUSDT", "1m", &candles).unwrap();

    let (min, max) = store.available_range("TESTUSDT", "1m").unwrap();
    assert_eq!(min, 1_000_000);
    assert_eq!(max, 1_000_000 + 49 * 60_000);
}

#[test]
fn list_symbols_and_intervals() {
    let (_tmp, store) = new_store();

    store
        .append_candles("BTCUSDT", "1m", &generate_1m_candles(5, 0))
        .unwrap();
    store
        .append_candles("BTCUSDT", "5m", &generate_1m_candles(5, 0))
        .unwrap();
    store
        .append_candles("ETHUSDT", "1m", &generate_1m_candles(5, 0))
        .unwrap();

    let symbols = store.list_symbols();
    assert_eq!(symbols, vec!["BTCUSDT", "ETHUSDT"]);

    let intervals = store.list_intervals("BTCUSDT");
    assert_eq!(intervals, vec!["1m", "5m"]);

    // 不存在的 symbol 返回空
    assert!(store.list_intervals("NOPE").is_empty());
}

// ── K 线聚合 ─────────────────────────────────────────────────

#[test]
fn aggregate_1m_to_5m() {
    let candles = generate_1m_candles(30, 0); // 30 根 1m = 6 根 5m
    let agg = DataStore::aggregate_candles(&candles, 5 * 60_000);
    assert_eq!(agg.len(), 6);

    // 每根聚合 K 线的 timestamp 应对齐到 5m 边界
    for c in &agg {
        assert_eq!(c.timestamp % (5 * 60_000), 0);
    }

    // 第一根聚合 K 线：open = 第 1 根 1m 的 open
    assert_eq!(agg[0].open, candles[0].open);
    // close = 第 5 根 1m 的 close
    assert_eq!(agg[0].close, candles[4].close);
    // volume = 5 根之和
    let expected_vol: f64 = candles[..5].iter().map(|c| c.volume).sum();
    assert!((agg[0].volume - expected_vol).abs() < 0.001);
}

#[test]
fn aggregate_1m_to_15m() {
    let candles = generate_1m_candles(60, 0); // 60 根 1m = 4 根 15m
    let agg = DataStore::aggregate_candles(&candles, 15 * 60_000);
    assert_eq!(agg.len(), 4);

    for c in &agg {
        assert_eq!(c.timestamp % (15 * 60_000), 0);
    }
}

#[test]
fn aggregate_partial_last_bucket() {
    // 7 根 1m → 1 根完整 5m + 1 根不完整 5m（只有 2 根）
    let candles = generate_1m_candles(7, 0);
    let agg = DataStore::aggregate_candles(&candles, 5 * 60_000);
    assert_eq!(agg.len(), 2);
    assert_eq!(agg[1].close, candles[6].close);
}

#[test]
fn aggregate_empty_input() {
    let agg = DataStore::aggregate_candles(&[], 5 * 60_000);
    assert!(agg.is_empty());
}

// ── 数据校验 ─────────────────────────────────────────────────

mod validator_tests {
    use super::*;

    // 内联 validator 逻辑测试（复用 data-engine 的测试思路）
    fn validate_candles_check(candles: &[Candle], interval_ms: u64) -> Vec<String> {
        let mut issues = Vec::new();
        for (i, c) in candles.iter().enumerate() {
            let max_oc = c.open.max(c.close);
            let min_oc = c.open.min(c.close);
            if c.high < max_oc {
                issues.push(format!("high < max(o,c) at ts={}", c.timestamp));
            }
            if c.low > min_oc {
                issues.push(format!("low > min(o,c) at ts={}", c.timestamp));
            }
            if c.high < c.low {
                issues.push(format!("high < low at ts={}", c.timestamp));
            }
            if i > 0 {
                let prev = &candles[i - 1];
                if c.timestamp != prev.timestamp + interval_ms {
                    issues.push(format!("gap at ts={}", c.timestamp));
                }
                if prev.close > 0.0 {
                    let pct = ((c.close - prev.close) / prev.close).abs() * 100.0;
                    if pct > 50.0 {
                        issues.push(format!("spike {:.1}% at ts={}", pct, c.timestamp));
                    }
                }
            }
        }
        issues
    }

    #[test]
    fn generated_candles_are_clean() {
        let candles = generate_1m_candles(1000, 0);
        let issues = validate_candles_check(&candles, 60_000);
        assert!(issues.is_empty(), "generated candles should be clean: {:?}", issues);
    }

    #[test]
    fn detects_gap_in_sequence() {
        let mut candles = generate_1m_candles(10, 0);
        // 制造缺口：删除第 5 根
        candles.remove(4);
        let issues = validate_candles_check(&candles, 60_000);
        assert!(!issues.is_empty());
        assert!(issues.iter().any(|i| i.contains("gap")));
    }

    #[test]
    fn detects_ohlc_violation() {
        let mut candles = generate_1m_candles(5, 0);
        // high < low
        candles[2].high = 0.5;
        candles[2].low = 1.5;
        let issues = validate_candles_check(&candles, 60_000);
        assert!(issues.iter().any(|i| i.contains("high < low")));
    }
}

// ── 多 symbol 隔离 ───────────────────────────────────────────

#[test]
fn symbols_are_isolated() {
    let (_tmp, store) = new_store();

    store
        .append_candles("AAAUSDT", "1m", &generate_1m_candles(10, 0))
        .unwrap();
    store
        .append_candles("BBBUSDT", "1m", &generate_1m_candles(20, 0))
        .unwrap();

    let a = store.read_candles("AAAUSDT", "1m", None, None).unwrap();
    let b = store.read_candles("BBBUSDT", "1m", None, None).unwrap();
    assert_eq!(a.len(), 10);
    assert_eq!(b.len(), 20);
}

// ── 大数据量压力测试 ─────────────────────────────────────────

#[test]
fn stress_10k_candles() {
    let (_tmp, store) = new_store();
    let candles = generate_1m_candles(10_000, 0);

    let written = store.append_candles("STRESSUSDT", "1m", &candles).unwrap();
    assert_eq!(written, 10_000);

    let read = store.read_candles("STRESSUSDT", "1m", None, None).unwrap();
    assert_eq!(read.len(), 10_000);

    // 范围查询中间段
    let mid = store
        .read_candles("STRESSUSDT", "1m", Some(3000 * 60_000), Some(4000 * 60_000))
        .unwrap();
    assert_eq!(mid.len(), 1001); // inclusive both ends
}

#[test]
fn stress_aggregate_full_day() {
    // 1440 根 1m（一整天）→ 288 根 5m
    let candles = generate_1m_candles(1440, 0);
    let agg = DataStore::aggregate_candles(&candles, 5 * 60_000);
    assert_eq!(agg.len(), 288);
}
