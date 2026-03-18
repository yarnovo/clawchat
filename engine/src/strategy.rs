use std::collections::HashMap;

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

    /// 导出策略内部指标状态（用于持久化）
    fn export_state(&self) -> serde_json::Value {
        serde_json::Value::Null
    }

    /// 从持久化状态恢复指标（跳过预热）
    fn restore_state(&mut self, _state: &serde_json::Value) {}
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

    /// 导出当前聚合状态
    pub fn export_state(&self) -> Option<crate::state::CandleAggregatorState> {
        self.current.as_ref().map(|c| crate::state::CandleAggregatorState {
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            window_start: self.window_start,
        })
    }

    /// 从持久化状态恢复
    pub fn restore_state(&mut self, state: &crate::state::CandleAggregatorState) {
        self.window_start = state.window_start;
        self.current = Some(Candle {
            open: state.open,
            high: state.high,
            low: state.low,
            close: state.close,
            volume: 0.0, // volume 不需要精确恢复
            timestamp: state.window_start,
        });
        tracing::info!(window_start = state.window_start, "candle aggregator state restored");
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

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            fee_rate: params.get("fee_rate").copied().unwrap_or(0.0004),
            order_qty,
            pending_bid: None,
            pending_ask: None,
        }
    }
}

impl Strategy for MarketMaker {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "pending_bid": self.pending_bid,
            "pending_ask": self.pending_ask,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        self.pending_bid = state.get("pending_bid").and_then(|v| v.as_f64());
        self.pending_ask = state.get("pending_ask").and_then(|v| v.as_f64());
        tracing::info!("MarketMaker state restored");
    }

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

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            ema_fast_period: params.get("ema_fast").copied().unwrap_or(21.0) as usize,
            ema_slow_period: params.get("ema_slow").copied().unwrap_or(55.0) as usize,
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl_mult: params.get("atr_sl_mult").copied().unwrap_or(1.5),
            atr_tp_mult: params.get("atr_tp_mult").copied().unwrap_or(2.5),
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
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "ema_fast": self.ema_fast,
            "ema_slow": self.ema_slow,
            "atr": self.atr,
            "prev_close": self.prev_close,
            "prev_fast_above": self.prev_fast_above,
            "candle_count": self.candle_count,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(v) = state.get("ema_fast").and_then(|v| v.as_f64()) {
            self.ema_fast = Some(v);
        }
        if let Some(v) = state.get("ema_slow").and_then(|v| v.as_f64()) {
            self.ema_slow = Some(v);
        }
        if let Some(v) = state.get("atr").and_then(|v| v.as_f64()) {
            self.atr = Some(v);
        }
        if let Some(v) = state.get("prev_close").and_then(|v| v.as_f64()) {
            self.prev_close = Some(v);
        }
        if let Some(v) = state.get("prev_fast_above").and_then(|v| v.as_bool()) {
            self.prev_fast_above = Some(v);
        }
        if let Some(v) = state.get("candle_count").and_then(|v| v.as_u64()) {
            self.candle_count = v as usize;
        }
        tracing::info!(
            ema_fast = ?self.ema_fast, ema_slow = ?self.ema_slow,
            candle_count = self.candle_count,
            "TrendFollower state restored"
        );
    }

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

// ── 工具函数 ─────────────────────────────────────────────────

