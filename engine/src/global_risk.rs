#![allow(dead_code)]

use crate::ledger::{Ledger, StrategyAllocation};
use clawchat_shared::alerts::{emit_alert, AlertEvent, AlertLevel};

// ── Verdict ─────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum GlobalRiskVerdict {
    Pass,
    /// 黄灯：回撤达到黄灯阈值 — 新开仓杠杆上限降 50%
    ReduceLeverage(String),
    Block(String),
    CloseAll(String),
}

// ── Strategy risk level ─────────────────────────────────────────

#[derive(Debug, PartialEq)]
pub enum StrategyRiskLevel {
    Normal,
    Yellow(f64),   // drawdown >= 15%
    Red(f64),      // drawdown >= 25%, should pause
    Meltdown(f64), // drawdown >= 35%, should close all
}

// ── Config ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct GlobalRiskConfig {
    /// KPI red-line: total drawdown % (10.0 = 10%)
    pub max_drawdown_pct: f64,
    /// Max daily loss % (5.0 = 5%)
    pub max_daily_loss_pct: f64,
    /// Max total exposure as multiple of capital (2.0 = 200%)
    pub max_total_exposure: f64,
    /// Max single-coin exposure % of total equity (50.0 = 50%)
    pub max_per_coin_exposure_pct: f64,
    /// 分级回撤：黄灯阈值 % — 降杠杆 50%
    pub drawdown_yellow_pct: f64,
    /// 分级回撤：橙灯阈值 % — 暂停新开仓 + 缩仓
    pub drawdown_orange_pct: f64,
    /// 分级回撤恢复阈值 % — 回撤收窄到此值以下开始恢复
    pub recovery_threshold_pct: f64,
}

impl Default for GlobalRiskConfig {
    fn default() -> Self {
        Self {
            max_drawdown_pct: 10.0,
            max_daily_loss_pct: 5.0,
            max_total_exposure: 2.0,
            max_per_coin_exposure_pct: 50.0,
            drawdown_yellow_pct: 3.0,
            drawdown_orange_pct: 6.0,
            recovery_threshold_pct: 2.0,
        }
    }
}

// ── Guard ───────────────────────────────────────────────────────

pub struct GlobalRiskGuard {
    config: GlobalRiskConfig,
    initial_capital: f64,
    peak_equity: f64,
    daily_start_equity: f64,
}

impl GlobalRiskGuard {
    pub fn new(config: GlobalRiskConfig, initial_capital: f64) -> Self {
        Self {
            config,
            initial_capital,
            peak_equity: initial_capital,
            daily_start_equity: initial_capital,
        }
    }

    /// Check global risk constraints against the ledger.
    ///
    /// 分级回撤防御（从高到低优先级）：
    /// - 红灯 (max_drawdown_pct, 默认 10%): CloseAll
    /// - 橙灯 (drawdown_orange_pct, 默认 6%): Block（暂停新开仓）
    /// - 黄灯 (drawdown_yellow_pct, 默认 3%): ReduceLeverage（杠杆降 50%）
    pub fn check(&self, ledger: &Ledger) -> GlobalRiskVerdict {
        let equity = ledger.total_equity();

        // 1. Graded drawdown defense (红灯 > 橙灯 > 黄灯)
        if self.peak_equity > 0.0 {
            let drawdown = (self.peak_equity - equity) / self.peak_equity * 100.0;

            // 红灯: CloseAll
            if drawdown >= self.config.max_drawdown_pct {
                return GlobalRiskVerdict::CloseAll(format!(
                    "总回撤 {drawdown:.1}% >= {}% 红线",
                    self.config.max_drawdown_pct
                ));
            }

            // 橙灯: Block（暂停新开仓）
            if drawdown >= self.config.drawdown_orange_pct {
                return GlobalRiskVerdict::Block(format!(
                    "总回撤 {drawdown:.1}% >= {}% 橙灯，暂停新开仓",
                    self.config.drawdown_orange_pct
                ));
            }

            // 黄灯: ReduceLeverage（杠杆降 50%）
            if drawdown >= self.config.drawdown_yellow_pct {
                return GlobalRiskVerdict::ReduceLeverage(format!(
                    "总回撤 {drawdown:.1}% >= {}% 黄灯，杠杆上限降 50%",
                    self.config.drawdown_yellow_pct
                ));
            }
        }

        // 2. Daily loss >= max_daily_loss_pct → Block
        if self.daily_start_equity > 0.0 {
            let daily_loss =
                (self.daily_start_equity - equity) / self.daily_start_equity * 100.0;
            if daily_loss >= self.config.max_daily_loss_pct {
                return GlobalRiskVerdict::Block(format!(
                    "当日亏损 {daily_loss:.1}% >= {}%",
                    self.config.max_daily_loss_pct
                ));
            }
        }

        // 3. Total exposure exceeds limit → Block
        if equity > 0.0 {
            let exposure_map = ledger.exposure_by_symbol();
            let total_exposure: f64 = exposure_map.values().sum();
            let exposure_ratio = total_exposure / equity;
            if exposure_ratio >= self.config.max_total_exposure {
                return GlobalRiskVerdict::Block(format!(
                    "总敞口 {:.0}% >= {:.0}% 限制",
                    exposure_ratio * 100.0,
                    self.config.max_total_exposure * 100.0
                ));
            }

            // 4. Single-coin exposure exceeds limit → Block
            for (symbol, notional) in &exposure_map {
                let coin_pct = notional / equity * 100.0;
                if coin_pct >= self.config.max_per_coin_exposure_pct {
                    return GlobalRiskVerdict::Block(format!(
                        "{symbol} 敞口 {coin_pct:.1}% >= {}%",
                        self.config.max_per_coin_exposure_pct
                    ));
                }
            }
        }

        GlobalRiskVerdict::Pass
    }

