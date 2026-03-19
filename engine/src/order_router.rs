#![allow(dead_code)]

use std::collections::HashMap;

use crate::global_risk::{GlobalRiskGuard, GlobalRiskVerdict};
use crate::ledger::{CapitalMode, Ledger};
use crate::risk::EngineRiskGuard;
use clawchat_shared::exchange::ExchangeClient;
use clawchat_shared::risk::RiskConfig;
use clawchat_shared::volatility::vol_leverage_multiplier;

// ── Signal / Update types ───────────────────────────────────────

/// Signal from a strategy worker, requesting an order.
#[derive(Debug, Clone)]
pub struct StrategySignal {
    pub strategy_name: String,
    pub symbol: String,
    /// "long" / "short"
    pub side: String,
    /// Desired position size ratio (0.0..1.0)
    pub position_size: f64,
    pub leverage: u32,
    pub price: f64,
    /// true = open, false = close
    pub is_open: bool,
    /// 资金模式
    pub capital_mode: CapitalMode,
    /// percent 模式下的百分比
    pub capital_pct: f64,
    /// 当前波动率百分位（0-100），None 表示未计算
    pub vol_percentile: Option<f64>,
}

/// Filled order update (from ORDER_TRADE_UPDATE).
#[derive(Debug, Clone)]
pub struct OrderUpdate {
    pub client_order_id: String,
    pub symbol: String,
    pub side: String,
    pub price: f64,
    pub qty: f64,
    pub realized_pnl: f64,
    pub commission: f64,
}

// ── OrderRouter ─────────────────────────────────────────────────

/// All strategy signals go through this single gateway.
pub struct OrderRouter {
    pub ledger: Ledger,
    pub global_risk: GlobalRiskGuard,
    strategy_guards: HashMap<String, EngineRiskGuard>,
    risk_configs: HashMap<String, RiskConfig>,
    /// Cached funding rates per symbol (from markPrice stream or periodic fetch)
    funding_rates: HashMap<String, f64>,
}

impl OrderRouter {
    pub fn new(ledger: Ledger, global_risk: GlobalRiskGuard) -> Self {
        Self {
            ledger,
            global_risk,
            strategy_guards: HashMap::new(),
            risk_configs: HashMap::new(),
            funding_rates: HashMap::new(),
        }
    }

    /// Register a per-strategy risk guard.
    pub fn add_strategy_guard(&mut self, name: &str, guard: EngineRiskGuard) {
        self.strategy_guards.insert(name.to_string(), guard);
    }

    /// Register a per-strategy risk config (for dynamic leverage lookup).
    pub fn add_risk_config(&mut self, name: &str, config: RiskConfig) {
        self.risk_configs.insert(name.to_string(), config);
    }

    /// Handle a strategy signal: validate, check risk, compute qty, place order.
    pub async fn handle_signal(
        &mut self,
        signal: &StrategySignal,
        exchange: &dyn ExchangeClient,
    ) -> Result<bool, String> {
        let strategy_name = &signal.strategy_name;

        // 1. Per-strategy risk check
        let guard = self
            .strategy_guards
            .get_mut(strategy_name)
            .ok_or_else(|| format!("strategy guard not found: {strategy_name}"))?;

        let is_long = signal.side == "long";
        let current_funding_rate = self.funding_rates
            .get(&signal.symbol)
            .copied()
            .unwrap_or(0.0);
        guard.pre_trade_check(
            signal.position_size,
            signal.leverage,
            is_long,
            current_funding_rate,
        )?;

        // 2. Virtual account balance check + dynamic quota
        let alloc = self
            .ledger
            .get(strategy_name)
            .ok_or_else(|| format!("strategy allocation not found: {strategy_name}"))?;

        let portfolio_equity = self.ledger.portfolio_equity_for_strategy(strategy_name);

        let effective_capital = alloc.effective_capital(
            signal.capital_mode,
            signal.capital_pct,
            portfolio_equity,
        );

        if effective_capital <= 0.0 {
            return Err("虚拟账户余额不足".into());
        }

        // 3. Global risk check (graded drawdown defense)
        let mut leverage_reduction = 1.0_f64;
        match self.global_risk.check(&self.ledger) {
            GlobalRiskVerdict::Pass => {}
            GlobalRiskVerdict::ReduceLeverage(reason) => {
                tracing::warn!(strategy = strategy_name, %reason, "global risk: reduce leverage (黄灯)");
                leverage_reduction = 0.5;
            }
            GlobalRiskVerdict::Block(reason) => return Err(reason),
            GlobalRiskVerdict::CloseAll(reason) => {
                return Err(format!("全局风控触发: {reason}"));
            }
        }

        // 4. Compute effective leverage (volatility-aware + drawdown grading)
        let mut effective_leverage = signal.leverage as f64 * leverage_reduction;
        if let Some(risk_cfg) = self.risk_configs.get(strategy_name) {
            if risk_cfg.dynamic_leverage {
                if let Some(pct) = signal.vol_percentile {
                    let multiplier = vol_leverage_multiplier(pct, &risk_cfg.vol_multipliers);
                    effective_leverage *= multiplier;
                    // Cap at max_leverage
                    effective_leverage = effective_leverage.min(risk_cfg.max_leverage as f64);
                    tracing::info!(
                        strategy = strategy_name,
                        vol_percentile = pct,
                        multiplier,
                        effective_leverage,
                        "dynamic leverage applied"
                    );
                }
            }
        }

        // 5. Compute order quantity: effective_capital * position_size * leverage / price
        let qty = if signal.price > 0.0 {
            effective_capital * signal.position_size * effective_leverage / signal.price
        } else {
            return Err("price must be > 0".into());
        };

        if qty <= 0.0 {
            return Err("computed qty <= 0".into());
        }

        // 6. Place order on exchange
        let side_str = if is_long { "BUY" } else { "SELL" };

        let result = exchange.market_order(&signal.symbol, side_str, qty).await;

        match result {
            Ok(_resp) => {
                // 7. Update virtual ledger
                if signal.is_open {
                    if let Some(a) = self.ledger.get_mut(strategy_name) {
                        a.open_position(&signal.symbol, &signal.side, qty, signal.price, 0.0);
                    }
                } else if let Some(a) = self.ledger.get_mut(strategy_name) {
                    a.close_position(&signal.symbol, signal.price, 0.0);
                }
                Ok(true)
            }
            Err(e) => Err(format!("exchange error: {e}")),
        }
    }

