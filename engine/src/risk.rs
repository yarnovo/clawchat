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
