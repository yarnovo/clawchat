//! 信号过滤模块 — 在策略信号和 DecisionGate 之间增加一层过滤
//!
//! 4 个过滤器：trade_direction / cooldown_bars / min_volume / liquidity_guard

use crate::config::Config;
use crate::strategy::{Candle, Signal};
use crate::types::{DepthData, Side};

// Re-export TradeDirection from shared (via config)
pub use crate::config::TradeDirection;

/// 信号过滤器
#[derive(Debug)]
pub struct SignalFilter {
    pub trade_direction: TradeDirection,
    pub cooldown_bars: u32,
    pub min_volume: f64,
    pub min_spread_bps: f64,
    pub min_depth_usd: f64,
    cooldown_remaining: u32,
}

/// 过滤结果
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FilterResult {
    Pass,
    Blocked(String),
}

impl SignalFilter {
    pub fn new(
        trade_direction: TradeDirection,
        cooldown_bars: u32,
        min_volume: f64,
        min_spread_bps: f64,
        min_depth_usd: f64,
    ) -> Self {
        Self {
            trade_direction,
            cooldown_bars,
            min_volume,
            min_spread_bps,
            min_depth_usd,
            cooldown_remaining: 0,
        }
    }

    /// 从 Config 构建（读取 signal.json 的 5 个字段）
    pub fn from_config(config: &Config) -> Self {
        Self::new(
            config.trade_direction,
            config.cooldown_bars,
            config.min_volume,
            config.min_spread_bps,
            config.min_depth_usd,
        )
    }

    /// 每根 K 线收盘时调用，递减冷却计数
    pub fn on_bar(&mut self) {
        if self.cooldown_remaining > 0 {
            self.cooldown_remaining -= 1;
        }
    }

    /// 检查信号是否允许通过
    pub fn allows(
        &mut self,
        signal: &Signal,
        candle: Option<&Candle>,
        depth: Option<&DepthData>,
    ) -> FilterResult {
        let order = match signal {
            Signal::Order(req) => req,
            Signal::None => return FilterResult::Pass,
        };

        // 1. trade_direction
        match self.trade_direction {
            TradeDirection::LongOnly if order.side == Side::Sell => {
                return FilterResult::Blocked("trade_direction: long_only blocks sell".into());
            }
            TradeDirection::ShortOnly if order.side == Side::Buy => {
                return FilterResult::Blocked("trade_direction: short_only blocks buy".into());
            }
            _ => {}
        }

        // 2. cooldown_bars
        if self.cooldown_remaining > 0 {
            return FilterResult::Blocked(format!(
                "cooldown: {} bars remaining",
                self.cooldown_remaining
            ));
        }

        // 3. min_volume（需要 candle）
        if self.min_volume > 0.0 {
            if let Some(c) = candle {
                if c.volume < self.min_volume {
                    return FilterResult::Blocked(format!(
                        "min_volume: {:.2} < {:.2}",
                        c.volume, self.min_volume
                    ));
                }
            }
        }

        // 4. liquidity_guard（需要 depth）
        if let Some(d) = depth {
            if !d.bids.is_empty() && !d.asks.is_empty() {
                let best_bid = d.bids[0].price;
                let best_ask = d.asks[0].price;
                let mid = (best_bid + best_ask) / 2.0;

                // 价差检查
                if self.min_spread_bps > 0.0 && mid > 0.0 {
                    let spread_bps = (best_ask - best_bid) / mid * 10_000.0;
                    if spread_bps > self.min_spread_bps {
                        return FilterResult::Blocked(format!(
                            "liquidity_guard: spread {spread_bps:.1}bps > {:.1}bps",
                            self.min_spread_bps
                        ));
                    }
                }

                // 深度检查（买一+卖一的 USD 深度）
                if self.min_depth_usd > 0.0 {
                    let bid_depth = d.bids[0].qty * d.bids[0].price;
                    let ask_depth = d.asks[0].qty * d.asks[0].price;
                    let total_depth = bid_depth + ask_depth;
                    if total_depth < self.min_depth_usd {
                        return FilterResult::Blocked(format!(
                            "liquidity_guard: depth ${total_depth:.0} < ${:.0}",
                            self.min_depth_usd
                        ));
                    }
                }
            }
        }

        // 信号通过，激活冷却
        if self.cooldown_bars > 0 {
            self.cooldown_remaining = self.cooldown_bars;
        }

        FilterResult::Pass
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{OrderRequest, OrderType, PriceLevel};

    fn buy_signal() -> Signal {
        Signal::Order(OrderRequest {
            symbol: "NTRNUSDT".to_string(),
            side: Side::Buy,
            order_type: OrderType::Market,
            qty: 100.0,
            price: None,
        })
    }

    fn sell_signal() -> Signal {
        Signal::Order(OrderRequest {
            symbol: "NTRNUSDT".to_string(),
            side: Side::Sell,
            order_type: OrderType::Market,
            qty: 100.0,
            price: None,
        })
    }

    fn candle(volume: f64) -> Candle {
        Candle {
            open: 1.0,
            high: 1.1,
            low: 0.9,
            close: 1.05,
            volume,
            timestamp: 0,
        }
    }

    fn depth(bid_price: f64, ask_price: f64, bid_qty: f64, ask_qty: f64) -> DepthData {
        DepthData {
            symbol: "NTRNUSDT".to_string(),
            bids: vec![PriceLevel { price: bid_price, qty: bid_qty }],
            asks: vec![PriceLevel { price: ask_price, qty: ask_qty }],
            timestamp: 0,
        }
    }

    // ── TradeDirection ──

    #[test]
    fn direction_from_str() {
        assert_eq!(TradeDirection::from_str_lossy("long_only"), TradeDirection::LongOnly);
        assert_eq!(TradeDirection::from_str_lossy("short_only"), TradeDirection::ShortOnly);
        assert_eq!(TradeDirection::from_str_lossy("both"), TradeDirection::Both);
        assert_eq!(TradeDirection::from_str_lossy(""), TradeDirection::Both);
        assert_eq!(TradeDirection::from_str_lossy("invalid"), TradeDirection::Both);
    }

    // ── Direction filter ──

    #[test]
    fn long_only_blocks_sell() {
        let mut f = SignalFilter::new(TradeDirection::LongOnly, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&sell_signal(), None, None), FilterResult::Blocked("trade_direction: long_only blocks sell".into()));
    }

