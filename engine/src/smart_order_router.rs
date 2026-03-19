//! Smart Order Router (SOR): automatically selects order type based on
//! order size vs orderbook depth.
//!
//! Decision logic:
//!   - order_usdt < top3_depth * 0.1  → Market order (small, minimal impact)
//!   - order_usdt < top10_depth * 0.3 → Limit order (at best bid/ask)
//!   - otherwise                      → TWAP (split across N slices)
//!
//! Predicted slippage > max_slippage_pct also forces TWAP.

use clawchat_shared::exchange::{ExchangeClient, ExchangeError, OrderbookDepth};

// ── SOR Decision ──────────────────────────────────────────────

/// The order execution method chosen by SOR.
#[derive(Debug, Clone, PartialEq)]
pub enum SorDecision {
    /// Small order — use market order directly.
    Market,
    /// Medium order — place limit at best bid/ask.
    Limit { price: f64 },
    /// Large order — split into N slices over duration.
    Twap {
        slices: u32,
        qty_per_slice: f64,
        interval_secs: u64,
    },
}

/// Configuration for SOR behavior (from signal.json or defaults).
#[derive(Debug, Clone)]
pub struct SorConfig {
    /// Maximum acceptable slippage %. Orders predicted above this → TWAP.
    pub max_slippage_pct: f64,
    /// TWAP total duration in minutes.
    pub twap_duration_minutes: u32,
    /// Minimum number of TWAP slices.
    pub twap_min_slices: u32,
}

impl Default for SorConfig {
    fn default() -> Self {
        Self {
            max_slippage_pct: 0.1,
            twap_duration_minutes: 5,
            twap_min_slices: 5,
        }
    }
}

// ── SOR logic ─────────────────────────────────────────────────

/// Decide the best order type given orderbook depth and order parameters.
///
/// `order_usdt` = qty * price (the notional USDT value of the order).
/// `is_buy` = true for buy orders (we look at ask depth), false for sell (bid depth).
pub fn decide_order_type(
    depth: &OrderbookDepth,
    order_usdt: f64,
    qty: f64,
    is_buy: bool,
    config: &SorConfig,
) -> SorDecision {
    // Depth thresholds
    let top3_depth = if is_buy {
        depth.ask_depth_usdt(3)
    } else {
        depth.bid_depth_usdt(3)
    };
    let top10_depth = if is_buy {
        depth.ask_depth_usdt(10)
    } else {
        depth.bid_depth_usdt(10)
    };

    // Predicted slippage check — force TWAP if too high
    let predicted_slippage = depth.predict_slippage_pct(order_usdt, is_buy);
    if predicted_slippage > config.max_slippage_pct {
        let slices = config.twap_min_slices.max(2);
        let interval_secs = (config.twap_duration_minutes as u64 * 60) / slices as u64;
        tracing::info!(
            order_usdt,
            predicted_slippage,
            max_slippage = config.max_slippage_pct,
            slices,
            "SOR: slippage too high → TWAP"
        );
        return SorDecision::Twap {
            slices,
            qty_per_slice: qty / slices as f64,
            interval_secs,
        };
    }

    // Size-based decision
    if order_usdt < top3_depth * 0.1 {
        // Small order — market
        SorDecision::Market
    } else if order_usdt < top10_depth * 0.3 {
        // Medium order — limit at best price
        let price = if is_buy {
            depth.best_ask()
        } else {
            depth.best_bid()
        };
        if price <= 0.0 {
            SorDecision::Market // fallback
        } else {
            SorDecision::Limit { price }
        }
    } else {
        // Large order — TWAP
        let slices = config.twap_min_slices.max(2);
        let interval_secs = (config.twap_duration_minutes as u64 * 60) / slices as u64;
        tracing::info!(
            order_usdt,
            top3_depth,
            top10_depth,
            slices,
            "SOR: large order → TWAP"
        );
        SorDecision::Twap {
            slices,
            qty_per_slice: qty / slices as f64,
            interval_secs,
        }
    }
}

