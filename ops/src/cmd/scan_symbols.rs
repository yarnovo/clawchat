use clawchat_shared::paths;
use clawchat_shared::symbols::SymbolRegistry;

use crate::Ctx;

/// 稳定币 base 列表（排除）
const SKIP_BASES: &[&str] = &[
    "USDC", "BUSD", "TUSD", "FDUSD", "DAI", "UST", "USDP",
];

/// 从 Binance 扫描候选币种，更新 symbols.json
pub async fn run(
    ctx: &Ctx,
    min_volume: f64,
    top: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    let symbols_path = paths::default_symbols_json();

    // 加载现有注册表（不存在则创建空的）
    let mut registry = if symbols_path.exists() {
        SymbolRegistry::load(&symbols_path).map_err(|e| format!("load symbols.json: {e}"))?
    } else {
        SymbolRegistry::default()
    };

    println!("  正在扫描 Binance USDT 永续合约...");

    // 获取交易所信息（用于检查上线时间）
    let exchange_info = ctx.exchange.fetch_exchange_info().await?;
    let symbols_info = exchange_info
        .get("symbols")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();

    // 180 天前的时间戳
    let cutoff_ms = chrono::Utc::now().timestamp_millis() - 180 * 86_400 * 1_000;

    // 构建 symbol -> onboardDate 映射
    let mut onboard_dates: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for info in &symbols_info {
        let symbol = info
            .get("symbol")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let onboard = info
            .get("onboardDate")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        if !symbol.is_empty() {
            onboard_dates.insert(symbol.to_string(), onboard);
        }
    }

    // 获取 24h tickers
    let tickers = ctx.exchange.fetch_tickers().await?;

    let mut candidates: Vec<(String, f64)> = Vec::new();

    for t in &tickers {
        let symbol = t
            .get("symbol")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // 只看 USDT 永续
        if !symbol.ends_with("USDT") {
            continue;
        }

        // 排除稳定币
        let base = symbol.trim_end_matches("USDT");
        if SKIP_BASES.contains(&base) {
            continue;
        }

        // 排除已有币种
        if registry.contains(&symbol) {
            continue;
        }

        // 排除黑名单
        if registry.is_blacklisted(&symbol) {
            continue;
        }

        // 成交量筛选
        let vol: f64 = t
            .get("quoteVolume")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        if vol < min_volume {
            continue;
        }

        // 上线时间 > 180 天
        let onboard = onboard_dates.get(&symbol).copied().unwrap_or(0);
        if onboard == 0 || onboard > cutoff_ms {
            continue;
        }

        candidates.push((symbol, vol));
    }

    // 按成交量排序
    candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let selected: Vec<_> = candidates.into_iter().take(top).collect();

    if selected.is_empty() {
        println!("  未发现符合条件的新币种");
        println!(
            "  (条件: 24h成交额 > ${:.0}M, 上线 > 180 天, 排除已有 {} 个币种)",
            min_volume / 1e6,
            registry.symbols.len()
        );
        return Ok(());
    }

    // 输出结果
    println!(
        "\n  发现 {} 个候选币种 (24h成交额 > ${:.0}M, 上线 > 180 天):\n",
        selected.len(),
        min_volume / 1e6
    );
    println!("  {:<4} {:<14} {:>14}", "#", "交易对", "24h成交额(M)");
    println!("  {}", "-".repeat(36));

    let mut added = 0;
    for (i, (sym, vol)) in selected.iter().enumerate() {
        println!(
            "  {:<4} {:<14} {:>14.1}",
            i + 1,
            sym,
            vol / 1e6
        );
        registry.add_symbol(sym.clone(), Some(*vol));
        added += 1;
    }

    // 保存
    registry.save(&symbols_path).map_err(|e| format!("save symbols.json: {e}"))?;
    println!(
        "\n  已添加 {added} 个新币种到 symbols.json (状态: data_ready)"
    );
    println!("  总币种数: {}", registry.symbols.len());
    println!(
        "\n  下一步: clawchat expand-symbol --symbol <SYMBOL> 回填数据+发现策略"
    );

    Ok(())
}
