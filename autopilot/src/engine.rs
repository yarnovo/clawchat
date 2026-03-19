//! 规则引擎 — 读取 ledger + state 数据，评估规则，产出决策

use crate::config;
use crate::types::{LedgerStrategy, TradeStats};

/// autopilot 对单个策略的决策
#[derive(Debug, Clone, PartialEq)]
pub enum Decision {
    /// 暂停开仓（写 trade.json pause）
    Pause { reason: String },
    /// 恢复交易（写 trade.json resume）
    Resume { reason: String },
    /// 全平仓位（写 trade.json close_all）
    Stop { reason: String },
    /// 扩仓（改 signal.json position_size）
    ScaleUp { new_position_size: f64, reason: String },
    /// 缩仓（改 signal.json position_size）
    ScaleDown { new_position_size: f64, reason: String },
    /// 停机（改 signal.json status=suspended）
    Suspend { reason: String },
    /// 调节 trailing_stop（改 risk.json）
    AdjustTrailingStop { new_value: f64, reason: String },
    /// 无操作
    NoAction,
}

/// 策略快照 — 规则引擎评估所需的所有数据
#[derive(Debug, Clone)]
pub struct StrategySnapshot {
    pub name: String,
    pub current_position_size: f64,
    pub current_trailing_stop: f64,
}

/// autopilot 对单个策略的跟踪状态
#[derive(Debug, Clone, Default)]
pub struct TrackedState {
    /// 上一次已知的 trade_stats
    pub prev_stats: TradeStats,
    /// 连续赢的笔数
    pub consecutive_wins: u32,
    /// 连续亏的笔数
    pub consecutive_losses: u32,
    /// 是否处于暂停状态（autopilot 写的 pause）
    pub paused: bool,
    /// 暂停时间（unix 秒）
    pub paused_at: Option<i64>,
    /// 上次缩放时间（unix 秒）
    pub last_scale_at: Option<i64>,
    /// 首次出现负 PnL 的时间（unix 秒）
    pub negative_pnl_since: Option<i64>,
}

impl TrackedState {
    /// 检测新交易并更新连续统计
    /// 返回 true 如果有新交易
    pub fn update_from_stats(&mut self, new_stats: &TradeStats) -> bool {
        if new_stats.total <= self.prev_stats.total {
            return false;
        }

        let new_wins = new_stats.wins.saturating_sub(self.prev_stats.wins);
        let new_losses = new_stats.losses.saturating_sub(self.prev_stats.losses);

        if new_losses > 0 && new_wins == 0 {
            self.consecutive_losses += new_losses;
            self.consecutive_wins = 0;
        } else if new_wins > 0 && new_losses == 0 {
            self.consecutive_wins += new_wins;
            self.consecutive_losses = 0;
        } else if new_wins > 0 && new_losses > 0 {
            if new_stats.realized_pnl < self.prev_stats.realized_pnl {
                self.consecutive_losses += 1;
                self.consecutive_wins = 0;
            } else {
                self.consecutive_wins += 1;
                self.consecutive_losses = 0;
            }
        }

        if new_stats.realized_pnl < 0.0 {
            if self.negative_pnl_since.is_none() {
                self.negative_pnl_since = Some(chrono::Utc::now().timestamp());
            }
        } else {
            self.negative_pnl_since = None;
        }

        self.prev_stats = new_stats.clone();
        true
    }
}

