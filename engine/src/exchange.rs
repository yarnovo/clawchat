use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::Config;

// -- Fee constants ----------------------------------------------------------

pub const MAKER_FEE: f64 = 0.0002; // 0.02%
pub const TAKER_FEE: f64 = 0.0004; // 0.04%

// -- Types ------------------------------------------------------------------

#[derive(Debug, Clone, Copy)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Copy)]
pub enum OrderType {
    Market,
    Limit,
    StopMarket,
    TakeProfitMarket,
}

#[derive(Debug, Clone, Copy)]
pub enum PositionSide {
    Long,
    Short,
    Both,
}

impl std::fmt::Display for Side {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Side::Buy => write!(f, "BUY"),
            Side::Sell => write!(f, "SELL"),
        }
    }
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

impl std::fmt::Display for PositionSide {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PositionSide::Long => write!(f, "LONG"),
            PositionSide::Short => write!(f, "SHORT"),
            PositionSide::Both => write!(f, "BOTH"),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct OrderRequest {
    pub symbol: String,
    pub side: String,
    #[serde(rename = "type")]
    pub order_type: String,
    #[serde(rename = "positionSide")]
    pub position_side: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "stopPrice")]
    pub stop_price: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "timeInForce")]
    pub time_in_force: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "closePosition")]
    pub close_position: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderResponse {
    pub order_id: i64,
    pub symbol: String,
    pub status: String,
    pub client_order_id: String,
    pub price: String,
    pub orig_qty: String,
    pub executed_qty: String,
    #[serde(rename = "type")]
    pub order_type: String,
    pub side: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ExchangeError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Binance API error: {code} — {msg}")]
    Api { code: i64, msg: String },
    #[error("Signature error: {0}")]
    Signature(String),
}

// -- Exchange client --------------------------------------------------------

pub struct Exchange {
    client: Client,
    api_key: String,
    api_secret: String,
    base_url: String,
    pub symbol: String,
    pub dry_run: bool,
}

impl Exchange {
    pub fn new(config: &Config) -> Self {
        Self {
            client: Client::new(),
            api_key: config.api_key.clone(),
            api_secret: config.api_secret.clone(),
            base_url: config.base_url.clone(),
            symbol: config.symbol.clone(),
            dry_run: config.dry_run,
        }
    }

    // -- Signing ------------------------------------------------------------

