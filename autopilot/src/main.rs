//! autopilot — 算法自动调控引擎
//!
//! 监听所有策略的 state.json 变化，根据 autopilot.json 规则自动：
//! - 暂停/恢复交易（写 trade.json）
//! - 扩仓/缩仓（改 signal.json position_size）
//! - 调节 trailing_stop（改 risk.json）
//! - 停机（改 signal.json status=suspended）

mod config;
mod engine;
mod types;
mod writer;

use config::AutopilotConfig;
use engine::{Decision, StrategySnapshot, TrackedState};
use types::{EngineState, RiskFile, StrategyFile};

use clap::Parser;
use notify::{EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::mpsc;

/// autopilot — 算法自动调控引擎
#[derive(Parser, Debug)]
struct Args {
    /// strategies 目录路径（默认 accounts/binance-main/portfolios/main/strategies）
    #[arg(long)]
    strategies_dir: Option<PathBuf>,

    /// 周期扫描间隔（秒），用于时间相关规则
    #[arg(long, default_value_t = 30)]
    interval: u64,

    /// dry-run 模式：只打印决策，不写文件
    #[arg(long, default_value_t = false)]
    dry_run: bool,

    /// 日志级别
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    log_level: String,
}

/// 每个策略的运行时上下文
struct StrategyContext {
    dir: PathBuf,
    config: AutopilotConfig,
    tracked: TrackedState,
}

fn main() {
    let args = Args::parse();
    let strategies_dir = args
        .strategies_dir
        .unwrap_or_else(|| clawchat_shared::paths::strategies_dir());

    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(&args.log_level)),
        )
        .init();

    tracing::info!(
        strategies_dir = %strategies_dir.display(),
        interval = args.interval,
        dry_run = args.dry_run,
        "autopilot starting"
    );

    // 初始扫描
    let mut contexts = scan_strategies(&strategies_dir);
    tracing::info!(count = contexts.len(), "found strategies with autopilot.json");

    if contexts.is_empty() {
        tracing::warn!("no strategies with autopilot.json found, waiting for changes...");
    }

    // 启动文件监听
    let (tx, rx) = mpsc::channel::<PathBuf>();
    let tx_clone = tx.clone();
    let watch_dir = strategies_dir.clone();

    let mut watcher = notify::recommended_watcher(
        move |res: Result<notify::Event, notify::Error>| {
            let Ok(event) = res else { return };
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {}
                _ => return,
            }
            for path in &event.paths {
                if let Some(filename) = path.file_name() {
                    let fname = filename.to_string_lossy();
                    if fname == "state.json" || fname == "autopilot.json" {
                        let _ = tx_clone.send(path.clone());
                    }
                }
            }
        },
    )
    .expect("failed to create file watcher");

    watcher
        .watch(&watch_dir, RecursiveMode::Recursive)
        .expect("failed to watch strategies directory");

    tracing::info!(dir = %watch_dir.display(), "file watcher started");

    // 主事件循环
    let timeout = std::time::Duration::from_secs(args.interval);

    loop {
        match rx.recv_timeout(timeout) {
            Ok(changed_path) => {
                // 找到对应的策略目录
                let strategy_dir = changed_path.parent().unwrap_or(&changed_path);
                let strategy_name = strategy_dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                // autopilot.json 变化 → 重新加载配置
                if changed_path.ends_with("autopilot.json") {
                    tracing::info!(strategy = %strategy_name, "autopilot.json changed, reloading");
                    if let Some(cfg) = AutopilotConfig::load(&changed_path) {
                        if cfg.enabled {
                            contexts
                                .entry(strategy_name.clone())
                                .and_modify(|ctx| ctx.config = cfg.clone())
                                .or_insert_with(|| StrategyContext {
                                    dir: strategy_dir.to_path_buf(),
                                    config: cfg,
                                    tracked: TrackedState::default(),
                                });
                        } else {
                            tracing::info!(strategy = %strategy_name, "autopilot disabled");
                            contexts.remove(&strategy_name);
                        }
                    }
                    continue;
                }

                // state.json 变化 → 评估规则
                if let Some(ctx) = contexts.get_mut(&strategy_name) {
                    process_strategy(ctx, args.dry_run);
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // 周期扫描：重新扫描策略目录 + 评估时间相关规则
                let new_contexts = scan_strategies(&strategies_dir);
                for (name, new_ctx) in new_contexts {
                    contexts
                        .entry(name)
                        .and_modify(|ctx| ctx.config = new_ctx.config.clone())
                        .or_insert(new_ctx);
                }

                for ctx in contexts.values_mut() {
                    process_strategy(ctx, args.dry_run);
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                tracing::error!("file watcher disconnected");
                break;
            }
        }
    }
}

/// 扫描 strategies/ 目录，找到有 autopilot.json 且 enabled 的策略
fn scan_strategies(strategies_dir: &Path) -> HashMap<String, StrategyContext> {
    let mut result = HashMap::new();

    let entries = match std::fs::read_dir(strategies_dir) {
        Ok(e) => e,
        Err(e) => {
            tracing::error!(dir = %strategies_dir.display(), "failed to read: {e}");
            return result;
        }
    };

    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }

        let autopilot_path = dir.join("autopilot.json");
        if !autopilot_path.exists() {
            continue;
        }

        let Some(config) = AutopilotConfig::load(&autopilot_path) else {
            continue;
        };

        if !config.enabled {
            continue;
        }

        // 只监控 approved/active 状态的策略
        let strategy_path = dir.join("signal.json");
        if let Ok(contents) = std::fs::read_to_string(&strategy_path) {
            if let Ok(sf) = serde_json::from_str::<StrategyFile>(&contents) {
                let status = sf.status.as_deref().unwrap_or("");
                if status != "approved" && status != "active" {
                    continue;
                }
            }
        }

        let name = dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        tracing::info!(strategy = %name, "autopilot enabled");
        result.insert(
            name,
            StrategyContext {
                dir,
                config,
                tracked: TrackedState::default(),
            },
        );
    }

    result
}

