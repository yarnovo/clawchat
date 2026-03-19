#![allow(dead_code)]

use crate::ledger::{Ledger, StrategyAllocation};

// ── Verdict ─────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum GlobalRiskVerdict {
    Pass,
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
}

impl Default for GlobalRiskConfig {
    fn default() -> Self {
        Self {
            max_drawdown_pct: 10.0,
            max_daily_loss_pct: 5.0,
            max_total_exposure: 2.0,
            max_per_coin_exposure_pct: 50.0,
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
    pub fn check(&self, ledger: &Ledger) -> GlobalRiskVerdict {
        let equity = ledger.total_equity();

        // 1. Total drawdown >= max_drawdown_pct → CloseAll
        if self.peak_equity > 0.0 {
            let drawdown = (self.peak_equity - equity) / self.peak_equity * 100.0;
            if drawdown >= self.config.max_drawdown_pct {
                return GlobalRiskVerdict::CloseAll(format!(
                    "总回撤 {drawdown:.1}% >= {}% 红线",
                    self.config.max_drawdown_pct
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
}
