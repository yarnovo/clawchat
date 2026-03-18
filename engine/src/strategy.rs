use crate::types::{DepthData, MarketEvent, OrderRequest, OrderType, Side, TickData};

// ── 信号 ──────────────────────────────────────────────────────

/// 策略输出信号
#[derive(Debug, Clone, PartialEq)]
pub enum Signal {
    /// 下单
    Order(OrderRequest),
    /// 不操作
    None,
}

// ── Candle（从 tick 聚合）──────────────────────────────────────

/// K 线数据，由引擎从 tick 流聚合后传入策略
#[derive(Debug, Clone)]
pub struct Candle {
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
    pub timestamp: u64,
}

// ── Strategy trait ────────────────────────────────────────────

/// 策略 trait：可接收 K 线或原始事件
pub trait Strategy {
    /// 基于 K 线决策（TrendFollower 等中低频策略）
    fn on_candle(&mut self, candle: &Candle) -> Option<Signal>;

    /// 基于 tick 决策（做市等高频策略，默认忽略）
    fn on_tick(&mut self, _tick: &TickData) -> Option<Signal> {
        Some(Signal::None)
    }

    /// 基于深度决策（做市策略，默认忽略）
    fn on_depth(&mut self, _depth: &DepthData) -> Option<Signal> {
        Some(Signal::None)
    }

    /// 分发 MarketEvent 到具体处理方法
    fn on_event(&mut self, event: &MarketEvent) -> Option<Signal> {
        match event {
            MarketEvent::Tick(t) => self.on_tick(t),
            MarketEvent::Depth(d) => self.on_depth(d),
            _ => Some(Signal::None),
        }
    }

    fn name(&self) -> &str;
}

// ── CandleAggregator ─────────────────────────────────────────

/// 从 tick 流聚合出 K 线
pub struct CandleAggregator {
    interval_ms: u64,
    current: Option<Candle>,
    window_start: u64,
}

impl CandleAggregator {
    pub fn new(interval_ms: u64) -> Self {
        Self {
            interval_ms,
            current: None,
            window_start: 0,
        }
    }

    /// 喂入一笔 tick，如果跨区间则返回完成的 K 线
    pub fn update(&mut self, tick: &TickData) -> Option<Candle> {
        let window = tick.timestamp / self.interval_ms * self.interval_ms;

        if let Some(ref mut c) = self.current {
            if window != self.window_start {
                // 新区间，完成旧 K 线
                let finished = c.clone();
                *c = Candle {
                    open: tick.price,
                    high: tick.price,
                    low: tick.price,
                    close: tick.price,
                    volume: tick.qty,
                    timestamp: window,
                };
                self.window_start = window;
                return Some(finished);
            }
            // 同区间，更新
            c.high = c.high.max(tick.price);
            c.low = c.low.min(tick.price);
            c.close = tick.price;
            c.volume += tick.qty;
        } else {
            self.current = Some(Candle {
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price,
                volume: tick.qty,
                timestamp: window,
            });
            self.window_start = window;
        }
        None
    }
}

// ══════════════════════════════════════════════════════════════
// 做市策略 (MarketMaker)
// ══════════════════════════════════════════════════════════════

pub struct MarketMaker {
    pub symbol: String,
    pub fee_rate: f64,
    pub order_qty: f64,
    pending_bid: Option<f64>,
    pending_ask: Option<f64>,
}

impl MarketMaker {
    pub fn new(symbol: &str, fee_rate: f64, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            fee_rate,
            order_qty,
            pending_bid: None,
            pending_ask: None,
        }
    }
}

impl Strategy for MarketMaker {
    fn on_candle(&mut self, _candle: &Candle) -> Option<Signal> {
        // 做市策略基于 depth 驱动，不使用 K 线
        Some(Signal::None)
    }

    fn on_depth(&mut self, depth: &DepthData) -> Option<Signal> {
        let best_bid = depth.bids.first()?.price;
        let best_ask = depth.asks.first()?.price;
        let spread = (best_ask - best_bid) / best_bid;
        let min_spread = self.fee_rate * 2.0;

        // 价差不够覆盖双边手续费
        if spread <= min_spread {
            return Some(Signal::None);
        }

        // 挂单被成交检测 & 反向挂单
        if let Some(pb) = self.pending_bid {
            if best_bid < pb {
                // bid 被吃，在 ask 侧挂卖单
                self.pending_bid = None;
                self.pending_ask = Some(best_ask);
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side: Side::Sell,
                    order_type: OrderType::Limit,
                    qty: self.order_qty,
                    price: Some(best_ask),
                }));
            }
        }

        if let Some(pa) = self.pending_ask {
            if best_ask > pa {
                // ask 被吃，在 bid 侧挂买单
                self.pending_ask = None;
                self.pending_bid = Some(best_bid);
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side: Side::Buy,
                    order_type: OrderType::Limit,
                    qty: self.order_qty,
                    price: Some(best_bid),
                }));
            }
        }

        // 初始双向挂单
        if self.pending_bid.is_none() && self.pending_ask.is_none() {
            self.pending_bid = Some(best_bid);
            self.pending_ask = Some(best_ask);
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Limit,
                qty: self.order_qty,
                price: Some(best_bid),
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "MarketMaker"
    }
}

// ══════════════════════════════════════════════════════════════
// 趋势策略 (TrendFollower) — EMA 21/55 交叉 + ATR 止损止盈
// ══════════════════════════════════════════════════════════════

