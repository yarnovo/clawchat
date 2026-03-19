/// Update EMA incrementally
pub fn ema_update(prev: Option<f64>, value: f64, period: usize) -> f64 {
    let k = 2.0 / (period as f64 + 1.0);
    match prev {
        Some(prev_ema) => prev_ema + k * (value - prev_ema),
        None => value,
    }
}

/// Compute EMA from a historical slice (SMA for warmup, then EMA)
pub fn ema_from_slice(data: &[f64], period: usize) -> Option<f64> {
    if data.len() < period {
        return None;
    }
    let k = 2.0 / (period as f64 + 1.0);
    let mut ema: f64 = data[..period].iter().sum::<f64>() / period as f64;
    for &v in &data[period..] {
        ema = v * k + ema * (1.0 - k);
    }
    Some(ema)
}

/// Compute RSI from historical closes
pub fn rsi_from_slice(closes: &[f64], period: usize) -> Option<f64> {
    if closes.len() < period + 1 {
        return None;
    }
    let start = closes.len() - period - 1;
    let mut gains = 0.0;
    let mut losses = 0.0;
    for i in (start + 1)..closes.len() {
        let delta = closes[i] - closes[i - 1];
        if delta > 0.0 {
            gains += delta;
        } else {
            losses -= delta;
        }
    }
    let avg_gain = gains / period as f64;
    let avg_loss = losses / period as f64;
    if avg_loss == 0.0 {
        return Some(100.0);
    }
    let rs = avg_gain / avg_loss;
    Some(100.0 - (100.0 / (1.0 + rs)))
}

