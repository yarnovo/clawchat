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

// ── Order ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub exchange_id: Option<String>,
    pub strategy_name: String,
    pub symbol: String,
    /// "buy" / "sell"
    pub side: String,
    /// "market" / "limit" / "stop_market" / "take_profit"
    pub order_type: String,
    pub qty: f64,
    pub price: Option<f64>,
    pub stop_price: Option<f64>,
    /// "pending" / "submitted" / "filled" / "canceled" / "rejected"
    pub status: String,
    pub filled_qty: f64,
    pub avg_fill_price: f64,
    pub commission: f64,
    /// ISO datetime
    pub created_at: String,
    pub filled_at: Option<String>,
}

/// Max recent orders to keep per strategy.
const MAX_RECENT_ORDERS: usize = 50;

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
    #[serde(default)]
    pub active_orders: Vec<Order>,
    #[serde(default)]
    pub recent_orders: Vec<Order>,
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
            active_orders: Vec::new(),
            recent_orders: Vec::new(),
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

    /// Push a completed order into recent_orders, trimming to MAX_RECENT_ORDERS.
    pub fn push_recent_order(&mut self, order: Order) {
        self.recent_orders.push(order);
        if self.recent_orders.len() > MAX_RECENT_ORDERS {
            self.recent_orders.remove(0);
        }
    }
}

// ── Account ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub name: String,
    pub exchange: String,
    pub total_capital: f64,
    pub portfolios: HashMap<String, Portfolio>,
}

// ── Portfolio ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Portfolio {
    pub name: String,
    pub allocated_capital: f64,
    pub reserve: f64,
    #[serde(default)]
    pub risk: Option<PortfolioRiskSnapshot>,
    pub strategies: HashMap<String, StrategyAllocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioRiskSnapshot {
    pub max_drawdown_pct: Option<f64>,
    pub max_daily_loss_pct: Option<f64>,
    pub max_total_exposure: Option<f64>,
    pub max_per_coin_exposure_pct: Option<f64>,
}

// ── Ledger (three-layer: Account → Portfolio → Strategy) ────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Ledger {
    pub accounts: HashMap<String, Account>,
}

/// Default account / portfolio names for the single-account scenario.
const DEFAULT_ACCOUNT: &str = "binance-main";
const DEFAULT_PORTFOLIO: &str = "main";

impl Ledger {
    /// Create a ledger for a single account + single portfolio (current scenario).
    pub fn new(total_capital: f64) -> Self {
        let portfolio = Portfolio {
            name: DEFAULT_PORTFOLIO.to_string(),
            allocated_capital: total_capital,
            reserve: 0.0,
            risk: None,
            strategies: HashMap::new(),
        };
        let account = Account {
            name: DEFAULT_ACCOUNT.to_string(),
            exchange: "binance".to_string(),
            total_capital,
            portfolios: HashMap::from([(DEFAULT_PORTFOLIO.to_string(), portfolio)]),
        };
        Self {
            accounts: HashMap::from([(DEFAULT_ACCOUNT.to_string(), account)]),
        }
    }

    /// Create a ledger from explicit account + portfolio config.
    pub fn new_single(
        account_name: &str,
        exchange: &str,
        account_capital: f64,
        portfolio_name: &str,
        allocated_capital: f64,
        reserve: f64,
    ) -> Self {
        let portfolio = Portfolio {
            name: portfolio_name.to_string(),
            allocated_capital,
            reserve,
            risk: None,
            strategies: HashMap::new(),
        };
        let account = Account {
            name: account_name.to_string(),
            exchange: exchange.to_string(),
            total_capital: account_capital,
            portfolios: HashMap::from([(portfolio_name.to_string(), portfolio)]),
        };
        Self {
            accounts: HashMap::from([(account_name.to_string(), account)]),
        }
    }

    // ── Default portfolio shortcut (single-account fast path) ───

    fn default_portfolio(&self) -> Option<&Portfolio> {
        // Try the first account's first portfolio
        self.accounts
            .values()
            .next()
            .and_then(|a| a.portfolios.values().next())
    }

    fn default_portfolio_mut(&mut self) -> Option<&mut Portfolio> {
        self.accounts
            .values_mut()
            .next()
            .and_then(|a| a.portfolios.values_mut().next())
    }

