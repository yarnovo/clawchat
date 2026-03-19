use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AccountConfig {
    pub name: String,
    pub exchange: String,
    pub base_url: Option<String>,
    pub total_capital: f64,
    pub api_key_env: Option<String>,
    pub api_secret_env: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PortfolioConfig {
    pub name: String,
    pub allocated_capital: f64,
    pub reserve: Option<f64>,
    pub risk: Option<PortfolioRisk>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PortfolioRisk {
    pub max_drawdown_pct: Option<f64>,
    pub max_daily_loss_pct: Option<f64>,
    pub max_total_exposure: Option<f64>,
    pub max_per_coin_exposure_pct: Option<f64>,
    /// 分级回撤：黄灯阈值（%），默认 3.0 — 降杠杆 50%
    #[serde(default)]
    pub drawdown_yellow_pct: Option<f64>,
    /// 分级回撤：橙灯阈值（%），默认 6.0 — 暂停新开仓 + 缩仓
    #[serde(default)]
    pub drawdown_orange_pct: Option<f64>,
    /// 分级回撤：红灯阈值（%），默认 10.0 — CloseAll
    #[serde(default)]
    pub drawdown_red_pct: Option<f64>,
    /// 回撤恢复阈值（%），默认 2.0 — 回撤收窄到此值以下开始恢复
    #[serde(default)]
    pub recovery_threshold_pct: Option<f64>,
}

impl AccountConfig {
    pub fn load(path: &std::path::Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("failed to parse {}: {e}", path.display()))
    }
}

impl PortfolioConfig {
    pub fn load(path: &std::path::Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("failed to parse {}: {e}", path.display()))
    }
}