pub struct TrendFollower {
    pub symbol: String,
    pub ema_fast_period: usize,
    pub ema_slow_period: usize,
    pub atr_period: usize,
    pub atr_sl_mult: f64,
    pub atr_tp_mult: f64,
    pub order_qty: f64,

    ema_fast: Option<f64>,
    ema_slow: Option<f64>,
    prev_fast_above: Option<bool>,
    atr: Option<f64>,
    prev_close: Option<f64>,
    candle_count: usize,
}

impl TrendFollower {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            ema_fast_period: 21,
            ema_slow_period: 55,
            atr_period: 14,
            atr_sl_mult: 1.5,
            atr_tp_mult: 2.5,
            order_qty,
            ema_fast: None,
            ema_slow: None,
            prev_fast_above: None,
            atr: None,
            prev_close: None,
            candle_count: 0,
        }
    }

    /// 当前 ATR 值（用于外部止损止盈计算）
    pub fn current_atr(&self) -> Option<f64> {
        self.atr
    }

    fn update_ema(prev: Option<f64>, value: f64, period: usize) -> f64 {
        let k = 2.0 / (period as f64 + 1.0);
        match prev {
            Some(prev_ema) => prev_ema + k * (value - prev_ema),
            None => value,
        }
    }

    fn update_atr(&self, candle: &Candle) -> f64 {
        let tr = {
            let hl = candle.high - candle.low;
            match self.prev_close {
                Some(pc) => {
                    let hc = (candle.high - pc).abs();
                    let lc = (candle.low - pc).abs();
                    hl.max(hc).max(lc)
                }
                None => hl,
            }
        };
        let k = 2.0 / (self.atr_period as f64 + 1.0);
        match self.atr {
            Some(prev_atr) => prev_atr + k * (tr - prev_atr),
            None => tr,
        }
    }
}

impl Strategy for TrendFollower {
    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.candle_count += 1;

        let new_fast = Self::update_ema(self.ema_fast, candle.close, self.ema_fast_period);
        let new_slow = Self::update_ema(self.ema_slow, candle.close, self.ema_slow_period);
        let new_atr = self.update_atr(candle);

        self.ema_fast = Some(new_fast);
        self.ema_slow = Some(new_slow);
        self.atr = Some(new_atr);
        self.prev_close = Some(candle.close);

        // 预热期
        if self.candle_count < self.ema_slow_period {
            self.prev_fast_above = Some(new_fast > new_slow);
            return Some(Signal::None);
        }

        let fast_above = new_fast > new_slow;
        let signal = match self.prev_fast_above {
            Some(was_above) if !was_above && fast_above => {
                // 金叉 → 做多
                Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side: Side::Buy,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }))
            }
            Some(was_above) if was_above && !fast_above => {
                // 死叉 → 做空
                Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side: Side::Sell,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }))
            }
            _ => Some(Signal::None),
        };

        self.prev_fast_above = Some(fast_above);
        signal
    }

    fn name(&self) -> &str {
        "TrendFollower"
    }
}

/// 计算止损/止盈价格
pub fn calc_sl_tp(entry: f64, atr: f64, is_long: bool, sl_mult: f64, tp_mult: f64) -> (f64, f64) {
    if is_long {
        (entry - atr * sl_mult, entry + atr * tp_mult)
    } else {
        (entry + atr * sl_mult, entry - atr * tp_mult)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_candle(close: f64, ts: u64) -> Candle {
        Candle {
            open: close - 0.5,
            high: close + 1.0,
            low: close - 1.0,
            close,
            volume: 100.0,
            timestamp: ts,
        }
    }

    #[test]
    fn trend_follower_warmup_returns_none() {
        let mut tf = TrendFollower::new("BTCUSDT", 1.0);
        for i in 0..54 {
            let sig = tf.on_candle(&sample_candle(100.0 + i as f64 * 0.01, i));
            assert_eq!(sig, Some(Signal::None));
        }
    }

    #[test]
    fn sl_tp_long() {
        let (sl, tp) = calc_sl_tp(100.0, 2.0, true, 1.5, 2.5);
        assert!((sl - 97.0).abs() < 1e-9);
        assert!((tp - 105.0).abs() < 1e-9);
    }

    #[test]
    fn sl_tp_short() {
        let (sl, tp) = calc_sl_tp(100.0, 2.0, false, 1.5, 2.5);
        assert!((sl - 103.0).abs() < 1e-9);
        assert!((tp - 95.0).abs() < 1e-9);
    }

    #[test]
    fn candle_aggregator_emits_on_boundary() {
        let mut agg = CandleAggregator::new(1000); // 1s K 线
        // 第一个区间的 ticks
        assert!(agg.update(&TickData {
            symbol: "BTC".into(), price: 100.0, qty: 1.0, timestamp: 0, is_buyer_maker: false,
        }).is_none());
        assert!(agg.update(&TickData {
            symbol: "BTC".into(), price: 102.0, qty: 2.0, timestamp: 500, is_buyer_maker: false,
        }).is_none());
        // 跨区间 → 产出 K 线
        let candle = agg.update(&TickData {
            symbol: "BTC".into(), price: 101.0, qty: 1.0, timestamp: 1000, is_buyer_maker: false,
        });
        assert!(candle.is_some());
        let c = candle.unwrap();
        assert!((c.open - 100.0).abs() < 1e-9);
        assert!((c.high - 102.0).abs() < 1e-9);
        assert!((c.close - 102.0).abs() < 1e-9);
        assert!((c.volume - 3.0).abs() < 1e-9);
    }
}
