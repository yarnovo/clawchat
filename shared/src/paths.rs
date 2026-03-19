use std::path::{Path, PathBuf};

/// Find the project root by walking up from the executable or current dir
/// looking for a directory that contains `accounts/`
pub fn project_root() -> PathBuf {
    // Try from current directory
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if let Some(root) = find_root_from(&cwd) {
        return root;
    }
    // Try from executable location
    if let Ok(exe) = std::env::current_exe() {
        if let Some(root) = find_root_from(&exe) {
            return root;
        }
    }
    cwd
}

fn find_root_from(start: &Path) -> Option<PathBuf> {
    let mut dir = start.to_path_buf();
    for _ in 0..10 {
        if dir.join("accounts").is_dir() {
            return Some(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

// --- Core directory hierarchy ---

pub fn accounts_dir() -> PathBuf {
    project_root().join("accounts")
}

pub fn account_dir(account: &str) -> PathBuf {
    accounts_dir().join(account)
}

pub fn portfolio_dir(account: &str, portfolio: &str) -> PathBuf {
    account_dir(account).join("portfolios").join(portfolio)
}

/// Default strategies dir: accounts/binance-main/portfolios/main/strategies/
/// This is the most commonly used shortcut across the codebase.
pub fn strategies_dir() -> PathBuf {
    portfolio_dir("binance-main", "main").join("strategies")
}

pub fn strategy_dir(name: &str) -> PathBuf {
    strategies_dir().join(name)
}

pub fn records_dir() -> PathBuf {
    project_root().join("records")
}

pub fn reports_dir() -> PathBuf {
    project_root().join("reports")
}

pub fn logs_dir() -> PathBuf {
    project_root().join("logs")
}

pub fn data_dir() -> PathBuf {
    project_root().join("data")
}

/// 配置目录: config/
pub fn config_dir() -> PathBuf {
    project_root().join("config")
}

/// 策略暂存区：发现引擎产出 pending 策略到此目录
pub fn discovered_dir() -> PathBuf {
    project_root().join("discovered")
}

pub fn engine_bin() -> PathBuf {
    project_root().join("engine/target/release/hft-engine")
}

/// 币种注册表: config/symbols.json
pub fn symbols_json(_account: &str) -> PathBuf {
    config_dir().join("symbols.json")
}

/// 默认 symbols.json: config/symbols.json
pub fn default_symbols_json() -> PathBuf {
    config_dir().join("symbols.json")
}

/// 运维级调度配置: config/schedule.json
pub fn schedule_json() -> PathBuf {
    config_dir().join("schedule.json")
}
