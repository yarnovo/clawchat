use serde::Deserialize;
use std::path::Path;

// ── risk.json 配置 ──────────────────────────────────────────────

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
    /// 最大同时持仓数，默认 3
    #[serde(default = "default_max_concurrent_positions")]
    pub max_concurrent_positions: u32,
    /// 持仓超时强制平仓（小时），默认 24
    #[serde(default = "default_max_hold_time_hours")]
    pub max_hold_time_hours: f64,
    /// 移动止损百分比（价格新高后回撤此比例平仓），默认 0.02 = 2%
    #[serde(default = "default_trailing_stop")]
    pub trailing_stop: f64,
    /// 所有策略总仓位不超过权益的百分比，默认 0.80 = 80%
    #[serde(default = "default_max_portfolio_exposure")]
    pub max_portfolio_exposure: f64,
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

    /// 手动重置（人工审核后）— 清除所有日内计数器
    pub fn reset(&mut self) {
        self.stopped = false;
        self.stop_reason = None;
        self.consecutive_losses = 0;
        self.daily_realized_pnl = 0.0;
        self.daily_trades = 0;
        tracing::info!("engine risk guard manually reset");
    }
}

// ── RiskGate: 纯函数风控检查 ─────────────────────────────────
// 从 risk_engine.rs 提取的核心检查逻辑，不涉及 IO，可在 hft-engine 内使用

/// RiskGate 检查结果
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RiskVerdict {
    /// 允许信号通过
    Pass,
    /// 拦截信号，附带原因
    Block(String),
    /// 需要平仓，附带原因
    ClosePosition(String),
}

/// 纯函数：检查单笔止损
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

/// 纯函数：检查单笔止盈
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

/// 纯函数：检查高水位利润保护
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

/// 纯函数：检查仓位占比
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

