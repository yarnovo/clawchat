use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::types::{OrderType, PositionSide, Side};

// ── Types ──────────────────────────────────────────────────────

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

/// Premium index data from /fapi/v1/premiumIndex.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PremiumIndex {
    pub symbol: String,
    /// Last funding rate (per 8h settlement)
    pub last_funding_rate: f64,
    /// Mark price
    pub mark_price: f64,
    /// Next funding time (unix ms)
    pub next_funding_time: u64,
}

/// Position risk data from /fapi/v2/positionRisk (non-zero positions only).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionRisk {
    pub symbol: String,
    pub position_amt: f64,
    pub entry_price: f64,
    pub mark_price: f64,
    pub unrealized_profit: f64,
    /// "LONG" / "SHORT" / "BOTH"
    pub position_side: String,
    pub leverage: u32,
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

// ── Exchange client ────────────────────────────────────────────

#[derive(Clone)]
pub struct Exchange {
    client: Client,
    api_key: String,
    api_secret: String,
    base_url: String,
    pub symbol: String,
    pub dry_run: bool,
    pub order_id_prefix: String,
}

impl Exchange {
    /// Primary constructor: raw credentials
    pub fn new(
        api_key: String,
        api_secret: String,
        base_url: String,
        dry_run: bool,
    ) -> Self {
        Self {
            client: Client::new(),
            api_key,
            api_secret,
            base_url,
            symbol: String::new(),
            dry_run,
            order_id_prefix: String::new(),
        }
    }

    pub fn with_symbol(mut self, symbol: &str) -> Self {
        self.symbol = symbol.to_string();
        self
    }

    pub fn with_order_id_prefix(mut self, prefix: &str) -> Self {
        self.order_id_prefix = prefix.to_string();
        self
    }

    pub fn api_key(&self) -> &str {
        &self.api_key
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    fn gen_client_order_id(&self) -> String {
        let ts = Self::timestamp_ms();
        if self.order_id_prefix.is_empty() {
            format!("hft-{ts}")
        } else {
            format!("{}-{ts}", self.order_id_prefix)
        }
    }

    // ── Signing ────────────────────────────────────────────────

    pub fn timestamp_ms() -> u64 {
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

    // ── HTTP helpers ───────────────────────────────────────────

    pub async fn signed_get(
        &self,
        path: &str,
        params: &[(&str, String)],
    ) -> Result<serde_json::Value, ExchangeError> {
        let qs = self.signed_query(params)?;
        let url = format!("{}{path}?{qs}", self.base_url);
        tracing::debug!("GET {url}");

        let resp = self
            .client
            .get(&url)
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

    pub async fn signed_post(
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

    pub async fn signed_delete(
        &self,
        path: &str,
        params: &[(&str, String)],
    ) -> Result<serde_json::Value, ExchangeError> {
        let qs = self.signed_query(params)?;
        let url = format!("{}{path}?{qs}", self.base_url);
        tracing::debug!("DELETE {url}");

        let resp = self
            .client
            .delete(&url)
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

    /// Unsigned GET (public endpoints)
    pub async fn public_get(
        &self,
        path: &str,
        params: &[(&str, String)],
    ) -> Result<serde_json::Value, ExchangeError> {
        let qs: String = params
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<Vec<_>>()
            .join("&");
        let url = if qs.is_empty() {
            format!("{}{path}", self.base_url)
        } else {
            format!("{}{path}?{qs}", self.base_url)
        };
        tracing::debug!("GET {url}");
        let resp = self.client.get(&url).send().await?;
        let body: serde_json::Value = resp.json().await?;
        if let Some(code) = body.get("code").and_then(|c| c.as_i64()) {
            if code != 200 && code != 0 {
                let msg = body["msg"].as_str().unwrap_or("unknown").to_string();
                return Err(ExchangeError::Api { code, msg });
            }
        }
        Ok(body)
    }

    // ── Trading API ────────────────────────────────────────────

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

    pub async fn market_order(
        &self,
        side: Side,
        position_side: PositionSide,
        quantity: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let cid = self.gen_client_order_id();
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::Market.to_string()),
            ("positionSide", position_side.to_string()),
            ("quantity", format!("{quantity}")),
            ("newClientOrderId", cid.clone()),
        ];
        if self.dry_run {
            tracing::info!("[DRY RUN] market_order side={side} pos={position_side} qty={quantity} cid={cid}");
            return Ok(serde_json::json!({
                "dryRun": true,
                "side": side.to_string(),
                "positionSide": position_side.to_string(),
                "quantity": quantity,
                "clientOrderId": cid,
            }));
        }
        self.signed_post("/fapi/v1/order", &params).await
    }

    pub async fn limit_order(
        &self,
        side: Side,
        position_side: PositionSide,
        quantity: f64,
        price: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let cid = self.gen_client_order_id();
        let params = [
            ("symbol", self.symbol.clone()),
            ("side", side.to_string()),
            ("type", OrderType::Limit.to_string()),
            ("positionSide", position_side.to_string()),
            ("quantity", format!("{quantity}")),
            ("price", format!("{price}")),
            ("timeInForce", "GTC".to_string()),
            ("newClientOrderId", cid.clone()),
        ];
        if self.dry_run {
            tracing::info!("[DRY RUN] limit_order side={side} pos={position_side} qty={quantity} price={price} cid={cid}");
            return Ok(serde_json::json!({
                "dryRun": true,
                "side": side.to_string(),
                "positionSide": position_side.to_string(),
                "quantity": quantity,
                "price": price,
                "clientOrderId": cid,
            }));
        }
        self.signed_post("/fapi/v1/order", &params).await
    }

    pub async fn open_long(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Buy, PositionSide::Long, quantity).await
    }

    pub async fn open_short(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Sell, PositionSide::Short, quantity).await
    }

    pub async fn close_long(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Sell, PositionSide::Long, quantity).await
    }