    /// Current drawdown percentage (0.0 when at or above peak).
    pub fn current_drawdown_pct(&self, equity: f64) -> f64 {
        if self.peak_equity <= 0.0 {
            return 0.0;
        }
        ((self.peak_equity - equity) / self.peak_equity * 100.0).max(0.0)
    }

    /// Update peak equity and daily start (call on new day / after each tick).
    pub fn update(&mut self, equity: f64) {
        if equity > self.peak_equity {
            self.peak_equity = equity;
        }
    }

    /// Reset daily start equity (call at UTC 00:00).
    pub fn reset_daily(&mut self, equity: f64) {
        self.daily_start_equity = equity;
    }

    /// Evaluate per-strategy drawdown level.
    pub fn check_strategy_drawdown(alloc: &StrategyAllocation) -> StrategyRiskLevel {
        let dd = alloc.drawdown_pct();
        if dd >= 35.0 {
            StrategyRiskLevel::Meltdown(dd)
        } else if dd >= 25.0 {
            StrategyRiskLevel::Red(dd)
        } else if dd >= 15.0 {
            StrategyRiskLevel::Yellow(dd)
        } else {
            StrategyRiskLevel::Normal
        }
    }

    /// Check global risk and emit alert if triggered.
    /// Returns the same verdict as `check()`.
    pub fn check_and_alert(
        &self,
        ledger: &Ledger,
        records_dir: &std::path::Path,
    ) -> GlobalRiskVerdict {
        let verdict = self.check(ledger);
        match &verdict {
            GlobalRiskVerdict::CloseAll(reason) => {
                emit_alert(
                    records_dir,
                    &AlertEvent::new(
                        AlertLevel::Red,
                        "global_risk",
                        None,
                        format!("CloseAll 触发: {reason}"),
                    ),
                );
            }
            GlobalRiskVerdict::Block(reason) => {
                emit_alert(
                    records_dir,
                    &AlertEvent::new(
                        AlertLevel::Yellow,
                        "global_risk",
                        None,
                        format!("Block 触发: {reason}"),
                    ),
                );
            }
            GlobalRiskVerdict::ReduceLeverage(reason) => {
                emit_alert(
                    records_dir,
                    &AlertEvent::new(
                        AlertLevel::Yellow,
                        "global_risk",
                        None,
                        format!("ReduceLeverage 触发: {reason}"),
                    ),
                );
            }
            GlobalRiskVerdict::Pass => {}
        }
        verdict
    }

    pub fn config(&self) -> &GlobalRiskConfig {
        &self.config
    }

    pub fn peak_equity(&self) -> f64 {
        self.peak_equity
    }

    pub fn daily_start_equity(&self) -> f64 {
        self.daily_start_equity
    }
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ledger::Ledger;

    fn make_guard(capital: f64) -> GlobalRiskGuard {
        GlobalRiskGuard::new(GlobalRiskConfig::default(), capital)
    }