/// 综合风控门：依次检查止损/止盈/高水位/仓位占比
/// 返回第一个非 Pass 的结果，全部通过返回 Pass
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
    ];
    for v in checks {
        if v != RiskVerdict::Pass {
            return v;
        }
    }
    RiskVerdict::Pass
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
    use std::io::Write;

    // ══════════════════════════════════════════════════════════════
    // RiskConfig 解析测试
    // ══════════════════════════════════════════════════════════════

    #[test]
    fn risk_config_default_values() {
        let cfg = RiskConfig::default();
        assert!((cfg.max_loss_per_trade - 0.05).abs() < f64::EPSILON);
        assert!((cfg.max_profit_per_trade - 0.10).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.15).abs() < f64::EPSILON);
        assert!((cfg.max_drawdown_warning - 0.20).abs() < f64::EPSILON);
        assert!((cfg.max_drawdown_stop - 0.30).abs() < f64::EPSILON);
        assert!((cfg.max_position_ratio - 0.30).abs() < f64::EPSILON);
        assert!((cfg.min_liquidation_distance - 0.10).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 20);
        assert_eq!(cfg.max_concurrent_positions, 3);
        assert!((cfg.max_hold_time_hours - 24.0).abs() < f64::EPSILON);
        assert!((cfg.trailing_stop - 0.02).abs() < f64::EPSILON);
        assert!((cfg.max_portfolio_exposure - 0.80).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_config_load_full_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("risk.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{
            "name": "test-strategy",
            "max_loss_per_trade": 0.03,
            "max_profit_per_trade": 0.08,
            "max_daily_loss": 0.10,
            "max_drawdown_warning": 0.15,
            "max_drawdown_stop": 0.25,
            "max_position_ratio": 0.40,
            "min_liquidation_distance": 0.15,
            "max_leverage": 10,
            "max_concurrent_positions": 5,
            "max_hold_time_hours": 48,
            "trailing_stop": 0.03,
            "max_portfolio_exposure": 0.60
        }}"#).unwrap();

        let cfg = RiskConfig::load(&path);
        assert_eq!(cfg.name, "test-strategy");
        assert!((cfg.max_loss_per_trade - 0.03).abs() < f64::EPSILON);
        assert!((cfg.max_profit_per_trade - 0.08).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.10).abs() < f64::EPSILON);
        assert!((cfg.max_drawdown_stop - 0.25).abs() < f64::EPSILON);
        assert!((cfg.max_position_ratio - 0.40).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 10);
        assert_eq!(cfg.max_concurrent_positions, 5);
        assert!((cfg.max_hold_time_hours - 48.0).abs() < f64::EPSILON);
        assert!((cfg.trailing_stop - 0.03).abs() < f64::EPSILON);
        assert!((cfg.max_portfolio_exposure - 0.60).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_config_load_partial_uses_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("risk.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"max_loss_per_trade": 0.02}}"#).unwrap();

        let cfg = RiskConfig::load(&path);
        assert!((cfg.max_loss_per_trade - 0.02).abs() < f64::EPSILON);
        // All other fields should be defaults
        assert!((cfg.max_profit_per_trade - 0.10).abs() < f64::EPSILON);
        assert!((cfg.max_daily_loss - 0.15).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 20);
        // New fields default when missing
        assert_eq!(cfg.max_concurrent_positions, 3);
        assert!((cfg.max_hold_time_hours - 24.0).abs() < f64::EPSILON);
        assert!((cfg.trailing_stop - 0.02).abs() < f64::EPSILON);
        assert!((cfg.max_portfolio_exposure - 0.80).abs() < f64::EPSILON);
    }

    #[test]
    fn risk_config_load_missing_file_uses_defaults() {
        let path = std::path::Path::new("/nonexistent/risk.json");
        let cfg = RiskConfig::load(path);
        assert!((cfg.max_loss_per_trade - 0.05).abs() < f64::EPSILON);
        assert_eq!(cfg.max_leverage, 20);
    }

    // ══════════════════════════════════════════════════════════════
    // EngineRiskGuard pre-trade check 测试
    // ══════════════════════════════════════════════════════════════

    fn guard_with_defaults(capital: f64) -> EngineRiskGuard {
        EngineRiskGuard::new(RiskConfig::default(), capital)
    }

    #[test]
    fn pre_trade_check_normal_pass() {
        let mut guard = guard_with_defaults(200.0);
        assert!(guard.pre_trade_check(100.0, 5).is_ok());
    }

    #[test]
    fn pre_trade_check_zero_qty_rejected() {
        let mut guard = guard_with_defaults(200.0);
        let err = guard.pre_trade_check(0.0, 5).unwrap_err();
        assert!(err.contains("qty must be > 0"));
    }

    #[test]
    fn pre_trade_check_leverage_exceeded() {
        let mut guard = guard_with_defaults(200.0);
        let err = guard.pre_trade_check(100.0, 25).unwrap_err();
        assert!(err.contains("leverage 25 exceeds max 20"));
    }

    #[test]
    fn pre_trade_check_custom_leverage_limit() {
        let mut cfg = RiskConfig::default();
        cfg.max_leverage = 5;
        let mut guard = EngineRiskGuard::new(cfg, 200.0);
        assert!(guard.pre_trade_check(100.0, 5).is_ok());
        let err = guard.pre_trade_check(100.0, 6).unwrap_err();
        assert!(err.contains("leverage 6 exceeds max 5"));
    }

    #[test]
    fn pre_trade_check_daily_loss_limit() {
        let mut guard = guard_with_defaults(200.0);
        // max_daily_loss default = 0.15 = $30 on $200 capital
        guard.record_trade(-30.0); // exactly at limit
        let err = guard.pre_trade_check(100.0, 5).unwrap_err();
        assert!(err.contains("daily loss"));
    }

    #[test]
    fn pre_trade_check_daily_loss_under_limit() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-29.0); // just under 15%
        assert!(guard.pre_trade_check(100.0, 5).is_ok());
    }

    #[test]
    fn pre_trade_check_consecutive_losses_circuit_breaker() {
        let mut guard = guard_with_defaults(10_000.0); // large capital so daily loss doesn't trigger
        for _ in 0..5 {
            guard.record_trade(-1.0);
        }
        let err = guard.pre_trade_check(100.0, 5).unwrap_err();
        assert!(err.contains("consecutive losses"));
    }

    #[test]
    fn pre_trade_check_win_resets_consecutive() {
        let mut guard = guard_with_defaults(10_000.0);
        guard.record_trade(-1.0);
        guard.record_trade(-1.0);
        guard.record_trade(-1.0);
        guard.record_trade(-1.0);
        guard.record_trade(10.0); // win resets counter
        guard.record_trade(-1.0);
        assert!(guard.pre_trade_check(100.0, 5).is_ok());
    }

    #[test]
    fn pre_trade_check_stopped_rejects() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-31.0); // triggers daily stop
        assert!(guard.is_stopped());
        let err = guard.pre_trade_check(100.0, 5).unwrap_err();
        assert!(err.contains("trading stopped"));
    }

    #[test]
    fn engine_risk_guard_reset() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-31.0);
        assert!(guard.is_stopped());
        guard.reset();
        assert!(!guard.is_stopped());
        assert!(guard.pre_trade_check(100.0, 5).is_ok());
    }

    #[test]
    fn engine_risk_guard_daily_pnl_tracking() {
        let mut guard = guard_with_defaults(1000.0);
        guard.record_trade(10.0);
        guard.record_trade(-3.0);
        guard.record_trade(5.0);
        assert!((guard.daily_pnl() - 12.0).abs() < f64::EPSILON);
        assert_eq!(guard.daily_trades(), 3);
    }

    // ══════════════════════════════════════════════════════════════
    // RiskGate 纯函数风控测试
    // ══════════════════════════════════════════════════════════════

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
    fn risk_gate_take_profit_triggers() {
        let v = check_take_profit(20.0, 200.0, 0.10);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_gate_take_profit_below_threshold() {
        let v = check_take_profit(19.9, 200.0, 0.10);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn risk_gate_hwm_triggers() {
        // hwm = $20, max_drawdown_stop = 0.30 → protection_line = $14
        // pnl = $14 → should trigger
        let v = check_hwm_protection(14.0, 20.0, 0.30);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_gate_hwm_does_not_trigger() {
        // pnl = $15 → above protection line
        let v = check_hwm_protection(15.0, 20.0, 0.30);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn risk_gate_hwm_exact_boundary() {
        // pnl = $14.01 → just above, should NOT trigger
        let v = check_hwm_protection(14.01, 20.0, 0.30);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn risk_gate_hwm_deep_drawdown() {
        let v = check_hwm_protection(5.0, 20.0, 0.30);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_gate_position_ratio_triggers() {
        // notional=400, balance=1000, limit=0.30 → ratio=40% > 30%
        let v = check_position_ratio(400.0, 1000.0, 0.30);
        assert!(matches!(v, RiskVerdict::Block(_)));
    }

    #[test]
    fn risk_gate_position_ratio_within_limit() {
        // notional=200, balance=1000, limit=0.30 → ratio=20% < 30%
        let v = check_position_ratio(200.0, 1000.0, 0.30);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn risk_gate_combined_first_fail_wins() {
        let config = RiskConfig::default();
        // pnl = -10, capital = 200 → loss 5% = stop_loss triggers first
        let v = risk_gate(-10.0, 200.0, 0.0, 0.0, 200.0, &config);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_gate_combined_all_pass() {
        let config = RiskConfig::default();
        // small positive pnl, no hwm, small notional
        let v = risk_gate(1.0, 200.0, 0.0, 50.0, 200.0, &config);
        assert_eq!(v, RiskVerdict::Pass);
    }

    // ══════════════════════════════════════════════════════════════
    // Legacy risk rule tests (via risk_gate)
    // ══════════════════════════════════════════════════════════════

    #[test]
    fn risk_stop_loss_triggers() {
        let risk = RiskConfig::default();
        let result = risk_gate(-10.0, 200.0, 0.0, 0.0, 200.0, &risk);
        assert!(matches!(result, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_stop_loss_below_threshold() {
        let risk = RiskConfig::default();
        let result = risk_gate(-9.9, 200.0, 0.0, 0.0, 200.0, &risk);
        assert_eq!(result, RiskVerdict::Pass);
    }

    #[test]
    fn risk_take_profit_triggers() {
        let risk = RiskConfig::default();
        let result = risk_gate(20.0, 200.0, 0.0, 0.0, 200.0, &risk);
        assert!(matches!(result, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_take_profit_below_threshold() {
        let risk = RiskConfig::default();
        let result = risk_gate(19.9, 200.0, 0.0, 0.0, 200.0, &risk);
        assert_eq!(result, RiskVerdict::Pass);
    }

    #[test]
    fn risk_hwm_protection_triggers() {
        let risk = RiskConfig::default();
        let result = risk_gate(14.0, 200.0, 20.0, 0.0, 200.0, &risk);
        assert!(matches!(result, RiskVerdict::ClosePosition(_)));
    }

    #[test]
    fn risk_hwm_protection_does_not_trigger() {
        let risk = RiskConfig::default();
        let result = risk_gate(15.0, 200.0, 20.0, 0.0, 200.0, &risk);
        assert_eq!(result, RiskVerdict::Pass);
    }

    #[test]
    fn risk_hwm_protection_exact_boundary() {
        let risk = RiskConfig::default();
        let result = risk_gate(14.01, 200.0, 20.0, 0.0, 200.0, &risk);
        assert_eq!(result, RiskVerdict::Pass);
    }

    #[test]
    fn risk_hwm_protection_deep_drawdown() {
        let risk = RiskConfig::default();
        let result = risk_gate(5.0, 200.0, 20.0, 0.0, 200.0, &risk);
        assert!(matches!(result, RiskVerdict::ClosePosition(_)));
    }

    // ══════════════════════════════════════════════════════════════
    // 原有 RiskManager 测试
    // ══════════════════════════════════════════════════════════════

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