/// 从历史序列计算 EMA
fn ema_from_slice(data: &[f64], period: usize) -> Option<f64> {
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

/// 从历史序列计算 RSI
fn rsi_from_slice(closes: &[f64], period: usize) -> Option<f64> {
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

/// 从历史序列计算 ATR
fn atr_from_slices(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> Option<f64> {
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

// ══════════════════════════════════════════════════════════════
// Scalping 策略 — EMA 快慢线交叉 + RSI 过滤 + 放量确认
// ══════════════════════════════════════════════════════════════

struct ScalpingPosition {
    side: Side,
    sl: f64,
    tp: f64,
}

pub struct ScalpingStrategy {
    pub symbol: String,
    pub order_qty: f64,
    fast_period: usize,
    slow_period: usize,
    vol_mult: f64,
    atr_period: usize,
    atr_sl_mult: f64,
    atr_tp_mult: f64,
    rsi_buy_low: f64,
    rsi_buy_high: f64,
    rsi_sell_low: f64,
    rsi_sell_high: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    volumes: Vec<f64>,
    pos: Option<ScalpingPosition>,
}

impl ScalpingStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            fast_period: 12,
            slow_period: 50,
            vol_mult: 1.2,
            atr_period: 14,
            atr_sl_mult: 1.5,
            atr_tp_mult: 3.0,
            rsi_buy_low: 45.0,
            rsi_buy_high: 70.0,
            rsi_sell_low: 30.0,
            rsi_sell_high: 55.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            volumes: Vec::new(),
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            fast_period: params.get("ema_fast").copied().unwrap_or(12.0) as usize,
            slow_period: params.get("ema_slow").copied().unwrap_or(50.0) as usize,
            vol_mult: params.get("volume_multiplier").copied().unwrap_or(1.2),
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl_mult: params.get("atr_sl_mult").copied().unwrap_or(1.5),
            atr_tp_mult: params.get("atr_tp_mult").copied().unwrap_or(3.0),
            rsi_buy_low: params.get("rsi_buy_low").copied().unwrap_or(45.0),
            rsi_buy_high: params.get("rsi_buy_high").copied().unwrap_or(70.0),
            rsi_sell_low: params.get("rsi_sell_low").copied().unwrap_or(30.0),
            rsi_sell_high: params.get("rsi_sell_high").copied().unwrap_or(55.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            volumes: Vec::new(),
            pos: None,
        }
    }
}

impl Strategy for ScalpingStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
            "volumes": self.volumes,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("volumes").and_then(|v| v.as_array()) {
            self.volumes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        tracing::info!(candles = self.closes.len(), "Scalping state restored");
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);
        self.volumes.push(candle.volume);

        let n = self.closes.len();
        if n < self.slow_period + 1 {
            return Some(Signal::None);
        }

        let fast_now = ema_from_slice(&self.closes, self.fast_period)?;
        let slow_now = ema_from_slice(&self.closes, self.slow_period)?;
        let fast_prev = ema_from_slice(&self.closes[..n - 1], self.fast_period)?;
        let slow_prev = ema_from_slice(&self.closes[..n - 1], self.slow_period)?;
        let rsi = rsi_from_slice(&self.closes, self.atr_period)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // 持仓中：ATR 止损/止盈
        if let Some(ref pos) = self.pos {
            let exit = match pos.side {
                Side::Buy => candle.close <= pos.sl || candle.close >= pos.tp,
                Side::Sell => candle.close >= pos.sl || candle.close <= pos.tp,
            };
            if exit {
                let side = match pos.side {
                    Side::Buy => Side::Sell,
                    Side::Sell => Side::Buy,
                };
                self.pos = None;
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }));
            }
            return Some(Signal::None);
        }

        let avg_vol: f64 = self.volumes[n - self.slow_period..].iter().sum::<f64>()
            / self.slow_period as f64;
        let vol_ok = candle.volume > avg_vol * self.vol_mult;

        // 做多：快线上穿慢线 + RSI 范围 + 放量
        if fast_prev <= slow_prev && fast_now > slow_now && vol_ok && rsi > self.rsi_buy_low && rsi < self.rsi_buy_high {
            self.pos = Some(ScalpingPosition {
                side: Side::Buy,
                sl: candle.close - atr * self.atr_sl_mult,
                tp: candle.close + atr * self.atr_tp_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 做空：快线下穿慢线 + RSI 范围
        if fast_prev >= slow_prev && fast_now < slow_now && rsi > self.rsi_sell_low && rsi < self.rsi_sell_high {
            self.pos = Some(ScalpingPosition {
                side: Side::Sell,
                sl: candle.close + atr * self.atr_sl_mult,
                tp: candle.close - atr * self.atr_tp_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "Scalping"
    }
}

// ══════════════════════════════════════════════════════════════
// Breakout 策略 — 价格突破 N 周期高低点 + ATR 过滤 + 移动止损
// ══════════════════════════════════════════════════════════════

struct BreakoutPosition {
    side: Side,
    trail_stop: f64,
}

pub struct BreakoutStrategy {
    pub symbol: String,
    pub order_qty: f64,
    lookback: usize,
    atr_period: usize,
    atr_filter: f64,
    trail_atr: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<BreakoutPosition>,
}

impl BreakoutStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            lookback: 48,
            atr_period: 14,
            atr_filter: 0.3,
            trail_atr: 3.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            lookback: params.get("lookback").copied().unwrap_or(48.0) as usize,
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_filter: params.get("atr_filter").copied().unwrap_or(0.3),
            trail_atr: params.get("trail_atr").copied().unwrap_or(3.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }
}

impl Strategy for BreakoutStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        tracing::info!(candles = self.closes.len(), "Breakout state restored");
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);

        let n = self.closes.len();
        if n < self.lookback + 1 {
            return Some(Signal::None);
        }

        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;
        if atr == 0.0 {
            return Some(Signal::None);
        }

        // 过去 N 根 K 线的高低点（不含当前）
        let start = n - self.lookback - 1;
        let end = n - 1;
        let highest = self.highs[start..end]
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        let lowest = self.lows[start..end]
            .iter()
            .cloned()
            .fold(f64::INFINITY, f64::min);

        // 持仓中：移动止损
        if let Some(ref mut pos) = self.pos {
            match pos.side {
                Side::Buy => {
                    let new_stop = candle.close - atr * self.trail_atr;
                    if new_stop > pos.trail_stop {
                        pos.trail_stop = new_stop;
                    }
                    if candle.close <= pos.trail_stop {
                        self.pos = None;
                        return Some(Signal::Order(OrderRequest {
                            symbol: self.symbol.clone(),
                            side: Side::Sell,
                            order_type: OrderType::Market,
                            qty: self.order_qty,
                            price: None,
                        }));
                    }
                }
                Side::Sell => {
                    let new_stop = candle.close + atr * self.trail_atr;
                    if new_stop < pos.trail_stop {
                        pos.trail_stop = new_stop;
                    }
                    if candle.close >= pos.trail_stop {
                        self.pos = None;
                        return Some(Signal::Order(OrderRequest {
                            symbol: self.symbol.clone(),
                            side: Side::Buy,
                            order_type: OrderType::Market,
                            qty: self.order_qty,
                            price: None,
                        }));
                    }
                }
            }
            return Some(Signal::None);
        }

        // 向上突破 + 突破幅度 > ATR * filter
        if candle.close > highest && (candle.close - highest) > atr * self.atr_filter {
            self.pos = Some(BreakoutPosition {
                side: Side::Buy,
                trail_stop: candle.close - atr * self.trail_atr,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 向下突破
        if candle.close < lowest && (lowest - candle.close) > atr * self.atr_filter {
            self.pos = Some(BreakoutPosition {
                side: Side::Sell,
                trail_stop: candle.close + atr * self.trail_atr,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "Breakout"
    }
}

// ══════════════════════════════════════════════════════════════
// RSI 策略 — RSI 超买超卖 + 趋势过滤 + ATR 止损止盈
// ══════════════════════════════════════════════════════════════

struct RSIPosition {
    side: Side,
    sl: f64,
    tp: f64,
}

pub struct RSIStrategy {
    pub symbol: String,
    pub order_qty: f64,
    rsi_period: usize,
    oversold: f64,
    overbought: f64,
    trend_ema: usize,
    atr_period: usize,
    atr_sl_mult: f64,
    atr_tp_mult: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<RSIPosition>,
}

impl RSIStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            rsi_period: 14,
            oversold: 25.0,
            overbought: 75.0,
            trend_ema: 50,
            atr_period: 14,
            atr_sl_mult: 2.0,
            atr_tp_mult: 4.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            rsi_period: params.get("rsi_period").copied().unwrap_or(14.0) as usize,
            oversold: params.get("rsi_oversold").copied().unwrap_or(25.0),
            overbought: params.get("rsi_overbought").copied().unwrap_or(75.0),
            trend_ema: params.get("trend_ema").copied().unwrap_or(50.0) as usize,
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl_mult: params.get("atr_sl_mult").copied().unwrap_or(2.0),
            atr_tp_mult: params.get("atr_tp_mult").copied().unwrap_or(4.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }
}

impl Strategy for RSIStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        tracing::info!(candles = self.closes.len(), "RSI state restored");
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);

        let n = self.closes.len();
        let warmup = (self.rsi_period + 1).max(self.trend_ema + 1);
        if n < warmup {
            return Some(Signal::None);
        }

        let rsi = rsi_from_slice(&self.closes, self.rsi_period)?;
        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // 持仓中：止损止盈
        if let Some(ref pos) = self.pos {
            let exit = match pos.side {
                Side::Buy => candle.close <= pos.sl || candle.close >= pos.tp,
                Side::Sell => candle.close >= pos.sl || candle.close <= pos.tp,
            };
            if exit {
                let side = match pos.side {
                    Side::Buy => Side::Sell,
                    Side::Sell => Side::Buy,
                };
                self.pos = None;
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }));
            }
            return Some(Signal::None);
        }

        // 做多：RSI 超卖 + 价格在趋势线上方
        if rsi < self.oversold && candle.close > trend {
            self.pos = Some(RSIPosition {
                side: Side::Buy,
                sl: candle.close - atr * self.atr_sl_mult,
                tp: candle.close + atr * self.atr_tp_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 做空：RSI 超买 + 价格在趋势线下方
        if rsi > self.overbought && candle.close < trend {
            self.pos = Some(RSIPosition {
                side: Side::Sell,
                sl: candle.close + atr * self.atr_sl_mult,
                tp: candle.close - atr * self.atr_tp_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "RSI"
    }
}

// ══════════════════════════════════════════════════════════════
// Bollinger 策略 — 布林带突破 + 趋势过滤 + 中轨止盈
// ══════════════════════════════════════════════════════════════

struct BollingerPosition {
    side: Side,
    sl: f64,
}

pub struct BollingerStrategy {
    pub symbol: String,
    pub order_qty: f64,
    bb_period: usize,
    num_std: f64,
    trend_ema: usize,
    atr_period: usize,
    atr_sl_mult: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<BollingerPosition>,
}

impl BollingerStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            bb_period: 20,
            num_std: 2.5,
            trend_ema: 50,
            atr_period: 14,
            atr_sl_mult: 2.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            bb_period: params.get("bb_period").copied().unwrap_or(20.0) as usize,
            num_std: params.get("num_std").copied().unwrap_or(2.5),
            trend_ema: params.get("trend_ema").copied().unwrap_or(50.0) as usize,
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl_mult: params.get("atr_sl_mult").copied().unwrap_or(2.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }
}

impl Strategy for BollingerStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        tracing::info!(candles = self.closes.len(), "Bollinger state restored");
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);

        let n = self.closes.len();
        let warmup = self.bb_period.max(self.trend_ema + 1);
        if n < warmup {
            return Some(Signal::None);
        }

        // 布林带
        let window = &self.closes[n - self.bb_period..];
        let mean: f64 = window.iter().sum::<f64>() / self.bb_period as f64;
        let variance: f64 =
            window.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / self.bb_period as f64;
        let std = variance.sqrt();
        let upper = mean + self.num_std * std;
        let lower = mean - self.num_std * std;

        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // 持仓中：止损或回到中轨平仓
        if let Some(ref pos) = self.pos {
            let exit = match pos.side {
                Side::Buy => candle.close <= pos.sl || candle.close >= mean,
                Side::Sell => candle.close >= pos.sl || candle.close <= mean,
            };
            if exit {
                let side = match pos.side {
                    Side::Buy => Side::Sell,
                    Side::Sell => Side::Buy,
                };
                self.pos = None;
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }));
            }
            return Some(Signal::None);
        }

        // 突破上轨 + 趋势向上 → 做多
        if candle.close > upper && candle.close > trend {
            self.pos = Some(BollingerPosition {
                side: Side::Buy,
                sl: candle.close - atr * self.atr_sl_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 突破下轨 + 趋势向下 → 做空
        if candle.close < lower && candle.close < trend {
            self.pos = Some(BollingerPosition {
                side: Side::Sell,
                sl: candle.close + atr * self.atr_sl_mult,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "Bollinger"
    }
}

// ══════════════════════════════════════════════════════════════
// MACD 策略 — MACD(12,26,9) 金叉死叉 + EMA 趋势过滤 + ATR 移动止损
// ══════════════════════════════════════════════════════════════

struct MACDPosition {
    side: Side,
    sl: f64,
}

pub struct MACDStrategy {
    pub symbol: String,
    pub order_qty: f64,
    fast_period: usize,
    slow_period: usize,
    signal_period: usize,
    trend_ema: usize,
    atr_period: usize,
    atr_sl: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    prev_histogram: Option<f64>,
    pos: Option<MACDPosition>,
}

impl MACDStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            fast_period: 12,
            slow_period: 26,
            signal_period: 9,
            trend_ema: 200,
            atr_period: 14,
            atr_sl: 2.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            prev_histogram: None,
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            fast_period: params.get("fast_period").copied().unwrap_or(12.0) as usize,
            slow_period: params.get("slow_period").copied().unwrap_or(26.0) as usize,
            signal_period: params.get("signal_period").copied().unwrap_or(9.0) as usize,
            trend_ema: params.get("trend_ema").copied().unwrap_or(200.0) as usize,
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl: params.get("atr_sl").copied().unwrap_or(2.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            prev_histogram: None,
            pos: None,
        }
    }

    /// 计算 MACD: 返回 (macd_line, signal_line, histogram)
    fn compute_macd(&self) -> (Option<f64>, Option<f64>, Option<f64>) {
        let n = self.closes.len();
        if n < self.slow_period {
            return (None, None, None);
        }

        // 计算完整的 MACD 序列以得到 signal line
        let fast_k = 2.0 / (self.fast_period as f64 + 1.0);
        let slow_k = 2.0 / (self.slow_period as f64 + 1.0);

        // 初始化 slow EMA（用前 slow_period 根的 SMA）
        let mut slow_ema: f64 = self.closes[..self.slow_period].iter().sum::<f64>()
            / self.slow_period as f64;

        // 初始化 fast EMA: SMA over fast_period, then walk to slow_period
        let mut fast_ema: f64 = self.closes[..self.fast_period].iter().sum::<f64>()
            / self.fast_period as f64;
        for i in self.fast_period..self.slow_period {
            fast_ema = self.closes[i] * fast_k + fast_ema * (1.0 - fast_k);
        }

        // 收集 MACD 序列（从 slow_period 开始）
        let mut macd_series = Vec::with_capacity(n - self.slow_period + 1);
        macd_series.push(fast_ema - slow_ema);

        for i in self.slow_period..n {
            fast_ema = self.closes[i] * fast_k + fast_ema * (1.0 - fast_k);
            slow_ema = self.closes[i] * slow_k + slow_ema * (1.0 - slow_k);
            macd_series.push(fast_ema - slow_ema);
        }

        let macd_line = *macd_series.last().unwrap();

        if macd_series.len() < self.signal_period {
            return (Some(macd_line), None, None);
        }

        // Signal line = EMA of MACD series
        let sig_k = 2.0 / (self.signal_period as f64 + 1.0);
        let mut signal: f64 = macd_series[..self.signal_period].iter().sum::<f64>()
            / self.signal_period as f64;
        for &m in &macd_series[self.signal_period..] {
            signal = m * sig_k + signal * (1.0 - sig_k);
        }

        let histogram = macd_line - signal;
        (Some(macd_line), Some(signal), Some(histogram))
    }
}

impl Strategy for MACDStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
            "prev_histogram": self.prev_histogram,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        self.prev_histogram = state.get("prev_histogram").and_then(|v| v.as_f64());
        tracing::info!(
            candles = self.closes.len(),
            prev_histogram = ?self.prev_histogram,
            "MACD state restored"
        );
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);

        let n = self.closes.len();
        // 需要 trend_ema + 1 根和足够的 MACD 数据
        let warmup = self.trend_ema.max(self.slow_period + self.signal_period) + 1;
        if n < warmup {
            // 仍然更新 prev_histogram 以便预热后第一根能判断方向
            let (_, _, hist) = self.compute_macd();
            self.prev_histogram = hist;
            return Some(Signal::None);
        }

        let trend = ema_from_slice(&self.closes, self.trend_ema)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;
        let (_, _, hist_opt) = self.compute_macd();
        let hist = hist_opt?;

        let prev_hist = self.prev_histogram;
        self.prev_histogram = Some(hist);

        let prev_hist = prev_hist?;

        // 持仓中：ATR 移动止损 + MACD 反转出场
        if let Some(ref mut pos) = self.pos {
            match pos.side {
                Side::Buy => {
                    // 移动止损：只上移不下移
                    let new_stop = candle.close - atr * self.atr_sl;
                    if new_stop > pos.sl {
                        pos.sl = new_stop;
                    }
                    // 止损触发 或 MACD 柱转负
                    if candle.close <= pos.sl || (hist < 0.0 && prev_hist >= 0.0) {
                        self.pos = None;
                        return Some(Signal::Order(OrderRequest {
                            symbol: self.symbol.clone(),
                            side: Side::Sell,
                            order_type: OrderType::Market,
                            qty: self.order_qty,
                            price: None,
                        }));
                    }
                }
                Side::Sell => {
                    let new_stop = candle.close + atr * self.atr_sl;
                    if new_stop < pos.sl {
                        pos.sl = new_stop;
                    }
                    if candle.close >= pos.sl || (hist > 0.0 && prev_hist <= 0.0) {
                        self.pos = None;
                        return Some(Signal::Order(OrderRequest {
                            symbol: self.symbol.clone(),
                            side: Side::Buy,
                            order_type: OrderType::Market,
                            qty: self.order_qty,
                            price: None,
                        }));
                    }
                }
            }
            return Some(Signal::None);
        }

        // 做多：MACD 柱由负转正 + 价格在趋势线上方
        if prev_hist <= 0.0 && hist > 0.0 && candle.close > trend {
            self.pos = Some(MACDPosition {
                side: Side::Buy,
                sl: candle.close - atr * self.atr_sl,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 做空：MACD 柱由正转负 + 价格在趋势线下方
        if prev_hist >= 0.0 && hist < 0.0 && candle.close < trend {
            self.pos = Some(MACDPosition {
                side: Side::Sell,
                sl: candle.close + atr * self.atr_sl,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "MACD"
    }
}

// ══════════════════════════════════════════════════════════════
// 均值回归策略 — 价格偏离 EMA 超过 N 个标准差反向开仓，回归均线平仓
// ══════════════════════════════════════════════════════════════

struct MeanRevPosition {
    side: Side,
    sl: f64,
}

pub struct MeanReversionStrategy {
    pub symbol: String,
    pub order_qty: f64,
    ema_period: usize,
    std_period: usize,
    entry_std: f64,
    atr_period: usize,
    atr_sl: f64,
    closes: Vec<f64>,
    highs: Vec<f64>,
    lows: Vec<f64>,
    pos: Option<MeanRevPosition>,
}

impl MeanReversionStrategy {
    pub fn new(symbol: &str, order_qty: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            ema_period: 50,
            std_period: 50,
            entry_std: 2.0,
            atr_period: 14,
            atr_sl: 2.0,
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }

    pub fn from_params(symbol: &str, order_qty: f64, params: &HashMap<String, f64>) -> Self {
        Self {
            symbol: symbol.to_string(),
            order_qty,
            ema_period: params.get("ema_period").copied().unwrap_or(50.0) as usize,
            std_period: params.get("std_period").copied().unwrap_or(50.0) as usize,
            entry_std: params.get("entry_std").copied().unwrap_or(2.0),
            atr_period: params.get("atr_period").copied().unwrap_or(14.0) as usize,
            atr_sl: params.get("atr_sl").copied().unwrap_or(2.0),
            closes: Vec::new(),
            highs: Vec::new(),
            lows: Vec::new(),
            pos: None,
        }
    }
}

impl Strategy for MeanReversionStrategy {
    fn export_state(&self) -> serde_json::Value {
        serde_json::json!({
            "closes": self.closes,
            "highs": self.highs,
            "lows": self.lows,
        })
    }

    fn restore_state(&mut self, state: &serde_json::Value) {
        if let Some(arr) = state.get("closes").and_then(|v| v.as_array()) {
            self.closes = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("highs").and_then(|v| v.as_array()) {
            self.highs = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        if let Some(arr) = state.get("lows").and_then(|v| v.as_array()) {
            self.lows = arr.iter().filter_map(|v| v.as_f64()).collect();
        }
        tracing::info!(candles = self.closes.len(), "MeanReversion state restored");
    }

    fn on_candle(&mut self, candle: &Candle) -> Option<Signal> {
        self.closes.push(candle.close);
        self.highs.push(candle.high);
        self.lows.push(candle.low);

        let n = self.closes.len();
        let warmup = self.ema_period.max(self.std_period).max(self.atr_period + 1);
        if n < warmup {
            return Some(Signal::None);
        }

        let ema = ema_from_slice(&self.closes, self.ema_period)?;
        let atr = atr_from_slices(&self.highs, &self.lows, &self.closes, self.atr_period)?;

        // 计算标准差：最近 std_period 根收盘价的标准差
        let window = &self.closes[n - self.std_period..];
        let mean: f64 = window.iter().sum::<f64>() / self.std_period as f64;
        let variance: f64 =
            window.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / self.std_period as f64;
        let std = variance.sqrt();
        if std < 1e-12 {
            return Some(Signal::None);
        }

        let deviation = (candle.close - ema) / std;

        // 持仓中
        if let Some(ref pos) = self.pos {
            let exit = match pos.side {
                // 做多：价格回到 EMA 或触发止损
                Side::Buy => candle.close >= ema || candle.close <= pos.sl,
                // 做空：价格回到 EMA 或触发止损
                Side::Sell => candle.close <= ema || candle.close >= pos.sl,
            };
            if exit {
                let close_side = match pos.side {
                    Side::Buy => Side::Sell,
                    Side::Sell => Side::Buy,
                };
                self.pos = None;
                return Some(Signal::Order(OrderRequest {
                    symbol: self.symbol.clone(),
                    side: close_side,
                    order_type: OrderType::Market,
                    qty: self.order_qty,
                    price: None,
                }));
            }
            return Some(Signal::None);
        }

        // 做多：价格远低于均值（偏离 < -N 个标准差）
        if deviation < -self.entry_std {
            self.pos = Some(MeanRevPosition {
                side: Side::Buy,
                sl: candle.close - atr * self.atr_sl,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Buy,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        // 做空：价格远高于均值（偏离 > N 个标准差）
        if deviation > self.entry_std {
            self.pos = Some(MeanRevPosition {
                side: Side::Sell,
                sl: candle.close + atr * self.atr_sl,
            });
            return Some(Signal::Order(OrderRequest {
                symbol: self.symbol.clone(),
                side: Side::Sell,
                order_type: OrderType::Market,
                qty: self.order_qty,
                price: None,
            }));
        }

        Some(Signal::None)
    }

    fn name(&self) -> &str {
        "MeanReversion"
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

    // ── state export/restore round-trip tests ──

    #[test]
    fn trend_follower_state_roundtrip() {
        let mut tf = TrendFollower::new("BTCUSDT", 1.0);
        // 喂入足够多的 K 线使 EMA 有值
        for i in 0..60 {
            tf.on_candle(&sample_candle(100.0 + i as f64 * 0.1, i * 300_000));
        }

        let exported = tf.export_state();
        assert!(exported.get("ema_fast").and_then(|v| v.as_f64()).is_some());
        assert!(exported.get("ema_slow").and_then(|v| v.as_f64()).is_some());
        assert!(exported.get("candle_count").and_then(|v| v.as_u64()).is_some());

        // 创建新实例并恢复
        let mut tf2 = TrendFollower::new("BTCUSDT", 1.0);
        tf2.restore_state(&exported);

        let re_exported = tf2.export_state();
        assert_eq!(
            exported.get("ema_fast").and_then(|v| v.as_f64()),
            re_exported.get("ema_fast").and_then(|v| v.as_f64()),
        );
        assert_eq!(
            exported.get("ema_slow").and_then(|v| v.as_f64()),
            re_exported.get("ema_slow").and_then(|v| v.as_f64()),
        );
        assert_eq!(
            exported.get("candle_count").and_then(|v| v.as_u64()),
            re_exported.get("candle_count").and_then(|v| v.as_u64()),
        );
    }

    #[test]
    fn macd_state_roundtrip() {
        let mut macd = MACDStrategy::new("BTCUSDT", 1.0);
        for i in 0..250 {
            macd.on_candle(&sample_candle(100.0 + (i as f64 * 0.05).sin() * 5.0, i * 300_000));
        }

        let exported = macd.export_state();
        let closes: Vec<f64> = exported.get("closes")
            .and_then(|v| v.as_array())
            .unwrap()
            .iter()
            .filter_map(|v| v.as_f64())
            .collect();
        assert_eq!(closes.len(), 250);

        let mut macd2 = MACDStrategy::new("BTCUSDT", 1.0);
        macd2.restore_state(&exported);

        assert_eq!(macd2.closes.len(), 250);
        assert_eq!(macd.prev_histogram, macd2.prev_histogram);
    }

    #[test]
    fn candle_aggregator_state_roundtrip() {
        let mut agg = CandleAggregator::new(60_000);
        agg.update(&TickData {
            symbol: "BTC".into(), price: 100.0, qty: 1.0, timestamp: 0, is_buyer_maker: false,
        });
        agg.update(&TickData {
            symbol: "BTC".into(), price: 102.0, qty: 2.0, timestamp: 30_000, is_buyer_maker: false,
        });

        let state = agg.export_state().unwrap();
        assert!((state.open - 100.0).abs() < 1e-9);
        assert!((state.high - 102.0).abs() < 1e-9);

        let mut agg2 = CandleAggregator::new(60_000);
        agg2.restore_state(&state);

        let state2 = agg2.export_state().unwrap();
        assert!((state2.open - state.open).abs() < 1e-9);
        assert!((state2.high - state.high).abs() < 1e-9);
        assert_eq!(state2.window_start, state.window_start);
    }

    #[test]
    fn strategy_default_export_is_null() {
        // MarketMaker with no pending orders should still export valid state
        let mm = MarketMaker::new("BTCUSDT", 0.0004, 1.0);
        let exported = mm.export_state();
        assert!(exported.get("pending_bid").unwrap().is_null());
        assert!(exported.get("pending_ask").unwrap().is_null());
    }
}
