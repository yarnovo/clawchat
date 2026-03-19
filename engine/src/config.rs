use clap::Parser;
use std::collections::HashMap;
use std::path::PathBuf;

// Re-export shared types used by Config
pub use clawchat_shared::config_util::{normalize_symbol, timeframe_to_ms};
pub use clawchat_shared::strategy::StrategyFile;
pub use clawchat_shared::types::{SizingMode, TradeDirection};

#[derive(Parser, Debug, Clone)]
#[command(name = "hft-engine", about = "High-frequency trading engine for Binance futures")]
pub struct Config {
    /// Path to signal.json config file
    #[arg(long)]
    pub config: Option<PathBuf>,

    /// Trading symbol (e.g. BTCUSDT) — overridden by config file
    #[arg(long, env = "SYMBOL", default_value = "BTCUSDT")]
    pub symbol: String,

    /// Leverage multiplier — overridden by config file
    #[arg(long, env = "LEVERAGE", default_value_t = 10)]
    pub leverage: u32,

    /// Strategy name — overridden by config file
    #[arg(long, env = "STRATEGY", default_value = "default")]
    pub strategy: String,

    /// Dry run mode — log orders without sending to exchange
    #[arg(long, env = "DRY_RUN", default_value_t = false)]
    pub dry_run: bool,

    /// Binance API key
    #[arg(long, env = "BINANCE_API_KEY")]
    pub api_key: String,

    /// Binance API secret
    #[arg(long, env = "BINANCE_API_SECRET")]
    pub api_secret: String,

    /// Binance futures API base URL
    #[arg(long, env = "BINANCE_BASE_URL", default_value = "https://fapi.binance.com")]
    pub base_url: String,

    // ── Fields populated from signal.json ──
    /// Strategy display name (from config file)
    #[arg(skip)]
    pub strategy_name: Option<String>,

    /// Order quantity (from config file)
    #[arg(skip)]
    pub order_qty: Option<f64>,

    /// Candle timeframe in ms (from config file)
    #[arg(skip)]
    pub timeframe_ms: Option<u64>,

    /// Strategy-specific parameters (from config file)
    #[arg(skip)]
    pub params: HashMap<String, f64>,

    /// Capital amount (from config file)
    #[arg(skip)]
    pub capital: Option<f64>,

    /// Position size as fraction of equity (e.g. 0.3 = 30%)
    #[arg(skip)]
    pub position_size: Option<f64>,

    /// Sizing mode: Fixed (use order_qty) or Percent (compute from equity)
    #[arg(skip)]
    pub sizing_mode: SizingMode,

    /// Trade direction filter: Both / LongOnly / ShortOnly
    #[arg(skip)]
    pub trade_direction: TradeDirection,

    /// Signal cooldown in bars (0 = disabled)
    #[arg(skip)]
    pub cooldown_bars: u32,

    /// Minimum candle volume to allow signal (0 = disabled)
    #[arg(skip)]
    pub min_volume: f64,

    /// Maximum spread in basis points (0 = disabled)
    #[arg(skip)]
    pub min_spread_bps: f64,

    /// Minimum order book depth in USD (0 = disabled)
    #[arg(skip)]
    pub min_depth_usd: f64,
}

const VALID_STRATEGIES: &[&str] = &[
    "mm", "market_maker", "default", "scalping", "breakout", "rsi", "bollinger", "macd",
    "mean_reversion", "grid",
];

/// Known params per strategy (for validation warnings)
fn known_params(strategy: &str) -> &'static [&'static str] {
    match strategy {
        "mm" | "market_maker" => &["fee_rate"],
        "default" => &["ema_fast", "ema_slow", "atr_period", "atr_sl_mult", "atr_tp_mult"],
        "scalping" => &["ema_fast", "ema_slow", "volume_multiplier", "atr_period", "atr_sl_mult", "atr_tp_mult", "rsi_buy_low", "rsi_buy_high", "rsi_sell_low", "rsi_sell_high"],
        "breakout" => &["lookback", "atr_period", "atr_filter", "trail_atr"],
        "rsi" => &["rsi_period", "rsi_oversold", "rsi_overbought", "trend_ema", "atr_period", "atr_sl_mult", "atr_tp_mult"],
        "bollinger" => &["bb_period", "num_std", "trend_ema", "atr_period", "atr_sl_mult"],
        "macd" => &["fast_period", "slow_period", "signal_period", "trend_ema", "atr_period", "atr_sl"],
        "mean_reversion" => &["ema_period", "std_period", "entry_std", "atr_period", "atr_sl"],
        "grid" => &["grids", "lookback"],
        _ => &[],
    }
}

