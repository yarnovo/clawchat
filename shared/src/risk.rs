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

    /// 从 portfolio 默认 + 策略覆盖加载合并后的 RiskConfig
    ///
    /// 1. 加载 portfolio_path 作为基础（文件不存在则用 Default）
    /// 2. 如果 strategy_path 存在，用其中显式设置的字段覆盖基础值
    pub fn load_merged(portfolio_path: &Path, strategy_path: &Path) -> Self {
        let mut base = Self::load(portfolio_path);

        let strategy_raw = match std::fs::read_to_string(strategy_path) {
            Ok(s) => s,
            Err(_) => {
                tracing::info!("no strategy risk.json at {}, using portfolio defaults", strategy_path.display());
                return base;
            }
        };

        let overlay: serde_json::Value = match serde_json::from_str(&strategy_raw) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("failed to parse strategy risk.json {}: {e}", strategy_path.display());
                return base;
            }
        };

        let obj = match overlay.as_object() {
            Some(o) => o,
            None => return base,
        };

        // 逐字段覆盖：策略 JSON 中存在的字段覆盖组合默认值
        if let Some(v) = obj.get("name").and_then(|v| v.as_str()) {
            base.name = v.to_string();
        }
        if let Some(v) = obj.get("max_loss_per_trade").and_then(|v| v.as_f64()) {
            base.max_loss_per_trade = v;
        }
        if let Some(v) = obj.get("max_profit_per_trade").and_then(|v| v.as_f64()) {
            base.max_profit_per_trade = v;
        }
        if let Some(v) = obj.get("max_daily_loss").and_then(|v| v.as_f64()) {
            base.max_daily_loss = v;
        }
        if let Some(v) = obj.get("max_drawdown_warning").and_then(|v| v.as_f64()) {
            base.max_drawdown_warning = v;
        }
        if let Some(v) = obj.get("max_drawdown_stop").and_then(|v| v.as_f64()) {
            base.max_drawdown_stop = v;
        }
        if let Some(v) = obj.get("max_position_ratio").and_then(|v| v.as_f64()) {
            base.max_position_ratio = v;
        }
        if let Some(v) = obj.get("min_liquidation_distance").and_then(|v| v.as_f64()) {
            base.min_liquidation_distance = v;
        }
        if let Some(v) = obj.get("max_leverage").and_then(|v| v.as_u64()) {
            base.max_leverage = v as u32;
        }
        if let Some(v) = obj.get("max_concurrent_positions").and_then(|v| v.as_u64()) {
            base.max_concurrent_positions = v as u32;
        }
        if let Some(v) = obj.get("max_hold_time_hours").and_then(|v| v.as_f64()) {
            base.max_hold_time_hours = v;
        }
        if let Some(v) = obj.get("trailing_stop").and_then(|v| v.as_f64()) {
            base.trailing_stop = v;
        }
        if let Some(v) = obj.get("max_portfolio_exposure").and_then(|v| v.as_f64()) {
            base.max_portfolio_exposure = v;
        }
        if obj.contains_key("funding_rate_limit") {
            base.funding_rate_limit = obj.get("funding_rate_limit").and_then(|v| v.as_f64());
        }
        if obj.contains_key("max_unrealized_loss") {
            base.max_unrealized_loss = obj.get("max_unrealized_loss").and_then(|v| v.as_f64());
        }

        tracing::info!(
            "merged risk config: portfolio={} + strategy={}",
            portfolio_path.display(),
            strategy_path.display()
        );
        base
    }
}

