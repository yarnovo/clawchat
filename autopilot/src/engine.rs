//! 规则引擎 — 读取状态数据，评估规则，产出决策

use crate::config::AutopilotConfig;
use crate::types::TradeStats;

/// autopilot 对单个策略的决策
#[derive(Debug, Clone, PartialEq)]
pub enum Decision {
    /// 暂停开仓（写 trade.json pause）
    Pause { reason: String },
    /// 恢复交易（写 trade.json resume）
    Resume { reason: String },
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
    pub capital: f64,
    pub status: String,
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

        // 逐笔推断：如果 wins 增加了，最后一笔是赢；losses 增加了，最后一笔是亏
        // 如果同时增加了多笔，以最后变化的为准
        if new_losses > 0 && new_wins == 0 {
            self.consecutive_losses += new_losses;
            self.consecutive_wins = 0;
        } else if new_wins > 0 && new_losses == 0 {
            self.consecutive_wins += new_wins;
            self.consecutive_losses = 0;
        } else if new_wins > 0 && new_losses > 0 {
            // 多笔同时更新，无法确定顺序，保守处理
            // 如果最终是亏损的方向
            if new_stats.realized_pnl < self.prev_stats.realized_pnl {
                self.consecutive_losses += 1;
                self.consecutive_wins = 0;
            } else {
                self.consecutive_wins += 1;
                self.consecutive_losses = 0;
            }
        }

