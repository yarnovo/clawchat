//! autopilot — 数据驱动的动态调控引擎
//!
//! 读取 ledger.json + state.json + risk.json，根据硬编码规则自动：
//! - 暂停/恢复交易（写 trade.json）
//! - 回撤超限全平（写 trade.json close_all）
//! - 扩仓/缩仓（改 signal.json position_size）
//! - 调节 trailing_stop（改 risk.json）
//! - 停机（改 signal.json status=suspended）

mod config;
mod engine;
mod types;
mod writer;

use engine::{Decision, StrategySnapshot, TrackedState};
use types::{EngineState, Ledger, RiskConfig, StrategyFile};

use clap::Parser;
use notify::{EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::mpsc;

/// records/ 目录路径（全局，用于告警写入）
fn records_dir() -> PathBuf {
    clawchat_shared::paths::records_dir()
}

/// autopilot — 数据驱动的动态调控引擎
#[derive(Parser, Debug)]
struct Args {
    /// strategies 目录路径（默认 accounts/binance-main/portfolios/main/strategies）
    #[arg(long)]
    strategies_dir: Option<PathBuf>,

    /// 轮询间隔（秒），用于 ledger.json 定时读取
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
    tracked: TrackedState,
}

fn main() {
    let args = Args::parse();
    let strategies_dir = args
        .strategies_dir
        .unwrap_or_else(|| clawchat_shared::paths::strategies_dir());
    let ledger_path = clawchat_shared::paths::records_dir().join("ledger.json");

    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(&args.log_level)),
        )
        .init();

    tracing::info!(
        strategies_dir = %strategies_dir.display(),
        ledger = %ledger_path.display(),
        interval = args.interval,
        dry_run = args.dry_run,
        "autopilot starting (data-driven mode)"
    );

    // 初始扫描：找所有 approved 策略
    let mut contexts = scan_strategies(&strategies_dir);
    tracing::info!(count = contexts.len(), "found approved strategies");

    // 启动文件监听（state.json + signal.json 变化）
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
                    if fname == "state.json" || fname == "signal.json" {
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
                let strategy_dir = changed_path.parent().unwrap_or(&changed_path);
                let strategy_name = strategy_dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                // signal.json 变化 → 可能是新策略上线或状态变更
                if changed_path.ends_with("signal.json") {
                    handle_signal_change(&mut contexts, &strategy_name, strategy_dir);
                    continue;
                }

                // state.json 变化 → 评估该策略
                if let Some(ctx) = contexts.get_mut(&strategy_name) {
                    let ledger = Ledger::load(&ledger_path);
                    let ledger_strats = ledger.as_ref().map(|l| l.all_strategies());
                    let ls = ledger_strats
                        .as_ref()
                        .and_then(|s| s.get(&strategy_name));
                    process_strategy(ctx, ls, args.dry_run);
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // 定时轮询：读 ledger.json，评估所有策略
                let new_contexts = scan_strategies(&strategies_dir);
                for (name, new_ctx) in new_contexts {
                    contexts.entry(name).or_insert(new_ctx);
                }

                let ledger = Ledger::load(&ledger_path);
                let ledger_strats = ledger.as_ref().map(|l| l.all_strategies());

                // 全局回撤检查
                if let Some(ref l) = ledger {
                    if let Some(reason) = engine::check_global_drawdown(
                        l.total_equity(),
                        l.total_allocated(),
                    ) {
                        tracing::warn!("{reason} — 全部策略 pause");
                        engine::emit_global_drawdown_alert(&records_dir(), &reason);
                        if !args.dry_run {
                            for ctx in contexts.values_mut() {
                                if !ctx.tracked.paused {
                                    let _ = writer::write_trade_json(
                                        &ctx.dir,
                                        "pause",
                                        &format!("[autopilot] {reason}"),
                                    );
                                    ctx.tracked.paused = true;
                                    ctx.tracked.paused_at =
                                        Some(chrono::Utc::now().timestamp());
                                }
                            }
                        }
                        continue;
                    }
                }

                for (name, ctx) in contexts.iter_mut() {
                    let ls = ledger_strats
                        .as_ref()
                        .and_then(|s| s.get(name));
                    process_strategy(ctx, ls, args.dry_run);
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                tracing::error!("file watcher disconnected");
                break;
            }
        }
    }
}

