//! 硬编码的调控阈值 — 不再依赖 autopilot.json

/// 连续亏损 N 笔 → pause
pub const CONSECUTIVE_LOSS_PAUSE: u32 = 3;

/// 日损失占 capital 比例 → pause
pub const DAILY_LOSS_PAUSE_PCT: f64 = 0.15;

/// 暂停后自动恢复（分钟）
pub const AUTO_RESUME_MINUTES: u64 = 30;

/// 策略回撤占配额比例 → stop（全平）
pub const DRAWDOWN_STOP_PCT: f64 = 0.25;

/// 全局回撤红线（总资产相对起始）→ 全部 pause
pub const GLOBAL_DRAWDOWN_PAUSE_PCT: f64 = 0.10;

/// 盈利时 trailing_stop 收紧区间
pub const TRAILING_STOP_MIN: f64 = 0.01;
pub const TRAILING_STOP_MAX: f64 = 0.05;

/// 仓位缩放
pub const SCALE_UP_AFTER_WINS: u32 = 3;
pub const SCALE_DOWN_AFTER_LOSSES: u32 = 2;
pub const SCALE_UP_FACTOR: f64 = 1.2;
pub const SCALE_DOWN_FACTOR: f64 = 0.7;
pub const POSITION_SIZE_MIN: f64 = 0.10;
pub const POSITION_SIZE_MAX: f64 = 0.50;
pub const SCALE_COOLDOWN_SECS: u64 = 300;

/// 持续亏损超时停机（小时）
pub const NEGATIVE_PNL_SUSPEND_HOURS: u64 = 48;

/// 总亏损占 capital 比例 → suspend
pub const TOTAL_LOSS_SUSPEND_PCT: f64 = 0.20;

// ── 资金费率防御 ─────────────────────────────────────────────

/// 年化费率 > 50% 且持仓方向不利 → 缩仓 30%
pub const FUNDING_RATE_SCALE_DOWN_ANNUALIZED: f64 = 0.50;
pub const FUNDING_RATE_SCALE_DOWN_FACTOR: f64 = 0.70;

/// 年化费率 > 100% → 暂停该策略
pub const FUNDING_RATE_PAUSE_ANNUALIZED: f64 = 1.00;

/// 年化费率 < -20% 且持仓方向有利 → 标记费率有利（允许扩仓）
pub const FUNDING_RATE_FAVORABLE_ANNUALIZED: f64 = -0.20;

/// 每 8h 费率 → 年化: rate * 3 * 365
pub const FUNDING_PERIODS_PER_YEAR: f64 = 1095.0;

// ── 容量利用率 ──────────────────────────────────────────────

/// 利用率 > 120% → 自动缩仓至 80%
pub const CAPACITY_SCALE_DOWN_PCT: f64 = 1.20;
/// 缩仓目标利用率
pub const CAPACITY_TARGET_PCT: f64 = 0.80;

// ── 策略生命周期评估 ────────────────────────────────────────

/// dry-run 最少观察天数（达到后才评估是否切 live）
pub const LIFECYCLE_DRYRUN_DAYS: u64 = 3;
/// dry-run 切 live 的最低 Sharpe 要求
pub const LIFECYCLE_PROMOTE_SHARPE: f64 = 2.0;
/// live 策略连续亏损天数 → 建议下线
pub const LIFECYCLE_DEMOTE_DAYS: u64 = 14;