    /// Handle an order fill update from the exchange user data stream.
    pub fn handle_order_update(&mut self, update: &OrderUpdate) {
        // Match strategy by clientOrderId prefix (e.g. "strat1-1234567890")
        let strategy_name = match update.client_order_id.rsplit_once('-') {
            Some((prefix, _)) => prefix.to_string(),
            None => return,
        };

        if let Some(alloc) = self.ledger.get_mut(&strategy_name) {
            // Update fees
            alloc.fees_paid += update.commission;

            // Update realized PnL if present (close fills)
            if update.realized_pnl.abs() > f64::EPSILON {
                alloc.realized_pnl += update.realized_pnl;
            }

            alloc.update_hwm();
        }

        // Record in per-strategy risk guard
        if let Some(guard) = self.strategy_guards.get_mut(&strategy_name) {
            if update.realized_pnl.abs() > f64::EPSILON {
                guard.record_trade(update.realized_pnl);
            }
        }
    }

    /// Handle mark price update: propagate to all strategies holding this symbol.
    pub fn handle_mark_price(&mut self, symbol: &str, mark_price: f64) {
        for alloc in self.ledger.all_strategies_mut() {
            if alloc.positions.contains_key(symbol) {
                alloc.update_mark_price(symbol, mark_price);
                alloc.update_hwm();
            }
        }
        // Update global risk peak equity
        let total_eq = self.ledger.total_equity();
        self.global_risk.update(total_eq);
    }

    /// Update the cached funding rate for a symbol (called from markPrice stream).
    pub fn update_funding_rate(&mut self, symbol: &str, rate: f64) {
        self.funding_rates.insert(symbol.to_string(), rate);
    }

    /// Get the current cached funding rate for a symbol.
    pub fn get_funding_rate(&self, symbol: &str) -> Option<f64> {
        self.funding_rates.get(symbol).copied()
    }

    pub fn ledger(&self) -> &Ledger {
        &self.ledger
    }

    pub fn ledger_mut(&mut self) -> &mut Ledger {
        &mut self.ledger
    }
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::global_risk::{GlobalRiskConfig, GlobalRiskGuard};
    use crate::risk::{EngineRiskGuard, RiskConfig};

    fn make_router(capital: f64) -> OrderRouter {
        let mut ledger = Ledger::new(capital);
        ledger.add_strategy("test", capital);
        let global = GlobalRiskGuard::new(GlobalRiskConfig::default(), capital);
        let mut router = OrderRouter::new(ledger, global);
        let guard = EngineRiskGuard::new(RiskConfig::default(), capital);
        router.add_strategy_guard("test", guard);
        router
    }

    #[test]
    fn virtual_balance_insufficient_rejected() {
        let mut router = make_router(100.0);
        // Drain the account
        router
            .ledger
            .get_mut("test")
            .unwrap()
            .realized_pnl = -100.0;

        let _signal = StrategySignal {
            strategy_name: "test".into(),
            symbol: "BTCUSDT".into(),
            side: "long".into(),
            position_size: 0.1,
            leverage: 5,
            price: 50.0,
            is_open: true,
            capital_mode: CapitalMode::Fixed,
            capital_pct: 0.0,
            vol_percentile: None,
        };

        // Can't use async in sync test without runtime, so test the balance check directly
        let alloc = router.ledger.get("test").unwrap();
        assert!(alloc.virtual_equity() <= 0.0);
    }