/// 评估单个策略，产出决策列表（按优先级排列）
pub fn evaluate(
    snapshot: &StrategySnapshot,
    tracked: &TrackedState,
    stats: &TradeStats,
    ledger: Option<&LedgerStrategy>,
) -> Vec<Decision> {
    let mut decisions = Vec::new();
    let now = chrono::Utc::now().timestamp();

    let capital = ledger.map(|l| l.allocated_capital).unwrap_or(0.0);

    // ── 1. 回撤 >= 25% 配额 → stop（全平）─────────────────────
    if let Some(ls) = ledger {
        let dd = ls.drawdown_pct();
        if dd >= config::DRAWDOWN_STOP_PCT {
            decisions.push(Decision::Stop {
                reason: format!(
                    "回撤 {:.1}% >= {:.1}%",
                    dd * 100.0,
                    config::DRAWDOWN_STOP_PCT * 100.0
                ),
            });
            return decisions;
        }
    }

    // ── 2. 总亏损超限 → suspend ────────────────────────────────
    if let Some(ls) = ledger {
        let loss_ratio = ls.loss_ratio();
        if loss_ratio >= config::TOTAL_LOSS_SUSPEND_PCT {
            decisions.push(Decision::Suspend {
                reason: format!(
                    "总亏损 {:.1}% >= {:.1}%",
                    loss_ratio * 100.0,
                    config::TOTAL_LOSS_SUSPEND_PCT * 100.0
                ),
            });
            return decisions;
        }
    }

    // ── 3. 持续亏损超时 → suspend ──────────────────────────────
    if let Some(since) = tracked.negative_pnl_since {
        let hours = (now - since) as f64 / 3600.0;
        if hours >= config::NEGATIVE_PNL_SUSPEND_HOURS as f64 {
            decisions.push(Decision::Suspend {
                reason: format!(
                    "持续亏损 {:.1}h >= {}h",
                    hours, config::NEGATIVE_PNL_SUSPEND_HOURS
                ),
            });
            return decisions;
        }
    }

    // ── 4. 暂停/恢复规则 ──────────────────────────────────────
    if !tracked.paused {
        // 连续亏损 → pause
        if tracked.consecutive_losses >= config::CONSECUTIVE_LOSS_PAUSE {
            decisions.push(Decision::Pause {
                reason: format!(
                    "连续亏损 {} 笔 >= {}",
                    tracked.consecutive_losses, config::CONSECUTIVE_LOSS_PAUSE
                ),
            });
        }

        // 日损失超限 → pause
        if capital > 0.0 && stats.realized_pnl < 0.0 {
            let daily_loss_ratio = -stats.realized_pnl / capital;
            if daily_loss_ratio >= config::DAILY_LOSS_PAUSE_PCT {
                decisions.push(Decision::Pause {
                    reason: format!(
                        "日亏损 {:.1}% >= {:.1}%",
                        daily_loss_ratio * 100.0,
                        config::DAILY_LOSS_PAUSE_PCT * 100.0
                    ),
                });
            }
        }
    } else if config::AUTO_RESUME_MINUTES > 0 {
        // 自动恢复
        if let Some(paused_at) = tracked.paused_at {
            let elapsed_mins = (now - paused_at) as u64 / 60;
            if elapsed_mins >= config::AUTO_RESUME_MINUTES {
                decisions.push(Decision::Resume {
                    reason: format!(
                        "暂停已 {} 分钟 >= 冷却期 {} 分钟",
                        elapsed_mins, config::AUTO_RESUME_MINUTES
                    ),
                });
            }
        }
    }

    // ── 5. 仓位缩放规则 ──────────────────────────────────────
    let scale_on_cooldown = tracked.last_scale_at
        .map(|t| (now - t) as u64 <= config::SCALE_COOLDOWN_SECS)
        .unwrap_or(false);

    if !scale_on_cooldown && !tracked.paused {
        if tracked.consecutive_wins >= config::SCALE_UP_AFTER_WINS {
            let new_ps = (snapshot.current_position_size * config::SCALE_UP_FACTOR)
                .min(config::POSITION_SIZE_MAX);
            if (new_ps - snapshot.current_position_size).abs() > 0.001 {
                decisions.push(Decision::ScaleUp {
                    new_position_size: new_ps,
                    reason: format!(
                        "连续赢 {} 笔, position_size {:.2} → {:.2}",
                        tracked.consecutive_wins,
                        snapshot.current_position_size,
                        new_ps
                    ),
                });
            }
        }

        if tracked.consecutive_losses >= config::SCALE_DOWN_AFTER_LOSSES {
            let new_ps = (snapshot.current_position_size * config::SCALE_DOWN_FACTOR)
                .max(config::POSITION_SIZE_MIN);
            if (new_ps - snapshot.current_position_size).abs() > 0.001 {
                decisions.push(Decision::ScaleDown {
                    new_position_size: new_ps,
                    reason: format!(
                        "连续亏 {} 笔, position_size {:.2} → {:.2}",
                        tracked.consecutive_losses,
                        snapshot.current_position_size,
                        new_ps
                    ),
                });
            }
        }
    }

    // ── 6. 风控参数动态调节 ─────────────────────────────────────
    // 盈利时收紧 trailing_stop（锁利），亏损时不放宽
    if stats.realized_pnl > 0.0 && capital > 0.0 {
        let pnl_ratio = stats.realized_pnl / capital;
        let range = config::TRAILING_STOP_MAX - config::TRAILING_STOP_MIN;
        let target = (config::TRAILING_STOP_MAX - (pnl_ratio * range).min(range))
            .max(config::TRAILING_STOP_MIN);

        if (target - snapshot.current_trailing_stop).abs() > 0.001 {
            decisions.push(Decision::AdjustTrailingStop {
                new_value: target,
                reason: format!(
                    "盈利 {:.1}%, trailing_stop {:.3} → {:.3}",
                    pnl_ratio * 100.0,
                    snapshot.current_trailing_stop,
                    target
                ),
            });
        }
    }

    if decisions.is_empty() {
        decisions.push(Decision::NoAction);
    }

    decisions
}