impl Config {
    /// Load config from .env file (if present), then parse CLI args + env vars,
    /// then overlay signal.json if --config is provided.
    pub fn load() -> Self {
        let _ = dotenvy::dotenv();
        let mut config = Self::parse();

        if let Some(ref path) = config.config {
            match std::fs::read_to_string(path) {
                Ok(contents) => match serde_json::from_str::<StrategyFile>(&contents) {
                    Ok(sf) => config.apply_strategy_file(sf),
                    Err(e) => {
                        eprintln!("Failed to parse {}: {e}", path.display());
                        std::process::exit(1);
                    }
                },
                Err(e) => {
                    eprintln!("Failed to read {}: {e}", path.display());
                    std::process::exit(1);
                }
            }
        }

        if let Err(errors) = config.validate() {
            for e in &errors {
                eprintln!("FATAL: {e}");
            }
            std::process::exit(1);
        }
        config
    }

    /// Validate config values. Returns Err with list of fatal errors.
    /// Also prints warnings for unknown/missing params.
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        // strategy must be valid
        if !VALID_STRATEGIES.contains(&self.strategy.as_str()) {
            errors.push(format!(
                "unknown strategy '{}'. Must be one of: {}",
                self.strategy,
                VALID_STRATEGIES.join(", ")
            ));
        }

        // symbol required
        if self.symbol.is_empty() {
            errors.push("symbol is required".to_string());
        }

        // leverage 1-20
        if self.leverage < 1 || self.leverage > 20 {
            errors.push(format!("leverage must be 1-20, got {}", self.leverage));
        }

        // order_qty > 0 (if set)
        if let Some(qty) = self.order_qty {
            if qty <= 0.0 {
                errors.push(format!("order_qty must be > 0, got {qty}"));
            }
        }

        if !errors.is_empty() {
            return Err(errors);
        }

        // Warn on unknown params
        let known = known_params(&self.strategy);
        for key in self.params.keys() {
            if !known.contains(&key.as_str()) {
                eprintln!("WARN: unknown param '{key}' for strategy '{}' (known: {})",
                    self.strategy, known.join(", "));
            }
        }

        // Warn on missing params with defaults
        for &k in known {
            if !self.params.contains_key(k) {
                eprintln!("WARN: param '{k}' not set for strategy '{}', using default", self.strategy);
            }
        }

