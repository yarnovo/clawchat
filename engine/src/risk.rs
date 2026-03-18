use serde::Deserialize;
use std::path::Path;

// ── risk.json 配置（与 Python risk_guard 共用同一格式）─────────

/// 从 strategies/{name}/risk.json 加载的风控配置
#[derive(Debug, Clone, Deserialize)]
pub struct RiskConfig {
    /// 策略名
    #[serde(default)]
    pub name: String,
    /// 单笔最大亏损（占权益比例），默认 0.05 = -5%
    #[serde(default = "default_max_loss_per_trade")]
    pub max_loss_per_trade: f64,
    /// 单笔最大盈利（占权益比例），默认 0.10 = +10%
    #[serde(default = "default_max_profit_per_trade")]
    pub max_profit_per_trade: f64,
    /// 当日最大总亏损（占权益），默认 0.15 = -15%
    #[serde(default = "default_max_daily_loss")]
    pub max_daily_loss: f64,
    /// 回撤预警线，默认 0.20
    #[serde(default = "default_max_drawdown_warning")]
    pub max_drawdown_warning: f64,
    /// 回撤止损线（高水位利润保护），默认 0.30
    #[serde(default = "default_max_drawdown_stop")]
    pub max_drawdown_stop: f64,
    /// 单币种仓位占比上限，默认 0.30
    #[serde(default = "default_max_position_ratio")]
    pub max_position_ratio: f64,
    /// 最小强平距离，默认 0.10
    #[serde(default = "default_min_liquidation_distance")]
    pub min_liquidation_distance: f64,
    /// 最大杠杆，默认 20
    #[serde(default = "default_max_leverage")]
    pub max_leverage: u32,
}

fn default_max_loss_per_trade() -> f64 { 0.05 }
fn default_max_profit_per_trade() -> f64 { 0.10 }
fn default_max_daily_loss() -> f64 { 0.15 }
fn default_max_drawdown_warning() -> f64 { 0.20 }
fn default_max_drawdown_stop() -> f64 { 0.30 }
fn default_max_position_ratio() -> f64 { 0.30 }
fn default_min_liquidation_distance() -> f64 { 0.10 }
fn default_max_leverage() -> u32 { 20 }

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

// ── 引擎内置风控守卫 ─────────────────────────────────────────

/// 交易引擎内置风控 — 每笔下单前检查，跟踪当日损益
#[derive(Debug)]
pub struct EngineRiskGuard {
    pub config: RiskConfig,
    /// 当日已实现损益（USDT）
    daily_realized_pnl: f64,
    /// 当日交易笔数
    daily_trades: u32,
    /// 连续亏损笔数
    consecutive_losses: u32,
    /// 是否已停止交易
    stopped: bool,
    /// 停止原因
    stop_reason: Option<String>,
    /// 当日起始时间戳（UTC 零点）
    day_start_ts: u64,
    /// 资金基准（用于计算比例）
    capital: f64,
}

impl EngineRiskGuard {
    pub fn new(config: RiskConfig, capital: f64) -> Self {
        let day_start_ts = Self::today_start_ts();
        tracing::info!(
            capital,
            max_daily_loss = config.max_daily_loss,
            max_loss_per_trade = config.max_loss_per_trade,
            max_leverage = config.max_leverage,
            "engine risk guard initialized"
        );
        Self {
            config,
            daily_realized_pnl: 0.0,
            daily_trades: 0,
            consecutive_losses: 0,
            stopped: false,
            stop_reason: None,
            day_start_ts,
            capital,
        }
    }

