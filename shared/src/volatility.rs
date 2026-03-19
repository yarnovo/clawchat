/// EWMA volatility: exponentially weighted moving average of log returns' std dev.
///
/// `span` controls the decay factor: alpha = 2 / (span + 1).
/// Returns annualized-style EWMA volatility (raw, not annualized).
pub fn ewma_volatility(closes: &[f64], span: usize) -> Option<f64> {
    if closes.len() < 2 {
        return None;
    }
    let alpha = 2.0 / (span as f64 + 1.0);

    // Compute log returns
    let returns: Vec<f64> = closes
        .windows(2)
        .map(|w| (w[1] / w[0]).ln())
        .collect();

    if returns.is_empty() {
        return None;
    }

    // EWMA variance
    let mut variance = returns[0] * returns[0];
    for &r in &returns[1..] {
        variance = alpha * r * r + (1.0 - alpha) * variance;
    }

    Some(variance.sqrt())
}

/// Compute the percentile rank of `current` within `history`.
///
/// Returns a value in [0.0, 100.0] representing what percentage of
/// historical values are less than or equal to `current`.
pub fn vol_percentile(current: f64, history: &[f64]) -> f64 {
    if history.is_empty() {
        return 50.0; // default to middle when no history
    }
    let count_le = history.iter().filter(|&&v| v <= current).count();
    count_le as f64 / history.len() as f64 * 100.0
}

/// Determine the leverage multiplier based on volatility percentile.
///
/// `multipliers` is expected to have 4 elements: [low, normal, high, extreme].
/// Default: [1.3, 1.0, 0.7, 0.3]
pub fn vol_leverage_multiplier(percentile: f64, multipliers: &[f64; 4]) -> f64 {
    if percentile > 90.0 {
        multipliers[3] // extreme
    } else if percentile > 75.0 {
        multipliers[2] // high
    } else if percentile > 25.0 {
        multipliers[1] // normal
    } else {
        multipliers[0] // low
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ewma_too_short() {
        assert!(ewma_volatility(&[100.0], 20).is_none());
        assert!(ewma_volatility(&[], 20).is_none());
    }

    #[test]
    fn ewma_constant_price_zero_vol() {
        let closes = vec![100.0; 50];
        let vol = ewma_volatility(&closes, 20).unwrap();
        assert!(vol.abs() < 1e-12, "constant price should have ~0 volatility");
    }

    #[test]
    fn ewma_increasing_prices_positive_vol() {
        let closes: Vec<f64> = (0..50).map(|i| 100.0 + i as f64).collect();
        let vol = ewma_volatility(&closes, 20).unwrap();
        assert!(vol > 0.0, "trending prices should have positive volatility");
    }

    #[test]
    fn ewma_volatile_prices_higher_vol() {
        // Steady 1% increase
        let steady: Vec<f64> = (0..50).map(|i| 100.0 * 1.01_f64.powi(i)).collect();
        // Wild oscillation
        let wild: Vec<f64> = (0..50)
            .map(|i| if i % 2 == 0 { 100.0 } else { 110.0 })
            .collect();
        let vol_steady = ewma_volatility(&steady, 20).unwrap();
        let vol_wild = ewma_volatility(&wild, 20).unwrap();
        assert!(
            vol_wild > vol_steady,
            "wild oscillation should have higher volatility"
        );
    }

    #[test]
    fn ewma_decay_factor_094() {
        // span=33 gives alpha ≈ 0.0588, decay = 1 - alpha ≈ 0.9412 ≈ 0.94
        let closes: Vec<f64> = (0..100).map(|i| 100.0 + (i as f64 * 0.1).sin() * 5.0).collect();
        let vol = ewma_volatility(&closes, 33).unwrap();
        assert!(vol > 0.0);
    }

    #[test]
    fn vol_percentile_all_below() {
        let history = vec![0.01, 0.02, 0.03, 0.04, 0.05];
        let pct = vol_percentile(0.10, &history);
        assert!((pct - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn vol_percentile_all_above() {
        let history = vec![0.10, 0.20, 0.30];
        let pct = vol_percentile(0.01, &history);
        assert!((pct).abs() < f64::EPSILON);
    }

    #[test]
    fn vol_percentile_middle() {
        let history = vec![0.01, 0.02, 0.03, 0.04, 0.05];
        let pct = vol_percentile(0.03, &history);
        // 3 values <= 0.03: 0.01, 0.02, 0.03 → 3/5 = 60%
        assert!((pct - 60.0).abs() < f64::EPSILON);
    }

    #[test]
    fn vol_percentile_empty_history() {
        let pct = vol_percentile(0.05, &[]);
        assert!((pct - 50.0).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_low_vol() {
        let m = vol_leverage_multiplier(10.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 1.3).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_normal_vol() {
        let m = vol_leverage_multiplier(50.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_high_vol() {
        let m = vol_leverage_multiplier(80.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 0.7).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_extreme_vol() {
        let m = vol_leverage_multiplier(95.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 0.3).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_boundary_25() {
        // exactly 25 → normal bucket (> 25 check)
        let m = vol_leverage_multiplier(25.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 1.3).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_boundary_75() {
        // exactly 75 → normal bucket (> 75 check)
        let m = vol_leverage_multiplier(75.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn leverage_multiplier_boundary_90() {
        // exactly 90 → high bucket (> 90 check)
        let m = vol_leverage_multiplier(90.0, &[1.3, 1.0, 0.7, 0.3]);
        assert!((m - 0.7).abs() < f64::EPSILON);
    }
}