/// 根据策略类型返回对应的 risk.json 模板
///
/// - trend / default: 趋势跟踪，止盈高
/// - breakout: 突破策略，止盈略低
/// - rsi: 均值回归，止盈保守，回撤更紧
pub fn risk_template_for_strategy(engine_strategy: &str) -> RiskConfig {
    match engine_strategy {
        "breakout" => RiskConfig {
            max_loss_per_trade: 0.05,
            max_profit_per_trade: 0.30,
            max_daily_loss: 0.15,
            max_leverage: 5,
            max_drawdown_stop: 0.25,
            funding_rate_limit: Some(0.001),
            ..Default::default()
        },
        "rsi" => RiskConfig {
            max_loss_per_trade: 0.05,
            max_profit_per_trade: 0.15,
            max_daily_loss: 0.12,
            max_leverage: 5,
            max_drawdown_stop: 0.20,
            funding_rate_limit: Some(0.001),
            ..Default::default()
        },
        // trend / default / 其他
        _ => RiskConfig {
            max_loss_per_trade: 0.05,
            max_profit_per_trade: 0.35,
            max_daily_loss: 0.15,
            max_leverage: 5,
            max_drawdown_stop: 0.25,
            funding_rate_limit: Some(0.001),
            ..Default::default()
        },
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

    #[test]
    fn risk_config_load_merged_overlay() {
        let dir = tempfile::tempdir().unwrap();

        // Portfolio defaults
        let portfolio_path = dir.path().join("portfolio_risk.json");
        let mut f = std::fs::File::create(&portfolio_path).unwrap();
        write!(f, r#"{{
            "max_loss_per_trade": 0.05,
            "max_daily_loss": 0.15,
            "max_leverage": 5,
            "max_portfolio_exposure": 0.80,
            "funding_rate_limit": 0.001
        }}"#).unwrap();

        // Strategy override: only change max_leverage and max_daily_loss
        let strategy_path = dir.path().join("strategy_risk.json");
        let mut f = std::fs::File::create(&strategy_path).unwrap();
        write!(f, r#"{{
            "name": "test-strat",
            "max_leverage": 10,
            "max_daily_loss": 0.10
        }}"#).unwrap();

        let cfg = RiskConfig::load_merged(&portfolio_path, &strategy_path);
        assert_eq!(cfg.name, "test-strat");
        assert_eq!(cfg.max_leverage, 10); // overridden
        assert!((cfg.max_daily_loss - 0.10).abs() < f64::EPSILON); // overridden
        assert!((cfg.max_loss_per_trade - 0.05).abs() < f64::EPSILON); // from portfolio
        assert!((cfg.max_portfolio_exposure - 0.80).abs() < f64::EPSILON); // from portfolio
        assert!((cfg.funding_rate_limit.unwrap() - 0.001).abs() < f64::EPSILON); // from portfolio
    }

    #[test]
    fn risk_config_load_merged_no_strategy_file() {
        let dir = tempfile::tempdir().unwrap();

        let portfolio_path = dir.path().join("portfolio_risk.json");
        let mut f = std::fs::File::create(&portfolio_path).unwrap();
        write!(f, r#"{{"max_leverage": 5}}"#).unwrap();

        let strategy_path = dir.path().join("nonexistent.json");
        let cfg = RiskConfig::load_merged(&portfolio_path, &strategy_path);
        assert_eq!(cfg.max_leverage, 5);
    }

    #[test]
    fn risk_template_trend() {
        let cfg = risk_template_for_strategy("default");
        assert!((cfg.max_profit_per_trade - 0.35).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.15).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 5);
        assert!((cfg.max_drawdown_stop - 0.25).abs() < f64::EPSILON);
        assert!((cfg.funding_rate_limit.unwrap() - 0.001).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_template_breakout() {
        let cfg = risk_template_for_strategy("breakout");
        assert!((cfg.max_profit_per_trade - 0.30).abs() < f64::EPSILON);
        assert!((cfg.max_drawdown_stop - 0.25).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_template_rsi() {
        let cfg = risk_template_for_strategy("rsi");
        assert!((cfg.max_profit_per_trade - 0.15).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.12).abs() < f64::EPSILON);
        assert!((cfg.max_drawdown_stop - 0.20).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_template_unknown_uses_trend() {
        let cfg = risk_template_for_strategy("some_new_type");
        assert!((cfg.max_profit_per_trade - 0.35).abs() < f64::EPSILON);
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
