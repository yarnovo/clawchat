#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── VirtualPosition ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualPosition {
    pub symbol: String,
    /// "long" / "short"
    pub side: String,
    pub qty: f64,
    pub entry_price: f64,
    pub unrealized_pnl: f64,
    /// ISO datetime
    pub opened_at: String,
}

// ── StrategyAllocation ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyAllocation {
    pub strategy_name: String,
    pub allocated_capital: f64,
    pub realized_pnl: f64,
    pub unrealized_pnl: f64,
    pub fees_paid: f64,
    pub funding_paid: f64,
    pub peak_equity: f64,
    pub positions: HashMap<String, VirtualPosition>,
}

impl StrategyAllocation {
    pub fn new(name: &str, capital: f64) -> Self {
        Self {
            strategy_name: name.to_string(),
            allocated_capital: capital,
            realized_pnl: 0.0,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: capital,
            positions: HashMap::new(),
        }
    }

    /// Current virtual equity.
    pub fn virtual_equity(&self) -> f64 {
        self.allocated_capital + self.realized_pnl + self.unrealized_pnl
            - self.fees_paid
            - self.funding_paid
    }

    /// Current drawdown percentage (0.0 when at or above peak).
    pub fn drawdown_pct(&self) -> f64 {
        let equity = self.virtual_equity();
        if self.peak_equity <= 0.0 {
            return 0.0;
        }
        ((self.peak_equity - equity) / self.peak_equity * 100.0).max(0.0)
    }

    /// Frozen margin: sum of notional across all open positions.
    pub fn frozen_margin(&self) -> f64 {
        self.positions
            .values()
            .map(|p| p.qty * p.entry_price)
            .sum()
    }

    /// Available balance (equity minus frozen margin).
    pub fn available_balance(&self) -> f64 {
        (self.virtual_equity() - self.frozen_margin()).max(0.0)
    }

    /// Record a new position opening.
    pub fn open_position(&mut self, symbol: &str, side: &str, qty: f64, price: f64, fee: f64) {
        let now = chrono::Utc::now().to_rfc3339();
        self.fees_paid += fee;
        let pos = VirtualPosition {
            symbol: symbol.to_string(),
            side: side.to_string(),
            qty,
            entry_price: price,
            unrealized_pnl: 0.0,
            opened_at: now,
        };
        self.positions.insert(symbol.to_string(), pos);
    }

    /// Record position close, returning realized PnL.
    pub fn close_position(&mut self, symbol: &str, price: f64, fee: f64) -> f64 {
        self.fees_paid += fee;
        let pnl = if let Some(pos) = self.positions.remove(symbol) {
            let diff = price - pos.entry_price;
            let raw_pnl = if pos.side == "long" {
                diff * pos.qty
            } else {
                -diff * pos.qty
            };
            raw_pnl
        } else {
            0.0
        };
        self.realized_pnl += pnl;
        // Remove the symbol's contribution from unrealized total (recalc from remaining)
        self.recalc_unrealized();
        pnl
    }

    /// Update unrealized PnL for a specific symbol based on mark price.
    pub fn update_mark_price(&mut self, symbol: &str, mark_price: f64) {
        if let Some(pos) = self.positions.get_mut(symbol) {
            let diff = mark_price - pos.entry_price;
            pos.unrealized_pnl = if pos.side == "long" {
                diff * pos.qty
            } else {
                -diff * pos.qty
            };
        }
        self.recalc_unrealized();
    }

    /// Update high-water mark if equity exceeds current peak.
    pub fn update_hwm(&mut self) {
        let equity = self.virtual_equity();
        if equity > self.peak_equity {
            self.peak_equity = equity;
        }
    }

    /// Recalculate total unrealized PnL from all positions.
    fn recalc_unrealized(&mut self) {
        self.unrealized_pnl = self.positions.values().map(|p| p.unrealized_pnl).sum();
    }
}

// ── Ledger ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Ledger {
    pub strategies: HashMap<String, StrategyAllocation>,
    pub total_capital: f64,
}

impl Ledger {
    pub fn new(total_capital: f64) -> Self {
        Self {
            strategies: HashMap::new(),
            total_capital,
        }
    }

    /// Add a strategy allocation.
    pub fn add_strategy(&mut self, name: &str, capital: f64) {
        self.strategies
            .insert(name.to_string(), StrategyAllocation::new(name, capital));
    }

    pub fn get(&self, name: &str) -> Option<&StrategyAllocation> {
        self.strategies.get(name)
    }

    pub fn get_mut(&mut self, name: &str) -> Option<&mut StrategyAllocation> {
        self.strategies.get_mut(name)
    }

    /// Total virtual equity across all strategies.
    pub fn total_equity(&self) -> f64 {
        self.strategies.values().map(|a| a.virtual_equity()).sum()
    }

    /// Total unrealized PnL across all strategies.
    pub fn total_unrealized_pnl(&self) -> f64 {
        self.strategies.values().map(|a| a.unrealized_pnl).sum()
    }

    /// Total realized PnL across all strategies.
    pub fn total_realized_pnl(&self) -> f64 {
        self.strategies.values().map(|a| a.realized_pnl).sum()
    }

    /// Aggregate notional exposure by symbol across all strategies.
    pub fn exposure_by_symbol(&self) -> HashMap<String, f64> {
        let mut map: HashMap<String, f64> = HashMap::new();
        for alloc in self.strategies.values() {
            for pos in alloc.positions.values() {
                let notional = pos.qty * pos.entry_price;
                *map.entry(pos.symbol.clone()).or_default() += notional;
            }
        }
        map
    }

    /// Persist ledger state to a JSON file.
    pub fn save(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(path, json)
    }