    // ── Strategy access (compatible interface) ──────────────────

    /// Add a strategy allocation to the default portfolio.
    pub fn add_strategy(&mut self, name: &str, capital: f64) {
        if let Some(p) = self.default_portfolio_mut() {
            p.strategies
                .insert(name.to_string(), StrategyAllocation::new(name, capital));
        }
    }

    /// Add a strategy allocation to a specific portfolio.
    pub fn add_strategy_to(
        &mut self,
        account: &str,
        portfolio: &str,
        name: &str,
        capital: f64,
    ) {
        if let Some(p) = self.portfolio_mut(account, portfolio) {
            p.strategies
                .insert(name.to_string(), StrategyAllocation::new(name, capital));
        }
    }

    /// Add a portfolio to an account. No-op if the portfolio already exists.
    pub fn add_portfolio(
        &mut self,
        account: &str,
        portfolio_name: &str,
        allocated_capital: f64,
        reserve: f64,
    ) {
        if let Some(acct) = self.accounts.get_mut(account) {
            acct.portfolios.entry(portfolio_name.to_string()).or_insert_with(|| {
                Portfolio {
                    name: portfolio_name.to_string(),
                    allocated_capital,
                    reserve,
                    risk: None,
                    strategies: HashMap::new(),
                }
            });
        }
    }

    pub fn get(&self, name: &str) -> Option<&StrategyAllocation> {
        self.accounts
            .values()
            .flat_map(|a| a.portfolios.values())
            .find_map(|p| p.strategies.get(name))
    }

    pub fn get_mut(&mut self, name: &str) -> Option<&mut StrategyAllocation> {
        self.accounts
            .values_mut()
            .flat_map(|a| a.portfolios.values_mut())
            .find_map(|p| p.strategies.get_mut(name))
    }

    /// Iterate over all strategy allocations (read-only).
    pub fn all_strategies(&self) -> impl Iterator<Item = &StrategyAllocation> {
        self.accounts
            .values()
            .flat_map(|a| a.portfolios.values())
            .flat_map(|p| p.strategies.values())
    }

    /// Iterate over all strategy allocations (mutable).
    pub fn all_strategies_mut(&mut self) -> impl Iterator<Item = &mut StrategyAllocation> {
        self.accounts
            .values_mut()
            .flat_map(|a| a.portfolios.values_mut())
            .flat_map(|p| p.strategies.values_mut())
    }

    /// Number of strategies across all portfolios.
    pub fn strategy_count(&self) -> usize {
        self.accounts
            .values()
            .flat_map(|a| a.portfolios.values())
            .map(|p| p.strategies.len())
            .sum()
    }

    // ── Aggregate queries (compatible interface) ────────────────

    /// Total virtual equity across all strategies.
    pub fn total_equity(&self) -> f64 {
        self.all_strategies().map(|a| a.virtual_equity()).sum()
    }

    /// Total unrealized PnL across all strategies.
    pub fn total_unrealized_pnl(&self) -> f64 {
        self.all_strategies().map(|a| a.unrealized_pnl).sum()
    }

    /// Total realized PnL across all strategies.
    pub fn total_realized_pnl(&self) -> f64 {
        self.all_strategies().map(|a| a.realized_pnl).sum()
    }

    /// Total capital across all accounts.
    pub fn total_capital(&self) -> f64 {
        self.accounts.values().map(|a| a.total_capital).sum()
    }

    /// Aggregate notional exposure by symbol across all strategies.
    pub fn exposure_by_symbol(&self) -> HashMap<String, f64> {
        let mut map: HashMap<String, f64> = HashMap::new();
        for alloc in self.all_strategies() {
            for pos in alloc.positions.values() {
                let notional = pos.qty * pos.entry_price;
                *map.entry(pos.symbol.clone()).or_default() += notional;
            }
        }
        map
    }

    // ── Account / Portfolio access ──────────────────────────────

    pub fn account(&self, name: &str) -> Option<&Account> {
        self.accounts.get(name)
    }

    pub fn account_mut(&mut self, name: &str) -> Option<&mut Account> {
        self.accounts.get_mut(name)
    }

