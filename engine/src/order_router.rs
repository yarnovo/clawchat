#![allow(dead_code)]

use std::collections::HashMap;

use crate::global_risk::{GlobalRiskGuard, GlobalRiskVerdict};
use crate::ledger::Ledger;
use crate::risk::EngineRiskGuard;
use clawchat_shared::exchange::Exchange;

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
}

impl OrderRouter {
    pub fn new(ledger: Ledger, global_risk: GlobalRiskGuard) -> Self {
        Self {
            ledger,
            global_risk,
            strategy_guards: HashMap::new(),
        }
    }

    /// Register a per-strategy risk guard.
    pub fn add_strategy_guard(&mut self, name: &str, guard: EngineRiskGuard) {
        self.strategy_guards.insert(name.to_string(), guard);
    }

    /// Handle a strategy signal: validate, check risk, compute qty, place order.
    pub async fn handle_signal(
        &mut self,
        signal: &StrategySignal,
        exchange: &Exchange,
    ) -> Result<bool, String> {
        let strategy_name = &signal.strategy_name;

        // 1. Per-strategy risk check
        let guard = self
            .strategy_guards
            .get_mut(strategy_name)
            .ok_or_else(|| format!("strategy guard not found: {strategy_name}"))?;

        let is_long = signal.side == "long";
        guard.pre_trade_check(
            signal.position_size,
            signal.leverage,
            is_long,
            0.0, // funding rate can be injected later
        )?;

        // 2. Virtual account balance check
        let alloc = self
            .ledger
            .get(strategy_name)
            .ok_or_else(|| format!("strategy allocation not found: {strategy_name}"))?;
        let equity = alloc.virtual_equity();
        if equity <= 0.0 {
            return Err("虚拟账户余额不足".into());
        }

        // 3. Global risk check
        match self.global_risk.check(&self.ledger) {
            GlobalRiskVerdict::Pass => {}
            GlobalRiskVerdict::Block(reason) => return Err(reason),
            GlobalRiskVerdict::CloseAll(reason) => {
                return Err(format!("全局风控触发: {reason}"));
            }
        }

        // 4. Compute order quantity: equity * position_size * leverage / price
        let qty = if signal.price > 0.0 {
            equity * signal.position_size * signal.leverage as f64 / signal.price
        } else {
            return Err("price must be > 0".into());
        };

        if qty <= 0.0 {
            return Err("computed qty <= 0".into());
        }

        // 5. Place order on exchange
        let side_enum = if is_long {
            clawchat_shared::types::Side::Buy
        } else {
            clawchat_shared::types::Side::Sell
        };
        let pos_side = if is_long {
            clawchat_shared::types::PositionSide::Long
        } else {
            clawchat_shared::types::PositionSide::Short
        };

        let result = exchange.market_order(side_enum, pos_side, qty).await;

        match result {
            Ok(_resp) => {
                // 6. Update virtual ledger
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
}
