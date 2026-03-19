use clawchat_shared::candle::Candle;

#[derive(Debug)]
pub enum DataIssue {
    /// K 线缺失
    Gap { expected_ts: u64, actual_ts: u64 },
    /// 价格异常（相邻 K 线价格变化超过阈值）
    PriceSpike { timestamp: u64, change_pct: f64 },
    /// OHLC 内部不一致（high < low 等）
    InvalidOhlc { timestamp: u64, detail: String },
    /// 零成交量
    ZeroVolume { timestamp: u64 },
}

/// 校验 K 线序列
pub fn validate_candles(candles: &[Candle], interval_ms: u64) -> Vec<DataIssue> {
    let mut issues = Vec::new();

    for (i, c) in candles.iter().enumerate() {
        // OHLC 一致性
        let max_oc = c.open.max(c.close);
        let min_oc = c.open.min(c.close);
        if c.high < max_oc {
            issues.push(DataIssue::InvalidOhlc {
                timestamp: c.timestamp,
                detail: format!("high ({}) < max(open,close) ({})", c.high, max_oc),
            });
        }
        if c.low > min_oc {
            issues.push(DataIssue::InvalidOhlc {
                timestamp: c.timestamp,
                detail: format!("low ({}) > min(open,close) ({})", c.low, min_oc),
            });
        }
        if c.high < c.low {
            issues.push(DataIssue::InvalidOhlc {
                timestamp: c.timestamp,
                detail: format!("high ({}) < low ({})", c.high, c.low),
            });
        }

        // 零成交量
        if c.volume == 0.0 {
            issues.push(DataIssue::ZeroVolume {
                timestamp: c.timestamp,
            });
        }

        // 相邻 K 线检查
        if i > 0 {
            let prev = &candles[i - 1];

            // 时间连续性
            let expected_ts = prev.timestamp + interval_ms;
            if c.timestamp != expected_ts {
                issues.push(DataIssue::Gap {
                    expected_ts,
                    actual_ts: c.timestamp,
                });
            }

            // 价格合理性：close 变化 > 50%
            if prev.close > 0.0 {
                let change_pct = ((c.close - prev.close) / prev.close).abs() * 100.0;
                if change_pct > 50.0 {
                    issues.push(DataIssue::PriceSpike {
                        timestamp: c.timestamp,
                        change_pct,
                    });
                }
            }
        }
    }

    issues
}

/// 生成校验报告摘要
pub fn validation_summary(issues: &[DataIssue]) -> String {
    let mut gaps = 0u32;
    let mut spikes = 0u32;
    let mut invalid_ohlc = 0u32;
    let mut zero_vol = 0u32;

    for issue in issues {
        match issue {
            DataIssue::Gap { .. } => gaps += 1,
            DataIssue::PriceSpike { .. } => spikes += 1,
            DataIssue::InvalidOhlc { .. } => invalid_ohlc += 1,
            DataIssue::ZeroVolume { .. } => zero_vol += 1,
        }
    }

    let mut lines = Vec::new();

    if gaps == 0 {
        lines.push("  \u{2713} No gaps detected".to_string());
    } else {
        lines.push(format!("  \u{26a0} {} gap(s) detected", gaps));
    }

    if spikes == 0 {
        lines.push("  \u{2713} No price spikes".to_string());
    } else {
        lines.push(format!("  \u{26a0} {} price spike(s) (>50% change)", spikes));
    }

    if zero_vol == 0 {
        lines.push("  \u{2713} No zero-volume candles".to_string());
    } else {
        lines.push(format!("  \u{26a0} {} zero-volume candle(s)", zero_vol));
    }

    if invalid_ohlc == 0 {
        lines.push("  \u{2713} OHLC consistency OK".to_string());
    } else {
        lines.push(format!("  \u{26a0} {} OHLC inconsistenc(ies)", invalid_ohlc));
    }

    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_candle(ts: u64, open: f64, high: f64, low: f64, close: f64, volume: f64) -> Candle {
        Candle { timestamp: ts, open, high, low, close, volume }
    }

    #[test]
    fn normal_data_no_issues() {
        let candles = vec![
            make_candle(0, 100.0, 105.0, 95.0, 102.0, 10.0),
            make_candle(60_000, 102.0, 108.0, 100.0, 106.0, 12.0),
            make_candle(120_000, 106.0, 110.0, 104.0, 107.0, 8.0),
        ];
        let issues = validate_candles(&candles, 60_000);
        assert!(issues.is_empty(), "expected no issues, got: {:?}", issues);
    }

    #[test]
    fn detects_gap() {
        let candles = vec![
            make_candle(0, 100.0, 105.0, 95.0, 102.0, 10.0),
            // skip 60_000, jump to 120_000
            make_candle(120_000, 102.0, 108.0, 100.0, 106.0, 12.0),
        ];
        let issues = validate_candles(&candles, 60_000);
        assert!(issues.iter().any(|i| matches!(i, DataIssue::Gap { expected_ts: 60_000, actual_ts: 120_000 })));
    }

    #[test]
    fn detects_price_spike() {
        let candles = vec![
            make_candle(0, 100.0, 105.0, 95.0, 100.0, 10.0),
            // close jumps from 100 to 200 => 100% change
            make_candle(60_000, 100.0, 200.0, 100.0, 200.0, 12.0),
        ];
        let issues = validate_candles(&candles, 60_000);
        assert!(issues.iter().any(|i| matches!(i, DataIssue::PriceSpike { .. })));
    }

    #[test]
    fn detects_invalid_ohlc() {
        // high < low
        let candles = vec![
            make_candle(0, 100.0, 90.0, 95.0, 102.0, 10.0),
        ];
        let issues = validate_candles(&candles, 60_000);
        assert!(issues.iter().any(|i| matches!(i, DataIssue::InvalidOhlc { .. })));
    }

    #[test]
    fn detects_zero_volume() {
        let candles = vec![
            make_candle(0, 100.0, 105.0, 95.0, 102.0, 0.0),
        ];
        let issues = validate_candles(&candles, 60_000);
        assert!(issues.iter().any(|i| matches!(i, DataIssue::ZeroVolume { .. })));
    }

    #[test]
    fn empty_data_no_panic() {
        let issues = validate_candles(&[], 60_000);
        assert!(issues.is_empty());
    }
}
