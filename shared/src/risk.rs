use serde::{Deserialize, Serialize};
use std::path::Path;

/// 从 strategies/{name}/risk.json 加载的风控配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RiskConfig {
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_max_loss_per_trade")]
    pub max_loss_per_trade: f64,
    #[serde(default = "default_max_profit_per_trade")]
    pub max_profit_per_trade: f64,
    #[serde(default = "default_max_daily_loss")]
    pub max_daily_loss: f64,
    #[serde(default = "default_max_drawdown_warning")]
    pub max_drawdown_warning: f64,
    #[serde(default = "default_max_drawdown_stop")]
    pub max_drawdown_stop: f64,
    #[serde(default = "default_max_position_ratio")]
    pub max_position_ratio: f64,
    #[serde(default = "default_min_liquidation_distance")]
    pub min_liquidation_distance: f64,
    #[serde(default = "default_max_leverage")]
    pub max_leverage: u32,
    #[serde(default = "default_max_concurrent_positions")]
    pub max_concurrent_positions: u32,
    #[serde(default = "default_max_hold_time_hours")]
    pub max_hold_time_hours: f64,
    #[serde(default = "default_trailing_stop")]
    pub trailing_stop: f64,
    #[serde(default = "default_max_portfolio_exposure")]
    pub max_portfolio_exposure: f64,
    #[serde(default)]
    pub funding_rate_limit: Option<f64>,
    #[serde(default)]
    pub max_unrealized_loss: Option<f64>,
}

fn default_max_loss_per_trade() -> f64 { 0.05 }
fn default_max_profit_per_trade() -> f64 { 0.10 }
fn default_max_daily_loss() -> f64 { 0.15 }
fn default_max_drawdown_warning() -> f64 { 0.20 }
fn default_max_drawdown_stop() -> f64 { 0.30 }
fn default_max_position_ratio() -> f64 { 0.30 }
fn default_min_liquidation_distance() -> f64 { 0.10 }
fn default_max_leverage() -> u32 { 20 }
fn default_max_concurrent_positions() -> u32 { 3 }
fn default_max_hold_time_hours() -> f64 { 24.0 }
fn default_trailing_stop() -> f64 { 0.02 }
fn default_max_portfolio_exposure() -> f64 { 0.80 }

impl Default for RiskConfig {
    fn default() -> Self {
        Self {
            name: String::new(),
            max_loss_per_trade: 0.05,
            max_profit_per_trade: 0.10,
            max_daily_loss: 0.15,
            max_drawdown_warning: 0.20,
            max_drawdown_stop: 0.30,
            max_position_ratio: 0.30,
            min_liquidation_distance: 0.10,
            max_leverage: 20,
            max_concurrent_positions: 3,
            max_hold_time_hours: 24.0,
            trailing_stop: 0.02,
            max_portfolio_exposure: 0.80,
            funding_rate_limit: None,
            max_unrealized_loss: None,
        }
    }
}

impl RiskConfig {
    /// 从 risk.json 文件加载，失败则返回默认值
    pub fn load(path: &Path) -> Self {
        match std::fs::read_to_string(path) {
            Ok(contents) => match serde_json::from_str::<RiskConfig>(&contents) {
                Ok(cfg) => {
                    tracing::info!("loaded risk config from {}", path.display());
                    cfg
                }
                Err(e) => {
                    tracing::warn!("failed to parse {}: {e}, using defaults", path.display());
                    Self::default()
                }
            },
            Err(_) => {
                tracing::info!("no risk.json at {}, using defaults", path.display());
                Self::default()
            }
        }
    }
}

// ── 纯函数风控检查 ─────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RiskVerdict {
    Pass,
    Block(String),
    ClosePosition(String),
}

pub fn check_stop_loss(pnl: f64, capital: f64, max_loss_per_trade: f64) -> RiskVerdict {
    if capital > 0.0 && pnl < 0.0 {
        let loss_ratio = -pnl / capital;
        if loss_ratio >= max_loss_per_trade {
            return RiskVerdict::ClosePosition(format!(
                "stop_loss: {:.2}% >= {:.2}%",
                loss_ratio * 100.0,
                max_loss_per_trade * 100.0
            ));
        }
    }
    RiskVerdict::Pass
}

pub fn check_take_profit(pnl: f64, capital: f64, max_profit_per_trade: f64) -> RiskVerdict {
    if capital > 0.0 && pnl > 0.0 {
        let profit_ratio = pnl / capital;
        if profit_ratio >= max_profit_per_trade {
            return RiskVerdict::ClosePosition(format!(
                "take_profit: {:.2}% >= {:.2}%",
                profit_ratio * 100.0,
                max_profit_per_trade * 100.0
            ));
        }
    }
    RiskVerdict::Pass
}

pub fn check_hwm_protection(pnl: f64, hwm: f64, max_drawdown_stop: f64) -> RiskVerdict {
    if pnl > 0.0 && hwm > 0.0 {
        let protection_line = hwm * (1.0 - max_drawdown_stop);
        if pnl <= protection_line {
            return RiskVerdict::ClosePosition(format!(
                "profit_protection: hwm={hwm:.4} pnl={pnl:.4} line={protection_line:.4}"
            ));
        }
    }
    RiskVerdict::Pass
}

