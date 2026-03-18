//! 独立 Rust 风控引擎 — WebSocket 实时监控，毫秒级止损/止盈/利润保护
//!
//! 架构：
//!   交易引擎（Rust）— 负责交易
//!   风控引擎（Rust）— 实时风控，独立进程  ← 本文件
//!
//! 数据源：
//!   1. markPrice@1s — 所有持仓 symbol 的实时标记价格
//!   2. user data stream (listenKey) — ACCOUNT_UPDATE 持仓变化
//!
//! 每次收到价格更新或持仓变化时立即检查风控规则。

use futures_util::{SinkExt, StreamExt};
use hft_engine::exchange::Exchange;
use hft_engine::risk::RiskConfig;
use hft_engine::state::RiskEngineState;
use notify::{EventKind, RecursiveMode, Watcher};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;

use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

const ENGINE_REGISTRY: &str = "/tmp/hft-engines.json";
const HIGH_WATER_FILE: &str = "reports/high_water_rust.json";
const RISK_STATE_FILE: &str = "reports/risk_engine_state.json";
const BINANCE_FSTREAM_WS: &str = "wss://fstream.binance.com";
/// listenKey keepalive 间隔（分钟）
const KEEPALIVE_MINUTES: u64 = 20;
// ── 风控事件 ─────────────────────────────────────────────────

#[derive(Debug)]
enum RiskEvent {
    /// 标记价格更新
    MarkPrice {
        symbol: String,
        mark_price: f64,
    },
    /// 持仓更新（从 user data stream ACCOUNT_UPDATE）
    PositionUpdate {
        symbol: String,
        position_side: String,
        position_amt: f64,
        entry_price: f64,
        unrealized_pnl: f64,
    },
    /// 余额更新
    BalanceUpdate {
        wallet_balance: f64,
    },
    /// 风控配置文件变化（risk.json / strategy.json）
    ConfigChanged,
}

// ── 策略目录扫描 ─────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct StrategyJson {
    name: Option<String>,
    symbol: Option<String>,
    capital: Option<f64>,
}

/// 每个 symbol 的风控配置
#[derive(Debug, Clone)]
struct SymbolRiskConfig {
    strategy_name: String,
    risk: RiskConfig,
    capital: f64,
}

/// {normalized_symbol: SymbolRiskConfig}
type RiskMap = HashMap<String, SymbolRiskConfig>;

fn load_risk_configs(strategies_dir: &Path) -> RiskMap {
    let mut map = RiskMap::new();
    let registry = read_engine_registry();

    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let dir = entry.path();
            if !dir.is_dir() {
                continue;
            }
            let strategy_file = dir.join("strategy.json");
            if !strategy_file.exists() {
                continue;
            }
            let Ok(contents) = std::fs::read_to_string(&strategy_file) else {
                continue;
            };
            let Ok(cfg) = serde_json::from_str::<StrategyJson>(&contents) else {
                continue;
            };

            let name = cfg
                .name
                .unwrap_or_else(|| dir.file_name().unwrap().to_string_lossy().to_string());
            let symbol = cfg
                .symbol
                .map(|s| normalize_symbol(&s))
                .unwrap_or_default();
            let capital = cfg.capital.unwrap_or(200.0);

            if symbol.is_empty() {
                continue;
            }

            let risk_file = dir.join("risk.json");
            let risk_config = RiskConfig::load(&risk_file);
            map.insert(
                symbol.clone(),
                SymbolRiskConfig {
                    strategy_name: name,
                    risk: risk_config,
                    capital,
                },
            );
        }
    }

    for (reg_name, norm_symbol, _) in &registry {
        if !map.contains_key(norm_symbol) && !norm_symbol.is_empty() {
            map.insert(
                norm_symbol.clone(),
                SymbolRiskConfig {
                    strategy_name: reg_name.clone(),
                    risk: RiskConfig::default(),
                    capital: 200.0,
                },
            );
        }
    }

    map
}

fn normalize_symbol(s: &str) -> String {
    s.replace("/", "").replace(":USDT", "")
}

fn read_engine_registry() -> Vec<(String, String, String)> {
    let Ok(contents) = std::fs::read_to_string(ENGINE_REGISTRY) else {
        return vec![];
    };
    let Ok(raw) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&contents)
    else {
        return vec![];
    };

    raw.into_iter()
        .map(|(key, val)| {
            if let Some(obj) = val.as_object() {
                let symbol = obj
                    .get("symbol")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let strategy = obj
                    .get("strategy")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                (key, symbol, strategy)
            } else {
                let strategy = val.as_str().unwrap_or("").to_string();
                (strategy.clone(), key, strategy)
            }
        })
        .collect()
}