    #[test]
    fn normal_pass() {
        let guard = make_guard(1000.0);
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 500.0);
        ledger.add_strategy("s2", 500.0);
        assert_eq!(guard.check(&ledger), GlobalRiskVerdict::Pass);
    }

    #[test]
    fn total_drawdown_close_all() {
        let mut guard = make_guard(1000.0);
        guard.peak_equity = 1000.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 500.0);
        // Simulate loss: set realized_pnl to bring equity to 890 (11% dd)
        ledger.get_mut("s1").unwrap().realized_pnl = -110.0;
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::CloseAll(_)));
    }

    #[test]
    fn daily_loss_block() {
        let mut guard = make_guard(1000.0);
        guard.daily_start_equity = 1000.0;
        // Set peak to current equity so drawdown grading doesn't fire first
        guard.peak_equity = 950.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);
        // 5% daily loss → equity = 950
        ledger.get_mut("s1").unwrap().realized_pnl = -50.0;
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::Block(_)));
    }

    #[test]
    fn single_coin_exposure_block() {
        let guard = make_guard(100.0);
        let mut ledger = Ledger::new(100.0);
        ledger.add_strategy("s1", 100.0);
        // Open a large position: notional = qty * entry = 10 * 8 = 80, equity = 100 → 80%
        ledger
            .get_mut("s1")
            .unwrap()
            .open_position("BTCUSDT", "long", 10.0, 8.0, 0.0);
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::Block(_)));
    }

    #[test]
    fn strategy_drawdown_levels() {
        let mut alloc = crate::ledger::StrategyAllocation::new("test", 100.0);
        // No drawdown
        assert_eq!(
            GlobalRiskGuard::check_strategy_drawdown(&alloc),
            StrategyRiskLevel::Normal
        );

        // 16% drawdown: realized_pnl = -16 → equity = 84, peak = 100 → dd = 16%
        alloc.realized_pnl = -16.0;
        alloc.update_hwm();
        assert!(matches!(
            GlobalRiskGuard::check_strategy_drawdown(&alloc),
            StrategyRiskLevel::Yellow(_)
        ));

        // 26% drawdown
        alloc.realized_pnl = -26.0;
        assert!(matches!(
            GlobalRiskGuard::check_strategy_drawdown(&alloc),
            StrategyRiskLevel::Red(_)
        ));

        // 36% drawdown
        alloc.realized_pnl = -36.0;
        assert!(matches!(
            GlobalRiskGuard::check_strategy_drawdown(&alloc),
            StrategyRiskLevel::Meltdown(_)
        ));
    }

    #[test]
    fn update_tracks_peak() {
        let mut guard = make_guard(100.0);
        guard.update(110.0);
        assert!((guard.peak_equity() - 110.0).abs() < f64::EPSILON);
        guard.update(105.0);
        // Peak should not decrease
        assert!((guard.peak_equity() - 110.0).abs() < f64::EPSILON);
    }

    // ── 分级回撤防御测试 ──────────────────────────────────────

    #[test]
    fn graded_drawdown_yellow_reduce_leverage() {
        // 3% drawdown → ReduceLeverage
        let mut guard = make_guard(1000.0);
        guard.peak_equity = 1000.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);
        // 4% drawdown: equity = 960
        ledger.get_mut("s1").unwrap().realized_pnl = -40.0;
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::ReduceLeverage(_)));
    }

    #[test]
    fn graded_drawdown_orange_block() {
        // 6% drawdown → Block (橙灯)
        let mut guard = make_guard(1000.0);
        guard.peak_equity = 1000.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);
        // 7% drawdown: equity = 930
        ledger.get_mut("s1").unwrap().realized_pnl = -70.0;
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::Block(_)));
        // Verify it's the orange drawdown block, not daily loss
        if let GlobalRiskVerdict::Block(reason) = v {
            assert!(reason.contains("橙灯"));
        }
    }

    #[test]
    fn graded_drawdown_red_close_all() {
        // 10% drawdown → CloseAll (红灯)
        let mut guard = make_guard(1000.0);
        guard.peak_equity = 1000.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);
        // 10% drawdown: equity = 900
        ledger.get_mut("s1").unwrap().realized_pnl = -100.0;
        let v = guard.check(&ledger);
        assert!(matches!(v, GlobalRiskVerdict::CloseAll(_)));
    }

    #[test]
    fn graded_drawdown_just_below_yellow_passes() {
        // 2.9% drawdown → Pass (below 3% yellow)
        let mut guard = make_guard(1000.0);
        guard.peak_equity = 1000.0;
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);
        // 2.9% drawdown: equity = 971
        ledger.get_mut("s1").unwrap().realized_pnl = -29.0;
        let v = guard.check(&ledger);
        assert_eq!(v, GlobalRiskVerdict::Pass);
    }

    #[test]
    fn graded_drawdown_custom_thresholds() {
        // Custom thresholds: yellow=5, orange=8, red=12
        let config = GlobalRiskConfig {
            max_drawdown_pct: 12.0,
            drawdown_yellow_pct: 5.0,
            drawdown_orange_pct: 8.0,
            ..Default::default()
        };
        let mut guard = GlobalRiskGuard::new(config, 1000.0);
        guard.peak_equity = 1000.0;

        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 1000.0);

        // 4% dd → Pass (below custom yellow 5%)
        ledger.get_mut("s1").unwrap().realized_pnl = -40.0;
        assert_eq!(guard.check(&ledger), GlobalRiskVerdict::Pass);

        // 6% dd → ReduceLeverage (above yellow 5%, below orange 8%)
        ledger.get_mut("s1").unwrap().realized_pnl = -60.0;
        assert!(matches!(guard.check(&ledger), GlobalRiskVerdict::ReduceLeverage(_)));

        // 9% dd → Block (above orange 8%, below red 12%)
        ledger.get_mut("s1").unwrap().realized_pnl = -90.0;
        assert!(matches!(guard.check(&ledger), GlobalRiskVerdict::Block(_)));

        // 13% dd → CloseAll (above red 12%)
        ledger.get_mut("s1").unwrap().realized_pnl = -130.0;
        assert!(matches!(guard.check(&ledger), GlobalRiskVerdict::CloseAll(_)));
    }

    #[test]
    fn current_drawdown_pct_calculation() {
        let guard = make_guard(1000.0);
        assert!((guard.current_drawdown_pct(1000.0)).abs() < f64::EPSILON);
        assert!((guard.current_drawdown_pct(950.0) - 5.0).abs() < f64::EPSILON);
        assert!((guard.current_drawdown_pct(1050.0)).abs() < f64::EPSILON); // above peak → 0
    }
}