pub fn check_position_ratio(
    notional: f64,
    total_balance: f64,
    max_position_ratio: f64,
) -> RiskVerdict {
    if total_balance > 0.0 && notional > 0.0 {
        let ratio = notional / total_balance;
        if ratio > max_position_ratio {
            return RiskVerdict::Block(format!(
                "position_ratio: {:.2}% > {:.2}%",
                ratio * 100.0,
                max_position_ratio * 100.0
            ));
        }
    }
    RiskVerdict::Pass
}

pub fn check_unrealized_loss(
    unrealized_pnl: f64,
    capital: f64,
    max_unrealized_loss: f64,
) -> RiskVerdict {
    if capital > 0.0 && unrealized_pnl < 0.0 {
        let loss_ratio = -unrealized_pnl / capital;
        if loss_ratio >= max_unrealized_loss {
            return RiskVerdict::ClosePosition(format!(
                "unrealized_loss: {:.2}% >= {:.2}%",
                loss_ratio * 100.0, max_unrealized_loss * 100.0
            ));
        }
    }
    RiskVerdict::Pass
}

/// 综合风控门
pub fn risk_gate(
    pnl: f64,
    capital: f64,
    hwm: f64,
    notional: f64,
    total_balance: f64,
    config: &RiskConfig,
) -> RiskVerdict {
    let checks = [
        check_stop_loss(pnl, capital, config.max_loss_per_trade),
        check_take_profit(pnl, capital, config.max_profit_per_trade),
        check_hwm_protection(pnl, hwm, config.max_drawdown_stop),
        check_position_ratio(notional, total_balance, config.max_position_ratio),
        config.max_unrealized_loss
            .map(|limit| check_unrealized_loss(pnl, capital, limit))
            .unwrap_or(RiskVerdict::Pass),
    ];
    for v in checks {
        if v != RiskVerdict::Pass {
            return v;
        }
    }
    RiskVerdict::Pass
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn risk_config_default_values() {
        let cfg = RiskConfig::default();
        assert!((cfg.max_loss_per_trade - 0.05).abs() < f64::EPSILON);
        assert!((cfg.max_profit_per_trade - 0.10).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.15).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 20);
        assert!(cfg.funding_rate_limit.is_none());
    }

    #[test]
    fn risk_config_load_partial_uses_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("risk.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"max_loss_per_trade": 0.02}}"#).unwrap();

        let cfg = RiskConfig::load(&path);
        assert!((cfg.max_loss_per_trade - 0.02).abs() < f64::EPSILON);
        assert!((cfg.max_profit_per_trade - 0.10).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_config_load_missing_file_uses_defaults() {
        let cfg = RiskConfig::load(Path::new("/nonexistent/risk.json"));
        assert!((cfg.max_loss_per_trade - 0.05).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_gate_stop_loss_triggers() {
        let v = check_stop_loss(-10.0, 200.0, 0.05);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_gate_stop_loss_below_threshold() {
        let v = check_stop_loss(-9.9, 200.0, 0.05);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn risk_gate_combined_all_pass() {
        let config = RiskConfig::default();
        let v = risk_gate(1.0, 200.0, 0.0, 50.0, 200.0, &config);
        assert_eq!(v, RiskVerdict::Pass);
    }

    /// 读取 strategies/ 下所有 risk.json 并验证反序列化 + roundtrip
    #[test]
    fn parse_all_risk_json_files() {
        let strategies_dir = crate::paths::strategies_dir();
        assert!(
            strategies_dir.exists(),
            "strategies/ dir not found at {}",
            strategies_dir.display()
        );

        let mut count = 0;
        for entry in std::fs::read_dir(&strategies_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path().join("risk.json");
            if !path.exists() {
                continue;
            }
            let contents = std::fs::read_to_string(&path)
                .unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
            let parsed: RiskConfig = serde_json::from_str(&contents)
                .unwrap_or_else(|e| panic!("parse {}: {e}", path.display()));

            // roundtrip
            let json = serde_json::to_string_pretty(&parsed).unwrap();
            let reparsed: RiskConfig = serde_json::from_str(&json)
                .unwrap_or_else(|e| panic!("roundtrip {}: {e}", path.display()));

            assert_eq!(parsed.name, reparsed.name, "name mismatch in {}", path.display());
            assert!(
                (parsed.max_loss_per_trade - reparsed.max_loss_per_trade).abs() < f64::EPSILON,
                "max_loss_per_trade mismatch in {}",
                path.display()
            );
            assert_eq!(
                parsed.max_leverage, reparsed.max_leverage,
                "max_leverage mismatch in {}",
                path.display()
            );
            count += 1;
        }

        assert!(count > 0, "no risk.json files found in {}", strategies_dir.display());
        eprintln!("validated {count} risk.json files");
    }
}