    /// UTC 当日零点的 unix 毫秒时间戳
    fn today_start_ts() -> u64 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let day_secs = now - (now % 86400);
        day_secs * 1000
    }

    /// 检查是否需要重置日期（新的一天）
    fn maybe_reset_day(&mut self) {
        let today = Self::today_start_ts();
        if today > self.day_start_ts {
            tracing::info!(
                prev_pnl = self.daily_realized_pnl,
                prev_trades = self.daily_trades,
                "new trading day, resetting daily counters"
            );
            self.daily_realized_pnl = 0.0;
            self.daily_trades = 0;
            self.day_start_ts = today;
            // 日切时重置停止状态（只重置日损相关的停止）
            if self.stopped {
                if let Some(ref reason) = self.stop_reason {
                    if reason.contains("daily") {
                        self.stopped = false;
                        self.stop_reason = None;
                        tracing::info!("daily stop cleared on new day");
                    }
                }
            }
        }
    }

    /// 下单前检查：返回 Ok(()) 允许下单，Err(reason) 拒绝
    pub fn pre_trade_check(&mut self, qty: f64, leverage: u32) -> Result<(), String> {
        self.maybe_reset_day();

        // 1. 是否已停止
        if self.stopped {
            let reason = self.stop_reason.as_deref().unwrap_or("unknown");
            return Err(format!("trading stopped: {reason}"));
        }

        // 2. 杠杆检查
        if leverage > self.config.max_leverage {
            return Err(format!(
                "leverage {leverage} exceeds max {}",
                self.config.max_leverage
            ));
        }

        // 3. 当日总亏损检查
        if self.capital > 0.0 {
            let daily_loss_ratio = -self.daily_realized_pnl / self.capital;
            if daily_loss_ratio >= self.config.max_daily_loss {
                self.stopped = true;
                self.stop_reason = Some(format!(
                    "daily loss {:.2}% >= limit {:.2}%",
                    daily_loss_ratio * 100.0,
                    self.config.max_daily_loss * 100.0
                ));
                return Err(self.stop_reason.clone().unwrap());
            }
        }

        // 4. 连续亏损熔断（5 笔）
        if self.consecutive_losses >= 5 {
            self.stopped = true;
            self.stop_reason = Some(format!(
                "consecutive losses {} >= 5",
                self.consecutive_losses
            ));
            return Err(self.stop_reason.clone().unwrap());
        }

        // 5. 下单量 > 0
        if qty <= 0.0 {
            return Err("order qty must be > 0".to_string());
        }

        Ok(())
    }

    /// 记录一笔交易结果（下单后回调）
    pub fn record_trade(&mut self, pnl: f64) {
        self.daily_realized_pnl += pnl;
        self.daily_trades += 1;

        if pnl < 0.0 {
            self.consecutive_losses += 1;
            tracing::warn!(
                pnl,
                consecutive = self.consecutive_losses,
                daily_pnl = self.daily_realized_pnl,
                "trade loss recorded"
            );
        } else {
            self.consecutive_losses = 0;
            tracing::info!(
                pnl,
                daily_pnl = self.daily_realized_pnl,
                "trade profit recorded"
            );
        }

        // 检查当日总亏损
        if self.capital > 0.0 && self.daily_realized_pnl < 0.0 {
            let daily_loss_ratio = -self.daily_realized_pnl / self.capital;
            if daily_loss_ratio >= self.config.max_daily_loss {
                self.stopped = true;
                self.stop_reason = Some(format!(
                    "daily loss {:.2}% hit limit after trade",
                    daily_loss_ratio * 100.0
                ));
                tracing::error!(reason = ?self.stop_reason, "RISK: trading stopped");
            }
        }
    }

    pub fn is_stopped(&self) -> bool {
        self.stopped
    }

    pub fn stop_reason(&self) -> Option<&str> {
        self.stop_reason.as_deref()
    }

    pub fn daily_pnl(&self) -> f64 {
        self.daily_realized_pnl
    }

    pub fn daily_trades(&self) -> u32 {
        self.daily_trades
    }

    /// 手动重置（人工审核后）
    pub fn reset(&mut self) {
        self.stopped = false;
        self.stop_reason = None;
        self.consecutive_losses = 0;
        tracing::info!("engine risk guard manually reset");
    }
}

// ── 原有基础风控管理器（保留兼容）─────────────────────────────

/// 风控管理器 — 仓位限制、亏损限制、爆仓价计算、连续亏损熔断
#[derive(Debug)]
pub struct RiskManager {
    /// 总资金
    pub total_capital: f64,
    /// 最大仓位（标的数量）
    pub max_position: f64,
    /// 最大亏损比例（占总资金），默认 0.10 = 10%
    pub max_loss_pct: f64,
    /// 连续亏损 N 笔后停止交易
    pub max_consecutive_losses: u32,

    current_position: f64,
    realized_pnl: f64,
    consecutive_losses: u32,
    stopped: bool,
}

impl RiskManager {
    pub fn new(total_capital: f64, max_position: f64, max_consecutive_losses: u32) -> Self {
        Self {
            total_capital,
            max_position,
            max_loss_pct: 0.10,
            max_consecutive_losses,
            current_position: 0.0,
            realized_pnl: 0.0,
            consecutive_losses: 0,
            stopped: false,
        }
    }