        Ok(())
    }

    pub fn apply_strategy_file(&mut self, sf: StrategyFile) {
        if let Some(name) = sf.name {
            self.strategy_name = Some(name);
        }
        if let Some(engine_strategy) = sf.engine_strategy {
            self.strategy = engine_strategy;
        }
        if let Some(symbol) = sf.symbol {
            self.symbol = normalize_symbol(&symbol);
        }
        if let Some(leverage) = sf.leverage {
            self.leverage = leverage;
        }
        if let Some(order_qty) = sf.order_qty {
            self.order_qty = Some(order_qty);
        }
        if let Some(capital) = sf.capital {
            self.capital = Some(capital);
        }
        if let Some(position_size) = sf.position_size {
            self.position_size = Some(position_size);
        }
        if let Some(ref mode) = sf.sizing_mode {
            self.sizing_mode = SizingMode::from_str_lossy(mode);
        }
        // timeframe: prefer timeframe_ms, fallback to timeframe string
        if let Some(ms) = sf.timeframe_ms {
            self.timeframe_ms = Some(ms);
        } else if let Some(ref tf) = sf.timeframe {
            self.timeframe_ms = timeframe_to_ms(tf);
        }
        // Extract numeric params
        for (k, v) in sf.params {
            if let Some(n) = v.as_f64() {
                self.params.insert(k, n);
            }
        }
        // Filter fields
        if let Some(ref dir) = sf.trade_direction {
            self.trade_direction = TradeDirection::from_str_lossy(dir);
        }
        if let Some(cd) = sf.cooldown_bars {
            self.cooldown_bars = cd;
        }
        if let Some(vol) = sf.min_volume {
            self.min_volume = vol;
        }
        if let Some(spread) = sf.min_spread_bps {
            self.min_spread_bps = spread;
        }
        if let Some(depth) = sf.min_depth_usd {
            self.min_depth_usd = depth;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: create a minimal valid Config for testing
    fn test_config(strategy: &str, symbol: &str, leverage: u32) -> Config {
        Config {
            config: None,
            symbol: symbol.to_string(),
            leverage,
            strategy: strategy.to_string(),
            dry_run: true,
            api_key: "test".to_string(),
            api_secret: "test".to_string(),
            base_url: "https://test".to_string(),
            strategy_name: None,
            order_qty: None,
            timeframe_ms: None,
            params: HashMap::new(),
            capital: None,
            position_size: None,
            sizing_mode: SizingMode::Fixed,
            trade_direction: TradeDirection::Both,
            cooldown_bars: 0,
            min_volume: 0.0,
            min_spread_bps: 0.0,
            min_depth_usd: 0.0,
        }
    }

    // ── timeframe_to_ms ──

    #[test]
    fn timeframe_minutes() {
        assert_eq!(timeframe_to_ms("5m"), Some(300_000));
        assert_eq!(timeframe_to_ms("1m"), Some(60_000));
        assert_eq!(timeframe_to_ms("15m"), Some(900_000));
    }

    #[test]
    fn timeframe_hours_days_seconds() {
        assert_eq!(timeframe_to_ms("1h"), Some(3_600_000));
        assert_eq!(timeframe_to_ms("4h"), Some(14_400_000));
        assert_eq!(timeframe_to_ms("1d"), Some(86_400_000));
        assert_eq!(timeframe_to_ms("30s"), Some(30_000));
    }

    #[test]
    fn timeframe_invalid() {
        assert_eq!(timeframe_to_ms("x"), None);
        assert_eq!(timeframe_to_ms(""), None);
    }

    // ── normalize_symbol ──

    #[test]
    fn normalize_symbol_slash() {
        assert_eq!(normalize_symbol("PIPPIN/USDT"), "PIPPINUSDT");
        assert_eq!(normalize_symbol("BTC/USDT"), "BTCUSDT");
    }

    #[test]
    fn normalize_symbol_colon() {
        assert_eq!(normalize_symbol("PIPPIN/USDT:USDT"), "PIPPINUSDT");
    }

    #[test]
    fn normalize_symbol_already_clean() {
        assert_eq!(normalize_symbol("BTCUSDT"), "BTCUSDT");
    }

    // ── validate: valid cases ──

    #[test]
    fn validate_valid_strategies() {
        for &s in VALID_STRATEGIES {
            let cfg = test_config(s, "BTCUSDT", 10);
            assert!(cfg.validate().is_ok(), "strategy '{s}' should be valid");
        }
    }

    #[test]
    fn validate_valid_leverage_range() {
        for lev in [1, 5, 10, 20] {
            let cfg = test_config("macd", "BTCUSDT", lev);
            assert!(cfg.validate().is_ok(), "leverage {lev} should be valid");
        }
    }

    #[test]
    fn validate_valid_order_qty() {
        let mut cfg = test_config("macd", "BTCUSDT", 5);
        cfg.order_qty = Some(100.0);
        assert!(cfg.validate().is_ok());
    }

    // ── validate: invalid cases ──

    #[test]
    fn validate_invalid_strategy() {
        let cfg = test_config("invalid_strat", "BTCUSDT", 10);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("unknown strategy")));
    }

    #[test]
    fn validate_empty_symbol() {
        let cfg = test_config("macd", "", 10);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("symbol is required")));
    }

    #[test]
    fn validate_leverage_zero() {
        let cfg = test_config("macd", "BTCUSDT", 0);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("leverage must be 1-20")));
    }

    #[test]
    fn validate_leverage_too_high() {
        let cfg = test_config("macd", "BTCUSDT", 21);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("leverage must be 1-20")));
    }

    #[test]
    fn validate_negative_order_qty() {
        let mut cfg = test_config("macd", "BTCUSDT", 5);
        cfg.order_qty = Some(-1.0);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("order_qty must be > 0")));
    }

    #[test]
    fn validate_zero_order_qty() {
        let mut cfg = test_config("macd", "BTCUSDT", 5);
        cfg.order_qty = Some(0.0);
        let err = cfg.validate().unwrap_err();
        assert!(err.iter().any(|e| e.contains("order_qty must be > 0")));
    }

    #[test]
    fn validate_multiple_errors() {
        let cfg = test_config("bad", "", 0);
        let err = cfg.validate().unwrap_err();
        assert!(err.len() >= 3); // bad strategy + empty symbol + leverage 0
    }

    // ── apply_strategy_file ──

    #[test]
    fn apply_strategy_file_full() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "name": "pippin-macd-5m",
            "engine_strategy": "macd",
            "symbol": "PIPPIN/USDT",
            "leverage": 5,
            "order_qty": 100,
            "capital": 200,
            "timeframe": "5m",
            "params": {"fast_period": 12, "slow_period": 26}
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        assert_eq!(cfg.strategy_name.as_deref(), Some("pippin-macd-5m"));
        assert_eq!(cfg.strategy, "macd");
        assert_eq!(cfg.symbol, "PIPPINUSDT");
        assert_eq!(cfg.leverage, 5);
        assert_eq!(cfg.order_qty, Some(100.0));
        assert_eq!(cfg.capital, Some(200.0));
        assert_eq!(cfg.timeframe_ms, Some(300_000));
        assert_eq!(cfg.params.get("fast_period"), Some(&12.0));
        assert_eq!(cfg.params.get("slow_period"), Some(&26.0));
    }

    #[test]
    fn apply_strategy_file_partial() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "symbol": "ETHUSDT"
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        assert_eq!(cfg.symbol, "ETHUSDT");
        assert_eq!(cfg.strategy, "default"); // unchanged
        assert_eq!(cfg.leverage, 10); // unchanged
    }

    #[test]
    fn apply_strategy_file_timeframe_ms_priority() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "timeframe_ms": 60000,
            "timeframe": "5m"
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        // timeframe_ms should take priority over timeframe string
        assert_eq!(cfg.timeframe_ms, Some(60_000));
    }

    // ── SizingMode ──

    #[test]
    fn sizing_mode_from_str_percent() {
        assert_eq!(SizingMode::from_str_lossy("percent"), SizingMode::Percent);
    }

    #[test]
    fn sizing_mode_from_str_fixed() {
        assert_eq!(SizingMode::from_str_lossy("fixed"), SizingMode::Fixed);
    }

    #[test]
    fn sizing_mode_from_str_unknown_defaults_fixed() {
        assert_eq!(SizingMode::from_str_lossy("banana"), SizingMode::Fixed);
        assert_eq!(SizingMode::from_str_lossy(""), SizingMode::Fixed);
    }

    #[test]
    fn sizing_mode_default_is_fixed() {
        let cfg = test_config("macd", "BTCUSDT", 5);
        assert_eq!(cfg.sizing_mode, SizingMode::Fixed);
    }

    #[test]
    fn apply_strategy_file_sizing_mode_percent() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "sizing_mode": "percent",
            "position_size": 0.3
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        assert_eq!(cfg.sizing_mode, SizingMode::Percent);
        assert_eq!(cfg.position_size, Some(0.3));
    }

    #[test]
    fn apply_strategy_file_sizing_mode_fixed() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "sizing_mode": "fixed",
            "order_qty": 50
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        assert_eq!(cfg.sizing_mode, SizingMode::Fixed);
        assert_eq!(cfg.order_qty, Some(50.0));
    }

    #[test]
    fn apply_strategy_file_sizing_mode_missing_stays_fixed() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "symbol": "ETHUSDT"
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        // sizing_mode not in JSON → stays at default Fixed
        assert_eq!(cfg.sizing_mode, SizingMode::Fixed);
    }

    #[test]
    fn apply_strategy_file_sizing_mode_invalid_defaults_fixed() {
        let mut cfg = test_config("default", "BTCUSDT", 10);
        let sf: StrategyFile = serde_json::from_str(r#"{
            "sizing_mode": "auto_magic"
        }"#).unwrap();

        cfg.apply_strategy_file(sf);

        // invalid value → from_str_lossy warns + returns Fixed
        assert_eq!(cfg.sizing_mode, SizingMode::Fixed);
    }
}
