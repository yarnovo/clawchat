use std::process::Command;

use clawchat_shared::paths;
use serde_json::json;

use crate::Ctx;

/// 单币种全链路扩展：回填历史数据 + 策略发现（纯 stdout 输出，不写文件）
///
/// 输出格式:
/// ```json
/// {"symbol":"WLDUSDT","backfill":"ok","discovery":"ok","candidates":3}
/// ```
pub async fn run(
    ctx: &Ctx,
    symbol: &str,
    days: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbol = symbol.to_uppercase();
    eprintln!("=== 扩展币种: {} ===\n", symbol);

    // ── Step 1: 回填历史数据 ──
    eprintln!("  [1/2] 回填 {} 天 1m K 线...", days);

    let backfill_status = Command::new("cargo")
        .args([
            "run", "--release", "-p", "data-engine", "--",
            "backfill",
            "--symbols", &symbol,
            "--days", &days.to_string(),
            "--intervals", "1m",
        ])
        .status()?;

    let backfill_ok = backfill_status.success();
    if !backfill_ok {
        let output = json!({
            "symbol": symbol,
            "backfill": "failed",
            "discovery": "skipped",
            "candidates": 0,
        });
        if ctx.json {
            println!("{}", serde_json::to_string_pretty(&output)?);
        } else {
            println!("{}", serde_json::to_string(&output)?);
        }
        return Err(format!("data-engine backfill 失败 (exit code: {:?})", backfill_status.code()).into());
    }
    eprintln!("  回填完成\n");

    // ── Step 2: 策略发现 ──
    eprintln!("  [2/2] 运行策略发现 (all strategies, 90 天, all timeframes)...");

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

    let discovery_ok = discovery_status.success();
    if !discovery_ok {
        let output = json!({
            "symbol": symbol,
            "backfill": "ok",
            "discovery": "failed",
            "candidates": 0,
        });
        if ctx.json {
            println!("{}", serde_json::to_string_pretty(&output)?);
        } else {
            println!("{}", serde_json::to_string(&output)?);
        }
        return Err(format!("discovery scan 失败 (exit code: {:?})", discovery_status.code()).into());
    }

    // ── Step 3: 检查结果（只读，不写文件） ──
    let discovered_dir = paths::discovered_dir();
    let sym_lower = symbol.to_lowercase().replace("usdt", "");

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

    let discovery_result = if found_count > 0 { "ok" } else { "no_signal" };

    // 输出结果 JSON 到 stdout
    let output = json!({
        "symbol": symbol,
        "backfill": "ok",
        "discovery": discovery_result,
        "candidates": found_count,
    });

    if ctx.json {
        println!("{}", serde_json::to_string_pretty(&output)?);
    } else {
        println!("{}", serde_json::to_string(&output)?);
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
