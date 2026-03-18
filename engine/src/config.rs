use clap::Parser;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Parser, Debug, Clone)]
#[command(name = "hft-engine", about = "High-frequency trading engine for Binance futures")]
pub struct Config {
    /// Path to strategy.json config file
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

    // ── Fields populated from strategy.json ──
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
}

/// Deserialized strategy.json
#[derive(Debug, Deserialize)]
pub struct StrategyFile {
    pub name: Option<String>,
    /// Maps to Config.strategy: "scalping", "breakout", "rsi", etc.
    #[serde(alias = "engine_strategy", alias = "strategy")]
    pub engine_strategy: Option<String>,
    pub symbol: Option<String>,
    pub leverage: Option<u32>,
    pub order_qty: Option<f64>,
    pub timeframe_ms: Option<u64>,
    /// Timeframe string like "5m", "1h" — converted to ms
    pub timeframe: Option<String>,
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
}

fn timeframe_to_ms(tf: &str) -> Option<u64> {
    let (num_str, unit) = tf.split_at(tf.len().saturating_sub(1));
    let num: u64 = num_str.parse().ok()?;
    match unit {
        "m" => Some(num * 60_000),
        "h" => Some(num * 3_600_000),
        "d" => Some(num * 86_400_000),
        "s" => Some(num * 1_000),
        _ => None,
    }
}

/// Normalize symbol: "PIPPIN/USDT" → "PIPPINUSDT", "BTC/USDT" → "BTCUSDT"
fn normalize_symbol(s: &str) -> String {
    s.replace("/", "").replace(":USDT", "")
}

const VALID_STRATEGIES: &[&str] = &[
    "mm", "market_maker", "default", "scalping", "breakout", "rsi", "bollinger", "macd",
];

/// Known params per strategy (for validation warnings)
fn known_params(strategy: &str) -> &'static [&'static str] {
    match strategy {
        "mm" | "market_maker" => &["fee_rate"],
        "default" => &["ema_fast", "ema_slow", "atr_period", "atr_sl_mult", "atr_tp_mult"],
        "scalping" => &["ema_fast", "ema_slow", "volume_multiplier"],
        "breakout" => &["lookback", "atr_period", "atr_filter", "trail_atr"],
        "rsi" => &["rsi_period", "rsi_oversold", "rsi_overbought", "trend_ema"],
        "bollinger" => &["bb_period", "num_std", "trend_ema"],
        "macd" => &["fast_period", "slow_period", "signal_period", "trend_ema", "atr_period", "atr_sl"],
        _ => &[],
    }
}

impl Config {
    /// Load config from .env file (if present), then parse CLI args + env vars,
    /// then overlay strategy.json if --config is provided.
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

        config.validate();
        config
    }

    /// Validate config values, exit on fatal errors, warn on issues.
    fn validate(&self) {
        let mut fatal = false;

        // strategy must be valid
        if !VALID_STRATEGIES.contains(&self.strategy.as_str()) {
            eprintln!("FATAL: unknown strategy '{}'. Must be one of: {}",
                self.strategy, VALID_STRATEGIES.join(", "));
            fatal = true;
        }

        // symbol required
        if self.symbol.is_empty() {
            eprintln!("FATAL: symbol is required");
            fatal = true;
        }

        // leverage 1-20
        if self.leverage < 1 || self.leverage > 20 {
            eprintln!("FATAL: leverage must be 1-20, got {}", self.leverage);
            fatal = true;
        }

        // order_qty > 0 (if set)
        if let Some(qty) = self.order_qty {
            if qty <= 0.0 {
                eprintln!("FATAL: order_qty must be > 0, got {qty}");
                fatal = true;
            }
        }

        if fatal {
            std::process::exit(1);
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
    }

    fn apply_strategy_file(&mut self, sf: StrategyFile) {
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
    }
}