    #[test]
    fn long_only_allows_buy() {
        let mut f = SignalFilter::new(TradeDirection::LongOnly, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
    }

    #[test]
    fn short_only_blocks_buy() {
        let mut f = SignalFilter::new(TradeDirection::ShortOnly, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Blocked("trade_direction: short_only blocks buy".into()));
    }

    #[test]
    fn short_only_allows_sell() {
        let mut f = SignalFilter::new(TradeDirection::ShortOnly, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&sell_signal(), None, None), FilterResult::Pass);
    }

    #[test]
    fn both_allows_all() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
        assert_eq!(f.allows(&sell_signal(), None, None), FilterResult::Pass);
    }

    // ── Cooldown ──

    #[test]
    fn cooldown_blocks_after_signal() {
        let mut f = SignalFilter::new(TradeDirection::Both, 3, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
        // Now cooldown is 3
        assert!(matches!(f.allows(&buy_signal(), None, None), FilterResult::Blocked(_)));
    }

    #[test]
    fn cooldown_decrements_on_bar() {
        let mut f = SignalFilter::new(TradeDirection::Both, 2, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
        f.on_bar();
        assert!(matches!(f.allows(&buy_signal(), None, None), FilterResult::Blocked(_)));
        f.on_bar();
        // Cooldown expired
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
    }

    #[test]
    fn cooldown_zero_no_blocking() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
        assert_eq!(f.allows(&buy_signal(), None, None), FilterResult::Pass);
    }

    // ── min_volume ──

    #[test]
    fn volume_below_threshold_blocks() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 1000.0, 0.0, 0.0);
        let c = candle(500.0);
        assert!(matches!(f.allows(&buy_signal(), Some(&c), None), FilterResult::Blocked(_)));
    }

    #[test]
    fn volume_above_threshold_passes() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 1000.0, 0.0, 0.0);
        let c = candle(1500.0);
        assert_eq!(f.allows(&buy_signal(), Some(&c), None), FilterResult::Pass);
    }

    #[test]
    fn volume_zero_threshold_skips_check() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0);
        let c = candle(0.0);
        assert_eq!(f.allows(&buy_signal(), Some(&c), None), FilterResult::Pass);
    }

    // ── liquidity_guard: spread ──

    #[test]
    fn spread_too_wide_blocks() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 10.0, 0.0);
        // bid=100, ask=100.20 → mid=100.10, spread=0.20/100.10*10000 ≈ 20bps > 10bps
        let d = depth(100.0, 100.20, 10.0, 10.0);
        assert!(matches!(f.allows(&buy_signal(), None, Some(&d)), FilterResult::Blocked(_)));
    }

    #[test]
    fn spread_within_limit_passes() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 50.0, 0.0);
        // bid=100, ask=100.02 → spread ≈ 2bps < 50bps
        let d = depth(100.0, 100.02, 10.0, 10.0);
        assert_eq!(f.allows(&buy_signal(), None, Some(&d)), FilterResult::Pass);
    }

    // ── liquidity_guard: depth ──

    #[test]
    fn depth_too_shallow_blocks() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 5000.0);
        // bid: 100*10=1000, ask: 100.02*10=1000.2, total=2000.2 < 5000
        let d = depth(100.0, 100.02, 10.0, 10.0);
        assert!(matches!(f.allows(&buy_signal(), None, Some(&d)), FilterResult::Blocked(_)));
    }

    #[test]
    fn depth_sufficient_passes() {
        let mut f = SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 1000.0);
        // bid: 100*50=5000, ask: 100.02*50=5001, total=10001 > 1000
        let d = depth(100.0, 100.02, 50.0, 50.0);
        assert_eq!(f.allows(&buy_signal(), None, Some(&d)), FilterResult::Pass);
    }

    // ── Signal::None always passes ──

    #[test]
    fn none_signal_always_passes() {
        let mut f = SignalFilter::new(TradeDirection::LongOnly, 5, 9999.0, 999.0, 99999.0);
        assert_eq!(f.allows(&Signal::None, None, None), FilterResult::Pass);
    }

    // ── Combined filters ──

    #[test]
    fn multiple_filters_first_fail_wins() {
        // direction=long_only + cooldown active → direction should block first
        let mut f = SignalFilter::new(TradeDirection::LongOnly, 3, 0.0, 0.0, 0.0);
        let result = f.allows(&sell_signal(), None, None);
        assert!(matches!(result, FilterResult::Blocked(ref s) if s.contains("trade_direction")));
    }
}
