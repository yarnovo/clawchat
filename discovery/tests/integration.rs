use clawchat_shared::candle::Candle;
use clawchat_shared::criteria::BacktestMetrics;
use discovery::evaluator::{backtest, backtest_batch, BacktestConfig};
use discovery::generator::{ParamGenerator, StrategyType};

// ── Helper: generate trending candles ───────────────────────────

/// Generate candles with clear trend cycles (up → down → up) to ensure
/// EMA crossovers and breakout signals fire.
fn generate_trending_candles(count: usize, base_ts: u64) -> Vec<Candle> {
    let mut candles = Vec::with_capacity(count);
    for i in 0..count {
        // Create obvious trend cycles
        let phase = (i as f64 / 100.0 * std::f64::consts::PI * 2.0).sin();
        let trend = phase * 0.3; // +/- 30% swing
        let price = 1.0 + trend;

        let noise = ((i * 7 + 3) % 13) as f64 / 130.0 - 0.05; // small noise
        let open = price + noise;
        let close = price - noise;
        let high = open.max(close) * 1.005;
        let low = open.min(close) * 0.995;
        let volume = 100.0 + (i % 50) as f64;

        candles.push(Candle {
            timestamp: base_ts + i as u64 * 60_000,
            open,
            high,
            low,
            close,
            volume,
        });
    }
    candles
}

fn default_config() -> BacktestConfig {
    BacktestConfig::default()
}

// ── 1. Generator → Evaluator end-to-end ─────────────────────────

#[test]
fn trend_generator_evaluator_end_to_end() {
    let pg = ParamGenerator::new(StrategyType::Trend);
    let combos = pg.generate();
    assert!(!combos.is_empty(), "Trend should generate combos");

    // Use subset for debug-mode speed
    let combos: Vec<_> = combos.into_iter().take(50).collect();
    let candles = generate_trending_candles(1000, 1_000_000);
    let config = default_config();

    let results = backtest_batch(&candles, "default", &combos, &config);
    assert_eq!(results.len(), combos.len());

    // At least some combos should produce trades
    let with_trades: Vec<_> = results.iter().filter(|(_, m)| m.is_some()).collect();
    assert!(
        !with_trades.is_empty(),
        "At least some trend combos should produce trades on trending data"
    );

    // Metrics should be reasonable
    for (_, metrics) in &with_trades {
        let m = metrics.as_ref().unwrap();
        assert!(m.total_trades > 0);
        assert!(m.win_rate >= 0.0 && m.win_rate <= 100.0);
        assert!(m.max_drawdown_pct >= 0.0);
        assert!(m.profit_factor >= 0.0);
    }
}

#[test]
fn breakout_generator_evaluator_end_to_end() {
    let pg = ParamGenerator::new(StrategyType::Breakout);
    let combos = pg.generate();
    assert!(!combos.is_empty(), "Breakout should generate combos");

    let combos: Vec<_> = combos.into_iter().take(50).collect();
    let candles = generate_trending_candles(1000, 1_000_000);
    let config = default_config();

    let results = backtest_batch(&candles, "breakout", &combos, &config);
    assert_eq!(results.len(), combos.len());

    let with_trades: Vec<_> = results.iter().filter(|(_, m)| m.is_some()).collect();
    assert!(
        !with_trades.is_empty(),
        "At least some breakout combos should produce trades on trending data"
    );
}

#[test]
fn rsi_generator_evaluator_end_to_end() {
    let pg = ParamGenerator::new(StrategyType::Rsi);
    let combos = pg.generate();
    assert!(!combos.is_empty(), "RSI should generate combos");

    let combos: Vec<_> = combos.into_iter().take(50).collect();
    let candles = generate_trending_candles(1000, 1_000_000);
    let config = default_config();

    let results = backtest_batch(&candles, "rsi", &combos, &config);
    assert_eq!(results.len(), combos.len());

    let with_trades: Vec<_> = results.iter().filter(|(_, m)| m.is_some()).collect();
    assert!(
        !with_trades.is_empty(),
        "At least some RSI combos should produce trades on trending data"
    );
}