    /// 检查是否允许开新仓
    pub fn can_open(&self, qty: f64) -> bool {
        if self.stopped {
            return false;
        }
        if (self.current_position + qty).abs() > self.max_position {
            return false;
        }
        if self.realized_pnl < 0.0
            && self.realized_pnl.abs() >= self.total_capital * self.max_loss_pct
        {
            return false;
        }
        true
    }

    /// 记录一笔交易结果
    pub fn record_trade(&mut self, pnl: f64, position_delta: f64) {
        self.realized_pnl += pnl;
        self.current_position += position_delta;

        if pnl < 0.0 {
            self.consecutive_losses += 1;
            if self.consecutive_losses >= self.max_consecutive_losses {
                self.stopped = true;
            }
        } else {
            self.consecutive_losses = 0;
        }

        // 亏损超限
        if self.realized_pnl < 0.0
            && self.realized_pnl.abs() >= self.total_capital * self.max_loss_pct
        {
            self.stopped = true;
        }
    }

    /// 计算爆仓价（期货简化模型）
    ///
    /// - `entry_price`: 开仓均价
    /// - `position`: 持仓量（正=多, 负=空）
    /// - `margin`: 保证金余额
    /// - `maint_margin_rate`: 维持保证金率 (如 0.005 = 0.5%)
    pub fn liquidation_price(
        entry_price: f64,
        position: f64,
        margin: f64,
        maint_margin_rate: f64,
    ) -> f64 {
        if position.abs() < f64::EPSILON {
            return 0.0;
        }
        if position > 0.0 {
            // 多仓: entry - margin/qty + entry * maint_rate
            entry_price - margin / position + entry_price * maint_margin_rate
        } else {
            // 空仓: entry + margin/|qty| - entry * maint_rate
            entry_price + margin / position.abs() - entry_price * maint_margin_rate
        }
    }

    pub fn is_stopped(&self) -> bool {
        self.stopped
    }

    /// 手动重置（人工审核后恢复交易）
    pub fn reset(&mut self) {
        self.consecutive_losses = 0;
        self.stopped = false;
    }

    pub fn pnl(&self) -> f64 {
        self.realized_pnl
    }

    pub fn position(&self) -> f64 {
        self.current_position
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn position_limit() {
        let rm = RiskManager::new(100_000.0, 10.0, 5);
        assert!(rm.can_open(10.0));
        assert!(!rm.can_open(10.1));
    }

    #[test]
    fn max_loss_stops_trading() {
        let mut rm = RiskManager::new(100_000.0, 100.0, 100);
        rm.record_trade(-10_000.0, 0.0);
        assert!(!rm.can_open(1.0));
        assert!(rm.is_stopped());
    }

    #[test]
    fn consecutive_losses_stops_trading() {
        let mut rm = RiskManager::new(100_000.0, 100.0, 3);
        rm.record_trade(-10.0, 0.0);
        rm.record_trade(-10.0, 0.0);
        assert!(!rm.is_stopped());
        rm.record_trade(-10.0, 0.0);
        assert!(rm.is_stopped());
        assert!(!rm.can_open(1.0));
    }

    #[test]
    fn win_resets_consecutive_count() {
        let mut rm = RiskManager::new(100_000.0, 100.0, 3);
        rm.record_trade(-10.0, 0.0);
        rm.record_trade(-10.0, 0.0);
        rm.record_trade(50.0, 0.0);
        rm.record_trade(-10.0, 0.0);
        rm.record_trade(-10.0, 0.0);
        assert!(!rm.is_stopped());
    }

    #[test]
    fn liquidation_price_long() {
        let liq = RiskManager::liquidation_price(50_000.0, 1.0, 5_000.0, 0.005);
        // 50000 - 5000 + 250 = 45250
        assert!((liq - 45_250.0).abs() < 1e-9);
    }

    #[test]
    fn liquidation_price_short() {
        let liq = RiskManager::liquidation_price(50_000.0, -1.0, 5_000.0, 0.005);
        // 50000 + 5000 - 250 = 54750
        assert!((liq - 54_750.0).abs() < 1e-9);
    }

    #[test]
    fn reset_allows_resuming() {
        let mut rm = RiskManager::new(100_000.0, 100.0, 2);
        rm.record_trade(-10.0, 0.0);
        rm.record_trade(-10.0, 0.0);
        assert!(rm.is_stopped());
        rm.reset();
        assert!(!rm.is_stopped());
        assert!(rm.can_open(1.0));
    }
}
