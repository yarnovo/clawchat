use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::config_util::{normalize_symbol, timeframe_to_ms};
use crate::types::TradeDirection;

/// signal.json 文件结构
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StrategyFile {
    pub name: Option<String>,
    /// Engine strategy type: "scalping", "breakout", "rsi", etc.
    #[serde(alias = "engine_strategy", alias = "strategy")]
    pub engine_strategy: Option<String>,
    pub symbol: Option<String>,
    pub leverage: Option<u32>,
    pub order_qty: Option<f64>,
    pub capital: Option<f64>,
    pub position_size: Option<f64>,
    pub sizing_mode: Option<String>,
    pub timeframe_ms: Option<u64>,
    /// Timeframe string like "5m", "1h" — converted to ms
    pub timeframe: Option<String>,
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
    pub trade_direction: Option<String>,
    pub cooldown_bars: Option<u32>,
    pub min_volume: Option<f64>,
    pub min_spread_bps: Option<f64>,
    pub min_depth_usd: Option<f64>,
    /// 资金模式: "fixed"（固定金额，默认）| "percent"（按 portfolio equity 百分比）
    pub capital_mode: Option<String>,
    /// percent 模式下的百分比（如 2.0 = 2%）
    pub capital_pct: Option<f64>,
    pub status: Option<String>,
    /// 运行模式: "dry-run" (默认) | "live"
    pub mode: Option<String>,
    #[serde(default)]
    pub backtest: Option<BacktestData>,
    #[serde(default)]
    pub lifecycle: Option<LifecycleData>,
}

/// 回测数据（嵌入 signal.json）
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BacktestData {
    pub win_rate: Option<f64>,
    pub return_pct: Option<f64>,
    pub max_drawdown_pct: Option<f64>,
    pub sharpe: Option<f64>,
    pub trades: Option<u32>,
    pub profit_factor: Option<f64>,
    pub days: Option<u32>,
    pub timeframe: Option<String>,
}

/// 生命周期数据
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LifecycleData {
    pub approved_at: Option<String>,
    pub probation_at: Option<String>,
    pub active_at: Option<String>,
    pub suspended_at: Option<String>,
}

impl StrategyFile {
    /// 从文件加载
    pub fn load(path: &std::path::Path) -> Result<Self, String> {
        let contents = std::fs::read_to_string(path)
            .map_err(|e| format!("read {}: {e}", path.display()))?;
        serde_json::from_str(&contents)
            .map_err(|e| format!("parse {}: {e}", path.display()))
    }

    /// 获取归一化后的 symbol
    pub fn normalized_symbol(&self) -> Option<String> {
        self.symbol.as_ref().map(|s| normalize_symbol(s))
    }

    /// 获取 timeframe（ms）
    pub fn timeframe_ms(&self) -> Option<u64> {
        self.timeframe_ms.or_else(|| {
            self.timeframe.as_ref().and_then(|tf| timeframe_to_ms(tf))
        })
    }

    /// 提取数值参数
    pub fn numeric_params(&self) -> HashMap<String, f64> {
        self.params
            .iter()
            .filter_map(|(k, v)| v.as_f64().map(|n| (k.clone(), n)))
            .collect()
    }

    /// 是否为 dry-run 模式（默认 true）
    pub fn is_dry_run(&self) -> bool {
        self.mode.as_deref().unwrap_or("dry-run") != "live"
    }

    /// 获取交易方向
    pub fn trade_direction(&self) -> TradeDirection {
        self.trade_direction
            .as_ref()
            .map(|s| TradeDirection::from_str_lossy(s))
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 读取 strategies/ 下所有 signal.json 并验证反序列化 + roundtrip
    #[test]
    fn parse_all_strategy_json_files() {
        let strategies_dir = crate::paths::strategies_dir();
        assert!(
            strategies_dir.exists(),
            "strategies/ dir not found at {}",
            strategies_dir.display()
        );

        let mut count = 0;
        for entry in std::fs::read_dir(&strategies_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path().join("signal.json");
            if !path.exists() {
                continue;
            }
            let contents = std::fs::read_to_string(&path)
                .unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
            let parsed: StrategyFile = serde_json::from_str(&contents)
                .unwrap_or_else(|e| panic!("parse {}: {e}", path.display()));

            // roundtrip: serialize back and re-parse
            let json = serde_json::to_string_pretty(&parsed).unwrap();
            let reparsed: StrategyFile = serde_json::from_str(&json)
                .unwrap_or_else(|e| panic!("roundtrip {}: {e}", path.display()));

            // spot-check: key fields survive roundtrip
            assert_eq!(parsed.name, reparsed.name, "name mismatch in {}", path.display());
            assert_eq!(parsed.symbol, reparsed.symbol, "symbol mismatch in {}", path.display());
            assert_eq!(parsed.engine_strategy, reparsed.engine_strategy, "engine_strategy mismatch in {}", path.display());
            assert_eq!(parsed.leverage, reparsed.leverage, "leverage mismatch in {}", path.display());
            assert_eq!(parsed.status, reparsed.status, "status mismatch in {}", path.display());
            count += 1;
        }

        assert!(count > 0, "no signal.json files found in {}", strategies_dir.display());
        eprintln!("validated {count} signal.json files");
    }

    #[test]
    fn is_dry_run_defaults_to_true() {
        let sf: StrategyFile = serde_json::from_str(r#"{"params":{}}"#).unwrap();
        assert!(sf.is_dry_run());
    }

    #[test]
    fn is_dry_run_explicit_dry_run() {
        let sf: StrategyFile = serde_json::from_str(r#"{"mode":"dry-run","params":{}}"#).unwrap();
        assert!(sf.is_dry_run());
    }

    #[test]
    fn is_dry_run_live_mode() {
        let sf: StrategyFile = serde_json::from_str(r#"{"mode":"live","params":{}}"#).unwrap();
        assert!(!sf.is_dry_run());
    }

    #[test]
    fn mode_field_roundtrip() {
        let sf: StrategyFile = serde_json::from_str(r#"{"mode":"live","params":{}}"#).unwrap();
        let json = serde_json::to_string(&sf).unwrap();
        let reparsed: StrategyFile = serde_json::from_str(&json).unwrap();
        assert_eq!(sf.mode, reparsed.mode);
        assert!(!reparsed.is_dry_run());
    }

    #[test]
    fn all_signal_json_have_mode() {
        let strategies_dir = crate::paths::strategies_dir();
        if !strategies_dir.exists() {
            return;
        }
        for entry in std::fs::read_dir(&strategies_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path().join("signal.json");
            if !path.exists() {
                continue;
            }
            let sf: StrategyFile = serde_json::from_str(
                &std::fs::read_to_string(&path).unwrap()
            ).unwrap();
            assert!(
                sf.mode.is_some(),
                "signal.json missing mode field: {}",
                path.display()
            );
        }
    }
}
