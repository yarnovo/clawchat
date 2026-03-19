//! autopilot.json 配置 — 每个策略一个，由 quant 设计参数

use serde::{Deserialize, Serialize};
use std::path::Path;

/// autopilot.json 根结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopilotConfig {
    /// 策略名（与目录名一致）
    pub name: String,
    /// 是否启用自动调控
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// 仓位缩放规则
    #[serde(default)]
    pub scaling: ScalingConfig,
    /// 暂停规则（写 trade.json pause）
    #[serde(default)]
    pub pause_rules: PauseRules,
    /// 停机规则（改 signal.json status=suspended）
    #[serde(default)]
    pub suspend_rules: SuspendRules,
    /// 风控参数动态调节
    #[serde(default)]
    pub risk_tuning: RiskTuningConfig,
}

/// 仓位缩放配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalingConfig {
    /// 最小 position_size
    #[serde(default = "default_ps_min")]
    pub position_size_min: f64,
    /// 最大 position_size
    #[serde(default = "default_ps_max")]
    pub position_size_max: f64,
    /// 扩仓倍数（如 1.2 = 增加 20%）
    #[serde(default = "default_scale_up")]
    pub scale_up_factor: f64,
    /// 缩仓倍数（如 0.7 = 缩小 30%）
    #[serde(default = "default_scale_down")]
    pub scale_down_factor: f64,
    /// 连续赢 N 笔后扩仓
    #[serde(default = "default_wins_to_scale")]
    pub scale_up_after_wins: u32,
    /// 连续亏 N 笔后缩仓
    #[serde(default = "default_losses_to_scale")]
    pub scale_down_after_losses: u32,
    /// 缩放冷却期（秒），避免频繁调整
    #[serde(default = "default_scale_cooldown")]
    pub cooldown_secs: u64,
}

/// 暂停规则（触发 trade.json pause）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PauseRules {
    /// 连续亏 N 笔后暂停
    #[serde(default = "default_consecutive_losses")]
    pub consecutive_losses: u32,
    /// 单日亏损占 capital 比例超过阈值暂停
    #[serde(default = "default_daily_loss_pct")]
    pub daily_loss_pct: f64,
    /// 暂停后自动恢复时间（分钟），0 = 不自动恢复
    #[serde(default)]
    pub auto_resume_minutes: u64,
}

/// 停机规则（触发 status=suspended）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuspendRules {
    /// 总亏损占 capital 比例超过阈值停机
    #[serde(default = "default_max_total_loss")]
    pub max_total_loss_pct: f64,
    /// 持续亏损超过 N 小时停机
    #[serde(default = "default_negative_pnl_hours")]
    pub negative_pnl_hours: u64,
    /// 是否允许自动停机
    #[serde(default = "default_true")]
    pub auto_suspend: bool,
    /// 是否允许自动恢复（从 suspended 回 approved）
    #[serde(default)]
    pub auto_resume: bool,
}

/// 风控参数动态调节
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskTuningConfig {
    /// trailing_stop 最小值
    #[serde(default = "default_ts_min")]
    pub trailing_stop_min: f64,
    /// trailing_stop 最大值
    #[serde(default = "default_ts_max")]
    pub trailing_stop_max: f64,
    /// 盈利时收紧 trailing_stop
    #[serde(default = "default_true")]
    pub tighten_on_profit: bool,
    /// 亏损时放宽 trailing_stop
    #[serde(default)]
    pub widen_on_loss: bool,
}

// ── 默认值 ──────────────────────────────────────────────────────

fn default_true() -> bool { true }
fn default_ps_min() -> f64 { 0.10 }
fn default_ps_max() -> f64 { 0.50 }
fn default_scale_up() -> f64 { 1.2 }
fn default_scale_down() -> f64 { 0.7 }
fn default_wins_to_scale() -> u32 { 3 }
fn default_losses_to_scale() -> u32 { 2 }
fn default_scale_cooldown() -> u64 { 300 } // 5 分钟
fn default_consecutive_losses() -> u32 { 3 }
fn default_daily_loss_pct() -> f64 { 0.10 }
fn default_max_total_loss() -> f64 { 0.20 }
fn default_negative_pnl_hours() -> u64 { 48 }
fn default_ts_min() -> f64 { 0.01 }
fn default_ts_max() -> f64 { 0.05 }

