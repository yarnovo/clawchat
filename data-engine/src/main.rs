mod backfill;
mod collector;
mod validator;

use std::path::PathBuf;

use clap::{Parser, Subcommand};
use tracing::info;

use clawchat_shared::config_util::timeframe_to_ms;
use clawchat_shared::data::DataStore;
use clawchat_shared::exchange::Exchange;
use clawchat_shared::paths;
use clawchat_shared::symbols::SymbolRegistry;

#[derive(Parser)]
#[command(name = "data-engine", about = "ClawChat data engine — backfill & realtime collection")]
struct Cli {
    #[command(subcommand)]
    command: Command,

    /// Data directory (default: <project_root>/data)
    #[arg(long, global = true)]
    data_dir: Option<PathBuf>,

    /// Comma-separated symbol list (overrides defaults)
    #[arg(long, global = true, value_delimiter = ',')]
    symbols: Option<Vec<String>>,
}

#[derive(Subcommand)]
enum Command {
    /// Start realtime kline collection (WS)
    Run,
    /// Backfill historical kline data
    Backfill {
        /// Number of days to backfill
        #[arg(long, default_value = "180")]
        days: u32,
        /// Intervals to backfill (comma-separated)
        #[arg(long, default_value = "1m", value_delimiter = ',')]
        intervals: Vec<String>,
    },
    /// Show data status for all symbols
    Status,
    /// Validate data quality
    Validate {
        /// Validate only this symbol
        #[arg(long)]
        symbol: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let cli = Cli::parse();

    let data_dir = cli.data_dir.unwrap_or_else(paths::data_dir);
    std::fs::create_dir_all(&data_dir)?;

    let symbols: Vec<String> = cli.symbols.unwrap_or_else(|| {
        // 从 config/symbols.json 读取可采集数据的币种
        let symbols_path = paths::default_symbols_json();
        if symbols_path.exists() {
            if let Ok(registry) = SymbolRegistry::load(&symbols_path) {
                let syms = registry.data_symbols();
                if !syms.is_empty() {
                    info!(count = syms.len(), "loaded symbols from config/symbols.json");
                    return syms;
                }
            }
        }
        info!("config/symbols.json not found or empty, using hardcoded defaults");
        vec![
            "BARDUSDT".into(), "NTRNUSDT".into(), "FETUSDT".into(),
            "SUIUSDT".into(), "LYNUSDT".into(),
        ]
    });

    let store = DataStore::new(&data_dir);

    match cli.command {
        Command::Run => {
            let api_key = std::env::var("BINANCE_API_KEY").unwrap_or_default();
            let api_secret = std::env::var("BINANCE_API_SECRET").unwrap_or_default();
            let base_url = std::env::var("BINANCE_BASE_URL")
                .unwrap_or_else(|_| "https://fapi.binance.com".to_string());

            let exchange = Exchange::new(api_key, api_secret, base_url, true);

            let intervals = vec!["1m".to_string()];

            info!(
                symbols = ?symbols,
                intervals = ?intervals,
                data_dir = %data_dir.display(),
                "starting realtime collection"
            );

            let symbols_json_path = paths::default_symbols_json();
            let watch_path = if symbols_json_path.exists() {
                Some(symbols_json_path.as_path())
            } else {
                None
            };

            collector::run_collector(&exchange, &store, &symbols, &intervals, watch_path).await?;
        }
        Command::Backfill { days, intervals } => {
            let api_key = std::env::var("BINANCE_API_KEY").unwrap_or_default();
            let api_secret = std::env::var("BINANCE_API_SECRET").unwrap_or_default();
            let base_url = std::env::var("BINANCE_BASE_URL")
                .unwrap_or_else(|_| "https://fapi.binance.com".to_string());

            let exchange = Exchange::new(api_key, api_secret, base_url, true);

            info!(
                symbols = ?symbols,
                intervals = ?intervals,
                days,
                data_dir = %data_dir.display(),
                "starting backfill"
            );

            backfill::run_backfill(&exchange, &store, &symbols, &intervals, days).await?;
        }
        Command::Status => {
            print_status(&store, &symbols)?;
        }
        Command::Validate { symbol } => {
            let targets: Vec<String> = match symbol {
                Some(s) => vec![s],
                None => store.list_symbols(),
            };
            run_validate(&store, &targets);
        }
    }

    Ok(())
}

fn print_status(store: &DataStore, symbols: &[String]) -> Result<(), Box<dyn std::error::Error>> {
    use chrono::{TimeZone, Utc};

    let all_symbols = store.list_symbols();

    if all_symbols.is_empty() {
        println!("No data found.");
        println!("\nExpected symbols: {}", symbols.join(", "));
        println!("Run `data-engine backfill --days 180` to fetch historical data.");
        return Ok(());
    }

    println!("{:<14} {:<6} {:<24} {:<24}", "SYMBOL", "INTV", "FROM", "TO");
    println!("{}", "-".repeat(72));

    for symbol in &all_symbols {
        for interval in store.list_intervals(symbol) {
            match store.available_range(symbol, &interval) {
                Some((min_ts, max_ts)) => {
                    let from = Utc.timestamp_millis_opt(min_ts as i64).unwrap();
                    let to = Utc.timestamp_millis_opt(max_ts as i64).unwrap();
                    println!(
                        "{:<14} {:<6} {:<24} {:<24}",
                        symbol,
                        interval,
                        from.format("%Y-%m-%d %H:%M"),
                        to.format("%Y-%m-%d %H:%M"),
                    );
                }
                None => {
                    println!("{:<14} {:<6} (no data)", symbol, interval);
                }
            }
        }
    }

    Ok(())
}

fn run_validate(store: &DataStore, symbols: &[String]) {
    if symbols.is_empty() {
        println!("No data found to validate.");
        return;
    }

    for symbol in symbols {
        for interval in store.list_intervals(symbol) {
            let interval_ms = match timeframe_to_ms(&interval) {
                Some(ms) => ms,
                None => {
                    println!("Skipping {symbol} {interval} (unknown interval)");
                    continue;
                }
            };

            let candles = match store.read_candles(symbol, &interval, None, None) {
                Ok(c) => c,
                Err(e) => {
                    println!("Error reading {symbol} {interval}: {e}");
                    continue;
                }
            };

            println!("Validating {symbol} {interval}... {} candles", candles.len());
            let issues = validator::validate_candles(&candles, interval_ms);
            println!("{}", validator::validation_summary(&issues));
        }
    }
}