/// signal.json 变化处理：新策略加入/状态变更
fn handle_signal_change(
    contexts: &mut HashMap<String, StrategyContext>,
    strategy_name: &str,
    strategy_dir: &Path,
) {
    let signal_path = strategy_dir.join("signal.json");
    let Ok(contents) = std::fs::read_to_string(&signal_path) else { return };
    let Ok(sf) = serde_json::from_str::<StrategyFile>(&contents) else { return };

    let status = sf.status.as_deref().unwrap_or("");
    if status == "approved" {
        if !contexts.contains_key(strategy_name) {
            tracing::info!(strategy = %strategy_name, "new strategy detected");
            contexts.insert(
                strategy_name.to_string(),
                StrategyContext {
                    dir: strategy_dir.to_path_buf(),
                    tracked: TrackedState::default(),
                },
            );
        }
    } else if status == "suspended" {
        if contexts.remove(strategy_name).is_some() {
            tracing::info!(strategy = %strategy_name, "strategy suspended, removed from watch");
        }
    }
}

/// 扫描 strategies/ 目录，找到 approved 策略（不需要 autopilot.json）
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

        let strategy_path = dir.join("signal.json");
        if let Ok(contents) = std::fs::read_to_string(&strategy_path) {
            if let Ok(sf) = serde_json::from_str::<StrategyFile>(&contents) {
                let status = sf.status.as_deref().unwrap_or("");
                if status != "approved" {
                    continue;
                }

                let name = dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                result.insert(
                    name,
                    StrategyContext {
                        dir,
                        tracked: TrackedState::default(),
                    },
                );
            }
        }
    }

    result
}