// ── 2. All strategy types can produce trades ─────────────────────

#[test]
fn all_strategy_types_produce_trades() {
    let candles = generate_trending_candles(1000, 1_000_000);
    let config = default_config();

    for st in StrategyType::all() {
        let pg = ParamGenerator::new(st);
        let combos = pg.generate();
        let combos: Vec<_> = combos.into_iter().take(30).collect();

        let results = backtest_batch(&candles, st.engine_name(), &combos, &config);

        let trade_count: usize = results
            .iter()
            .filter_map(|(_, m)| m.as_ref())
            .map(|m| m.total_trades as usize)
            .sum();

        assert!(
            trade_count > 0,
            "{:?} produced zero total trades across all {} combos",
            st,
            combos.len()
        );
    }
}

// ── 3. Parallel consistency: batch == serial ─────────────────────

#[test]
fn batch_matches_serial_for_all_strategies() {
    let candles = generate_trending_candles(1000, 1_000_000);
    let config = default_config();

    for st in StrategyType::all() {
        let pg = ParamGenerator::new(st);
        let combos = pg.generate();
        // Take a subset to keep the test fast
        let subset: Vec<_> = combos.into_iter().take(20).collect();

        // Serial
        let serial: Vec<Option<BacktestMetrics>> = subset
            .iter()
            .map(|p| backtest(&candles, st.engine_name(), p, &config))
            .collect();

        // Parallel (batch)
        let batch = backtest_batch(&candles, st.engine_name(), &subset, &config);

        assert_eq!(serial.len(), batch.len());

        for (i, (_, batch_m)) in batch.iter().enumerate() {
            match (&serial[i], batch_m) {
                (Some(s), Some(b)) => {
                    assert!(
                        (s.roi - b.roi).abs() < 1e-9,
                        "{:?} ROI mismatch at {}: serial={}, batch={}",
                        st,
                        i,
                        s.roi,
                        b.roi
                    );
                    assert_eq!(
                        s.total_trades, b.total_trades,
                        "{:?} trade count mismatch at {}",
                        st, i
                    );
                    assert!(
                        (s.win_rate - b.win_rate).abs() < 1e-9,
                        "{:?} win_rate mismatch at {}",
                        st,
                        i
                    );
                }
                (None, None) => {}
                _ => panic!("{:?} serial/batch None mismatch at index {}", st, i),
            }
        }
    }
}

// ── 4. Large-scale scan performance ──────────────────────────────

#[test]
fn large_scale_scan_performance() {
    let candles = generate_trending_candles(5000, 1_000_000);
    let config = default_config();

    // Generate param combos (Trend typically has enough)
    let pg = ParamGenerator::new(StrategyType::Trend);
    let combos = pg.generate();
    // Ensure we have a meaningful number of combos
    assert!(
        combos.len() >= 100,
        "Need at least 100 combos for perf test, got {}",
        combos.len()
    );

    // Use a subset (200 combos) to keep debug-mode test time reasonable
    let subset: Vec<_> = combos.into_iter().take(200).collect();

    let start = std::time::Instant::now();
    let results = backtest_batch(&candles, "default", &subset, &config);
    let elapsed = start.elapsed();

    assert_eq!(results.len(), subset.len());
    // 200 combos x 5000 candles should complete in well under 60s even in debug
    assert!(
        elapsed.as_secs() < 60,
        "{} combos x 5000 candles took {:?}, expected < 60s",
        subset.len(),
        elapsed
    );
}

// ── 5. Param space size limits ───────────────────────────────────

#[test]
fn param_space_within_limits() {
    for st in StrategyType::all() {
        let pg = ParamGenerator::new(st);
        let total = pg.total_combinations();
        assert!(
            total <= 50000,
            "{:?} has {} total combinations, exceeds 50000 limit",
            st,
            total
        );
        assert!(total > 0, "{:?} has zero combinations", st);

        let filtered = pg.generate().len();
        assert!(
            filtered <= 50000,
            "{:?} has {} filtered combinations, exceeds 50000 limit",
            st,
            filtered
        );
        assert!(filtered > 0, "{:?} has zero filtered combinations", st);
    }
}