// ── Default impls ───────────────────────────────────────────────

impl Default for ScalingConfig {
    fn default() -> Self {
        Self {
            position_size_min: default_ps_min(),
            position_size_max: default_ps_max(),
            scale_up_factor: default_scale_up(),
            scale_down_factor: default_scale_down(),
            scale_up_after_wins: default_wins_to_scale(),
            scale_down_after_losses: default_losses_to_scale(),
            cooldown_secs: default_scale_cooldown(),
        }
    }
}

impl Default for PauseRules {
    fn default() -> Self {
        Self {
            consecutive_losses: default_consecutive_losses(),
            daily_loss_pct: default_daily_loss_pct(),
            auto_resume_minutes: 0,
        }
    }
}

impl Default for SuspendRules {
    fn default() -> Self {
        Self {
            max_total_loss_pct: default_max_total_loss(),
            negative_pnl_hours: default_negative_pnl_hours(),
            auto_suspend: true,
            auto_resume: false,
        }
    }
}

impl Default for RiskTuningConfig {
    fn default() -> Self {
        Self {
            trailing_stop_min: default_ts_min(),
            trailing_stop_max: default_ts_max(),
            tighten_on_profit: true,
            widen_on_loss: false,
        }
    }
}

impl AutopilotConfig {
    /// 从 autopilot.json 文件加载
    pub fn load(path: &Path) -> Option<Self> {
        let contents = std::fs::read_to_string(path).ok()?;
        match serde_json::from_str(&contents) {
            Ok(cfg) => Some(cfg),
            Err(e) => {
                tracing::warn!("failed to parse {}: {e}", path.display());
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_minimal_config() {
        let json = r#"{"name": "test"}"#;
        let cfg: AutopilotConfig = serde_json::from_str(json).unwrap();
        assert_eq!(cfg.name, "test");
        assert!(cfg.enabled);
        assert!((cfg.scaling.position_size_min - 0.10).abs() < f64::EPSILON);
        assert_eq!(cfg.pause_rules.consecutive_losses, 3);
    }

    #[test]
    fn parse_full_config() {
        let json = r#"{
            "name": "ntrn-trend-5m",
            "enabled": true,
            "scaling": {
                "position_size_min": 0.15,
                "position_size_max": 0.40,
                "scale_up_factor": 1.3,
                "scale_down_factor": 0.6,
                "scale_up_after_wins": 4,
                "scale_down_after_losses": 3,
                "cooldown_secs": 600
            },
            "pause_rules": {
                "consecutive_losses": 5,
                "daily_loss_pct": 0.08,
                "auto_resume_minutes": 60
            },
            "suspend_rules": {
                "max_total_loss_pct": 0.15,
                "negative_pnl_hours": 24,
                "auto_suspend": true,
                "auto_resume": false
            },
            "risk_tuning": {
                "trailing_stop_min": 0.005,
                "trailing_stop_max": 0.03,
                "tighten_on_profit": true,
                "widen_on_loss": true
            }
        }"#;
        let cfg: AutopilotConfig = serde_json::from_str(json).unwrap();
        assert_eq!(cfg.scaling.scale_up_after_wins, 4);
        assert_eq!(cfg.pause_rules.consecutive_losses, 5);
        assert!(cfg.risk_tuning.widen_on_loss);
    }

    #[test]
    fn disabled_config() {
        let json = r#"{"name": "test", "enabled": false}"#;
        let cfg: AutopilotConfig = serde_json::from_str(json).unwrap();
        assert!(!cfg.enabled);
    }
}
