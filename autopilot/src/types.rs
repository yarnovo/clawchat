//! 类型定义 — 从 shared 重导出 + ledger 结构

// ── state.json（引擎写，autopilot 读）──────────────────────────
pub use clawchat_shared::state::{EngineState, TradeStats};

// ── signal.json（autopilot 读写 position_size / status）──────
pub use clawchat_shared::strategy::StrategyFile;

// ── trade.json（autopilot 写，引擎读）──────────────────────────
pub use clawchat_shared::trade::TradeOverride;

// ── risk.json（autopilot 读写 trailing_stop）───────────────────
pub use clawchat_shared::risk::RiskConfig;

// ── ledger.json 结构 ───────────────────────────────────────────

use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct Ledger {
    pub accounts: HashMap<String, LedgerAccount>,
}

#[derive(Debug, Deserialize)]
pub struct LedgerAccount {
    pub total_capital: f64,
    pub portfolios: HashMap<String, LedgerPortfolio>,
}

#[derive(Debug, Deserialize)]
pub struct LedgerPortfolio {
    pub allocated_capital: f64,
    pub strategies: HashMap<String, LedgerStrategy>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LedgerStrategy {
    pub strategy_name: String,
    pub allocated_capital: f64,
    #[serde(default)]
    pub realized_pnl: f64,
    #[serde(default)]
    pub unrealized_pnl: f64,
    #[serde(default)]
    pub fees_paid: f64,
    #[serde(default)]
    pub funding_paid: f64,
    #[serde(default)]
    pub peak_equity: f64,
}

impl LedgerStrategy {
    /// 当前权益 = allocated + realized + unrealized - fees - funding
    pub fn equity(&self) -> f64 {
        self.allocated_capital + self.realized_pnl + self.unrealized_pnl
            - self.fees_paid - self.funding_paid
    }

    /// 回撤 = (peak - equity) / peak
    pub fn drawdown_pct(&self) -> f64 {
        if self.peak_equity > 0.0 {
            let equity = self.equity();
            if equity < self.peak_equity {
                (self.peak_equity - equity) / self.peak_equity
            } else {
                0.0
            }
        } else {
            0.0
        }
    }

    /// 亏损占配额比例
    pub fn loss_ratio(&self) -> f64 {
        if self.allocated_capital > 0.0 && self.realized_pnl < 0.0 {
            -self.realized_pnl / self.allocated_capital
        } else {
            0.0
        }
    }
}

impl Ledger {
    pub fn load(path: &std::path::Path) -> Option<Self> {
        let contents = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&contents).ok()
    }

    /// 获取所有策略的 ledger 数据（扁平化）
    pub fn all_strategies(&self) -> HashMap<String, LedgerStrategy> {
        let mut result = HashMap::new();
        for account in self.accounts.values() {
            for portfolio in account.portfolios.values() {
                for (name, strat) in &portfolio.strategies {
                    result.insert(name.clone(), strat.clone());
                }
            }
        }
        result
    }

    /// 全局总权益
    pub fn total_equity(&self) -> f64 {
        self.accounts.values()
            .flat_map(|a| a.portfolios.values())
            .flat_map(|p| p.strategies.values())
            .map(|s| s.equity())
            .sum()
    }

    /// 全局总配额
    pub fn total_allocated(&self) -> f64 {
        self.accounts.values()
            .flat_map(|a| a.portfolios.values())
            .flat_map(|p| p.strategies.values())
            .map(|s| s.allocated_capital)
            .sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ledger_strategy_equity() {
        let s = LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: 100.0,
            realized_pnl: 10.0,
            unrealized_pnl: -3.0,
            fees_paid: 1.0,
            funding_paid: 0.5,
            peak_equity: 110.0,
        };
        assert!((s.equity() - 105.5).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_strategy_drawdown() {
        let s = LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: 100.0,
            realized_pnl: -15.0,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: 100.0,
        };
        assert!((s.drawdown_pct() - 0.15).abs() < f64::EPSILON);
    }

    #[test]
    fn ledger_strategy_loss_ratio() {
        let s = LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: 200.0,
            realized_pnl: -30.0,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: 200.0,
        };
        assert!((s.loss_ratio() - 0.15).abs() < f64::EPSILON);
    }

    #[test]
    fn parse_ledger_json() {
        let json = r#"{
            "accounts": {
                "binance-main": {
                    "name": "binance-main",
                    "exchange": "binance",
                    "total_capital": 200.0,
                    "portfolios": {
                        "main": {
                            "name": "main",
                            "allocated_capital": 200.0,
                            "reserve": 0.0,
                            "risk": null,
                            "strategies": {
                                "test-strat": {
                                    "strategy_name": "test-strat",
                                    "allocated_capital": 50.0,
                                    "realized_pnl": -5.0,
                                    "unrealized_pnl": 2.0,
                                    "fees_paid": 0.5,
                                    "funding_paid": 0.1,
                                    "peak_equity": 55.0,
                                    "positions": {},
                                    "active_orders": [],
                                    "recent_orders": []
                                }
                            }
                        }
                    }
                }
            }
        }"#;
        let ledger: Ledger = serde_json::from_str(json).unwrap();
        let strats = ledger.all_strategies();
        assert_eq!(strats.len(), 1);
        let s = &strats["test-strat"];
        assert!((s.allocated_capital - 50.0).abs() < f64::EPSILON);
        assert!((s.realized_pnl - (-5.0)).abs() < f64::EPSILON);
    }
}