    pub fn portfolio(&self, account: &str, portfolio: &str) -> Option<&Portfolio> {
        self.accounts
            .get(account)
            .and_then(|a| a.portfolios.get(portfolio))
    }

    pub fn portfolio_mut(&mut self, account: &str, portfolio: &str) -> Option<&mut Portfolio> {
        self.accounts
            .get_mut(account)
            .and_then(|a| a.portfolios.get_mut(portfolio))
    }

    pub fn portfolio_equity(&self, account: &str, portfolio: &str) -> f64 {
        self.portfolio(account, portfolio)
            .map(|p| p.strategies.values().map(|s| s.virtual_equity()).sum())
            .unwrap_or(0.0)
    }

    pub fn portfolio_exposure(
        &self,
        account: &str,
        portfolio: &str,
    ) -> HashMap<String, f64> {
        let mut map: HashMap<String, f64> = HashMap::new();
        if let Some(p) = self.portfolio(account, portfolio) {
            for alloc in p.strategies.values() {
                for pos in alloc.positions.values() {
                    let notional = pos.qty * pos.entry_price;
                    *map.entry(pos.symbol.clone()).or_default() += notional;
                }
            }
        }
        map
    }

    // ── Persistence ─────────────────────────────────────────────

    /// Persist ledger state to a JSON file.
    pub fn save(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(path, json)
    }

    /// Load ledger state from a JSON file (auto-migrates old flat format).
    pub fn load(path: &std::path::Path) -> std::io::Result<Self> {
        let data = std::fs::read_to_string(path)?;
        let value: serde_json::Value = serde_json::from_str(&data)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        // New format: has "accounts" key
        if value.get("accounts").is_some() {
            return serde_json::from_value(value)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e));
        }

        // Old flat format: has "strategies" + "total_capital"
        let old: OldLedger = serde_json::from_value(value)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        let portfolio = Portfolio {
            name: DEFAULT_PORTFOLIO.to_string(),
            allocated_capital: old.total_capital,
            reserve: 0.0,
            risk: None,
            strategies: old.strategies,
        };

        let account = Account {
            name: DEFAULT_ACCOUNT.to_string(),
            exchange: "binance".to_string(),
            total_capital: old.total_capital,
            portfolios: HashMap::from([(DEFAULT_PORTFOLIO.to_string(), portfolio)]),
        };

        Ok(Ledger {
            accounts: HashMap::from([(DEFAULT_ACCOUNT.to_string(), account)]),
        })
    }
}

/// Legacy flat ledger format for migration.
#[derive(Deserialize)]
struct OldLedger {
    strategies: HashMap<String, StrategyAllocation>,
    total_capital: f64,
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

    #[test]
    fn recent_orders_trimmed() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        for i in 0..60 {
            alloc.push_recent_order(Order {
                id: format!("ord-{i}"),
                exchange_id: None,
                strategy_name: "test".to_string(),
                symbol: "BTCUSDT".to_string(),
                side: "buy".to_string(),
                order_type: "market".to_string(),
                qty: 1.0,
                price: None,
                stop_price: None,
                status: "filled".to_string(),
                filled_qty: 1.0,
                avg_fill_price: 50.0,
                commission: 0.01,
                created_at: "2026-01-01T00:00:00Z".to_string(),
                filled_at: Some("2026-01-01T00:00:01Z".to_string()),
            });
        }
        assert_eq!(alloc.recent_orders.len(), MAX_RECENT_ORDERS);
        // First order should be ord-10 (0..9 trimmed)
        assert_eq!(alloc.recent_orders[0].id, "ord-10");
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

