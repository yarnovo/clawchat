/// 策略准入标准 — 唯一定义源
pub struct Criteria {
    pub min_days: u32,
    pub min_return_pct: f64,
    pub min_sharpe: f64,
    pub max_drawdown_pct: f64,
    pub min_trades: u32,
    pub min_win_rate: f64,
    pub min_profit_factor: f64,
}

pub const CRITERIA: Criteria = Criteria {
    min_days: 14,
    min_return_pct: 15.0,
    min_sharpe: 5.0,
    max_drawdown_pct: 20.0,
    min_trades: 20,
    min_win_rate: 45.0,
    min_profit_factor: 1.8,
};

/// Metrics needed for admission check
#[derive(Debug, Clone)]
pub struct BacktestMetrics {
    pub roi: f64,
    pub sharpe: f64,
    pub max_drawdown_pct: f64,
    pub total_trades: u32,
    pub win_rate: f64,
    pub profit_factor: f64,
}

/// Check if backtest results meet admission criteria
pub fn passes(metrics: &BacktestMetrics, days: u32) -> bool {
    let c = &CRITERIA;
    days >= c.min_days
        && metrics.roi > c.min_return_pct
        && metrics.sharpe > c.min_sharpe
        && metrics.max_drawdown_pct < c.max_drawdown_pct
        && metrics.total_trades >= c.min_trades
        && metrics.win_rate >= c.min_win_rate
        && metrics.profit_factor >= c.min_profit_factor
}

#[cfg(test)]
mod tests {
    use super::*;

    fn passing_metrics() -> BacktestMetrics {
        BacktestMetrics {
            roi: 30.0,
            sharpe: 8.0,
            max_drawdown_pct: 10.0,
            total_trades: 50,
            win_rate: 55.0,
            profit_factor: 2.5,
        }
    }

    #[test]
    fn passes_all_criteria() {
        assert!(passes(&passing_metrics(), 14));
    }

    #[test]
    fn fails_min_days() {
        assert!(!passes(&passing_metrics(), 13));
    }

    #[test]
    fn fails_min_return() {
        let mut m = passing_metrics();
        m.roi = 15.0; // not > 15
        assert!(!passes(&m, 14));
    }

    #[test]
    fn fails_min_sharpe() {
        let mut m = passing_metrics();
        m.sharpe = 5.0; // not > 5
        assert!(!passes(&m, 14));
    }

    #[test]
    fn fails_max_drawdown() {
        let mut m = passing_metrics();
        m.max_drawdown_pct = 20.0; // not < 20
        assert!(!passes(&m, 14));
    }

    #[test]
    fn fails_min_trades() {
        let mut m = passing_metrics();
        m.total_trades = 19;
        assert!(!passes(&m, 14));
    }

    #[test]
    fn fails_min_win_rate() {
        let mut m = passing_metrics();
        m.win_rate = 44.9;
        assert!(!passes(&m, 14));
    }

    #[test]
    fn fails_min_profit_factor() {
        let mut m = passing_metrics();
        m.profit_factor = 1.79;
        assert!(!passes(&m, 14));
    }

    #[test]
    fn boundary_passes() {
        let m = BacktestMetrics {
            roi: 15.01,
            sharpe: 5.01,
            max_drawdown_pct: 19.99,
            total_trades: 20,
            win_rate: 45.0,
            profit_factor: 1.8,
        };
        assert!(passes(&m, 14));
    }
}