/// 从 RiskMap 中提取需要监控的 symbol 列表
fn monitored_symbols(risk_map: &RiskMap) -> Vec<String> {
    risk_map.keys().map(|s| s.to_lowercase()).collect()
}

// ── 高水位管理 ───────────────────────────────────────────────

type HighWaterMarks = HashMap<String, f64>;

fn load_high_water() -> HighWaterMarks {
    let path = Path::new(HIGH_WATER_FILE);
    if let Ok(contents) = std::fs::read_to_string(path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

fn save_high_water(hwm: &HighWaterMarks) {
    let path = Path::new(HIGH_WATER_FILE);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(hwm) {
        let _ = std::fs::write(path, json);
    }
}

// ── 复利动态 order_qty ───────────────────────────────────────

// ── 文件监听（策略配置热更新）────────────────────────────────

/// 监听 strategies/ 目录下 risk.json / strategy.json 的变化
/// 文件修改后发送 ConfigChanged 事件，主循环立即重新加载配置
fn start_config_watcher(strategies_dir: PathBuf, tx: mpsc::Sender<RiskEvent>) {
    std::thread::spawn(move || {
        let tx_clone = tx.clone();
        let mut watcher = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                let Ok(event) = res else { return };
                // 只关心写入/创建/删除事件
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => {}
                    _ => return,
                }
                // 只关心 risk.json 和 strategy.json
                let dominated = event.paths.iter().any(|p| {
                    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    name == "risk.json" || name == "strategy.json"
                });
                if !dominated {
                    return;
                }
                tracing::info!("config file changed: {:?}", event.paths);
                let _ = tx_clone.blocking_send(RiskEvent::ConfigChanged);
            },
        )
        .expect("failed to create file watcher");

        watcher
            .watch(&strategies_dir, RecursiveMode::Recursive)
            .expect("failed to watch strategies directory");

        tracing::info!("file watcher started: {:?}", strategies_dir);
        // 保持 watcher 存活（阻塞线程）
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });
}

// ── 持仓状态跟踪 ─────────────────────────────────────────────

#[derive(Debug, Clone)]
struct TrackedPosition {
    symbol: String,
    position_side: String,
    position_amt: f64,
    entry_price: f64,
    unrealized_pnl: f64,
    /// 最新标记价格
    mark_price: f64,
}

impl TrackedPosition {
    /// 根据标记价格重新计算未实现盈亏
    fn recalc_pnl(&mut self) {
        if self.mark_price <= 0.0 || self.entry_price <= 0.0 {
            return;
        }
        let price_diff = self.mark_price - self.entry_price;
        self.unrealized_pnl = if self.position_amt > 0.0 {
            price_diff * self.position_amt
        } else {
            -price_diff * self.position_amt.abs()
        };
    }

    fn key(&self) -> String {
        format!("{}:{}", self.symbol, self.position_side)
    }
}

/// 持仓管理器
struct PositionTracker {
    /// key = "BTCUSDT:LONG" → TrackedPosition
    positions: HashMap<String, TrackedPosition>,
}

impl PositionTracker {
    fn new() -> Self {
        Self {
            positions: HashMap::new(),
        }
    }

    /// 从 ACCOUNT_UPDATE 更新持仓
    fn update_position(
        &mut self,
        symbol: &str,
        position_side: &str,
        position_amt: f64,
        entry_price: f64,
        unrealized_pnl: f64,
    ) {
        let key = format!("{symbol}:{position_side}");
        if position_amt.abs() < f64::EPSILON {
            // 仓位清零，移除
            self.positions.remove(&key);
            return;
        }
        let pos = self.positions.entry(key).or_insert_with(|| TrackedPosition {
            symbol: symbol.to_string(),
            position_side: position_side.to_string(),
            position_amt: 0.0,
            entry_price: 0.0,
            unrealized_pnl: 0.0,
            mark_price: 0.0,
        });
        pos.position_amt = position_amt;
        pos.entry_price = entry_price;
        pos.unrealized_pnl = unrealized_pnl;
    }

    /// 根据标记价格更新所有相关持仓的 PnL
    fn update_mark_price(&mut self, symbol: &str, mark_price: f64) {
        for pos in self.positions.values_mut() {
            if pos.symbol == symbol {
                pos.mark_price = mark_price;
                pos.recalc_pnl();
            }
        }
    }