    #[test]
    fn ledger_total_capital() {
        let ledger = Ledger::new(500.0);
        assert!((ledger.total_capital() - 500.0).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_new_single() {
        let ledger = Ledger::new_single("acc1", "binance", 1000.0, "port1", 800.0, 200.0);
        assert!(ledger.account("acc1").is_some());
        assert!(ledger.portfolio("acc1", "port1").is_some());
        let p = ledger.portfolio("acc1", "port1").unwrap();
        assert!((p.allocated_capital - 800.0).abs() < f64::EPSILON);
        assert!((p.reserve - 200.0).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_portfolio_equity() {
        let mut ledger = Ledger::new(200.0);
        ledger.add_strategy("s1", 100.0);
        ledger.add_strategy("s2", 100.0);
        ledger.get_mut("s1").unwrap().realized_pnl = 10.0;
        let eq = ledger.portfolio_equity(DEFAULT_ACCOUNT, DEFAULT_PORTFOLIO);
        assert!((eq - 210.0).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_all_strategies_iter() {
        let mut ledger = Ledger::new(200.0);
        ledger.add_strategy("s1", 100.0);
        ledger.add_strategy("s2", 100.0);
        assert_eq!(ledger.all_strategies().count(), 2);
        assert_eq!(ledger.strategy_count(), 2);
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

        assert!((loaded.total_capital() - 500.0).abs() < f64::EPSILON);
        assert_eq!(loaded.strategy_count(), 2);
        let alpha = loaded.get("alpha").unwrap();
        assert!((alpha.realized_pnl - 15.0).abs() < f64::EPSILON);
        assert!(alpha.positions.contains_key("ETHUSDT"));
        assert!((alpha.fees_paid - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn load_old_format_migration() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ledger.json");

        // Write old flat format
        let old_json = r#"{
            "strategies": {
                "test-strat": {
                    "strategy_name": "test-strat",
                    "allocated_capital": 100.0,
                    "realized_pnl": 5.0,
                    "unrealized_pnl": 0.0,
                    "fees_paid": 0.1,
                    "funding_paid": 0.0,
                    "peak_equity": 105.0,
                    "positions": {}
                }
            },
            "total_capital": 200.0
        }"#;
        std::fs::write(&path, old_json).unwrap();

        let loaded = Ledger::load(&path).unwrap();
        assert!((loaded.total_capital() - 200.0).abs() < f64::EPSILON);
        assert_eq!(loaded.strategy_count(), 1);
        let strat = loaded.get("test-strat").unwrap();
        assert!((strat.realized_pnl - 5.0).abs() < f64::EPSILON);
        assert!(loaded.account(DEFAULT_ACCOUNT).is_some());
        assert!(loaded.portfolio(DEFAULT_ACCOUNT, DEFAULT_PORTFOLIO).is_some());
    }

    #[test]
    fn close_nonexistent_position_returns_zero() {
        let mut alloc = StrategyAllocation::new("test", 100.0);
        let pnl = alloc.close_position("NOTEXIST", 50.0, 0.0);
        assert!((pnl).abs() < f64::EPSILON);
    }

    #[test]
    fn add_portfolio_and_strategy_to() {
        let mut ledger = Ledger::new_single("acc1", "binance", 1000.0, "main", 800.0, 0.0);
        ledger.add_portfolio("acc1", "new-coins", 200.0, 0.0);

        // Two portfolios exist
        let acc = ledger.account("acc1").unwrap();
        assert_eq!(acc.portfolios.len(), 2);

        // Add strategies to specific portfolios
        ledger.add_strategy_to("acc1", "main", "s1", 400.0);
        ledger.add_strategy_to("acc1", "new-coins", "s2", 100.0);

        assert!(ledger.get("s1").is_some());
        assert!(ledger.get("s2").is_some());
        assert_eq!(ledger.strategy_count(), 2);

        // Strategies are in the correct portfolios
        let main_p = ledger.portfolio("acc1", "main").unwrap();
        assert!(main_p.strategies.contains_key("s1"));
        assert!(!main_p.strategies.contains_key("s2"));

        let nc_p = ledger.portfolio("acc1", "new-coins").unwrap();
        assert!(nc_p.strategies.contains_key("s2"));
        assert!(!nc_p.strategies.contains_key("s1"));
    }

    #[test]
    fn add_portfolio_no_duplicate() {
        let mut ledger = Ledger::new_single("acc1", "binance", 1000.0, "main", 800.0, 0.0);
        ledger.add_strategy("s1", 100.0);

        // Adding "main" again should not overwrite
        ledger.add_portfolio("acc1", "main", 999.0, 999.0);
        let main_p = ledger.portfolio("acc1", "main").unwrap();
        assert!((main_p.allocated_capital - 800.0).abs() < f64::EPSILON);
        assert!(main_p.strategies.contains_key("s1"));
    }
}
