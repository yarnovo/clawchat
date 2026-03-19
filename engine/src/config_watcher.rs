//! Config file watching and hot-reload logic.
//!
//! Watches strategy directories for signal.json / risk.json / trade.json changes,
//! and portfolio directories for portfolio-level config changes.

use std::path::PathBuf;

use notify::{EventKind, RecursiveMode, Watcher};
use tokio::sync::mpsc;
use tracing::{info, warn};

// ── Config change event ────────────────────────────────────────

#[derive(Debug)]
pub enum ConfigChange {
    Strategy(String),       // strategy name — existing strategy signal.json changed
    NewStrategy(String),    // strategy dir name — new signal.json created
    Trade(String),          // strategy name
    Risk(String),           // strategy name
    PortfolioTrade,         // portfolio-level trade.json changed
    PortfolioRisk,          // portfolio-level risk.json changed
    NewPortfolio(String),   // new portfolio directory detected under portfolios/
}

// ── Config watcher ─────────────────────────────────────────────

pub fn start_config_watcher(
    portfolios_base: PathBuf,
    portfolio_dirs: Vec<PathBuf>,
    config_tx: mpsc::Sender<ConfigChange>,
) {
    std::thread::spawn(move || {
        let tx = config_tx;
        let portfolio_dirs_clone = portfolio_dirs.clone();
        let portfolios_base_clone = portfolios_base.clone();
        let mut watcher = notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                let Ok(event) = res else { return };
                let is_create = matches!(event.kind, EventKind::Create(_));
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {}
                    _ => return,
                }
                for path in &event.paths {
                    // Detect new portfolio directory under portfolios/
                    if is_create && path.parent() == Some(portfolios_base_clone.as_path()) {
                        if path.is_dir() {
                            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                                let _ = tx.blocking_send(ConfigChange::NewPortfolio(name.to_string()));
                            }
                        }
                        continue;
                    }

                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    // Check if this is a portfolio-level config change
                    let is_portfolio_level = portfolio_dirs_clone.iter().any(|pd| {
                        path.parent() == Some(pd.as_path())
                    });
                    if is_portfolio_level {
                        let change = match file_name {
                            "trade.json" => ConfigChange::PortfolioTrade,
                            "risk.json" => ConfigChange::PortfolioRisk,
                            _ => continue,
                        };
                        let _ = tx.blocking_send(change);
                        continue;
                    }

                    // Extract strategy name from parent directory
                    let strategy_name = path
                        .parent()
                        .and_then(|p| p.file_name())
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    if strategy_name.is_empty() {
                        continue;
                    }
                    let change = match file_name {
                        // New signal.json = new strategy directory detected
                        "signal.json" if is_create => ConfigChange::NewStrategy(strategy_name),
                        "signal.json" => ConfigChange::Strategy(strategy_name),
                        "trade.json" => ConfigChange::Trade(strategy_name),
                        "risk.json" => ConfigChange::Risk(strategy_name),
                        _ => continue,
                    };
                    let _ = tx.blocking_send(change);
                }
            },
        )
        .expect("failed to create config watcher");

        // Watch portfolios/ parent for new portfolio directories
        watcher
            .watch(&portfolios_base, RecursiveMode::NonRecursive)
            .unwrap_or_else(|e| warn!("failed to watch portfolios dir {}: {e}", portfolios_base.display()));

        for pdir in &portfolio_dirs {
            let strats_dir = pdir.join("strategies");
            if strats_dir.is_dir() {
                watcher
                    .watch(&strats_dir, RecursiveMode::Recursive)
                    .unwrap_or_else(|e| warn!("failed to watch {}: {e}", strats_dir.display()));
            }
            // Watch portfolio directory for portfolio-level config changes
            watcher
                .watch(pdir, RecursiveMode::NonRecursive)
                .unwrap_or_else(|e| warn!("failed to watch {}: {e}", pdir.display()));
        }

        info!(
            "config watcher started: watching {} portfolio directories + portfolios/ parent",
            portfolio_dirs.len()
        );
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    });
}