    /// 获取某 symbol 的所有持仓
    fn get_positions_for_symbol(&self, symbol: &str) -> Vec<&TrackedPosition> {
        self.positions
            .values()
            .filter(|p| p.symbol == symbol)
            .collect()
    }

    /// 获取所有活跃持仓
    fn all_positions(&self) -> Vec<&TrackedPosition> {
        self.positions.values().collect()
    }

    /// 移除持仓
    fn remove(&mut self, key: &str) {
        self.positions.remove(key);
    }
}

// ── WebSocket: markPrice 流 ──────────────────────────────────

async fn start_mark_price_feed(
    symbols: Vec<String>,
    tx: mpsc::Sender<RiskEvent>,
) {
    if symbols.is_empty() {
        tracing::warn!("no symbols to monitor for mark price");
        return;
    }

    let streams: Vec<String> = symbols
        .iter()
        .map(|s| format!("{}@markPrice@1s", s.to_lowercase()))
        .collect();
    let url = format!("{BINANCE_FSTREAM_WS}/stream?streams={}", streams.join("/"));

    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);

    loop {
        tracing::info!(url = %url, "connecting to markPrice ws");

        match connect_async(&url).await {
            Ok((ws, _)) => {
                tracing::info!("markPrice ws connected ({} symbols)", symbols.len());
                retry_delay = std::time::Duration::from_secs(1);

                let (mut write, mut read) = ws.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                            if let Some(event) = parse_mark_price_msg(&text) {
                                let _ = tx.try_send(event);
                            }
                        }
                        Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                            let _ = write
                                .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                .await;
                        }
                        Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                            tracing::warn!("markPrice ws closed");
                            break;
                        }
                        Err(e) => {
                            tracing::error!("markPrice ws error: {e}");
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                tracing::error!("markPrice ws connect failed: {e}");
            }
        }

        if tx.is_closed() {
            return;
        }

        tracing::warn!(delay = ?retry_delay, "markPrice ws reconnecting");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

fn parse_mark_price_msg(raw: &str) -> Option<RiskEvent> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    let data = v.get("data")?;
    let symbol = data.get("s")?.as_str()?.to_string();
    let mark_price: f64 = data.get("p")?.as_str()?.parse().ok()?;
    Some(RiskEvent::MarkPrice { symbol, mark_price })
}

// ── WebSocket: User Data Stream ──────────────────────────────

async fn start_user_data_feed(
    exchange: &Exchange,
    tx: mpsc::Sender<RiskEvent>,
) {
    let mut retry_delay = std::time::Duration::from_secs(1);
    let max_delay = std::time::Duration::from_secs(30);

    loop {
        // 获取 listenKey
        let listen_key = match exchange.create_listen_key().await {
            Ok(k) => k,
            Err(e) => {
                tracing::error!("failed to create listenKey: {e}");
                tokio::time::sleep(retry_delay).await;
                retry_delay = (retry_delay * 2).min(max_delay);
                continue;
            }
        };

        let ws_base = exchange.ws_base_url();
        let url = format!("{ws_base}/ws/{listen_key}");
        tracing::info!(url = %url, "connecting to user data stream");

        // 启动 keepalive 任务
        let lk = listen_key.clone();
        let exchange_key = exchange.api_key().to_string();
        let exchange_base = exchange.base_url().to_string();
        let keepalive_handle = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let mut interval =
                tokio::time::interval(std::time::Duration::from_secs(KEEPALIVE_MINUTES * 60));
            loop {
                interval.tick().await;
                let url = format!("{}/fapi/v1/listenKey", exchange_base);
                let _ = client
                    .put(&url)
                    .header("X-MBX-APIKEY", &exchange_key)
                    .query(&[("listenKey", &lk)])
                    .send()
                    .await;
                tracing::debug!("listenKey keepalive sent");
            }
        });

        match connect_async(&url).await {
            Ok((ws, _)) => {
                tracing::info!("user data stream connected");
                retry_delay = std::time::Duration::from_secs(1);

                let (mut write, mut read) = ws.split();

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                            for event in parse_user_data_msg(&text) {
                                let _ = tx.try_send(event);
                            }
                        }
                        Ok(tokio_tungstenite::tungstenite::Message::Ping(data)) => {
                            let _ = write
                                .send(tokio_tungstenite::tungstenite::Message::Pong(data))
                                .await;
                        }
                        Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                            tracing::warn!("user data stream closed");
                            break;
                        }
                        Err(e) => {
                            tracing::error!("user data stream error: {e}");
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                tracing::error!("user data stream connect failed: {e}");
            }
        }

        keepalive_handle.abort();

        if tx.is_closed() {
            return;
        }

        tracing::warn!(delay = ?retry_delay, "user data stream reconnecting");
        tokio::time::sleep(retry_delay).await;
        retry_delay = (retry_delay * 2).min(max_delay);
    }
}