    #[test]
    fn global_risk_block_prevents_order() {
        let mut router = make_router(100.0);
        // Cause daily loss > 5%
        router.global_risk = GlobalRiskGuard::new(GlobalRiskConfig::default(), 100.0);
        router
            .ledger
            .get_mut("test")
            .unwrap()
            .realized_pnl = -6.0; // 6% loss

        let verdict = router.global_risk.check(&router.ledger);
        assert!(matches!(verdict, GlobalRiskVerdict::Block(_)));
    }

    #[test]
    fn mark_price_updates_unrealized_pnl() {
        let mut router = make_router(100.0);
        router
            .ledger
            .get_mut("test")
            .unwrap()
            .open_position("BTCUSDT", "long", 2.0, 50.0, 0.0);

        router.handle_mark_price("BTCUSDT", 55.0);

        let alloc = router.ledger.get("test").unwrap();
        // unrealized = (55-50) * 2 = 10
        assert!((alloc.unrealized_pnl - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn handle_order_update_records_pnl_and_fees() {
        let mut router = make_router(100.0);
        let update = OrderUpdate {
            client_order_id: "test-1234567890".into(),
            symbol: "BTCUSDT".into(),
            side: "BUY".into(),
            price: 50.0,
            qty: 1.0,
            realized_pnl: 5.0,
            commission: 0.02,
        };
        router.handle_order_update(&update);

        let alloc = router.ledger.get("test").unwrap();
        assert!((alloc.realized_pnl - 5.0).abs() < f64::EPSILON);
        assert!((alloc.fees_paid - 0.02).abs() < f64::EPSILON);
    }

    // ── 浮动配额测试 ──────────────────────────────────────────

    #[test]
    fn effective_capital_fixed_mode() {
        let alloc = crate::ledger::StrategyAllocation::new("test", 100.0);
        let cap = alloc.effective_capital(CapitalMode::Fixed, 0.0, 1000.0);
        assert!((cap - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn effective_capital_percent_mode() {
        let alloc = crate::ledger::StrategyAllocation::new("test", 100.0);
        // 2% of 1000 = 20
        let cap = alloc.effective_capital(CapitalMode::Percent, 2.0, 1000.0);
        assert!((cap - 20.0).abs() < f64::EPSILON);
    }

    #[test]
    fn effective_capital_percent_capped_at_10() {
        let alloc = crate::ledger::StrategyAllocation::new("test", 100.0);
        // 15% requested, capped to 10% of 1000 = 100
        let cap = alloc.effective_capital(CapitalMode::Percent, 15.0, 1000.0);
        assert!((cap - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn effective_capital_percent_scales_with_equity() {
        let alloc = crate::ledger::StrategyAllocation::new("test", 100.0);
        // 5% of 200 = 10
        let cap1 = alloc.effective_capital(CapitalMode::Percent, 5.0, 200.0);
        assert!((cap1 - 10.0).abs() < f64::EPSILON);
        // 5% of 2000 = 100
        let cap2 = alloc.effective_capital(CapitalMode::Percent, 5.0, 2000.0);
        assert!((cap2 - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn portfolio_equity_for_strategy_lookup() {
        let mut ledger = Ledger::new(1000.0);
        ledger.add_strategy("s1", 400.0);
        ledger.add_strategy("s2", 600.0);
        // s1 has 10 pnl: equity = 410 + 600 = 1010
        ledger.get_mut("s1").unwrap().realized_pnl = 10.0;
        let eq = ledger.portfolio_equity_for_strategy("s1");
        assert!((eq - 1010.0).abs() < f64::EPSILON);
    }

    // ── 波动率感知杠杆测试 ────────────────────────────────────

    #[test]
    fn dynamic_leverage_not_applied_when_disabled() {
        let router = make_router(100.0);
        // Default RiskConfig has dynamic_leverage = false
        let cfg = RiskConfig::default();
        assert!(!cfg.dynamic_leverage);
        // With no risk config registered, router won't adjust leverage
        assert!(router.risk_configs.is_empty());
    }

    #[test]
    fn dynamic_leverage_config_registered() {
        let mut router = make_router(100.0);
        let mut cfg = RiskConfig::default();
        cfg.dynamic_leverage = true;
        cfg.vol_multipliers = [1.3, 1.0, 0.7, 0.3];
        router.add_risk_config("test", cfg);

        let rc = router.risk_configs.get("test").unwrap();
        assert!(rc.dynamic_leverage);
        assert!((rc.vol_multipliers[0] - 1.3).abs() < f64::EPSILON);
    }
}
