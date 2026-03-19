use serde_json::json;

use crate::Ctx;

/// 稳定币 base 列表（排除）
const SKIP_BASES: &[&str] = &[
    "USDC", "BUSD", "TUSD", "FDUSD", "DAI", "UST", "USDP",
];

/// 扫描 Binance 候选币种，纯 stdout 输出（不写文件）
///
/// --json 模式输出 JSON 数组:
/// ```json
/// [
///   {"symbol":"BTCUSDT","volume_24h":18808000000,"listing_days":365},
///   {"symbol":"ETHUSDT","volume_24h":17627000000,"listing_days":365}
/// ]
/// ```
///
/// 默认输出表格格式。
pub async fn run(
    ctx: &Ctx,
    min_volume: f64,
    top: usize,
    existing_symbols: &[String],
    blacklist: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("  正在扫描 Binance USDT 永续合约...");

    // 获取交易所信息（用于检查上线时间）
    let exchange_info = ctx.exchange.fetch_exchange_info().await?;
    let symbols_info = exchange_info
        .get("symbols")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();

    // 180 天前的时间戳
    let now_ms = chrono::Utc::now().timestamp_millis();
    let cutoff_ms = now_ms - 180 * 86_400 * 1_000;

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

    let mut candidates: Vec<(String, f64, i64)> = Vec::new();

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
        if existing_symbols.iter().any(|s| s == &symbol) {
            continue;
        }

        // 排除黑名单
        if blacklist.iter().any(|s| s == &symbol) {
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

        let listing_days = (now_ms - onboard) / (86_400 * 1_000);
        candidates.push((symbol, vol, listing_days));
    }

    // 按成交量排序
    candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let selected: Vec<_> = candidates.into_iter().take(top).collect();

    if ctx.json {
        // --json: 输出 JSON 数组（与需求文档格式一致）
        let arr: Vec<serde_json::Value> = selected
            .iter()
            .map(|(sym, vol, days)| {
                json!({ "symbol": sym, "volume_24h": *vol as i64, "listing_days": days })
            })
            .collect();
        println!("{}", serde_json::to_string_pretty(&arr)?);
    } else {
        // 默认: 表格格式
        println!(
            "{:<16} {:>18} {:>14}",
            "SYMBOL", "VOLUME_24H (USDT)", "LISTING_DAYS"
        );
        println!("{}", "-".repeat(50));
        for (sym, vol, days) in &selected {
            println!("{:<16} {:>18.0} {:>14}", sym, vol, days);
        }
        println!("{}", "-".repeat(50));
        println!("共 {} 个候选币种", selected.len());
    }

    Ok(())
}