    /// Load ledger state from a JSON file.
    pub fn load(path: &std::path::Path) -> std::io::Result<Self> {
        let data = std::fs::read_to_string(path)?;
        serde_json::from_str(&data)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── StrategyAllocation ──────────────────────────────────────

    #[test]
    fn new_allocation_equity_equals_capital() {
        let alloc = StrategyAllocation::new("test", 100.0);
        assert!((alloc.virtual_equity() - 100.0).abs() < f64::EPSILON);
        assert!((alloc.drawdown_pct()).abs() < f64::EPSILON);
    }

    #[test]
    fn open_close_position_pnl() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.open_position("BTCUSDT", "long", 1.0, 50.0, 0.1);
        assert!(alloc.positions.contains_key("BTCUSDT"));
        assert!((alloc.fees_paid - 0.1).abs() < f64::EPSILON);

        // Close at a profit
        let pnl = alloc.close_position("BTCUSDT", 55.0, 0.1);
        assert!((pnl - 5.0).abs() < f64::EPSILON);
        assert!((alloc.realized_pnl - 5.0).abs() < f64::EPSILON);
        assert!((alloc.fees_paid - 0.2).abs() < f64::EPSILON);
        assert!(!alloc.positions.contains_key("BTCUSDT"));
    }

    #[test]
    fn short_position_pnl() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.open_position("ETHUSDT", "short", 2.0, 100.0, 0.0);

        // Close at lower price → profit for short
        let pnl = alloc.close_position("ETHUSDT", 90.0, 0.0);
        assert!((pnl - 20.0).abs() < f64::EPSILON); // (100-90) * 2
    }

    #[test]
    fn mark_price_updates_unrealized() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.open_position("BTCUSDT", "long", 2.0, 50.0, 0.0);

        alloc.update_mark_price("BTCUSDT", 55.0);
        // unrealized = (55-50) * 2 = 10
        assert!((alloc.unrealized_pnl - 10.0).abs() < f64::EPSILON);
        assert!((alloc.virtual_equity() - 110.0).abs() < f64::EPSILON);
    }

    #[test]
    fn drawdown_calculation() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.update_hwm(); // peak = 100
        alloc.realized_pnl = -20.0;
        // equity = 80, peak = 100 → dd = 20%
        assert!((alloc.drawdown_pct() - 20.0).abs() < f64::EPSILON);
    }

    #[test]
    fn frozen_margin_and_available() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.open_position("BTCUSDT", "long", 1.0, 40.0, 0.0);
        assert!((alloc.frozen_margin() - 40.0).abs() < f64::EPSILON);
        assert!((alloc.available_balance() - 60.0).abs() < f64::EPSILON);
    }

    #[test]
    fn hwm_only_increases() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        alloc.realized_pnl = 10.0;
        alloc.update_hwm(); // peak → 110
        assert!((alloc.peak_equity - 110.0).abs() < f64::EPSILON);

        alloc.realized_pnl = 5.0; // equity drops to 105
        alloc.update_hwm();
        assert!((alloc.peak_equity - 110.0).abs() < f64::EPSILON); // stays at 110
    }

    // ── Ledger ──────────────────────────────────────────────────

    #[test]
    fn ledger_add_and_total_equity() {
        let mut ledger = Ledger::new(200.0);
        ledger.add_strategy("s1", 100.0);
        ledger.add_strategy("s2", 100.0);
        assert!((ledger.total_equity() - 200.0).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_total_realized_pnl() {
        let mut ledger = Ledger::new(200.0);
        ledger.add_strategy("s1", 100.0);
        ledger.add_strategy("s2", 100.0);
        ledger.get_mut("s1").unwrap().realized_pnl = 10.0;
        ledger.get_mut("s2").unwrap().realized_pnl = -5.0;
        assert!((ledger.total_realized_pnl() - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_exposure_by_symbol() {
        let mut ledger = Ledger::new(200.0);
        ledger.add_strategy("s1", 100.0);
        ledger.add_strategy("s2", 100.0);
        ledger
            .get_mut("s1")
            .unwrap()
            .open_position("BTCUSDT", "long", 1.0, 50.0, 0.0);
        ledger
            .get_mut("s2")
            .unwrap()
            .open_position("BTCUSDT", "short", 2.0, 50.0, 0.0);

        let exposure = ledger.exposure_by_symbol();
        // s1: 1*50 = 50, s2: 2*50 = 100, total BTCUSDT = 150
        assert!((exposure["BTCUSDT"] - 150.0).abs() < f64::EPSILON);
    }

    // ── Persistence ─────────────────────────────────────────────

    #[test]
    fn save_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ledger.json");

        let mut ledger = Ledger::new(500.0);
        ledger.add_strategy("alpha", 300.0);
        ledger.get_mut("alpha").unwrap().realized_pnl = 15.0;
        ledger
            .get_mut("alpha")
            .unwrap()
            .open_position("ETHUSDT", "long", 1.0, 100.0, 0.5);
        ledger.add_strategy("beta", 200.0);

        ledger.save(&path).unwrap();
        let loaded = Ledger::load(&path).unwrap();

        assert!((loaded.total_capital - 500.0).abs() < f64::EPSILON);
        assert_eq!(loaded.strategies.len(), 2);
        let alpha = loaded.get("alpha").unwrap();
        assert!((alpha.realized_pnl - 15.0).abs() < f64::EPSILON);
        assert!(alpha.positions.contains_key("ETHUSDT"));
        assert!((alpha.fees_paid - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn close_nonexistent_position_returns_zero() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        let pnl = alloc.close_position("NOTEXIST", 50.0, 0.0);
        assert!((pnl).abs() < f64::EPSILON);
    }
}