        // 更新负 PnL 追踪
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

/// 评估规则，产出决策列表（按优先级排列）
pub fn evaluate(
    config: &AutopilotConfig,
    snapshot: &StrategySnapshot,
    tracked: &TrackedState,
    stats: &TradeStats,
) -> Vec<Decision> {
    let mut decisions = Vec::new();
    let now = chrono::Utc::now().timestamp();

    // ── 1. 停机规则（最高优先级）────────────────────────────────
    if config.suspend_rules.auto_suspend {
        // 总亏损超限
        if snapshot.capital > 0.0 && stats.realized_pnl < 0.0 {
            let loss_ratio = -stats.realized_pnl / snapshot.capital;
            if loss_ratio >= config.suspend_rules.max_total_loss_pct {
                decisions.push(Decision::Suspend {
                    reason: format!(
                        "总亏损 {:.1}% >= 阈值 {:.1}%",
                        loss_ratio * 100.0,
                        config.suspend_rules.max_total_loss_pct * 100.0
                    ),
                });
                return decisions; // 停机后不再评估其他规则
            }
        }

        // 持续亏损超时
        if let Some(since) = tracked.negative_pnl_since {
            let hours = (now - since) as f64 / 3600.0;
            if hours >= config.suspend_rules.negative_pnl_hours as f64 {
                decisions.push(Decision::Suspend {
                    reason: format!(
                        "持续亏损 {:.1}h >= 阈值 {}h",
                        hours, config.suspend_rules.negative_pnl_hours
                    ),
                });
                return decisions;
            }
        }
    }

    // ── 2. 暂停/恢复规则 ────────────────────────────────────────
    if !tracked.paused {
        // 连续亏损暂停
        if tracked.consecutive_losses >= config.pause_rules.consecutive_losses {
            decisions.push(Decision::Pause {
                reason: format!(
                    "连续亏损 {} 笔 >= 阈值 {}",
                    tracked.consecutive_losses, config.pause_rules.consecutive_losses
                ),
            });
        }

        // 日亏损暂停（用 realized_pnl 近似，engine 日切时重置 state）
        if snapshot.capital > 0.0 && stats.realized_pnl < 0.0 {
            let daily_loss_ratio = -stats.realized_pnl / snapshot.capital;
            if daily_loss_ratio >= config.pause_rules.daily_loss_pct {
                decisions.push(Decision::Pause {
                    reason: format!(
                        "日亏损 {:.1}% >= 阈值 {:.1}%",
                        daily_loss_ratio * 100.0,
                        config.pause_rules.daily_loss_pct * 100.0
                    ),
                });
            }
        }
    } else if tracked.paused && config.pause_rules.auto_resume_minutes > 0 {
        // 自动恢复
        if let Some(paused_at) = tracked.paused_at {
            let elapsed_mins = (now - paused_at) as u64 / 60;
            if elapsed_mins >= config.pause_rules.auto_resume_minutes {
                decisions.push(Decision::Resume {
                    reason: format!(
                        "暂停已 {} 分钟 >= 冷却期 {} 分钟",
                        elapsed_mins, config.pause_rules.auto_resume_minutes
                    ),
                });
            }
        }
    }

    // ── 3. 仓位缩放规则 ─────────────────────────────────────────
    let scale_on_cooldown = tracked.last_scale_at
        .map(|t| (now - t) as u64 <= config.scaling.cooldown_secs)
        .unwrap_or(false);

    if !scale_on_cooldown && !tracked.paused {
        // 连续赢 → 扩仓
        if tracked.consecutive_wins >= config.scaling.scale_up_after_wins {
            let new_ps = (snapshot.current_position_size * config.scaling.scale_up_factor)
                .min(config.scaling.position_size_max);
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

        // 连续亏 → 缩仓
        if tracked.consecutive_losses >= config.scaling.scale_down_after_losses {
            let new_ps = (snapshot.current_position_size * config.scaling.scale_down_factor)
                .max(config.scaling.position_size_min);
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

    // ── 4. 风控参数动态调节 ──────────────────────────────────────
    if stats.realized_pnl > 0.0 && config.risk_tuning.tighten_on_profit {
        // 盈利时收紧 trailing_stop（向 min 靠近）
        let pnl_ratio = if snapshot.capital > 0.0 {
            stats.realized_pnl / snapshot.capital
        } else {
            0.0
        };
        // 盈利越多，trailing_stop 越紧
        let range = config.risk_tuning.trailing_stop_max - config.risk_tuning.trailing_stop_min;
        let target = config.risk_tuning.trailing_stop_max - (pnl_ratio * range).min(range);
        let target = target.max(config.risk_tuning.trailing_stop_min);

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
    } else if stats.realized_pnl < 0.0 && config.risk_tuning.widen_on_loss {
        // 亏损时放宽 trailing_stop（向 max 靠近）
        let target = config.risk_tuning.trailing_stop_max;
        if (target - snapshot.current_trailing_stop).abs() > 0.001 {
            decisions.push(Decision::AdjustTrailingStop {
                new_value: target,
                reason: format!(
                    "亏损中, trailing_stop {:.3} → {:.3}",
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

#[cfg(test)]
mod tests {
    use super::*;

    fn default_config() -> AutopilotConfig {
        serde_json::from_str(r#"{"name": "test"}"#).unwrap()
    }

    fn default_snapshot() -> StrategySnapshot {
        StrategySnapshot {
            name: "test".to_string(),
            current_position_size: 0.30,
            capital: 200.0,
            status: "approved".to_string(),
            current_trailing_stop: 0.02,
        }
    }

    #[test]
    fn no_trades_no_action() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        let stats = TradeStats::default();
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert_eq!(decisions, vec![Decision::NoAction]);
    }

    #[test]
    fn consecutive_losses_triggers_pause() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 0, losses: 3, realized_pnl: -5.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert!(decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }

    #[test]
    fn consecutive_wins_triggers_scale_up() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_wins: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 3, losses: 0, realized_pnl: 10.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert!(decisions.iter().any(|d| matches!(d, Decision::ScaleUp { .. })));
    }

    #[test]
    fn consecutive_losses_triggers_scale_down() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 2,
            ..Default::default()
        };
        let stats = TradeStats { total: 2, wins: 0, losses: 2, realized_pnl: -5.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert!(decisions.iter().any(|d| matches!(d, Decision::ScaleDown { .. })));
    }

    #[test]
    fn total_loss_triggers_suspend() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState::default();
        // capital=200, loss=40 → 20% >= 20%
        let stats = TradeStats { total: 5, wins: 1, losses: 4, realized_pnl: -40.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert!(decisions.iter().any(|d| matches!(d, Decision::Suspend { .. })));
    }

    #[test]
    fn position_size_clamped_to_max() {
        let cfg = default_config(); // max = 0.50
        let snap = StrategySnapshot {
            current_position_size: 0.48,
            ..default_snapshot()
        };
        let tracked = TrackedState {
            consecutive_wins: 3,
            ..Default::default()
        };
        let stats = TradeStats { total: 3, wins: 3, losses: 0, realized_pnl: 10.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        if let Some(Decision::ScaleUp { new_position_size, .. }) = decisions.first() {
            assert!(*new_position_size <= 0.50);
        }
    }

    #[test]
    fn position_size_clamped_to_min() {
        let cfg = default_config(); // min = 0.10
        let snap = StrategySnapshot {
            current_position_size: 0.12,
            ..default_snapshot()
        };
        let tracked = TrackedState {
            consecutive_losses: 2,
            ..Default::default()
        };
        let stats = TradeStats { total: 2, wins: 0, losses: 2, realized_pnl: -5.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        if let Some(Decision::ScaleDown { new_position_size, .. }) = decisions.first() {
            assert!(*new_position_size >= 0.10);
        }
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
    fn scale_cooldown_prevents_action() {
        let cfg = default_config(); // cooldown = 300s
        let snap = default_snapshot();
        let now = chrono::Utc::now().timestamp();
        let tracked = TrackedState {
            consecutive_wins: 5,
            last_scale_at: Some(now - 100), // 100s ago, within cooldown
            ..Default::default()
        };
        let stats = TradeStats { total: 5, wins: 5, losses: 0, realized_pnl: 20.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        assert!(!decisions.iter().any(|d| matches!(d, Decision::ScaleUp { .. })));
    }

    #[test]
    fn paused_state_skips_pause_check() {
        let cfg = default_config();
        let snap = default_snapshot();
        let tracked = TrackedState {
            consecutive_losses: 10,
            paused: true,
            paused_at: Some(chrono::Utc::now().timestamp()),
            ..Default::default()
        };
        let stats = TradeStats { total: 10, wins: 0, losses: 10, realized_pnl: -20.0 };
        let decisions = evaluate(&cfg, &snap, &tracked, &stats);
        // Should not emit another Pause since already paused
        assert!(!decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }
}