    pub async fn close_short(&self, quantity: f64) -> Result<serde_json::Value, ExchangeError> {
        self.market_order(Side::Buy, PositionSide::Short, quantity).await
    }

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
            tracing::info!("[DRY RUN] stop_loss side={side} pos={position_side} stop_price={stop_price}");
            return Ok(serde_json::json!({"dryRun": true, "type": "STOP_MARKET", "stopPrice": stop_price}));
        }
        self.signed_post("/fapi/v1/order", &params).await
    }

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
            tracing::info!("[DRY RUN] take_profit side={side} pos={position_side} stop_price={stop_price}");
            return Ok(serde_json::json!({"dryRun": true, "type": "TAKE_PROFIT_MARKET", "stopPrice": stop_price}));
        }
        self.signed_post("/fapi/v1/order", &params).await
    }

    // ── Account & Position queries ─────────────────────────────

    /// Fetch position risk for all symbols (or a specific symbol) via /fapi/v2/positionRisk.
    /// Returns only positions with non-zero positionAmt.
    pub async fn get_position_risk(
        &self,
        symbol: Option<&str>,
    ) -> Result<Vec<PositionRisk>, ExchangeError> {
        let params: Vec<(&str, String)> = match symbol {
            Some(s) => vec![("symbol", s.to_string())],
            None => vec![],
        };
        let body = self.signed_get("/fapi/v2/positionRisk", &params).await?;
        let arr = body.as_array().cloned().unwrap_or_default();

        let mut positions = Vec::new();
        for item in arr {
            let symbol = item.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let position_amt: f64 = item
                .get("positionAmt")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            if position_amt.abs() < f64::EPSILON {
                continue;
            }
            let entry_price: f64 = item
                .get("entryPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let mark_price: f64 = item
                .get("markPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let unrealized_profit: f64 = item
                .get("unRealizedProfit")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let position_side = item
                .get("positionSide")
                .and_then(|v| v.as_str())
                .unwrap_or("BOTH")
                .to_string();
            let leverage: u32 = item
                .get("leverage")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(1);

            positions.push(PositionRisk {
                symbol,
                position_amt,
                entry_price,
                mark_price,
                unrealized_profit,
                position_side,
                leverage,
            });
        }
        Ok(positions)
    }

    /// Cancel all open orders for the current symbol.
    pub async fn cancel_all_open_orders(&self, symbol: &str) -> Result<serde_json::Value, ExchangeError> {
        let params = [("symbol", symbol.to_string())];
        if self.dry_run {
            tracing::info!("[DRY RUN] cancel_all_open_orders symbol={symbol}");
            return Ok(serde_json::json!({"dryRun": true, "symbol": symbol}));
        }
        self.signed_delete("/fapi/v1/allOpenOrders", &params).await
    }

    pub async fn get_account(&self) -> Result<serde_json::Value, ExchangeError> {
        self.signed_get("/fapi/v2/account", &[]).await
    }

    pub async fn get_positions(&self) -> Result<Vec<serde_json::Value>, ExchangeError> {
        let account = self.get_account().await?;
        let positions = account
            .get("positions")
            .and_then(|p| p.as_array())
            .cloned()
            .unwrap_or_default();

        let open: Vec<serde_json::Value> = positions
            .into_iter()
            .filter(|p| {
                let amt: f64 = p
                    .get("positionAmt")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                amt.abs() > f64::EPSILON
            })
            .collect();

        Ok(open)
    }

    pub async fn get_balance(&self) -> Result<f64, ExchangeError> {
        let account = self.get_account().await?;
        let balance = account
            .get("totalWalletBalance")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);
        Ok(balance)
    }

    pub async fn close_position(
        &self,
        symbol: &str,
        position_amt: f64,
    ) -> Result<serde_json::Value, ExchangeError> {
        let (side, pos_side) = if position_amt > 0.0 {
            (Side::Sell, PositionSide::Long)
        } else {
            (Side::Buy, PositionSide::Short)
        };
        let qty = position_amt.abs();
        let cid = format!("risk-close-{}", Self::timestamp_ms());

        let params = [
            ("symbol", symbol.to_string()),
            ("side", side.to_string()),
            ("type", OrderType::Market.to_string()),
            ("positionSide", pos_side.to_string()),
            ("quantity", format!("{qty}")),
            ("newClientOrderId", cid),
        ];

        if self.dry_run {
            tracing::info!("[DRY RUN] close_position symbol={symbol} side={side} pos={pos_side} qty={qty}");
            return Ok(serde_json::json!({
                "dryRun": true, "symbol": symbol,
                "side": side.to_string(), "positionSide": pos_side.to_string(),
                "quantity": qty,
            }));
        }
        self.signed_post("/fapi/v1/order", &params).await
    }

    // ── User Data Stream ───────────────────────────────────────

    pub async fn create_listen_key(&self) -> Result<String, ExchangeError> {
        let url = format!("{}/fapi/v1/listenKey", self.base_url);
        let resp = self.client.post(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await?;
        let body: serde_json::Value = resp.json().await?;
        body.get("listenKey")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| ExchangeError::Api {
                code: -1,
                msg: "no listenKey in response".to_string(),
            })
    }

    pub async fn keepalive_listen_key(&self, listen_key: &str) -> Result<(), ExchangeError> {
        let url = format!("{}/fapi/v1/listenKey", self.base_url);
        self.client.put(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .query(&[("listenKey", listen_key)])
            .send().await?;
        Ok(())
    }

    pub fn ws_base_url(&self) -> String {
        if self.base_url.contains("testnet") {
            "wss://stream.binancefuture.com".to_string()
        } else {
            "wss://fstream.binance.com".to_string()
        }
    }

    // ── CLI-specific endpoints (Phase 4) ───────────────────────

    /// Fetch OHLCV klines
    pub async fn fetch_ohlcv(
        &self,
        symbol: &str,
        interval: &str,
        limit: u32,
        start_time: Option<u64>,
        end_time: Option<u64>,
    ) -> Result<Vec<serde_json::Value>, ExchangeError> {
        let mut params = vec![
            ("symbol", symbol.to_string()),
            ("interval", interval.to_string()),
            ("limit", limit.to_string()),
        ];
        if let Some(st) = start_time {
            params.push(("startTime", st.to_string()));
        }
        if let Some(et) = end_time {
            params.push(("endTime", et.to_string()));
        }
        let body = self.public_get("/fapi/v1/klines", &params).await?;
        Ok(body.as_array().cloned().unwrap_or_default())
    }

    /// Fetch 24hr tickers
    pub async fn fetch_tickers(&self) -> Result<Vec<serde_json::Value>, ExchangeError> {
        let body = self.public_get("/fapi/v1/ticker/24hr", &[]).await?;
        Ok(body.as_array().cloned().unwrap_or_default())
    }

    /// Fetch premium index (funding rate) — raw JSON
    pub async fn fetch_premium_index(
        &self,
        symbol: Option<&str>,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params: Vec<(&str, String)> = match symbol {
            Some(s) => vec![("symbol", s.to_string())],
            None => vec![],
        };
        self.public_get("/fapi/v1/premiumIndex", &params).await
    }

    /// Fetch premium index as typed structs.
    /// If `symbol` is None, returns all symbols.
    pub async fn get_premium_index(
        &self,
        symbol: Option<&str>,
    ) -> Result<Vec<PremiumIndex>, ExchangeError> {
        let body = self.fetch_premium_index(symbol).await?;

        let items: Vec<serde_json::Value> = if body.is_array() {
            body.as_array().cloned().unwrap_or_default()
        } else {
            vec![body]
        };

        let mut result = Vec::new();
        for item in items {
            let sym = item.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let last_funding_rate: f64 = item
                .get("lastFundingRate")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let mark_price: f64 = item
                .get("markPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let next_funding_time: u64 = item
                .get("nextFundingTime")
                .and_then(|v| v.as_u64().or_else(|| v.as_i64().map(|i| i as u64)))
                .unwrap_or(0);

            result.push(PremiumIndex {
                symbol: sym,
                last_funding_rate,
                mark_price,
                next_funding_time,
            });
        }
        Ok(result)
    }

    /// Fetch funding rate history
    pub async fn fetch_funding_rate_history(
        &self,
        symbol: &str,
        limit: u32,
    ) -> Result<Vec<serde_json::Value>, ExchangeError> {
        let params = [
            ("symbol", symbol.to_string()),
            ("limit", limit.to_string()),
        ];
        let body = self.public_get("/fapi/v1/fundingRate", &params).await?;
        Ok(body.as_array().cloned().unwrap_or_default())
    }

    /// Fetch user trades (signed)
    pub async fn fetch_my_trades(
        &self,
        symbol: &str,
        limit: u32,
    ) -> Result<Vec<serde_json::Value>, ExchangeError> {
        let params = [
            ("symbol", symbol.to_string()),
            ("limit", limit.to_string()),
        ];
        let body = self.signed_get("/fapi/v1/userTrades", &params).await?;
        Ok(body.as_array().cloned().unwrap_or_default())
    }

    /// Fetch exchange info (all symbols, filters, etc.)
    pub async fn fetch_exchange_info(&self) -> Result<serde_json::Value, ExchangeError> {
        self.public_get("/fapi/v1/exchangeInfo", &[]).await
    }

    /// Internal transfer (spot ↔ futures)
    /// type: 1 = spot→futures, 2 = futures→spot
    pub async fn transfer_internal(
        &self,
        asset: &str,
        amount: f64,
        transfer_type: u32,
    ) -> Result<serde_json::Value, ExchangeError> {
        let params = [
            ("asset", asset.to_string()),
            ("amount", format!("{amount}")),
            ("type", transfer_type.to_string()),
        ];
        if self.dry_run {
            tracing::info!("[DRY RUN] transfer asset={asset} amount={amount} type={transfer_type}");
            return Ok(serde_json::json!({"dryRun": true, "asset": asset, "amount": amount}));
        }
        self.signed_post("/sapi/v1/futures/transfer", &params).await
    }
}
