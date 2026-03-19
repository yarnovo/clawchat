use serde::{Deserialize, Serialize};

// ── Fee constants ──────────────────────────────────────────────

pub const MAKER_FEE: f64 = 0.0002; // 0.02%
pub const TAKER_FEE: f64 = 0.0004; // 0.04%
pub const SLIPPAGE: f64 = 0.0005; // 0.05%

// ── Order / Position types ─────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
    Buy,
    Sell,
}

impl std::fmt::Display for Side {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Side::Buy => write!(f, "BUY"),
            Side::Sell => write!(f, "SELL"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderType {
    Market,
    Limit,
    StopMarket,
    TakeProfitMarket,
}

impl std::fmt::Display for OrderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderType::Market => write!(f, "MARKET"),
            OrderType::Limit => write!(f, "LIMIT"),
            OrderType::StopMarket => write!(f, "STOP_MARKET"),
            OrderType::TakeProfitMarket => write!(f, "TAKE_PROFIT_MARKET"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PositionSide {
    Long,
    Short,
    Both,
}

impl std::fmt::Display for PositionSide {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PositionSide::Long => write!(f, "LONG"),
            PositionSide::Short => write!(f, "SHORT"),
            PositionSide::Both => write!(f, "BOTH"),
        }
    }
}

/// Shared order request (used by engine strategies)
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

/// 下单量模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SizingMode {
    #[default]
    Fixed,
    Percent,
}

impl SizingMode {
    pub fn from_str_lossy(s: &str) -> Self {
        match s {
            "percent" => Self::Percent,
            "fixed" => Self::Fixed,
            other => {
                eprintln!("WARN: unknown sizing_mode '{other}', defaulting to fixed");
                Self::Fixed
            }
        }
    }
}

/// 交易方向过滤
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TradeDirection {
    #[default]
    Both,
    LongOnly,
    ShortOnly,
}

impl TradeDirection {
    pub fn from_str_lossy(s: &str) -> Self {
        match s {
            "long_only" => Self::LongOnly,
            "short_only" => Self::ShortOnly,
            "both" => Self::Both,
            other => {
                if !other.is_empty() {
                    tracing::warn!("unknown trade_direction '{other}', defaulting to both");
                }
                Self::Both
            }
        }
    }
}