/// 解析 user data stream 消息（ACCOUNT_UPDATE 等）
fn parse_user_data_msg(raw: &str) -> Vec<RiskEvent> {
    let mut events = Vec::new();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) else {
        return events;
    };

    let event_type = v.get("e").and_then(|e| e.as_str()).unwrap_or("");

    match event_type {
        "ACCOUNT_UPDATE" => {
            if let Some(data) = v.get("a") {
                // 余额更新
                if let Some(balances) = data.get("B").and_then(|b| b.as_array()) {
                    for b in balances {
                        let asset = b.get("a").and_then(|v| v.as_str()).unwrap_or("");
                        if asset == "USDT" {
                            if let Some(wb) = b
                                .get("wb")
                                .and_then(|v| v.as_str())
                                .and_then(|s| s.parse::<f64>().ok())
                            {
                                events.push(RiskEvent::BalanceUpdate {
                                    wallet_balance: wb,
                                });
                            }
                        }
                    }
                }
                // 持仓更新
                if let Some(positions) = data.get("P").and_then(|p| p.as_array()) {
                    for p in positions {
                        let symbol = p.get("s").and_then(|v| v.as_str()).unwrap_or("");
                        let ps = p.get("ps").and_then(|v| v.as_str()).unwrap_or("BOTH");
                        let pa: f64 = p
                            .get("pa")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        let ep: f64 = p
                            .get("ep")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);
                        let up: f64 = p
                            .get("up")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse().ok())
                            .unwrap_or(0.0);

                        if !symbol.is_empty() {
                            events.push(RiskEvent::PositionUpdate {
                                symbol: symbol.to_string(),
                                position_side: ps.to_string(),
                                position_amt: pa,
                                entry_price: ep,
                                unrealized_pnl: up,
                            });
                        }
                    }
                }
            }
        }
        "listenKeyExpired" => {
            tracing::warn!("listenKey expired, will reconnect");
        }
        _ => {
            tracing::debug!("user data event: {event_type}");
        }
    }

    events
}

// ── 风控检查 ─────────────────────────────────────────────────

/// UTC 当日零点的 unix 毫秒时间戳
fn today_start_ts() -> u64 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let day_secs = now - (now % 86400);
    day_secs * 1000
}

/// 记录平仓到 risk_state 并持久化（降级后暂不使用，保留备用）
#[allow(dead_code)]
fn record_close_and_save(risk_state: &mut RiskEngineState, strategy_name: &str, pnl: f64) {
    let today = today_start_ts();
    {
        let entry = risk_state
            .strategies
            .entry(strategy_name.to_string())
            .or_default();
        entry.maybe_reset_day(today);
        entry.record_close(pnl);
    }
    risk_state.last_updated =
        chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    risk_state.save(Path::new(RISK_STATE_FILE));
    let entry = &risk_state.strategies[strategy_name];
    tracing::info!(
        strategy = strategy_name,
        pnl,
        daily_pnl = entry.daily_realized_pnl,
        daily_trades = entry.daily_trades,
        consecutive_losses = entry.consecutive_losses,
        "risk state updated"
    );
}

