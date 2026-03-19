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