/// Compute ATR from historical OHLC
pub fn atr_from_slices(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> Option<f64> {
    if closes.len() < period + 1 {
        return None;
    }
    let n = closes.len();
    let start = n - period;
    let mut sum = 0.0;
    for i in start..n {
        let hl = highs[i] - lows[i];
        let hc = (highs[i] - closes[i - 1]).abs();
        let lc = (lows[i] - closes[i - 1]).abs();
        sum += hl.max(hc).max(lc);
    }
    Some(sum / period as f64)
}

/// Compute MACD (macd_line, signal_line, histogram)
pub fn macd(
    closes: &[f64],
    fast_period: usize,
    slow_period: usize,
    signal_period: usize,
) -> (Option<f64>, Option<f64>, Option<f64>) {
    let n = closes.len();
    if n < slow_period {
        return (None, None, None);
    }

    let fast_k = 2.0 / (fast_period as f64 + 1.0);
    let slow_k = 2.0 / (slow_period as f64 + 1.0);

    let mut slow_ema: f64 = closes[..slow_period].iter().sum::<f64>() / slow_period as f64;
    let mut fast_ema: f64 = closes[..fast_period].iter().sum::<f64>() / fast_period as f64;
    for i in fast_period..slow_period {
        fast_ema = closes[i] * fast_k + fast_ema * (1.0 - fast_k);
    }

    let mut macd_series = Vec::with_capacity(n - slow_period + 1);
    macd_series.push(fast_ema - slow_ema);

    for i in slow_period..n {
        fast_ema = closes[i] * fast_k + fast_ema * (1.0 - fast_k);
        slow_ema = closes[i] * slow_k + slow_ema * (1.0 - slow_k);
        macd_series.push(fast_ema - slow_ema);
    }

    let macd_line = *macd_series.last().unwrap();

    if macd_series.len() < signal_period {
        return (Some(macd_line), None, None);
    }

    let sig_k = 2.0 / (signal_period as f64 + 1.0);
    let mut signal: f64 = macd_series[..signal_period].iter().sum::<f64>() / signal_period as f64;
    for &m in &macd_series[signal_period..] {
        signal = m * sig_k + signal * (1.0 - sig_k);
    }

    let histogram = macd_line - signal;
    (Some(macd_line), Some(signal), Some(histogram))
}

/// Compute Bollinger Bands (upper, middle, lower)
pub fn bollinger_bands(closes: &[f64], period: usize, num_std: f64) -> Option<(f64, f64, f64)> {
    if closes.len() < period {
        return None;
    }
    let window = &closes[closes.len() - period..];
    let mean: f64 = window.iter().sum::<f64>() / period as f64;
    let variance: f64 = window.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / period as f64;
    let std = variance.sqrt();
    Some((mean + num_std * std, mean, mean - num_std * std))
}

/// Compute Pearson correlation coefficient between two series
pub fn pearson_correlation(x: &[f64], y: &[f64]) -> Option<f64> {
    if x.len() != y.len() || x.len() < 2 {
        return None;
    }
    let n = x.len() as f64;
    let mean_x = x.iter().sum::<f64>() / n;
    let mean_y = y.iter().sum::<f64>() / n;

    let mut cov = 0.0;
    let mut var_x = 0.0;
    let mut var_y = 0.0;

    for i in 0..x.len() {
        let dx = x[i] - mean_x;
        let dy = y[i] - mean_y;
        cov += dx * dy;
        var_x += dx * dx;
        var_y += dy * dy;
    }

    let denom = (var_x * var_y).sqrt();
    if denom < 1e-12 {
        return None;
    }
    Some(cov / denom)
}

/// Compute standard deviation of a slice
pub fn std_dev(data: &[f64]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }
    let n = data.len() as f64;
    let mean = data.iter().sum::<f64>() / n;
    let variance = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n;
    variance.sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ema_update_initial() {
        assert!((ema_update(None, 100.0, 10) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn ema_update_subsequent() {
        let v = ema_update(Some(100.0), 110.0, 10);
        // k = 2/11 ≈ 0.1818; result = 100 + 0.1818 * 10 ≈ 101.818
        assert!((v - 101.818).abs() < 0.01);
    }

    #[test]
    fn ema_from_slice_basic() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let result = ema_from_slice(&data, 3);
        assert!(result.is_some());
    }

    #[test]
    fn ema_from_slice_too_short() {
        let data = vec![1.0, 2.0];
        assert!(ema_from_slice(&data, 3).is_none());
    }

    #[test]
    fn rsi_all_gains() {
        let closes = vec![10.0, 11.0, 12.0, 13.0, 14.0, 15.0];
        let rsi = rsi_from_slice(&closes, 5).unwrap();
        assert!((rsi - 100.0).abs() < 1e-9);
    }

    #[test]
    fn rsi_too_short() {
        let closes = vec![10.0, 11.0];
        assert!(rsi_from_slice(&closes, 5).is_none());
    }

    #[test]
    fn atr_basic() {
        let highs = vec![12.0, 13.0, 14.0, 15.0, 16.0];
        let lows = vec![8.0, 9.0, 10.0, 11.0, 12.0];
        let closes = vec![10.0, 11.0, 12.0, 13.0, 14.0];
        let atr = atr_from_slices(&highs, &lows, &closes, 3);
        assert!(atr.is_some());
    }

    #[test]
    fn macd_basic() {
        let closes: Vec<f64> = (0..50).map(|i| 100.0 + (i as f64 * 0.1).sin() * 5.0).collect();
        let (macd_line, signal, hist) = macd(&closes, 12, 26, 9);
        assert!(macd_line.is_some());
        assert!(signal.is_some());
        assert!(hist.is_some());
    }

    #[test]
    fn bollinger_basic() {
        let closes: Vec<f64> = (0..20).map(|i| 100.0 + i as f64).collect();
        let result = bollinger_bands(&closes, 20, 2.0);
        assert!(result.is_some());
        let (upper, mid, lower) = result.unwrap();
        assert!(upper > mid);
        assert!(mid > lower);
    }

    #[test]
    fn pearson_perfect_correlation() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        let r = pearson_correlation(&x, &y).unwrap();
        assert!((r - 1.0).abs() < 1e-9);
    }

    #[test]
    fn pearson_negative_correlation() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![10.0, 8.0, 6.0, 4.0, 2.0];
        let r = pearson_correlation(&x, &y).unwrap();
        assert!((r - (-1.0)).abs() < 1e-9);
    }

    #[test]
    fn pearson_mismatched_lengths() {
        assert!(pearson_correlation(&[1.0, 2.0], &[1.0]).is_none());
    }

    #[test]
    fn std_dev_basic() {
        let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        let sd = std_dev(&data);
        assert!((sd - 2.0).abs() < 0.01);
    }
}