/// 处理单个策略：加载数据 → 评估规则 → 执行决策
fn process_strategy(ctx: &mut StrategyContext, dry_run: bool) {
    let name = &ctx.config.name;

    // 加载 state.json
    let state_path = ctx.dir.join("state.json");
    let state: EngineState = match std::fs::read_to_string(&state_path) {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!(strategy = %name, "parse state.json: {e}");
                return;
            }
        },
        Err(_) => return, // 引擎未运行，没有 state.json
    };

    // 检测新交易
    let has_new_trades = ctx.tracked.update_from_stats(&state.trade_stats);
    if !has_new_trades && ctx.tracked.prev_stats.total > 0 {
        // 没有新交易且不是首次加载，跳过（除非是定时扫描）
        // 定时扫描由 timeout 触发，也会进入这里用于时间相关规则
    }

    // 加载 signal.json
    let strategy_path = ctx.dir.join("signal.json");
    let strategy: StrategyFile = match std::fs::read_to_string(&strategy_path) {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!(strategy = %name, "parse signal.json: {e}");
                return;
            }
        },
        Err(e) => {
            tracing::warn!(strategy = %name, "read signal.json: {e}");
            return;
        }
    };

    // 加载 risk.json
    let risk_path = ctx.dir.join("risk.json");
    let risk: RiskFile = match std::fs::read_to_string(&risk_path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => RiskFile::default(),
    };

    // 构建快照
    let snapshot = StrategySnapshot {
        name: name.clone(),
        current_position_size: strategy.position_size.unwrap_or(0.3),
        capital: 200.0, // TODO: 从 signal.json capital 字段读
        status: strategy.status.unwrap_or_default(),
        current_trailing_stop: risk.trailing_stop,
    };

    // 评估规则
    let decisions = engine::evaluate(&ctx.config, &snapshot, &ctx.tracked, &state.trade_stats);

    // 执行决策
    for decision in &decisions {
        if matches!(decision, Decision::NoAction) {
            continue;
        }

        tracing::info!(strategy = %name, decision = ?decision, "autopilot decision");

        if dry_run {
            tracing::info!(strategy = %name, "[DRY-RUN] would execute: {decision:?}");
            continue;
        }

        match decision {
            Decision::Pause { reason } => {
                if let Err(e) = writer::write_trade_json(
                    &ctx.dir,
                    "pause",
                    &format!("[autopilot] {reason}"),
                ) {
                    tracing::error!(strategy = %name, "write trade.json: {e}");
                }
                ctx.tracked.paused = true;
                ctx.tracked.paused_at = Some(chrono::Utc::now().timestamp());
            }
            Decision::Resume { reason } => {
                if let Err(e) = writer::write_trade_json(
                    &ctx.dir,
                    "resume",
                    &format!("[autopilot] {reason}"),
                ) {
                    tracing::error!(strategy = %name, "write trade.json: {e}");
                }
                ctx.tracked.paused = false;
                ctx.tracked.paused_at = None;
                // 恢复后重置连续亏损计数
                ctx.tracked.consecutive_losses = 0;
            }
            Decision::ScaleUp { new_position_size, reason } => {
                if let Err(e) = writer::update_position_size(&ctx.dir, *new_position_size) {
                    tracing::error!(strategy = %name, "update position_size: {e}");
                } else {
                    tracing::info!(strategy = %name, reason, "scaled up");
                    ctx.tracked.last_scale_at = Some(chrono::Utc::now().timestamp());
                    ctx.tracked.consecutive_wins = 0; // 重置，等下一轮积累
                }
            }
            Decision::ScaleDown { new_position_size, reason } => {
                if let Err(e) = writer::update_position_size(&ctx.dir, *new_position_size) {
                    tracing::error!(strategy = %name, "update position_size: {e}");
                } else {
                    tracing::info!(strategy = %name, reason, "scaled down");
                    ctx.tracked.last_scale_at = Some(chrono::Utc::now().timestamp());
                    ctx.tracked.consecutive_losses = 0;
                }
            }
            Decision::Suspend { reason } => {
                if let Err(e) = writer::update_strategy_status(&ctx.dir, "suspended") {
                    tracing::error!(strategy = %name, "update status: {e}");
                } else {
                    tracing::warn!(strategy = %name, reason, "SUSPENDED by autopilot");
                }
            }
            Decision::AdjustTrailingStop { new_value, reason } => {
                if let Err(e) = writer::update_trailing_stop(&ctx.dir, *new_value) {
                    tracing::error!(strategy = %name, "update trailing_stop: {e}");
                } else {
                    tracing::info!(strategy = %name, reason, "adjusted trailing_stop");
                }
            }
            Decision::NoAction => {}
        }
    }
}

/// 记录 autopilot 决策到日志文件（审计追踪）
#[allow(dead_code)]
fn log_decision(strategy_dir: &Path, strategy_name: &str, decision: &Decision) {
    let log_path = strategy_dir.join("autopilot.log");
    let timestamp = chrono::Utc::now()
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let line = format!("{timestamp} [{strategy_name}] {decision:?}\n");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .and_then(|mut f| std::io::Write::write_all(&mut f, line.as_bytes()));
}
