//! 市场体制检测 — 基于 ADX + 波动率百分位判断 Trending / Ranging / Choppy
//!
//! 纯函数，无状态。

use serde::{Deserialize, Serialize};

/// 市场体制
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MarketRegime {
    /// 趋势行情：高 ADX + 高波动
    Trending,
    /// 震荡行情：低 ADX + 低波动
    Ranging,
    /// 杂波行情：低 ADX + 高波动
    Choppy,
}

impl std::fmt::Display for MarketRegime {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MarketRegime::Trending => write!(f, "Trending"),
            MarketRegime::Ranging => write!(f, "Ranging"),
            MarketRegime::Choppy => write!(f, "Choppy"),
        }
    }
}

/// 计算 ADX（Average Directional Index）
///
/// 需要 highs, lows, closes 长度 >= period * 2 + 1
fn compute_adx(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> Option<f64> {
    let n = highs.len();
    if n < period + 1 || lows.len() != n || closes.len() != n {
        return None;
    }

    // 计算 +DM, -DM, TR 序列
    let mut plus_dm = Vec::with_capacity(n - 1);
    let mut minus_dm = Vec::with_capacity(n - 1);
    let mut tr = Vec::with_capacity(n - 1);

    for i in 1..n {
        let up = highs[i] - highs[i - 1];
        let down = lows[i - 1] - lows[i];

        plus_dm.push(if up > down && up > 0.0 { up } else { 0.0 });
        minus_dm.push(if down > up && down > 0.0 { down } else { 0.0 });

        let hl = highs[i] - lows[i];
        let hc = (highs[i] - closes[i - 1]).abs();
        let lc = (lows[i] - closes[i - 1]).abs();
        tr.push(hl.max(hc).max(lc));
    }

    if plus_dm.len() < period {
        return None;
    }

    // Wilder's smoothing: 初始值用 SMA，后续用 prev - prev/period + current
    let mut smooth_plus_dm: f64 = plus_dm[..period].iter().sum();
    let mut smooth_minus_dm: f64 = minus_dm[..period].iter().sum();
    let mut smooth_tr: f64 = tr[..period].iter().sum();

    // 收集 DX 序列用于计算 ADX
    let mut dx_values = Vec::new();

    // 第一个 DI 对
    if smooth_tr > 0.0 {
        let plus_di = 100.0 * smooth_plus_dm / smooth_tr;
        let minus_di = 100.0 * smooth_minus_dm / smooth_tr;
        let di_sum = plus_di + minus_di;
        if di_sum > 0.0 {
            dx_values.push(100.0 * (plus_di - minus_di).abs() / di_sum);
        }
    }

    for i in period..plus_dm.len() {
        smooth_plus_dm = smooth_plus_dm - smooth_plus_dm / period as f64 + plus_dm[i];
        smooth_minus_dm = smooth_minus_dm - smooth_minus_dm / period as f64 + minus_dm[i];
        smooth_tr = smooth_tr - smooth_tr / period as f64 + tr[i];

        if smooth_tr > 0.0 {
            let plus_di = 100.0 * smooth_plus_dm / smooth_tr;
            let minus_di = 100.0 * smooth_minus_dm / smooth_tr;
            let di_sum = plus_di + minus_di;
            if di_sum > 0.0 {
                dx_values.push(100.0 * (plus_di - minus_di).abs() / di_sum);
            }
        }
    }

    if dx_values.len() < period {
        return None;
    }

    // ADX = Wilder's smoothing of DX
    let mut adx: f64 = dx_values[..period].iter().sum::<f64>() / period as f64;
    for &dx in &dx_values[period..] {
        adx = (adx * (period as f64 - 1.0) + dx) / period as f64;
    }

    Some(adx)
}

/// 计算波动率百分位（当前波动率在历史中的排名）
///
/// 用收盘价的对数收益率标准差作为波动率度量
fn compute_vol_percentile(closes: &[f64], period: usize) -> Option<f64> {
    if closes.len() < period + 1 {
        return None;
    }

    // 计算滚动波动率序列
    let returns: Vec<f64> = closes.windows(2).map(|w| (w[1] / w[0]).ln()).collect();
    if returns.len() < period {
        return None;
    }

    let mut vol_history = Vec::new();
    for i in period..=returns.len() {
        let window = &returns[i - period..i];
        let mean: f64 = window.iter().sum::<f64>() / period as f64;
        let var: f64 = window.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / period as f64;
        vol_history.push(var.sqrt());
    }

    if vol_history.is_empty() {
        return None;
    }

    let current = *vol_history.last().unwrap();
    let count_le = vol_history.iter().filter(|&&v| v <= current).count();
    Some(count_le as f64 / vol_history.len() as f64 * 100.0)
}

/// 检测市场体制
///
/// - `closes`: 收盘价序列
/// - `highs`: 最高价序列
/// - `lows`: 最低价序列
/// - `period`: 回溯周期（ADX 和波动率的计算周期，默认 14）
///
/// 判断逻辑：
/// - ADX >= 25 → 趋势明显
/// - ADX < 25 + 波动率百分位 < 50 → Ranging（低波动震荡）
/// - ADX < 25 + 波动率百分位 >= 50 → Choppy（高波动杂乱）
pub fn detect_regime(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    period: usize,
) -> Option<MarketRegime> {
    let adx = compute_adx(highs, lows, closes, period)?;
    let vol_pct = compute_vol_percentile(closes, period)?;

    Some(if adx >= 25.0 {
        MarketRegime::Trending
    } else if vol_pct < 50.0 {
        MarketRegime::Ranging
    } else {
        MarketRegime::Choppy
    })
}

/// 基于体制的参数缩放因子
///
/// 返回 (sl_mult_scale, tp_mult_scale, position_scale)
pub fn regime_scaling(regime: MarketRegime) -> (f64, f64, f64) {
    match regime {
        MarketRegime::Trending => (1.3, 1.5, 1.0),
        MarketRegime::Ranging => (0.7, 0.8, 0.5),
        MarketRegime::Choppy => (1.0, 1.0, 0.0), // position 0 = 暂停（由 wrapper 实现为 Signal::None）
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_trending_data(n: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
        // 持续上涨的趋势数据
        let mut highs = Vec::with_capacity(n);
        let mut lows = Vec::with_capacity(n);
        let mut closes = Vec::with_capacity(n);
        for i in 0..n {
            let base = 100.0 + i as f64 * 2.0;
            highs.push(base + 1.0);
            lows.push(base - 0.5);
            closes.push(base + 0.5);
        }
        (highs, lows, closes)
    }

    fn make_ranging_data(n: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
        // 低波动震荡数据
        let mut highs = Vec::with_capacity(n);
        let mut lows = Vec::with_capacity(n);
        let mut closes = Vec::with_capacity(n);
        for i in 0..n {
            let base = 100.0 + (i as f64 * 0.3).sin() * 0.5;
            highs.push(base + 0.2);
            lows.push(base - 0.2);
            closes.push(base);
        }
        (highs, lows, closes)
    }

    fn make_choppy_data(n: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
        // 高波动无方向数据（大幅锯齿）
        let mut highs = Vec::with_capacity(n);
        let mut lows = Vec::with_capacity(n);
        let mut closes = Vec::with_capacity(n);
        for i in 0..n {
            let swing = if i % 2 == 0 { 5.0 } else { -5.0 };
            let base = 100.0 + swing;
            highs.push(base + 3.0);
            lows.push(base - 3.0);
            closes.push(base);
        }
        (highs, lows, closes)
    }

    #[test]
    fn detect_trending_market() {
        let (h, l, c) = make_trending_data(100);
        let regime = detect_regime(&h, &l, &c, 14);
        assert!(regime.is_some());
        assert_eq!(regime.unwrap(), MarketRegime::Trending);
    }

    #[test]
    fn detect_ranging_market() {
        let (h, l, c) = make_ranging_data(100);
        let regime = detect_regime(&h, &l, &c, 14);
        assert!(regime.is_some());
        assert_eq!(regime.unwrap(), MarketRegime::Ranging);
    }

    #[test]
    fn detect_choppy_market() {
        let (h, l, c) = make_choppy_data(100);
        let regime = detect_regime(&h, &l, &c, 14);
        assert!(regime.is_some());
        assert_eq!(regime.unwrap(), MarketRegime::Choppy);
    }

    #[test]
    fn regime_too_short_returns_none() {
        let h = vec![100.0; 5];
        let l = vec![99.0; 5];
        let c = vec![99.5; 5];
        assert!(detect_regime(&h, &l, &c, 14).is_none());
    }

    #[test]
    fn regime_scaling_trending() {
        let (sl, tp, pos) = regime_scaling(MarketRegime::Trending);
        assert!((sl - 1.3).abs() < f64::EPSILON);
        assert!((tp - 1.5).abs() < f64::EPSILON);
        assert!((pos - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn regime_scaling_ranging() {
        let (sl, tp, pos) = regime_scaling(MarketRegime::Ranging);
        assert!((sl - 0.7).abs() < f64::EPSILON);
        assert!((tp - 0.8).abs() < f64::EPSILON);
        assert!((pos - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn regime_scaling_choppy() {
        let (sl, tp, pos) = regime_scaling(MarketRegime::Choppy);
        assert!((sl - 1.0).abs() < f64::EPSILON);
        assert!((tp - 1.0).abs() < f64::EPSILON);
        assert!((pos - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn adx_positive_for_trend() {
        let (h, l, c) = make_trending_data(100);
        let adx = compute_adx(&h, &l, &c, 14);
        assert!(adx.is_some());
        assert!(adx.unwrap() > 25.0, "ADX should be > 25 for trend, got {}", adx.unwrap());
    }

    #[test]
    fn adx_low_for_range() {
        let (h, l, c) = make_ranging_data(100);
        let adx = compute_adx(&h, &l, &c, 14);
        assert!(adx.is_some());
        assert!(adx.unwrap() < 25.0, "ADX should be < 25 for range, got {}", adx.unwrap());
    }

    #[test]
    fn vol_percentile_in_range() {
        let (_, _, c) = make_trending_data(100);
        let pct = compute_vol_percentile(&c, 14);
        assert!(pct.is_some());
        let p = pct.unwrap();
        assert!(p >= 0.0 && p <= 100.0, "vol percentile should be in [0, 100], got {}", p);
    }

    #[test]
    fn display_regime() {
        assert_eq!(format!("{}", MarketRegime::Trending), "Trending");
        assert_eq!(format!("{}", MarketRegime::Ranging), "Ranging");
        assert_eq!(format!("{}", MarketRegime::Choppy), "Choppy");
    }
}
