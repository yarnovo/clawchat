//! 规则引擎 — 读取 ledger + state 数据，评估规则，产出决策

use crate::config;
use crate::types::{LedgerStrategy, TradeStats};
use clawchat_shared::alerts::{emit_alert, AlertEvent, AlertLevel};

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
    /// 建议 dry-run 策略切 live（写 requirements/pending/）
    SuggestPromote { reason: String },
    /// 建议 live 策略下线（写 issues/pending/）
    SuggestDemote { reason: String },
    /// 无操作
    NoAction,
}

/// 策略快照 — 规则引擎评估所需的所有数据
#[derive(Debug, Clone)]
pub struct StrategySnapshot {
    pub name: String,
    pub current_position_size: f64,
    pub current_trailing_stop: f64,
    /// 当前 8h 资金费率（从 premiumIndex 获取），None 表示未获取
    pub funding_rate: Option<f64>,
    /// 当前持仓方向: "long", "short", 或 None（无仓位）
    pub position_side: Option<String>,
    /// 币种 24h 成交额（USDT），用于容量计算。None 表示未获取
    pub adv_24h: Option<f64>,
    /// 策略杠杆倍数
    pub leverage: Option<f64>,
    /// 运行模式: "dry-run" | "live"
    pub mode: Option<String>,
    /// 回测 Sharpe（来自 signal.json backtest.sharpe）
    pub backtest_sharpe: Option<f64>,
    /// 策略上线时间（unix 秒），来自 lifecycle.approved_at
    pub approved_at: Option<i64>,
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

/// 评估资金费率，产出决策
///
/// 规则：
/// - 年化费率 > 100% → Pause（极端市场）
/// - 年化费率 > 50% 且持仓方向不利 → ScaleDown 30%
/// - 年化费率 < -20% 且持仓方向有利 → 标记为费率有利（日志，不自动扩仓）
pub fn evaluate_funding_rate(snapshot: &StrategySnapshot) -> Vec<Decision> {
    let mut decisions = Vec::new();

    let rate = match snapshot.funding_rate {
        Some(r) => r,
        None => return decisions,
    };

    let annualized = rate * config::FUNDING_PERIODS_PER_YEAR;

    // 正费率做多付费，负费率做空付费
    let is_long = snapshot.position_side.as_deref() == Some("long");
    let is_short = snapshot.position_side.as_deref() == Some("short");
    let has_position = is_long || is_short;

    if !has_position {
        return decisions;
    }

    // 费率方向不利：做多时正费率，做空时负费率
    let unfavorable = (is_long && rate > 0.0) || (is_short && rate < 0.0);
    let favorable = (is_long && rate < 0.0) || (is_short && rate > 0.0);

    // 极端费率 → Pause
    if unfavorable && annualized.abs() >= config::FUNDING_RATE_PAUSE_ANNUALIZED {
        decisions.push(Decision::Pause {
            reason: format!(
                "资金费率极端: {:.4}% (年化 {:.1}%), 暂停{}方向",
                rate * 100.0,
                annualized * 100.0,
                if is_long { "多" } else { "空" }
            ),
        });
        return decisions;
    }

    // 高费率 → 缩仓
    if unfavorable && annualized.abs() >= config::FUNDING_RATE_SCALE_DOWN_ANNUALIZED {
        let new_ps = snapshot.current_position_size * config::FUNDING_RATE_SCALE_DOWN_FACTOR;
        let new_ps = new_ps.max(config::POSITION_SIZE_MIN);
        if (new_ps - snapshot.current_position_size).abs() > 0.001 {
            decisions.push(Decision::ScaleDown {
                new_position_size: new_ps,
                reason: format!(
                    "资金费率偏高: {:.4}% (年化 {:.1}%), 缩仓 {:.2} → {:.2}",
                    rate * 100.0,
                    annualized * 100.0,
                    snapshot.current_position_size,
                    new_ps
                ),
            });
        }
    }

    // 有利费率 → 日志记录（不自动扩仓，留给人工决策）
    if favorable && annualized.abs() >= config::FUNDING_RATE_FAVORABLE_ANNUALIZED.abs() {
        tracing::info!(
            strategy = %snapshot.name,
            rate = rate,
            annualized = annualized,
            "资金费率有利，可考虑扩仓"
        );
    }

    decisions
}

/// 评估策略容量利用率，产出决策
///
/// 规则：
/// - 利用率 > 120% → ScaleDown（自动缩仓至 80%）
/// - 利用率 > 80% → 日志警告
/// - 利用率 < 30% → 日志标记可扩仓
pub fn evaluate_capacity(snapshot: &StrategySnapshot, ledger: Option<&LedgerStrategy>) -> Vec<Decision> {
    let mut decisions = Vec::new();

    let adv_24h = match snapshot.adv_24h {
        Some(v) if v > 0.0 => v,
        _ => return decisions,
    };
    let leverage = snapshot.leverage.unwrap_or(3.0);
    let allocated = ledger.map(|l| l.allocated_capital).unwrap_or(0.0);
    if allocated <= 0.0 {
        return decisions;
    }

    let max_cap = clawchat_shared::capacity::max_capacity(adv_24h, leverage);
    if max_cap <= 0.0 {
        return decisions;
    }

    let util = clawchat_shared::capacity::utilization(allocated, max_cap);
    let status = clawchat_shared::capacity::CapacityStatus::from_utilization(util);

    match status {
        clawchat_shared::capacity::CapacityStatus::Overcapacity => {
            let target_alloc = clawchat_shared::capacity::scale_down_target(max_cap, config::CAPACITY_TARGET_PCT);
            let scale_factor = target_alloc / allocated;
            let new_ps = (snapshot.current_position_size * scale_factor)
                .max(config::POSITION_SIZE_MIN);
            if (new_ps - snapshot.current_position_size).abs() > 0.001 {
                decisions.push(Decision::ScaleDown {
                    new_position_size: new_ps,
                    reason: format!(
                        "容量超载: 利用率 {:.0}% > {:.0}%, ADV=${:.0}, max_cap=${:.0}, 缩仓 {:.2} → {:.2}",
                        util * 100.0,
                        config::CAPACITY_SCALE_DOWN_PCT * 100.0,
                        adv_24h,
                        max_cap,
                        snapshot.current_position_size,
                        new_ps
                    ),
                });
            }
        }
        clawchat_shared::capacity::CapacityStatus::Warning => {
            tracing::warn!(
                strategy = %snapshot.name,
                util_pct = format!("{:.0}", util * 100.0),
                adv_24h,
                max_cap,
                "容量警告"
            );
        }
        clawchat_shared::capacity::CapacityStatus::Expandable => {
            tracing::info!(
                strategy = %snapshot.name,
                util_pct = format!("{:.0}", util * 100.0),
                max_cap,
                "容量充裕，可扩仓"
            );
        }
        clawchat_shared::capacity::CapacityStatus::Normal => {}
    }

    decisions
}

/// 评估策略生命周期，产出决策
///
/// 规则：
/// - dry-run 策略运行 >= N 天且回测 Sharpe > 阈值 → 建议切 live（写 requirements/pending/）
/// - live 策略连续 14 天负收益 → 建议下线（写 issues/pending/）
/// - live 策略回撤超配额 25% → 自动暂停（写 trade.json pause）
pub fn evaluate_lifecycle(
    snapshot: &StrategySnapshot,
    tracked: &TrackedState,
    ledger: Option<&LedgerStrategy>,
) -> Vec<Decision> {
    let mut decisions = Vec::new();
    let now = chrono::Utc::now().timestamp();

    let mode = snapshot.mode.as_deref().unwrap_or("dry-run");

    match mode {
        "dry-run" => {
            // dry-run 策略：运行 >= N 天且 Sharpe > 阈值 → 建议切 live
            if let Some(approved_at) = snapshot.approved_at {
                let running_days = (now - approved_at) as u64 / 86400;
                if running_days >= config::LIFECYCLE_DRYRUN_DAYS {
                    let sharpe = snapshot.backtest_sharpe.unwrap_or(0.0);
                    if sharpe >= config::LIFECYCLE_PROMOTE_SHARPE {
                        decisions.push(Decision::SuggestPromote {
                            reason: format!(
                                "dry-run 运行 {} 天 >= {} 天, Sharpe {:.2} >= {:.1}, 建议切 live",
                                running_days,
                                config::LIFECYCLE_DRYRUN_DAYS,
                                sharpe,
                                config::LIFECYCLE_PROMOTE_SHARPE,
                            ),
                        });
                    }
                }
            }
        }
        "live" => {
            // live 策略回撤超配额 25% → 自动暂停
            if let Some(ls) = ledger {
                let dd = ls.drawdown_pct();
                if dd >= config::DRAWDOWN_STOP_PCT {
                    decisions.push(Decision::Pause {
                        reason: format!(
                            "[lifecycle] live 策略回撤 {:.1}% >= {:.1}%, 自动暂停",
                            dd * 100.0,
                            config::DRAWDOWN_STOP_PCT * 100.0,
                        ),
                    });
                    return decisions;
                }
            }

            // live 策略连续 14 天负收益 → 建议下线
            if let Some(since) = tracked.negative_pnl_since {
                let negative_days = (now - since) as u64 / 86400;
                if negative_days >= config::LIFECYCLE_DEMOTE_DAYS {
                    decisions.push(Decision::SuggestDemote {
                        reason: format!(
                            "live 策略连续 {} 天负收益 >= {} 天, 建议下线",
                            negative_days,
                            config::LIFECYCLE_DEMOTE_DAYS,
                        ),
                    });
                }
            }
        }
        _ => {}
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

/// 为 autopilot 决策发出告警
///
/// 规则：
/// - Stop / Suspend → 红色告警
/// - Pause / ScaleDown → 黄色告警
/// - ScaleUp / Resume / AdjustTrailingStop → 信息告警
/// - NoAction → 不发告警
pub fn emit_decision_alert(
    records_dir: &std::path::Path,
    strategy_name: &str,
    decision: &Decision,
) {
    let (level, message) = match decision {
        Decision::Stop { reason } => (AlertLevel::Red, format!("全平: {reason}")),
        Decision::Suspend { reason } => (AlertLevel::Red, format!("停机: {reason}")),
        Decision::Pause { reason } => (AlertLevel::Yellow, format!("暂停: {reason}")),
        Decision::ScaleDown { new_position_size, reason } => (
            AlertLevel::Yellow,
            format!("缩仓 → {new_position_size:.2}: {reason}"),
        ),
        Decision::ScaleUp { new_position_size, reason } => (
            AlertLevel::Info,
            format!("扩仓 → {new_position_size:.2}: {reason}"),
        ),
        Decision::Resume { reason } => (AlertLevel::Info, format!("恢复: {reason}")),
        Decision::AdjustTrailingStop { new_value, reason } => (
            AlertLevel::Info,
            format!("调节 trailing_stop → {new_value:.3}: {reason}"),
        ),
        Decision::SuggestPromote { reason } => (
            AlertLevel::Info,
            format!("建议切 live: {reason}"),
        ),
        Decision::SuggestDemote { reason } => (
            AlertLevel::Yellow,
            format!("建议下线: {reason}"),
        ),
        Decision::NoAction => return,
    };

    emit_alert(
        records_dir,
        &AlertEvent::new(
            level,
            "autopilot",
            Some(strategy_name.to_string()),
            message,
        ),
    );
}

/// 评估跨策略相关性风险
///
/// 当两个策略收益相关性 > 0.8 且合计敞口超过限制时发出 ScaleDown 建议。
/// `correlation_pairs`: 来自 `shared::correlation::check_correlation_exposure` 的结果
/// `max_correlation_exposure`: 高相关策略组合计敞口限制（如 0.4 = 40%）
///
/// 返回 Vec<(策略名, Decision)>
pub fn evaluate_correlation_risk(
    correlation_pairs: &[(Vec<String>, f64, f64)],
    max_correlation_exposure: f64,
) -> Vec<(String, Decision)> {
    let mut decisions = Vec::new();

    for (strategies, corr, combined_exposure) in correlation_pairs {
        if *combined_exposure > max_correlation_exposure {
            let group_name = strategies.join(" + ");
            let reason = format!(
                "高相关性策略组 [{}] 相关系数={:.2}, 合计敞口={:.1}% > 限制={:.1}%",
                group_name,
                corr,
                combined_exposure * 100.0,
                max_correlation_exposure * 100.0,
            );
            tracing::warn!(%reason, "correlation exposure exceeded");

            // 建议缩仓策略组中的后一个策略
            if let Some(target) = strategies.last() {
                decisions.push((
                    target.clone(),
                    Decision::ScaleDown {
                        new_position_size: 0.15,
                        reason,
                    },
                ));
            }
        } else if corr.abs() > 0.8 {
            let group_name = strategies.join(" + ");
            tracing::warn!(
                strategies = %group_name,
                correlation = %format!("{:.2}", corr),
                combined_exposure = %format!("{:.1}%", combined_exposure * 100.0),
                "高相关性策略组（敞口未超限）"
            );
        }
    }

    decisions
}

/// 为全局回撤发出告警
pub fn emit_global_drawdown_alert(records_dir: &std::path::Path, reason: &str) {
    emit_alert(
        records_dir,
        &AlertEvent::new(
            AlertLevel::Red,
            "autopilot",
            None,
            format!("全局回撤触发: {reason}"),
        ),
    );
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
            funding_rate: None,
            position_side: None,
            adv_24h: None,
            leverage: None,
            mode: None,
            backtest_sharpe: None,
            approved_at: None,
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

    // ── 资金费率防御测试 ──────────────────────────────────────

    #[test]
    fn funding_rate_no_position_no_action() {
        let snap = StrategySnapshot {
            funding_rate: Some(0.001),
            position_side: None,
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.is_empty());
    }

    #[test]
    fn funding_rate_none_no_action() {
        let snap = StrategySnapshot {
            funding_rate: None,
            position_side: Some("long".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.is_empty());
    }

    #[test]
    fn funding_rate_extreme_long_pauses() {
        // 年化 > 100%: rate = 1.0 / 1095 ≈ 0.000913 per 8h → annualized = 100%
        let snap = StrategySnapshot {
            funding_rate: Some(0.001), // annualized ~109.5%
            position_side: Some("long".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }

    #[test]
    fn funding_rate_high_long_scales_down() {
        // 年化 > 50% but < 100%: rate ≈ 0.0005 → annualized ~54.75%
        let snap = StrategySnapshot {
            funding_rate: Some(0.0005),
            position_side: Some("long".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.iter().any(|d| matches!(d, Decision::ScaleDown { .. })));
    }

    #[test]
    fn funding_rate_favorable_long_no_action() {
        // 做多，负费率 = 有利，不自动扩仓
        let snap = StrategySnapshot {
            funding_rate: Some(-0.001),
            position_side: Some("long".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.is_empty());
    }

    #[test]
    fn funding_rate_extreme_short_pauses() {
        // 做空，负费率 = 不利
        let snap = StrategySnapshot {
            funding_rate: Some(-0.001), // annualized ~-109.5%, abs > 100%
            position_side: Some("short".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.iter().any(|d| matches!(d, Decision::Pause { .. })));
    }

    #[test]
    fn funding_rate_normal_no_action() {
        // 正常费率 0.01% = 0.0001, annualized ~10.95%
        let snap = StrategySnapshot {
            funding_rate: Some(0.0001),
            position_side: Some("long".to_string()),
            ..default_snapshot()
        };
        let decisions = evaluate_funding_rate(&snap);
        assert!(decisions.is_empty());
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

    // ── 容量利用率测试 ──────────────────────────────────────────

    #[test]
    fn capacity_overcapacity_triggers_scale_down() {
        // ADV=$100K, leverage=3 → max_cap=$33.33
        // allocated=$50 → utilization=150% > 120%
        let snap = StrategySnapshot {
            adv_24h: Some(100_000.0),
            leverage: Some(3.0),
            ..default_snapshot()
        };
        let ledger = default_ledger(50.0, 0.0);
        let decisions = evaluate_capacity(&snap, Some(&ledger));
        assert!(
            decisions.iter().any(|d| matches!(d, Decision::ScaleDown { .. })),
            "should trigger scale down when overcapacity: {decisions:?}"
        );
    }

    #[test]
    fn capacity_normal_no_scale_down() {
        // ADV=$10M, leverage=3 → max_cap=$3333
        // allocated=$200 → utilization=6% (well within limits)
        let snap = StrategySnapshot {
            adv_24h: Some(10_000_000.0),
            leverage: Some(3.0),
            ..default_snapshot()
        };
        let ledger = default_ledger(200.0, 0.0);
        let decisions = evaluate_capacity(&snap, Some(&ledger));
        assert!(
            decisions.is_empty(),
            "should not scale down when utilization is normal: {decisions:?}"
        );
    }

    #[test]
    fn capacity_no_adv_data_no_action() {
        let snap = StrategySnapshot {
            adv_24h: None,
            leverage: Some(3.0),
            ..default_snapshot()
        };
        let ledger = default_ledger(200.0, 0.0);
        let decisions = evaluate_capacity(&snap, Some(&ledger));
        assert!(decisions.is_empty());
    }

    // ── 相关性风控测试 ──────────────────────────────────────────

    #[test]
    fn correlation_risk_triggers_scale_down_when_over_limit() {
        let pairs = vec![
            (vec!["s1".to_string(), "s2".to_string()], 0.85, 0.50),
        ];
        let decisions = evaluate_correlation_risk(&pairs, 0.40);
        assert_eq!(decisions.len(), 1);
        assert_eq!(decisions[0].0, "s2");
        assert!(matches!(decisions[0].1, Decision::ScaleDown { .. }));
    }

    #[test]
    fn correlation_risk_no_action_when_under_limit() {
        let pairs = vec![
            (vec!["s1".to_string(), "s2".to_string()], 0.85, 0.30),
        ];
        let decisions = evaluate_correlation_risk(&pairs, 0.40);
        // 敞口未超限，只 warn 不产生 decision
        assert!(decisions.is_empty());
    }

    #[test]
    fn correlation_risk_empty_pairs() {
        let pairs: Vec<(Vec<String>, f64, f64)> = Vec::new();
        let decisions = evaluate_correlation_risk(&pairs, 0.40);
        assert!(decisions.is_empty());
    }

    #[test]
    fn correlation_risk_multiple_pairs() {
        let pairs = vec![
            (vec!["s1".to_string(), "s2".to_string()], 0.90, 0.50),
            (vec!["s3".to_string(), "s4".to_string()], 0.82, 0.45),
        ];
        let decisions = evaluate_correlation_risk(&pairs, 0.40);
        assert_eq!(decisions.len(), 2);
    }

    // ── 策略生命周期评估测试 ────────────────────────────────────

    #[test]
    fn lifecycle_dryrun_promote_when_ready() {
        let now = chrono::Utc::now().timestamp();
        let snap = StrategySnapshot {
            mode: Some("dry-run".to_string()),
            backtest_sharpe: Some(3.0),
            approved_at: Some(now - 4 * 86400), // 4 天前
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        let decisions = evaluate_lifecycle(&snap, &tracked, None);
        assert!(
            decisions.iter().any(|d| matches!(d, Decision::SuggestPromote { .. })),
            "should suggest promote: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_dryrun_no_promote_too_early() {
        let now = chrono::Utc::now().timestamp();
        let snap = StrategySnapshot {
            mode: Some("dry-run".to_string()),
            backtest_sharpe: Some(3.0),
            approved_at: Some(now - 2 * 86400), // 2 天前，不够 3 天
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        let decisions = evaluate_lifecycle(&snap, &tracked, None);
        assert!(
            decisions.is_empty(),
            "should not promote too early: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_dryrun_no_promote_low_sharpe() {
        let now = chrono::Utc::now().timestamp();
        let snap = StrategySnapshot {
            mode: Some("dry-run".to_string()),
            backtest_sharpe: Some(1.5), // 低于 2.0
            approved_at: Some(now - 5 * 86400),
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        let decisions = evaluate_lifecycle(&snap, &tracked, None);
        assert!(
            decisions.is_empty(),
            "should not promote with low sharpe: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_live_demote_after_negative_days() {
        let now = chrono::Utc::now().timestamp();
        let snap = StrategySnapshot {
            mode: Some("live".to_string()),
            ..default_snapshot()
        };
        let tracked = TrackedState {
            negative_pnl_since: Some(now - 15 * 86400), // 15 天负收益
            ..Default::default()
        };
        let decisions = evaluate_lifecycle(&snap, &tracked, None);
        assert!(
            decisions.iter().any(|d| matches!(d, Decision::SuggestDemote { .. })),
            "should suggest demote: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_live_no_demote_short_negative() {
        let now = chrono::Utc::now().timestamp();
        let snap = StrategySnapshot {
            mode: Some("live".to_string()),
            ..default_snapshot()
        };
        let tracked = TrackedState {
            negative_pnl_since: Some(now - 10 * 86400), // 10 天，不够 14 天
            ..Default::default()
        };
        let decisions = evaluate_lifecycle(&snap, &tracked, None);
        assert!(
            !decisions.iter().any(|d| matches!(d, Decision::SuggestDemote { .. })),
            "should not demote yet: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_live_pause_on_drawdown() {
        let snap = StrategySnapshot {
            mode: Some("live".to_string()),
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        // 25% drawdown: peak=200, realized=-50 → equity=150, dd=25%
        let ledger = LedgerStrategy {
            strategy_name: "test".into(),
            allocated_capital: 200.0,
            realized_pnl: -50.0,
            unrealized_pnl: 0.0,
            fees_paid: 0.0,
            funding_paid: 0.0,
            peak_equity: 200.0,
        };
        let decisions = evaluate_lifecycle(&snap, &tracked, Some(&ledger));
        assert!(
            decisions.iter().any(|d| matches!(d, Decision::Pause { .. })),
            "should pause on drawdown: {decisions:?}"
        );
    }

    #[test]
    fn lifecycle_live_no_action_healthy() {
        let snap = StrategySnapshot {
            mode: Some("live".to_string()),
            ..default_snapshot()
        };
        let tracked = TrackedState::default();
        let ledger = default_ledger(200.0, 10.0);
        let decisions = evaluate_lifecycle(&snap, &tracked, Some(&ledger));
        assert!(
            decisions.is_empty(),
            "should have no action when healthy: {decisions:?}"
        );
    }
}
