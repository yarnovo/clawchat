use clap::Parser;

#[derive(Parser, Debug, Clone)]
#[command(name = "hft-engine", about = "High-frequency trading engine for Binance futures")]
pub struct Config {
    /// Trading symbol (e.g. BTCUSDT)
    #[arg(long, env = "SYMBOL", default_value = "BTCUSDT")]
    pub symbol: String,

    /// Leverage multiplier
    #[arg(long, env = "LEVERAGE", default_value_t = 10)]
    pub leverage: u32,

    /// Strategy name
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
}

impl Config {
    /// Load config from .env file (if present), then parse CLI args + env vars.
    pub fn load() -> Self {
        let _ = dotenvy::dotenv(); // silently ignore if .env doesn't exist
        Self::parse()
    }
}