/// 处理单个策略：加载数据 → 评估规则 → 执行决策
fn process_strategy(
    ctx: &mut StrategyContext,
    ledger_strat: Option<&types::LedgerStrategy>,
    dry_run: bool,
) {
    let strategy_name = ctx.dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // 加载 state.json
    let state_path = ctx.dir.join("state.json");
    let state: EngineState = match std::fs::read_to_string(&state_path) {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!(strategy = %strategy_name, "parse state.json: {e}");
                return;
            }
        },
        Err(_) => return, // 引擎未运行
    };

    // 检测新交易
    ctx.tracked.update_from_stats(&state.trade_stats);

    // 加载 signal.json 获取 position_size
    let strategy_path = ctx.dir.join("signal.json");
    let strategy: StrategyFile = match std::fs::read_to_string(&strategy_path) {
        Ok(contents) => match serde_json::from_str(&contents) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!(strategy = %strategy_name, "parse signal.json: {e}");
                return;
            }
        },
        Err(e) => {
            tracing::warn!(strategy = %strategy_name, "read signal.json: {e}");
            return;
        }
    };

    // 加载 risk.json
    let risk_path = ctx.dir.join("risk.json");
    let risk = RiskConfig::load(&risk_path);

    // 读取当前资金费率（从 records/funding_rate_latest.json）
    let funding_rate_path = clawchat_shared::paths::records_dir().join("funding_rate_latest.json");
    let (funding_rate, position_side) = load_funding_info(
        &funding_rate_path,
        strategy.symbol.as_deref().unwrap_or(""),
        ledger_strat,
    );

    // 构建快照
    let snapshot = StrategySnapshot {
        name: strategy_name.clone(),
        current_position_size: strategy.position_size.unwrap_or(0.3),
        current_trailing_stop: risk.trailing_stop,
        funding_rate,
        position_side,
        adv_24h: None,
        leverage: strategy.leverage.map(|l| l as f64),
    };

    // 评估规则
    let mut decisions = engine::evaluate(
        &snapshot,
        &ctx.tracked,
        &state.trade_stats,
        ledger_strat,
    );

    // 资金费率防御评估
    let funding_decisions = engine::evaluate_funding_rate(&snapshot);
    if !funding_decisions.is_empty() {
        // 费率决策优先级高于常规缩放，插入到前面
        for d in funding_decisions.into_iter().rev() {
            decisions.insert(0, d);
        }
        // 去掉 NoAction（如果有的话）
        decisions.retain(|d| !matches!(d, Decision::NoAction));
    }

    // 执行决策
    for decision in &decisions {
        if matches!(decision, Decision::NoAction) {
            continue;
        }

        tracing::info!(strategy = %strategy_name, decision = ?decision, "autopilot decision");

        // 发出告警
        engine::emit_decision_alert(&records_dir(), &strategy_name, decision);

        if dry_run {
            tracing::info!(strategy = %strategy_name, "[DRY-RUN] would execute: {decision:?}");
            continue;
        }

        match decision {
            Decision::Pause { reason } => {
                if let Err(e) = writer::write_trade_json(
                    &ctx.dir,
                    "pause",
                    &format!("[autopilot] {reason}"),
                ) {
                    tracing::error!(strategy = %strategy_name, "write trade.json: {e}");
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
                    tracing::error!(strategy = %strategy_name, "write trade.json: {e}");
                }
                ctx.tracked.paused = false;
                ctx.tracked.paused_at = None;
                ctx.tracked.consecutive_losses = 0;
            }
            Decision::Stop { reason } => {
                if let Err(e) = writer::write_trade_json(
                    &ctx.dir,
                    "close_all",
                    &format!("[autopilot] {reason}"),
                ) {
                    tracing::error!(strategy = %strategy_name, "write trade.json: {e}");
                }
            }
            Decision::ScaleUp { new_position_size, reason } => {
                if let Err(e) = writer::update_position_size(&ctx.dir, *new_position_size) {
                    tracing::error!(strategy = %strategy_name, "update position_size: {e}");
                } else {
                    tracing::info!(strategy = %strategy_name, reason, "scaled up");
                    ctx.tracked.last_scale_at = Some(chrono::Utc::now().timestamp());
                    ctx.tracked.consecutive_wins = 0;
                }
            }
            Decision::ScaleDown { new_position_size, reason } => {
                if let Err(e) = writer::update_position_size(&ctx.dir, *new_position_size) {
                    tracing::error!(strategy = %strategy_name, "update position_size: {e}");
                } else {
                    tracing::info!(strategy = %strategy_name, reason, "scaled down");
                    ctx.tracked.last_scale_at = Some(chrono::Utc::now().timestamp());
                    ctx.tracked.consecutive_losses = 0;
                }
            }
            Decision::Suspend { reason } => {
                if let Err(e) = writer::update_strategy_status(&ctx.dir, "suspended") {
                    tracing::error!(strategy = %strategy_name, "update status: {e}");
                } else {
                    tracing::warn!(strategy = %strategy_name, reason, "SUSPENDED by autopilot");
                }
            }
            Decision::AdjustTrailingStop { new_value, reason } => {
                if let Err(e) = writer::update_trailing_stop(&ctx.dir, *new_value) {
                    tracing::error!(strategy = %strategy_name, "update trailing_stop: {e}");
                } else {
                    tracing::info!(strategy = %strategy_name, reason, "adjusted trailing_stop");
                }
            }
            Decision::NoAction => {}
        }
    }
}

/// 从 records/funding_rate_latest.json 加载指定币种的费率和持仓方向
fn load_funding_info(
    path: &std::path::Path,
    symbol: &str,
    ledger_strat: Option<&types::LedgerStrategy>,
) -> (Option<f64>, Option<String>) {
    if symbol.is_empty() {
        return (None, None);
    }

    // 读取费率
    let funding_rate = std::fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|data| {
            // funding_rate_latest.json 格式: { "NTRNUSDT": { "rate": 0.0001, ... }, ... }
            data.get(symbol)
                .and_then(|entry| entry.get("rate").and_then(|v| v.as_f64()))
        });

    // 从 ledger 推断持仓方向
    let position_side = ledger_strat.and_then(|ls| {
        if ls.unrealized_pnl.abs() < f64::EPSILON {
            None // 无仓位
        } else {
            // 简化判断：unrealized_pnl 存在时认为有仓位
            // 真实方向需要从 state.json 或 positions 获取
            // 这里保守处理：有 unrealized_pnl 说明有仓位，方向由费率符号决定策略
            Some("long".to_string()) // 默认做多（大多数策略）
        }
    });

    (funding_rate, position_side)
}
