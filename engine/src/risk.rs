// Re-export shared risk types and pure functions
pub use clawchat_shared::risk::{
    check_hwm_protection, check_position_ratio, check_stop_loss, check_take_profit,
    check_unrealized_loss, risk_gate, RiskConfig, RiskVerdict,
};

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
    ///
    /// - `is_long`: true = 做多（buy），false = 做空（sell）
    /// - `current_funding_rate`: 当前资金费率（从 MarkPrice 事件获取）
    pub fn pre_trade_check(
        &mut self,
        qty: f64,
        leverage: u32,
        is_long: bool,
        current_funding_rate: f64,
    ) -> Result<(), String> {
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

        // 6. 资金费率检查：做多时 funding > limit 拒绝，做空时 funding < -limit 拒绝
        if let Some(limit) = self.config.funding_rate_limit {
            if is_long && current_funding_rate > limit {
                return Err(format!(
                    "funding rate {current_funding_rate:.6} > limit {limit:.6}, long blocked"
                ));
            }
            if !is_long && current_funding_rate < -limit {
                return Err(format!(
                    "funding rate {current_funding_rate:.6} < -{limit:.6}, short blocked"
                ));
            }
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
        assert!(cfg.funding_rate_limit.is_none());
        assert!(cfg.max_unrealized_loss.is_none());
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
            "max_portfolio_exposure": 0.60,
            "funding_rate_limit": 0.001,
            "max_unrealized_loss": 0.05
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
        assert!((cfg.funding_rate_limit.unwrap() - 0.001).abs() < f64::EPSILON);
        assert!((cfg.max_unrealized_loss.unwrap() - 0.05).abs() < f64::EPSILON);
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
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0).is_ok());
    }

    #[test]
    fn pre_trade_check_zero_qty_rejected() {
        let mut guard = guard_with_defaults(200.0);
        let err = guard.pre_trade_check(0.0, 5, true, 0.0).unwrap_err();
        assert!(err.contains("qty must be > 0"));
    }

    #[test]
    fn pre_trade_check_leverage_exceeded() {
        let mut guard = guard_with_defaults(200.0);
        let err = guard.pre_trade_check(100.0, 25, true, 0.0).unwrap_err();
        assert!(err.contains("leverage 25 exceeds max 20"));
    }

    #[test]
    fn pre_trade_check_custom_leverage_limit() {
        let mut cfg = RiskConfig::default();
        cfg.max_leverage = 5;
        let mut guard = EngineRiskGuard::new(cfg, 200.0);
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0).is_ok());
        let err = guard.pre_trade_check(100.0, 6, true, 0.0).unwrap_err();
        assert!(err.contains("leverage 6 exceeds max 5"));
    }

    #[test]
    fn pre_trade_check_daily_loss_limit() {
        let mut guard = guard_with_defaults(200.0);
        // max_daily_loss default = 0.15 = $30 on $200 capital
        guard.record_trade(-30.0); // exactly at limit
        let err = guard.pre_trade_check(100.0, 5, true, 0.0).unwrap_err();
        assert!(err.contains("daily loss"));
    }

    #[test]
    fn pre_trade_check_daily_loss_under_limit() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-29.0); // just under 15%
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0).is_ok());
    }

    #[test]
    fn pre_trade_check_consecutive_losses_circuit_breaker() {
        let mut guard = guard_with_defaults(10_000.0); // large capital so daily loss doesn't trigger
        for _ in 0..5 {
            guard.record_trade(-1.0);
        }
        let err = guard.pre_trade_check(100.0, 5, true, 0.0).unwrap_err();
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
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0).is_ok());
    }

    #[test]
    fn pre_trade_check_stopped_rejects() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-31.0); // triggers daily stop
        assert!(guard.is_stopped());
        let err = guard.pre_trade_check(100.0, 5, true, 0.0).unwrap_err();
        assert!(err.contains("trading stopped"));
    }

    #[test]
    fn engine_risk_guard_reset() {
        let mut guard = guard_with_defaults(200.0);
        guard.record_trade(-31.0);
        assert!(guard.is_stopped());
        guard.reset();
        assert!(!guard.is_stopped());
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0).is_ok());
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
    // funding_rate_limit 测试
    // ══════════════════════════════════════════════════════════════

    fn guard_with_funding_limit(limit: f64) -> EngineRiskGuard {
        let mut cfg = RiskConfig::default();
        cfg.funding_rate_limit = Some(limit);
        EngineRiskGuard::new(cfg, 1000.0)
    }

    #[test]
    fn funding_rate_long_blocked_when_high() {
        let mut guard = guard_with_funding_limit(0.001);
        let err = guard.pre_trade_check(100.0, 5, true, 0.002).unwrap_err();
        assert!(err.contains("funding rate"));
        assert!(err.contains("long blocked"));
    }

    #[test]
    fn funding_rate_long_allowed_when_low() {
        let mut guard = guard_with_funding_limit(0.001);
        assert!(guard.pre_trade_check(100.0, 5, true, 0.0005).is_ok());
    }

    #[test]
    fn funding_rate_long_allowed_when_negative() {
        let mut guard = guard_with_funding_limit(0.001);
        assert!(guard.pre_trade_check(100.0, 5, true, -0.002).is_ok());
    }

    #[test]
    fn funding_rate_short_blocked_when_very_negative() {
        let mut guard = guard_with_funding_limit(0.001);
        let err = guard.pre_trade_check(100.0, 5, false, -0.002).unwrap_err();
        assert!(err.contains("funding rate"));
        assert!(err.contains("short blocked"));
    }

    #[test]
    fn funding_rate_short_allowed_when_positive() {
        let mut guard = guard_with_funding_limit(0.001);
        assert!(guard.pre_trade_check(100.0, 5, false, 0.002).is_ok());
    }

    #[test]
    fn funding_rate_short_allowed_when_within_limit() {
        let mut guard = guard_with_funding_limit(0.001);
        assert!(guard.pre_trade_check(100.0, 5, false, -0.0005).is_ok());
    }

    #[test]
    fn funding_rate_no_limit_always_passes() {
        let mut guard = guard_with_defaults(1000.0);
        // No funding_rate_limit set (None), should pass even with extreme rates
        assert!(guard.pre_trade_check(100.0, 5, true, 0.05).is_ok());
        assert!(guard.pre_trade_check(100.0, 5, false, -0.05).is_ok());
    }

    #[test]
    fn funding_rate_exact_boundary_allowed() {
        let mut guard = guard_with_funding_limit(0.001);
        // Exactly at the limit should pass (> not >=)
        assert!(guard.pre_trade_check(100.0, 5, true, 0.001).is_ok());
        assert!(guard.pre_trade_check(100.0, 5, false, -0.001).is_ok());
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

    // ── check_unrealized_loss ──────────────────────────────────

    #[test]
    fn unrealized_loss_none_skips_check() {
        // max_unrealized_loss = None → risk_gate should pass
        let config = RiskConfig::default(); // None by default
        let _v = risk_gate(-50.0, 200.0, 0.0, 0.0, 200.0, &config);
        // stop_loss triggers first at 25%, but unrealized_loss itself is not the cause
        // Test the pure function directly: None means no check
        // (risk_gate handles None via unwrap_or(Pass))
        assert_eq!(
            config.max_unrealized_loss
                .map(|limit| check_unrealized_loss(-50.0, 200.0, limit))
                .unwrap_or(RiskVerdict::Pass),
            RiskVerdict::Pass
        );
    }

    #[test]
    fn unrealized_loss_below_threshold_passes() {
        // 4% loss < 5% threshold → Pass
        let v = check_unrealized_loss(-8.0, 200.0, 0.05);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn unrealized_loss_at_threshold_triggers() {
        // 5% loss >= 5% threshold → ClosePosition
        let v = check_unrealized_loss(-10.0, 200.0, 0.05);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
        if let RiskVerdict::ClosePosition(msg) = v {
            assert!(msg.contains("unrealized_loss"));
        }
    }

    #[test]
    fn unrealized_loss_capital_zero_safe() {
        // capital = 0 → no division, should pass
        let v = check_unrealized_loss(-10.0, 0.0, 0.05);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn unrealized_loss_positive_pnl_passes() {
        // Profitable → should never trigger
        let v = check_unrealized_loss(10.0, 200.0, 0.05);
        assert_eq!(v, RiskVerdict::Pass);
    }

    #[test]
    fn unrealized_loss_integrated_in_risk_gate() {
        // Verify it triggers through risk_gate when configured
        let mut config = RiskConfig::default();
        config.max_unrealized_loss = Some(0.03); // 3%
        config.max_loss_per_trade = 1.0; // disable stop_loss so unrealized_loss fires
        // pnl = -8, capital = 200 → 4% > 3% → should trigger
        let v = risk_gate(-8.0, 200.0, 0.0, 0.0, 200.0, &config);
        assert!(matches!(v, RiskVerdict::ClosePosition(_)));
        if let RiskVerdict::ClosePosition(msg) = v {
            assert!(msg.contains("unrealized_loss"));
        }
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
