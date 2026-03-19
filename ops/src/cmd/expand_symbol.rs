use std::process::Command;

use clawchat_shared::paths;
use clawchat_shared::symbols::{SymbolRegistry, SymbolStatus};

use crate::Ctx;

/// 单币种全链路扩展：回填历史数据 + 策略发现
pub async fn run(
    _ctx: &Ctx,
    symbol: &str,
    days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbol = symbol.to_uppercase();
    println!("=== 扩展币种: {} ===\n", symbol);

    // ── Step 1: 回填历史数据 ──
    println!("  [1/2] 回填 {} 天 1m K 线...", days);

    let backfill_status = Command::new("cargo")
        .args([
            "run", "--release", "-p", "data-engine", "--",
            "backfill",
            "--symbols", &symbol,
            "--days", &days.to_string(),
            "--intervals", "1m",
        ])
        .status()?;

    if !backfill_status.success() {
        return Err(format!("data-engine backfill 失败 (exit code: {:?})", backfill_status.code()).into());
    }
    println!("  回填完成\n");

    // ── Step 2: 策略发现 ──
    println!("  [2/2] 运行策略发现 (all strategies, 90 天, all timeframes)...");

    let discovery_status = Command::new("cargo")
        .args([
            "run", "--release", "-p", "discovery", "--",
            "scan",
            "--strategy", "all",
            "--symbol", &symbol,
            "--days", "90",
            "--timeframe", "all",
        ])
        .status()?;

    if !discovery_status.success() {
        return Err(format!("discovery scan 失败 (exit code: {:?})", discovery_status.code()).into());
    }

    // ── Step 3: 检查结果并更新状态 ──
    let discovered_dir = paths::discovered_dir();
    let sym_lower = symbol.to_lowercase().replace("usdt", "");

    // 扫描 discovered/ 看是否有匹配 symbol 的策略产出
    let mut found_count = 0;
    if discovered_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&discovered_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(&sym_lower) && entry.path().join("signal.json").exists() {
                    found_count += 1;
                }
            }
        }
    }

    // 更新 symbols.json 状态
    let symbols_path = paths::default_symbols_json();
    if symbols_path.exists() {
        if let Ok(mut registry) = SymbolRegistry::load(&symbols_path) {
            if found_count > 0 {
                registry.set_status(&symbol, SymbolStatus::DataReady);
            } else {
                registry.set_status(&symbol, SymbolStatus::NoSignal);
            }
            registry.save(&symbols_path).map_err(|e| format!("save symbols.json: {e}"))?;
        }
    }

    // ── 汇总 ──
    println!("\n=== 结果 ===");
    if found_count > 0 {
        println!("  发现 {} 个候选策略", found_count);
        println!("  位置: discovered/{}*", sym_lower);
        println!("  下一步: 审批策略 → status=approved → 移到 strategies/");
    } else {
        println!("  未发现合格策略");
        println!("  symbols.json 状态已更新为 no_signal");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    // expand-symbol 依赖外部二进制（data-engine, discovery），
    // 集成测试在 CI 环境中运行。
    // 此处验证辅助逻辑。

    #[test]
    fn symbol_normalization() {
        let symbol = "wldusdt".to_uppercase();
        assert_eq!(symbol, "WLDUSDT");

        let sym_lower = symbol.to_lowercase().replace("usdt", "");
        assert_eq!(sym_lower, "wld");
    }
}
