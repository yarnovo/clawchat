/// Convert timeframe string to milliseconds: "5m" → 300000, "1h" → 3600000
pub fn timeframe_to_ms(tf: &str) -> Option<u64> {
    let (num_str, unit) = tf.split_at(tf.len().saturating_sub(1));
    let num: u64 = num_str.parse().ok()?;
    match unit {
        "m" => Some(num * 60_000),
        "h" => Some(num * 3_600_000),
        "d" => Some(num * 86_400_000),
        "s" => Some(num * 1_000),
        _ => None,
    }
}

/// Convert timeframe ms to Binance interval string: 300000 → "5m"
pub fn ms_to_timeframe(ms: u64) -> String {
    if ms % 86_400_000 == 0 {
        format!("{}d", ms / 86_400_000)
    } else if ms % 3_600_000 == 0 {
        format!("{}h", ms / 3_600_000)
    } else if ms % 60_000 == 0 {
        format!("{}m", ms / 60_000)
    } else {
        format!("{}s", ms / 1_000)
    }
}

/// Normalize symbol: "PIPPIN/USDT" → "PIPPINUSDT", "BTC/USDT:USDT" → "BTCUSDT"
pub fn normalize_symbol(s: &str) -> String {
    s.replace("/", "").replace(":USDT", "")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timeframe_minutes() {
        assert_eq!(timeframe_to_ms("5m"), Some(300_000));
        assert_eq!(timeframe_to_ms("1m"), Some(60_000));
        assert_eq!(timeframe_to_ms("15m"), Some(900_000));
    }

    #[test]
    fn timeframe_hours_days_seconds() {
        assert_eq!(timeframe_to_ms("1h"), Some(3_600_000));
        assert_eq!(timeframe_to_ms("4h"), Some(14_400_000));
        assert_eq!(timeframe_to_ms("1d"), Some(86_400_000));
        assert_eq!(timeframe_to_ms("30s"), Some(30_000));
    }

    #[test]
    fn timeframe_invalid() {
        assert_eq!(timeframe_to_ms("x"), None);
        assert_eq!(timeframe_to_ms(""), None);
    }

    #[test]
    fn ms_to_timeframe_roundtrip() {
        assert_eq!(ms_to_timeframe(300_000), "5m");
        assert_eq!(ms_to_timeframe(3_600_000), "1h");
        assert_eq!(ms_to_timeframe(86_400_000), "1d");
    }

    #[test]
    fn normalize_symbol_slash() {
        assert_eq!(normalize_symbol("PIPPIN/USDT"), "PIPPINUSDT");
        assert_eq!(normalize_symbol("BTC/USDT"), "BTCUSDT");
    }

    #[test]
    fn normalize_symbol_colon() {
        assert_eq!(normalize_symbol("PIPPIN/USDT:USDT"), "PIPPINUSDT");
    }

    #[test]
    fn normalize_symbol_already_clean() {
        assert_eq!(normalize_symbol("BTCUSDT"), "BTCUSDT");
    }
}