/// 检查全局回撤是否接近红线
pub fn check_global_drawdown(total_equity: f64, total_allocated: f64) -> Option<String> {
    if total_allocated > 0.0 && total_equity < total_allocated {
        let dd = (total_allocated - total_equity) / total_allocated;
        if dd >= config::GLOBAL_DRAWDOWN_PAUSE_PCT {
            return Some(format!(
                "全局回撤 {:.1}% >= 红线 {:.1}%",
                dd * 100.0,
                config::GLOBAL_DRAWDOWN_PAUSE_PCT * 100.0
            ));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::LedgerStrategy;

    fn default_snapshot() -> StrategySnapshot {
        StrategySnapshot {
            name: "test".to_string(),
            current_position_size: 0.30,
            current_trailing_stop: 0.02,
        }
    }

    fn default_ledger(capital: f64, pnl: f64) -> LedgerStrategy {
        LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: capital,
            realized_pnl: pnl,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: capital,
        }
    }

    #[test]
    fn no_trades_no_action() {
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        let stats = TradeStats::default();
        let ledger = default_ledger(200.0, 0.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert_eq!(decisions, vec![Decision::NoAction]);
    }

    #[test]
    fn consecutive_losses_triggers_pause() {
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 0, losses: 3, realized_pnl: -5.0 };
        let ledger = default_ledger(200.0, -5.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }

    #[test]
    fn drawdown_triggers_stop() {
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        let stats = TradeStats::default();
        // 25% drawdown: peak=200, equity=150 → dd=25%
        let ledger = LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: 200.0,
            realized_pnl: -50.0,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: 200.0,
        };
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::Stop { .. })));
    }

    #[test]
    fn total_loss_triggers_suspend() {
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        let stats = TradeStats { total: 5, wins: 1, losses: 4, realized_pnl: -40.0 };
        let ledger = default_ledger(200.0, -40.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::Suspend { .. })));
    }

    #[test]
    fn consecutive_wins_triggers_scale_up() {
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_wins: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 3, losses: 0, realized_pnl: 10.0 };
        let ledger = default_ledger(200.0, 10.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::ScaleUp { .. })));
    }

    #[test]
    fn consecutive_losses_triggers_scale_down() {
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 2,
            ..Default::default()
        };
        let stats = TradeStats { total: 2, wins: 0, losses: 2, realized_pnl: -5.0 };
        let ledger = default_ledger(200.0, -5.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::ScaleDown { .. })));
    }

    #[test]
    fn profit_tightens_trailing_stop() {
        let snap = StrategySnapshot {
            current_trailing_stop: 0.05,
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        let stats = TradeStats { total: 5, wins: 4, losses: 1, realized_pnl: 50.0 };
        let ledger = default_ledger(200.0, 50.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(decisions.iter().any(|d| matches!(d, Decision::AdjustTrailingStop { .. })));
    }

    #[test]
    fn global_drawdown_detects_red_line() {
        // total_allocated=200, equity=175 → dd=12.5% > 10%
        let result = check_global_drawdown(175.0, 200.0);
        assert!(result.is_some());
    }

    #[test]
    fn global_drawdown_ok_when_healthy() {
        let result = check_global_drawdown(195.0, 200.0);
        assert!(result.is_none());
    }

    #[test]
    fn scale_cooldown_prevents_action() {
        let snap = default_snapshot();
        let now = chrono::Utc::now().timestamp();
        let tracked = TrackedState {
            consecutive_wins: 5,
            last_scale_at: Some(now - 100),
            ..Default::default()
        };
        let stats = TradeStats { total: 5, wins: 5, losses: 0, realized_pnl: 20.0 };
        let ledger = default_ledger(200.0, 20.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(!decisions.iter().any(|d| matches!(d, Decision::ScaleUp { .. })));
    }

    #[test]
    fn paused_state_skips_pause_check() {
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 10,
            paused: true,
            paused_at: Some(chrono::Utc::now().timestamp()),
            ..Default::default()
        };
        let stats = TradeStats { total: 10, wins: 0, losses: 10, realized_pnl: -20.0 };
        let ledger = default_ledger(200.0, -20.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        assert!(!decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }

    #[test]
    fn tracked_state_detects_new_loss() {
        let mut tracked = TrackedState::default();
        let stats = TradeStats { total: 1, wins: 0, losses: 1, realized_pnl: -2.0 };
        assert!(tracked.update_from_stats(&stats));
        assert_eq!(tracked.consecutive_losses, 1);
        assert_eq!(tracked.consecutive_wins, 0);
    }

    #[test]
    fn tracked_state_detects_new_win() {
        let mut tracked = TrackedState::default();
        let stats = TradeStats { total: 1, wins: 1, losses: 0, realized_pnl: 5.0 };
        assert!(tracked.update_from_stats(&stats));
        assert_eq!(tracked.consecutive_wins, 1);
        assert_eq!(tracked.consecutive_losses, 0);
    }

    #[test]
    fn tracked_state_win_resets_loss_streak() {
        let mut tracked = TrackedState {
            prev_stats: TradeStats { total: 3, wins: 0, losses: 3, realized_pnl: -6.0 },
            consecutive_losses: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 4, wins: 1, losses: 3, realized_pnl: -1.0 };
        tracked.update_from_stats(&stats);
        assert_eq!(tracked.consecutive_wins, 1);
        assert_eq!(tracked.consecutive_losses, 0);
    }

    #[test]
    fn no_ledger_still_works() {
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        let stats = TradeStats::default();
        let decisions = evaluate(&snap, &tracked, &stats, None);
        assert_eq!(decisions, vec![Decision::NoAction]);
    }

    #[test]
    fn position_size_clamped_to_max() {
        let snap = StrategySnapshot {
            current_position_size: 0.48,
            ..default_snapshot()
        };
        let tracked = TrackedState {
            consecutive_wins: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 3, losses: 0, realized_pnl: 10.0 };
        let ledger = default_ledger(200.0, 10.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        if let Some(Decision::ScaleUp { new_position_size, .. }) = decisions.first() {
            assert!(*new_position_size <= config::POSITION_SIZE_MAX);
        }
    }

    #[test]
    fn position_size_clamped_to_min() {
        let snap = StrategySnapshot {
            current_position_size: 0.12,
            ..default_snapshot()
        };
        let tracked = TrackedState {
            consecutive_losses: 2,
            ..Default::default()
        };
        let stats = TradeStats { total: 2, wins: 0, losses: 2, realized_pnl: -5.0 };
        let ledger = default_ledger(200.0, -5.0);
        let decisions = evaluate(&snap, &tracked, &stats, Some(&ledger));
        if let Some(Decision::ScaleDown { new_position_size, .. }) = decisions.first() {
            assert!(*new_position_size >= config::POSITION_SIZE_MIN);
        }
    }
}