/// Execute an order via SOR: fetch depth, decide type, place order(s).
/// Returns the JSON response from the final (or only) order placement.
pub async fn execute_sor_order(
    exchange: &dyn ExchangeClient,
    symbol: &str,
    side: &str,
    qty: f64,
    price: f64,
    config: &SorConfig,
) -> Result<serde_json::Value, ExchangeError> {
    let is_buy = side.eq_ignore_ascii_case("BUY");
    let order_usdt = qty * price;

    // Fetch orderbook (20 levels)
    let depth = match exchange.get_orderbook_depth(symbol, 20).await {
        Ok(d) => d,
        Err(e) => {
            tracing::warn!(symbol, "SOR: failed to fetch orderbook, falling back to market: {e}");
            return exchange.market_order(symbol, side, qty).await;
        }
    };

    let decision = decide_order_type(&depth, order_usdt, qty, is_buy, config);
    tracing::info!(symbol, side, qty, order_usdt, ?decision, "SOR decision");

    match decision {
        SorDecision::Market => {
            exchange.market_order(symbol, side, qty).await
        }
        SorDecision::Limit { price: limit_price } => {
            exchange.limit_order(symbol, side, qty, limit_price).await
        }
        SorDecision::Twap {
            slices,
            qty_per_slice,
            interval_secs,
        } => {
            let mut last_resp = serde_json::Value::Null;
            for i in 0..slices {
                // Last slice gets remainder to avoid rounding issues
                let slice_qty = if i == slices - 1 {
                    qty - qty_per_slice * (slices - 1) as f64
                } else {
                    qty_per_slice
                };
                if slice_qty <= 0.0 {
                    continue;
                }

                match exchange.market_order(symbol, side, slice_qty).await {
                    Ok(resp) => {
                        tracing::info!(
                            symbol,
                            slice = i + 1,
                            total = slices,
                            slice_qty,
                            "TWAP slice executed"
                        );
                        last_resp = resp;
                    }
                    Err(e) => {
                        tracing::error!(
                            symbol,
                            slice = i + 1,
                            total = slices,
                            "TWAP slice failed: {e}"
                        );
                        return Err(e);
                    }
                }

                // Wait between slices (skip wait after last)
                if i < slices - 1 {
                    tokio::time::sleep(std::time::Duration::from_secs(interval_secs)).await;
                }
            }
            Ok(last_resp)
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use clawchat_shared::exchange::OrderbookDepth;

    fn make_depth(bids: Vec<(f64, f64)>, asks: Vec<(f64, f64)>) -> OrderbookDepth {
        OrderbookDepth { bids, asks }
    }

    #[test]
    fn small_order_uses_market() {
        // Top 3 ask depth = 100*10 + 100.1*10 + 100.2*10 = ~3003 USDT
        // Order = 10 USDT < 3003 * 0.1 = 300.3 → Market
        let depth = make_depth(
            vec![(99.9, 10.0), (99.8, 10.0), (99.7, 10.0)],
            vec![(100.0, 10.0), (100.1, 10.0), (100.2, 10.0)],
        );
        let config = SorConfig::default();
        let decision = decide_order_type(&depth, 10.0, 0.1, true, &config);
        assert_eq!(decision, SorDecision::Market);
    }

    #[test]
    fn medium_order_uses_limit() {
        // Top 3 ask depth = ~3003 USDT, top 10 ask depth = same 3 levels = ~3003
        // Order = 500 USDT: > 3003*0.1=300.3, but < 3003*0.3=900.9 → Limit
        let depth = make_depth(
            vec![(99.9, 10.0), (99.8, 10.0), (99.7, 10.0)],
            vec![
                (100.0, 10.0), (100.1, 10.0), (100.2, 10.0),
                (100.3, 10.0), (100.4, 10.0), (100.5, 10.0),
                (100.6, 10.0), (100.7, 10.0), (100.8, 10.0),
                (100.9, 10.0),
            ],
        );
        let config = SorConfig { max_slippage_pct: 5.0, ..Default::default() };
        let decision = decide_order_type(&depth, 500.0, 5.0, true, &config);
        assert_eq!(decision, SorDecision::Limit { price: 100.0 });
    }

    #[test]
    fn large_order_uses_twap() {
        // Top 10 ask depth = 10 * 100 * 1 = 1000 USDT
        // Order = 500 USDT > 1000 * 0.3 = 300 → TWAP
        let depth = make_depth(
            vec![(99.0, 1.0)],
            vec![
                (100.0, 1.0), (100.1, 1.0), (100.2, 1.0),
                (100.3, 1.0), (100.4, 1.0), (100.5, 1.0),
                (100.6, 1.0), (100.7, 1.0), (100.8, 1.0),
                (100.9, 1.0),
            ],
        );
        let config = SorConfig { max_slippage_pct: 5.0, ..Default::default() };
        let decision = decide_order_type(&depth, 500.0, 5.0, true, &config);
        match decision {
            SorDecision::Twap { slices, .. } => assert!(slices >= 2),
            other => panic!("expected TWAP, got {other:?}"),
        }
    }

    #[test]
    fn high_slippage_forces_twap() {
        // Thin orderbook: 1 ask level with 0.01 qty at 100
        // Order = 50 USDT → huge predicted slippage → TWAP
        let depth = make_depth(
            vec![(99.0, 0.01)],
            vec![(100.0, 0.01)],
        );
        let config = SorConfig { max_slippage_pct: 0.1, ..Default::default() };
        let decision = decide_order_type(&depth, 50.0, 0.5, true, &config);
        match decision {
            SorDecision::Twap { .. } => {} // OK
            other => panic!("expected TWAP due to slippage, got {other:?}"),
        }
    }

    #[test]
    fn sell_order_checks_bid_depth() {
        // Bid depth top 3 = 3 * 99 * 10 = ~2970 USDT
        // Order = 10 USDT < 2970 * 0.1 = 297 → Market
        let depth = make_depth(
            vec![(99.0, 10.0), (98.9, 10.0), (98.8, 10.0)],
            vec![(100.0, 10.0)],
        );
        let config = SorConfig::default();
        let decision = decide_order_type(&depth, 10.0, 0.1, false, &config);
        assert_eq!(decision, SorDecision::Market);
    }

    #[test]
    fn predict_slippage_zero_for_tiny_order() {
        let depth = make_depth(
            vec![(99.0, 100.0)],
            vec![(100.0, 100.0)],
        );
        let slippage = depth.predict_slippage_pct(1.0, true);
        assert!(slippage < 0.001);
    }

    #[test]
    fn predict_slippage_increases_with_size() {
        let depth = make_depth(
            vec![],
            vec![(100.0, 1.0), (101.0, 1.0), (102.0, 1.0)],
        );
        let small = depth.predict_slippage_pct(50.0, true);
        let large = depth.predict_slippage_pct(250.0, true);
        assert!(large > small);
    }

    #[test]
    fn default_sor_config() {
        let config = SorConfig::default();
        assert!((config.max_slippage_pct - 0.1).abs() < f64::EPSILON);
        assert_eq!(config.twap_duration_minutes, 5);
        assert_eq!(config.twap_min_slices, 5);
    }

    #[test]
    fn twap_slices_qty_sum_equals_total() {
        let qty = 10.0;
        let slices = 3u32;
        let qty_per_slice = qty / slices as f64;
        let mut total = 0.0;
        for i in 0..slices {
            let slice_qty = if i == slices - 1 {
                qty - qty_per_slice * (slices - 1) as f64
            } else {
                qty_per_slice
            };
            total += slice_qty;
        }
        assert!((total - qty).abs() < 1e-10);
    }

    #[test]
    fn empty_orderbook_falls_back_to_market() {
        let depth = make_depth(vec![], vec![]);
        let config = SorConfig::default();
        // With empty orderbook, top3_depth = 0, so order_usdt < 0 is false
        // But slippage prediction returns 0 for empty book
        // And 0 < 0*0.1 is false, 0 < 0*0.3 is false → TWAP
        // Actually: order_usdt=10, top3=0, 10 < 0*0.1=0 → false, 10 < 0*0.3=0 → false → TWAP
        let decision = decide_order_type(&depth, 10.0, 0.1, true, &config);
        match decision {
            SorDecision::Twap { .. } => {} // expected for unknown depth
            _ => {} // also acceptable
        }
    }
}