    fn timestamp_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_millis() as u64
    }

    fn sign(&self, query: &str) -> Result<String, ExchangeError> {
        let mut mac = Hmac::<Sha256>::new_from_slice(self.api_secret.as_bytes())
            .map_err(|e| ExchangeError::Signature(e.to_string()))?;
        mac.update(query.as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }

    /// Build query string from params, append timestamp + signature.
    fn signed_query(&self, params: &[(&str, String)]) -> Result<String, ExchangeError> {
        let ts = Self::timestamp_ms().to_string();
        let mut parts: Vec<String> = params
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect();
        parts.push(format!("timestamp={ts}"));
        let query = parts.join("&");
        let sig = self.sign(&query)?;
        Ok(format!("{query}&signature={sig}"))
    }

    // -- Private POST helper ------------------------------------------------

    async fn signed_post(
        &self,
        path: &str,
        params: &[(&str, String)],
    ) -> Result<serde_json::Value, ExchangeError> {
        let qs = self.signed_query(params)?;
        let url = format!("{}{path}?{qs}", self.base_url);

        tracing::debug!("POST {url}");

        let resp = self
            .client
            .post(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send()
            .await?;

        let body: serde_json::Value = resp.json().await?;

        if let Some(code) = body.get("code").and_then(|c| c.as_i64()) {
            if code != 200 && code != 0 {
                let msg = body["msg"].as_str().unwrap_or("unknown").to_string();
                return Err(ExchangeError::Api { code, msg });
            }
        }

        Ok(body)
    }

    // -- Public API ---------------------------------------------------------

    /// Set leverage for the configured symbol.
    pub async fn set_leverage(&self, leverage: u32) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("symbol", self.symbol.clone()),
            ("leverage", leverage.to_string()),
        ];

        if self.dry_run {
            tracing::info!("[DRY RUN] set_leverage symbol={} leverage={leverage}", self.symbol);
            return Ok(serde_json::json!({"dryRun": true, "leverage": leverage}));
        }

        self.signed_post("/fapi/v1/leverage", &params).await
    }

    /// Place a market order (taker fee applies).
    pub async fn market_order(
        &self,
        side: Side,
        position_side: PositionSide,
        quantity: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::Market.to_string()),
            ("positionSide", position_side.to_string()),
            ("quantity", format!("{quantity}")),
        ];

        if self.dry_run {
            tracing::info!(
                "[DRY RUN] market_order side={side} pos={position_side} qty={quantity} fee_rate={TAKER_FEE}"
            );
            return Ok(serde_json::json!({
                "dryRun": true,
                "side": side.to_string(),
                "positionSide": position_side.to_string(),
                "quantity": quantity,
                "feeRate": TAKER_FEE,
            }));
        }

        self.signed_post("/fapi/v1/order", &params).await
    }

    /// Place a limit order (maker fee applies if it rests on the book).
    pub async fn limit_order(
        &self,
        side: Side,
        position_side: PositionSide,
        quantity: f64,
        price: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::Limit.to_string()),
            ("positionSide", position_side.to_string()),
            ("quantity", format!("{quantity}")),
            ("price", format!("{price}")),
            ("timeInForce", "GTC".to_string()),
        ];

        if self.dry_run {
            tracing::info!(
                "[DRY RUN] limit_order side={side} pos={position_side} qty={quantity} price={price} fee_rate={MAKER_FEE}"
            );
            return Ok(serde_json::json!({
                "dryRun": true,
                "side": side.to_string(),
                "positionSide": position_side.to_string(),
                "quantity": quantity,
                "price": price,
                "feeRate": MAKER_FEE,
            }));
        }

        self.signed_post("/fapi/v1/order", &params).await
    }

    /// Open a long position (market buy).
    pub async fn open_long(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Buy, PositionSide::Long, quantity).await
    }

    /// Open a short position (market sell).
    pub async fn open_short(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Sell, PositionSide::Short, quantity).await
    }

    /// Close a long position (market sell).
    pub async fn close_long(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Sell, PositionSide::Long, quantity).await
    }

    /// Close a short position (market buy).
    pub async fn close_short(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Buy, PositionSide::Short, quantity).await
    }

    /// Set a stop-loss for a position.
    pub async fn stop_loss(
        &self,
        side: Side,
        position_side: PositionSide,
        stop_price: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::StopMarket.to_string()),
            ("positionSide", position_side.to_string()),
            ("stopPrice", format!("{stop_price}")),
            ("closePosition", "true".to_string()),
        ];

        if self.dry_run {
            tracing::info!(
                "[DRY RUN] stop_loss side={side} pos={position_side} stop_price={stop_price}"
            );
            return Ok(serde_json::json!({
                "dryRun": true,
                "type": "STOP_MARKET",
                "stopPrice": stop_price,
            }));
        }

        self.signed_post("/fapi/v1/order", &params).await
    }

    /// Set a take-profit for a position.
    pub async fn take_profit(
        &self,
        side: Side,
        position_side: PositionSide,
        stop_price: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::TakeProfitMarket.to_string()),
            ("positionSide", position_side.to_string()),
            ("stopPrice", format!("{stop_price}")),
            ("closePosition", "true".to_string()),
        ];

        if self.dry_run {
            tracing::info!(
                "[DRY RUN] take_profit side={side} pos={position_side} stop_price={stop_price}"
            );
            return Ok(serde_json::json!({
                "dryRun": true,
                "type": "TAKE_PROFIT_MARKET",
                "stopPrice": stop_price,
            }));
        }

        self.signed_post("/fapi/v1/order", &params).await
    }
}
