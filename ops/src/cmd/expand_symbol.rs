use clawchat_shared::paths;
use clawchat_shared::symbols::{SymbolRegistry, SymbolStatus};
use std::process::Command as ProcessCommand;

use crate::Ctx;

/// 单币种全链路扩展：回填数据 → 策略发现
pub async fn run(
    _ctx: &Ctx,
    symbol: &str,
    backfill_days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbol = symbol.to_uppercase();
    let symbols_path = paths::default_symbols_json();

    // 检查 symbols.json
    let mut registry = if symbols_path.exists() {
        SymbolRegistry::load(&symbols_path).map_err(|e| format!("load symbols.json: {e}"))?
    } else {
        return Err("symbols.json 不存在，请先运行 scan-symbols".into());
    };

    if !registry.contains(&symbol) {
        println!("  {symbol} 不在 symbols.json 中，自动添加...");
        registry.add_symbol(symbol.clone(), None);
        registry.save(&symbols_path)?;
    }

    let project_root = paths::project_root();

    // ── Step 1: 回填数据 ──
    println!("\n  [1/2] 回填 {symbol} 历史数据 ({backfill_days} 天)...\n");

    let backfill_status = ProcessCommand::new("cargo")
        .args([
            "run", "--release", "-p", "data-engine", "--",
            "backfill",
            "--days", &backfill_days.to_string(),
            "--symbols", &symbol,
        ])
        .current_dir(&project_root)
        .status();

    match backfill_status {
        Ok(status) if status.success() => {
            println!("\n  数据回填完成");
        }
        Ok(status) => {
            eprintln!("\n  数据回填失败 (exit code: {:?})", status.code());
            return Err("backfill failed".into());
        }
        Err(e) => {
            eprintln!("\n  无法启动 data-engine: {e}");
            return Err(e.into());
        }
    }

    // ── Step 2: 策略发现 ──
    println!("\n  [2/2] 运行策略发现 ({symbol}, all strategies, all timeframes)...\n");

    let discovery_status = ProcessCommand::new("cargo")
        .args([
            "run", "--release", "-p", "discovery", "--",
            "scan",
            "--strategy", "all",
            "--symbol", &symbol,
            "--timeframe", "all",
            "--days", "90",
        ])
        .current_dir(&project_root)
        .status();

    match discovery_status {
        Ok(status) if status.success() => {
            println!("\n  策略发现完成");
        }
        Ok(status) => {
            eprintln!("\n  策略发现失败 (exit code: {:?})", status.code());
            // 发现失败不是致命错误，可能只是没找到好参数
            registry.set_status(&symbol, SymbolStatus::NoSignal);
            registry.save(&symbols_path)?;
            println!("  已将 {symbol} 状态设为 no_signal");
            return Ok(());
        }
        Err(e) => {
            eprintln!("\n  无法启动 discovery: {e}");
            return Err(e.into());
        }
    }

    // 检查 discovered/ 是否有该币种的策略
    let discovered_dir = paths::discovered_dir();
    let has_discovery = if discovered_dir.exists() {
        std::fs::read_dir(&discovered_dir)?
            .filter_map(|e| e.ok())
            .any(|entry| {
                entry.file_name().to_string_lossy().to_uppercase().contains(
                    &symbol.trim_end_matches("USDT"),
                )
            })
    } else {
        false
    };

    if has_discovery {
        println!("\n  在 discovered/ 中发现 {symbol} 策略候选");
        println!("  运行 /review-discovered 审批上线");
    } else {
        registry.set_status(&symbol, SymbolStatus::NoSignal);
        registry.save(&symbols_path)?;
        println!("\n  未发现 {symbol} 优质策略，状态设为 no_signal");
    }

    Ok(())
}