async fn check_position_risk(
    pos: &TrackedPosition,
    risk_map: &RiskMap,
    hwm: &mut HighWaterMarks,
    _exchange: &Exchange,
    total_balance: f64,
    risk_state: &mut RiskEngineState,
) -> Option<String> {
    let norm_sym = &pos.symbol;
    let key = pos.key();

    let cfg = match risk_map.get(norm_sym) {
        Some(r) => r,
        None => return None,
    };
    let strategy_name = &cfg.strategy_name;
    let risk_cfg = &cfg.risk;
    let capital = cfg.capital;

    let pnl = pos.unrealized_pnl;

    // ── 0. 当日亏损熔断 + 连续亏损熔断 ──
    {
        let today = today_start_ts();
        let entry = risk_state
            .strategies
            .entry(strategy_name.clone())
            .or_default();
        entry.maybe_reset_day(today);

        // 当日总亏损检查
        if capital > 0.0 && entry.daily_realized_pnl < 0.0 {
            let daily_loss_ratio = -entry.daily_realized_pnl / capital;
            if daily_loss_ratio >= risk_cfg.max_daily_loss {
                tracing::warn!(
                    "[DAILY LOSS] [{strategy_name}] {norm_sym} daily_loss={:.2}% >= {:.2}%, blocking",
                    daily_loss_ratio * 100.0,
                    risk_cfg.max_daily_loss * 100.0
                );
                return None;
            }
        }

        // 连续亏损熔断（5 笔）
        if entry.consecutive_losses >= 5 {
            tracing::warn!(
                "[CONSECUTIVE LOSS] [{strategy_name}] {norm_sym} consecutive_losses={}, blocking",
                entry.consecutive_losses
            );
            return None;
        }
    }

    // ── 1. 单笔止损（已降级：仅告警，hft-engine 负责平仓）──
    if capital > 0.0 && pnl < 0.0 {
        let loss_ratio = -pnl / capital;
        if loss_ratio >= risk_cfg.max_loss_per_trade {
            tracing::warn!(
                "[STOP LOSS ALERT] [{strategy_name}] {norm_sym} {} loss=${pnl:.4} ({:.2}% >= {:.2}%) — hft-engine handles close",
                pos.position_side,
                loss_ratio * 100.0,
                risk_cfg.max_loss_per_trade * 100.0
            );
        }
    }

    // ── 2. 单笔止盈（已降级：仅告警，hft-engine 负责平仓）──
    if capital > 0.0 && pnl > 0.0 {
        let profit_ratio = pnl / capital;
        if profit_ratio >= risk_cfg.max_profit_per_trade {
            tracing::warn!(
                "[TAKE PROFIT ALERT] [{strategy_name}] {norm_sym} {} profit=${pnl:.4} ({:.2}% >= {:.2}%) — hft-engine handles close",
                pos.position_side,
                profit_ratio * 100.0,
                risk_cfg.max_profit_per_trade * 100.0
            );
        }
    }

    // ── 3. 仓位占比警告 ──
    if total_balance > 0.0 && pos.entry_price > 0.0 {
        let notional = pos.position_amt.abs() * pos.mark_price;
        let ratio = notional / total_balance;
        if ratio > risk_cfg.max_position_ratio {
            tracing::warn!(
                "[POSITION LIMIT] [{strategy_name}] {norm_sym} ratio={:.2}% > {:.2}%",
                ratio * 100.0,
                risk_cfg.max_position_ratio * 100.0
            );
        }
    }

    // ── 4. 高水位利润保护（已降级：仅告警，hft-engine 负责平仓）──
    if pnl > 0.0 {
        let prev_hwm = *hwm.get(&key).unwrap_or(&0.0);
        if pnl > prev_hwm {
            hwm.insert(key.clone(), pnl);
            save_high_water(hwm);
        }

        let current_hwm = *hwm.get(&key).unwrap_or(&0.0);
        if current_hwm > 0.0 {
            let protection_line = current_hwm * (1.0 - risk_cfg.max_drawdown_stop);
            if pnl <= protection_line {
                tracing::warn!(
                    "[PROFIT PROTECT ALERT] [{strategy_name}] {norm_sym} {} hwm=+${current_hwm:.4} → +${pnl:.4} — hft-engine handles close",
                    pos.position_side
                );
            }
        }
    } else if hwm.contains_key(&key) {
        hwm.remove(&key);
        save_high_water(hwm);
    }

    None
}

// ── tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── normalize_symbol ──

    #[test]
    fn normalize_symbol_slash() {
        assert_eq!(normalize_symbol("PIPPIN/USDT"), "PIPPINUSDT");
    }

    #[test]
    fn normalize_symbol_colon() {
        assert_eq!(normalize_symbol("PIPPIN/USDT:USDT"), "PIPPINUSDT");
    }

    #[test]
    fn normalize_symbol_clean() {
        assert_eq!(normalize_symbol("BTCUSDT"), "BTCUSDT");
    }

    // ── parse_mark_price_msg ──

    #[test]
    fn parse_mark_price_valid() {
        let raw = r#"{"stream":"btcusdt@markPrice@1s","data":{"e":"markPriceUpdate","s":"BTCUSDT","p":"65000.50","T":1234567890}}"#;
        let event = parse_mark_price_msg(raw).unwrap();
        match event {
            RiskEvent::MarkPrice { symbol, mark_price } => {
                assert_eq!(symbol, "BTCUSDT");
                assert!((mark_price - 65000.50).abs() < 0.01);
            }
            _ => panic!("expected MarkPrice"),
        }
    }

    #[test]
    fn parse_mark_price_invalid_json() {
        assert!(parse_mark_price_msg("not json").is_none());
    }

    #[test]
    fn parse_mark_price_missing_fields() {
        let raw = r#"{"stream":"test","data":{}}"#;
        assert!(parse_mark_price_msg(raw).is_none());
    }

    // ── parse_user_data_msg ──

    #[test]
    fn parse_user_data_account_update() {
        let raw = r#"{
            "e": "ACCOUNT_UPDATE",
            "a": {
                "B": [{"a": "USDT", "wb": "250.50"}],
                "P": [{"s": "BTCUSDT", "ps": "LONG", "pa": "0.001", "ep": "65000", "up": "5.50"}]
            }
        }"#;
        let events = parse_user_data_msg(raw);
        assert_eq!(events.len(), 2);

        match &events[0] {
            RiskEvent::BalanceUpdate { wallet_balance } => {
                assert!((wallet_balance - 250.50).abs() < 0.01);
            }
            _ => panic!("expected BalanceUpdate"),
        }

        match &events[1] {
            RiskEvent::PositionUpdate { symbol, position_side, position_amt, entry_price, unrealized_pnl } => {
                assert_eq!(symbol, "BTCUSDT");
                assert_eq!(position_side, "LONG");
                assert!((*position_amt - 0.001).abs() < 1e-9);
                assert!((*entry_price - 65000.0).abs() < 0.01);
                assert!((*unrealized_pnl - 5.50).abs() < 0.01);
            }
            _ => panic!("expected PositionUpdate"),
        }
    }

    #[test]
    fn parse_user_data_unknown_event() {
        let raw = r#"{"e": "ORDER_TRADE_UPDATE", "o": {}}"#;
        let events = parse_user_data_msg(raw);
        assert!(events.is_empty());
    }

    #[test]
    fn parse_user_data_invalid_json() {
        let events = parse_user_data_msg("not json");
        assert!(events.is_empty());
    }

    // ── TrackedPosition ──

    #[test]
    fn tracked_position_recalc_pnl_long() {
        let mut pos = TrackedPosition {
            symbol: "BTCUSDT".to_string(),
            position_side: "LONG".to_string(),
            position_amt: 0.01,
            entry_price: 65000.0,
            unrealized_pnl: 0.0,
            mark_price: 66000.0,
        };
        pos.recalc_pnl();
        assert!((pos.unrealized_pnl - 10.0).abs() < 0.01);
    }

    #[test]
    fn tracked_position_recalc_pnl_short() {
        let mut pos = TrackedPosition {
            symbol: "BTCUSDT".to_string(),
            position_side: "SHORT".to_string(),
            position_amt: -0.01,
            entry_price: 65000.0,
            unrealized_pnl: 0.0,
            mark_price: 64000.0,
        };
        pos.recalc_pnl();
        assert!((pos.unrealized_pnl - 10.0).abs() < 0.01);
    }

    #[test]
    fn tracked_position_key_format() {
        let pos = TrackedPosition {
            symbol: "BTCUSDT".to_string(),
            position_side: "LONG".to_string(),
            position_amt: 0.01,
            entry_price: 65000.0,
            unrealized_pnl: 0.0,
            mark_price: 0.0,
        };
        assert_eq!(pos.key(), "BTCUSDT:LONG");
    }

    // ── PositionTracker ──

    #[test]
    fn position_tracker_add_and_get() {
        let mut tracker = PositionTracker::new();
        tracker.update_position("BTCUSDT", "LONG", 0.01, 65000.0, 5.0);

        let positions = tracker.get_positions_for_symbol("BTCUSDT");
        assert_eq!(positions.len(), 1);
        assert!((positions[0].position_amt - 0.01).abs() < 1e-9);
    }

    #[test]
    fn position_tracker_remove_on_zero_amt() {
        let mut tracker = PositionTracker::new();
        tracker.update_position("BTCUSDT", "LONG", 0.01, 65000.0, 5.0);
        assert_eq!(tracker.all_positions().len(), 1);

        tracker.update_position("BTCUSDT", "LONG", 0.0, 0.0, 0.0);
        assert_eq!(tracker.all_positions().len(), 0);
    }

    #[test]
    fn position_tracker_mark_price_updates_pnl() {
        let mut tracker = PositionTracker::new();
        tracker.update_position("BTCUSDT", "LONG", 0.01, 65000.0, 0.0);

        tracker.update_mark_price("BTCUSDT", 66000.0);

        let positions = tracker.get_positions_for_symbol("BTCUSDT");
        assert_eq!(positions.len(), 1);
        assert!((positions[0].unrealized_pnl - 10.0).abs() < 0.01);
        assert!((positions[0].mark_price - 66000.0).abs() < 0.01);
    }

    #[test]
    fn position_tracker_multiple_symbols() {
        let mut tracker = PositionTracker::new();
        tracker.update_position("BTCUSDT", "LONG", 0.01, 65000.0, 5.0);
        tracker.update_position("ETHUSDT", "SHORT", -0.1, 3500.0, -2.0);

        assert_eq!(tracker.all_positions().len(), 2);
        assert_eq!(tracker.get_positions_for_symbol("BTCUSDT").len(), 1);
        assert_eq!(tracker.get_positions_for_symbol("ETHUSDT").len(), 1);
        assert_eq!(tracker.get_positions_for_symbol("SOLUSDT").len(), 0);
    }
}

