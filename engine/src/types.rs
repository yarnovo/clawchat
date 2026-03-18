use serde::Deserialize;

// ── 行情事件（策略接收的统一事件流）──────────────────────────

/// 策略层消费的事件枚举
#[derive(Debug, Clone)]
pub enum MarketEvent {
    /// 最新成交价（aggTrade）
    Tick(TickData),
    /// 深度快照 / 增量
    Depth(DepthData),
    /// 逐笔成交
    Trade(TradeData),
    /// 标记价格
    MarkPrice(MarkPriceData),
}

// ── Tick ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct TickData {
    pub symbol: String,
    pub price: f64,
    pub qty: f64,
    pub timestamp: u64,
    pub is_buyer_maker: bool,
}

// ── Depth ─────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct DepthData {
    pub symbol: String,
    pub bids: Vec<PriceLevel>,
    pub asks: Vec<PriceLevel>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Copy)]
pub struct PriceLevel {
    pub price: f64,
    pub qty: f64,
}

// ── Trade ─────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct TradeData {
    pub symbol: String,
    pub id: u64,
    pub price: f64,
    pub qty: f64,
    pub timestamp: u64,
    pub is_buyer_maker: bool,
}

// ── MarkPrice ─────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct MarkPriceData {
    pub symbol: String,
    pub mark_price: f64,
    pub funding_rate: f64,
    pub next_funding_time: u64,
    pub timestamp: u64,
}

// ── 订单 / 仓位 ──────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderType {
    Limit,
    Market,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OrderRequest {
    pub symbol: String,
    pub side: Side,
    pub order_type: OrderType,
    pub qty: f64,
    pub price: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct Position {
    pub symbol: String,
    pub side: Side,
    pub qty: f64,
    pub entry_price: f64,
    pub unrealized_pnl: f64,
}

// ── 币安 WebSocket 原始 JSON 映射 ────────────────────────────
// 这些结构体直接对应币安 fstream 推送的 JSON，用于零拷贝反序列化

/// aggTrade stream: <symbol>@aggTrade
#[derive(Debug, Deserialize)]
pub struct BinanceAggTrade {
    #[serde(rename = "e")]
    pub event_type: String,
    #[serde(rename = "E")]
    pub event_time: u64,
    #[serde(rename = "s")]
    pub symbol: String,
    #[serde(rename = "p")]
    pub price: String,
    #[serde(rename = "q")]
    pub qty: String,
    #[serde(rename = "T")]
    pub trade_time: u64,
    #[serde(rename = "m")]
    pub is_buyer_maker: bool,
}

/// depthUpdate stream: <symbol>@depth@100ms
#[derive(Debug, Deserialize)]
pub struct BinanceDepthUpdate {
    #[serde(rename = "e")]
    pub event_type: String,
    #[serde(rename = "E")]
    pub event_time: u64,
    #[serde(rename = "s")]
    pub symbol: String,
    #[serde(rename = "b")]
    pub bids: Vec<[String; 2]>,
    #[serde(rename = "a")]
    pub asks: Vec<[String; 2]>,
}

/// markPriceUpdate stream: <symbol>@markPrice@1s
#[derive(Debug, Deserialize)]
pub struct BinanceMarkPrice {
    #[serde(rename = "e")]
    pub event_type: String,
    #[serde(rename = "E")]
    pub event_time: u64,
    #[serde(rename = "s")]
    pub symbol: String,
    #[serde(rename = "p")]
    pub mark_price: String,
    #[serde(rename = "r")]
    pub funding_rate: String,
    #[serde(rename = "T")]
    pub next_funding_time: u64,
}

// ── 币安 Combined stream wrapper ─────────────────────────────

/// 组合流的外层包裹: {"stream":"btcusdt@aggTrade","data":{...}}
#[derive(Debug, Deserialize)]
pub struct BinanceCombinedStream {
    pub stream: String,
    pub data: serde_json::Value,
}

// ── 转换实现 ─────────────────────────────────────────────────

impl BinanceAggTrade {
    pub fn into_tick(self) -> TickData {
        TickData {
            symbol: self.symbol,
            price: fast_parse_f64(&self.price),
            qty: fast_parse_f64(&self.qty),
            timestamp: self.trade_time,
            is_buyer_maker: self.is_buyer_maker,
        }
    }

    pub fn into_trade(self) -> TradeData {
        TradeData {
            symbol: self.symbol.clone(),
            id: self.event_time, // aggTrade 没有独立 trade id，用事件时间
            price: fast_parse_f64(&self.price),
            qty: fast_parse_f64(&self.qty),
            timestamp: self.trade_time,
            is_buyer_maker: self.is_buyer_maker,
        }
    }
}

impl BinanceDepthUpdate {
    pub fn into_depth(self) -> DepthData {
        DepthData {
            symbol: self.symbol,
            bids: self.bids.iter().map(|l| PriceLevel {
                price: fast_parse_f64(&l[0]),
                qty: fast_parse_f64(&l[1]),
            }).collect(),
            asks: self.asks.iter().map(|l| PriceLevel {
                price: fast_parse_f64(&l[0]),
                qty: fast_parse_f64(&l[1]),
            }).collect(),
            timestamp: self.event_time,
        }
    }
}

impl BinanceMarkPrice {
    pub fn into_mark_price(self) -> MarkPriceData {
        MarkPriceData {
            symbol: self.symbol,
            mark_price: fast_parse_f64(&self.mark_price),
            funding_rate: fast_parse_f64(&self.funding_rate),
            next_funding_time: self.next_funding_time,
            timestamp: self.event_time,
        }
    }
}

// ── 工具函数 ─────────────────────────────────────────────────

/// 快速解析浮点数，避免 unwrap panic
#[inline]
pub fn fast_parse_f64(s: &str) -> f64 {
    s.parse::<f64>().unwrap_or(0.0)
}