// ── main ─────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("risk_engine=info".parse().unwrap()),
        )
        .init();

    let _ = dotenvy::dotenv();

    let api_key = std::env::var("BINANCE_API_KEY").expect("BINANCE_API_KEY not set");
    let api_secret = std::env::var("BINANCE_API_SECRET").expect("BINANCE_API_SECRET not set");
    let base_url = std::env::var("BINANCE_BASE_URL")
        .unwrap_or_else(|_| "https://fapi.binance.com".to_string());
    let dry_run = std::env::var("DRY_RUN")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    let exchange = Exchange::from_credentials(api_key, api_secret, base_url, dry_run);

    let strategies_dir = PathBuf::from(
        std::env::var("STRATEGIES_DIR").unwrap_or_else(|_| "strategies".to_string()),
    );

    // 加载风控配置
    let mut risk_map = load_risk_configs(&strategies_dir);
    let symbols = monitored_symbols(&risk_map);

    tracing::info!("========================================");
    tracing::info!("  Rust 风控引擎启动（WebSocket 实时）");
    tracing::info!("  监控 symbols: {:?}", symbols);
    tracing::info!("  策略目录: {}", strategies_dir.display());
    tracing::info!("  dry_run: {dry_run}");
    tracing::info!("========================================");

    // 加载高水位 + 风控状态 + 初始持仓
    let mut hwm = load_high_water();
    if !hwm.is_empty() {
        tracing::info!("恢复 {} 个高水位记录", hwm.len());
    }

    let mut risk_state = RiskEngineState::load(Path::new(RISK_STATE_FILE));
    if !risk_state.strategies.is_empty() {
        tracing::info!("恢复 {} 个策略风控状态", risk_state.strategies.len());
        for (name, s) in &risk_state.strategies {
            tracing::info!(
                "  {name}: daily_pnl={:.2} trades={} consecutive_losses={}",
                s.daily_realized_pnl, s.daily_trades, s.consecutive_losses
            );
        }
    }

    // 初始化持仓跟踪器（从交易所拉一次初始持仓）
    let mut tracker = PositionTracker::new();
    let mut total_balance = 0.0;
    match exchange.get_account().await {
        Ok(account) => {
            total_balance = account
                .get("totalWalletBalance")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);

            if let Some(positions) = account.get("positions").and_then(|p| p.as_array()) {
                for p in positions {
                    let amt: f64 = p
                        .get("positionAmt")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0.0);
                    if amt.abs() < f64::EPSILON {
                        continue;
                    }
                    let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("");
                    let ps = p
                        .get("positionSide")
                        .and_then(|v| v.as_str())
                        .unwrap_or("BOTH");
                    let ep: f64 = p
                        .get("entryPrice")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0.0);
                    let up: f64 = p
                        .get("unrealizedProfit")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0.0);
                    tracker.update_position(sym, ps, amt, ep, up);
                }
            }
            tracing::info!(
                "初始持仓: {} 个, 余额: ${:.2}",
                tracker.all_positions().len(),
                total_balance
            );
        }
        Err(e) => {
            tracing::error!("failed to load initial account: {e}");
        }
    }

    // 启动事件通道
    let (tx, mut rx) = mpsc::channel::<RiskEvent>(4096);

    // 启动 markPrice WebSocket
    let tx_mark = tx.clone();
    let syms = symbols.clone();
    tokio::spawn(async move {
        start_mark_price_feed(syms, tx_mark).await;
    });

    // 启动 user data stream WebSocket
    let tx_user = tx.clone();
    // Exchange 不能 move 进 spawn（需要在主循环用），所以 user data stream
    // 需要自己的 API key。从环境变量重新读取。
    let api_key2 = std::env::var("BINANCE_API_KEY").unwrap();
    let api_secret2 = std::env::var("BINANCE_API_SECRET").unwrap();
    let base_url2 = std::env::var("BINANCE_BASE_URL")
        .unwrap_or_else(|_| "https://fapi.binance.com".to_string());
    let exchange2 = Exchange::from_credentials(api_key2, api_secret2, base_url2, dry_run);
    tokio::spawn(async move {
        start_user_data_feed(&exchange2, tx_user).await;
    });

    // 文件监听：strategies/ 目录下 risk.json / strategy.json 变化时立即重新加载
    let tx_watcher = tx.clone();
    start_config_watcher(strategies_dir.clone(), tx_watcher);

    // 状态日志计数器
    let mut event_count: u64 = 0;
    let mut last_status_log = std::time::Instant::now();

    // ── 主事件循环 ──
    loop {
        tokio::select! {
            Some(event) = rx.recv() => {
                event_count += 1;
                match event {
                    RiskEvent::MarkPrice { ref symbol, mark_price } => {
                        // 更新标记价格并检查所有相关持仓
                        tracker.update_mark_price(symbol, mark_price);

                        let positions: Vec<TrackedPosition> = tracker
                            .get_positions_for_symbol(symbol)
                            .into_iter()
                            .cloned()
                            .collect();

                        for pos in &positions {
                            if let Some(closed_sym) = check_position_risk(
                                pos, &risk_map, &mut hwm, &exchange, total_balance,
                                &mut risk_state,
                            ).await {
                                tracker.remove(&pos.key());
                                tracing::warn!("position closed: {closed_sym}");
                            }
                        }
                    }
                    RiskEvent::PositionUpdate {
                        ref symbol,
                        ref position_side,
                        position_amt,
                        entry_price,
                        unrealized_pnl,
                    } => {
                        tracing::info!(
                            "ACCOUNT_UPDATE: {symbol} {position_side} amt={position_amt} ep={entry_price} pnl={unrealized_pnl:.4}"
                        );
                        tracker.update_position(
                            symbol,
                            position_side,
                            position_amt,
                            entry_price,
                            unrealized_pnl,
                        );

                        // 仓位变化时也检查风控
                        if position_amt.abs() > f64::EPSILON {
                            let key = format!("{symbol}:{position_side}");
                            if let Some(pos) = tracker.positions.get(&key).cloned() {
                                if let Some(closed_sym) = check_position_risk(
                                    &pos, &risk_map, &mut hwm, &exchange, total_balance,
                                    &mut risk_state,
                                ).await {
                                    tracker.remove(&key);
                                    tracing::warn!("position closed on update: {closed_sym}");
                                }
                            }
                        } else {
                            // 仓位清零，清除高水位
                            let key = format!("{symbol}:{position_side}");
                            if hwm.remove(&key).is_some() {
                                save_high_water(&hwm);
                            }
                        }
                    }
                    RiskEvent::BalanceUpdate { wallet_balance } => {
                        tracing::info!("balance update: ${wallet_balance:.2}");
                        total_balance = wallet_balance;
                    }
                    RiskEvent::ConfigChanged => {
                        // 文件监听触发：立即重新加载风控配置
                        let new_map = load_risk_configs(&strategies_dir);
                        tracing::info!("risk config reloaded (file changed): {} strategies", new_map.len());
                        risk_map = new_map;
                    }
                }

                // 每 30 秒输出状态日志
                if last_status_log.elapsed() >= std::time::Duration::from_secs(30) {
                    let n_pos = tracker.all_positions().len();
                    tracing::info!(
                        "[STATUS] events={event_count} positions={n_pos} balance=${total_balance:.2} hwm={}",
                        hwm.len()
                    );
                    last_status_log = std::time::Instant::now();
                }
            }
        }
    }
}
