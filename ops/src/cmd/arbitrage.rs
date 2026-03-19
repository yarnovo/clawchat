use colored::Colorize;
use crate::Ctx;
use clawchat_shared::exchange::Exchange;
use discovery::arbitrage::{
    self, ArbitrageType, PremiumIndexData, ScanConfig,
};
use std::collections::HashMap;

/// 扫描套利机会并输出
pub async fn run(
    ctx: &Ctx,
    arb_type: Option<&str>,
    min_profit: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    let config = ScanConfig {
        min_net_profit_pct: min_profit,
        ..ScanConfig::default()
    };

    let mut all_opportunities = Vec::new();

    let scan_spot_perp = arb_type.is_none() || arb_type == Some("spot-perp");
    let scan_triangular = arb_type.is_none() || arb_type == Some("triangular");

    // 1. Spot-Perp Basis 扫描
    if scan_spot_perp {
        match scan_spot_perp_opportunities(&ctx.exchange, &config).await {
            Ok(opps) => all_opportunities.extend(opps),
            Err(e) => {
                if !ctx.json {
                    eprintln!("  spot-perp 扫描失败: {e}");
                }
            }
        }
    }

    // 2. 三角套利扫描（用现货价格）
    if scan_triangular {
        match scan_triangular_opportunities(&ctx.exchange, &config).await {
            Ok(opps) => all_opportunities.extend(opps),
            Err(e) => {
                if !ctx.json {
                    eprintln!("  三角套利扫描失败: {e}");
                }
            }
        }
    }

    // 输出
    if ctx.json {
        let json = serde_json::to_string_pretty(&all_opportunities)?;
        println!("{}", json);
        return Ok(());
    }

    if all_opportunities.is_empty() {
        println!("\n  无可用套利机会 (min_profit={min_profit}%)");
        return Ok(());
    }

    println!("\n  {}", "=".repeat(105));
    println!("  {}", "套利机会扫描".bold());
    println!("  {}", "=".repeat(105));
    println!(
        "  {:<14} {:<12} {:>10} {:>10} {:>12} {}",
        "类型", "交易对", "价差%", "净利润%", "年化%", "描述"
    );
    println!("  {}", "─".repeat(105));

    for opp in &all_opportunities {
        let type_str = match opp.arb_type {
            ArbitrageType::SpotPerp => "spot-perp".cyan().to_string(),
            ArbitrageType::CrossExchange => "cross-ex".yellow().to_string(),
            ArbitrageType::Triangular => "triangular".green().to_string(),
        };

        let annual_str = if opp.annualized_pct > 0.0 {
            format!("{:.1}%", opp.annualized_pct)
        } else {
            "—".into()
        };

        println!(
            "  {:<14} {:<12} {:>9.3}% {:>9.3}% {:>11} {}",
            type_str,
            opp.symbol,
            opp.spread_pct,
            opp.net_profit_pct,
            annual_str,
            opp.description,
        );
    }

    println!("  {}", "─".repeat(105));
    println!("  合计: {} 个机会", all_opportunities.len());

    // 写入 records
    let records_dir = clawchat_shared::paths::records_dir();
    for opp in &all_opportunities {
        arbitrage::log_opportunity(&records_dir, opp);
    }
    println!("  已记录到 records/arbitrage.jsonl\n");

    Ok(())
}

/// 查看历史套利机会
pub fn history(ctx: &Ctx, limit: usize) -> Result<(), Box<dyn std::error::Error>> {
    let records_dir = &ctx.records_dir;
    let opps = arbitrage::read_opportunities(records_dir);

    if ctx.json {
        // 取最后 limit 条
        let start = opps.len().saturating_sub(limit);
        let recent = &opps[start..];
        println!("{}", serde_json::to_string_pretty(recent)?);
        return Ok(());
    }

    if opps.is_empty() {
        println!("\n  无历史套利记录");
        return Ok(());
    }

    // 取最后 limit 条
    let start = opps.len().saturating_sub(limit);
    let recent = &opps[start..];

    println!("\n  {}", "=".repeat(105));
    println!("  {} (最近 {} 条)", "套利历史".bold(), recent.len());
    println!("  {}", "=".repeat(105));
    println!(
        "  {:<14} {:<12} {:>10} {:>10} {:>12} {}",
        "类型", "交易对", "价差%", "净利润%", "年化%", "时间"
    );
    println!("  {}", "─".repeat(105));

    for opp in recent {
        let type_str = format!("{}", opp.arb_type);
        let annual_str = if opp.annualized_pct > 0.0 {
            format!("{:.1}%", opp.annualized_pct)
        } else {
            "—".into()
        };
        let time_str = opp.scanned_at.get(..19).unwrap_or(&opp.scanned_at);

        println!(
            "  {:<14} {:<12} {:>9.3}% {:>9.3}% {:>11} {}",
            type_str,
            opp.symbol,
            opp.spread_pct,
            opp.net_profit_pct,
            annual_str,
            time_str,
        );
    }

    println!("  {}", "─".repeat(105));
    println!("  合计: {} 条记录\n", opps.len());

    Ok(())
}

// ── Internal helpers ─────────────────────────────────────────

async fn scan_spot_perp_opportunities(
    exchange: &Exchange,
    config: &ScanConfig,
) -> Result<Vec<arbitrage::ArbitrageOpportunity>, Box<dyn std::error::Error>> {
    // 1. 获取永续合约 premium index（funding rate + mark price）
    let premium_list = exchange.get_premium_index(None).await?;
    let indices: Vec<PremiumIndexData> = premium_list
        .iter()
        .map(|pi| PremiumIndexData {
            symbol: pi.symbol.clone(),
            mark_price: pi.mark_price,
            last_funding_rate: pi.last_funding_rate,
            next_funding_time: pi.next_funding_time,
        })
        .collect();

    // 2. 获取现货价格
    //    Binance 现货 API: GET /api/v3/ticker/price
    let spot_client = reqwest::Client::new();
    let spot_resp = spot_client
        .get("https://api.binance.com/api/v3/ticker/price")
        .send()
        .await?
        .json::<Vec<serde_json::Value>>()
        .await?;

    let spot_prices: HashMap<String, f64> = spot_resp
        .iter()
        .filter_map(|t| {
            let sym = t.get("symbol")?.as_str()?;
            let price: f64 = t.get("price")?.as_str()?.parse().ok()?;
            Some((sym.to_string(), price))
        })
        .collect();

    Ok(arbitrage::scan_spot_perp_basis(&indices, &spot_prices, config))
}

async fn scan_triangular_opportunities(
    _exchange: &Exchange,
    config: &ScanConfig,
) -> Result<Vec<arbitrage::ArbitrageOpportunity>, Box<dyn std::error::Error>> {
    // 用现货价格做三角套利检测
    let spot_client = reqwest::Client::new();
    let spot_resp = spot_client
        .get("https://api.binance.com/api/v3/ticker/price")
        .send()
        .await?
        .json::<Vec<serde_json::Value>>()
        .await?;

    let prices: HashMap<String, f64> = spot_resp
        .iter()
        .filter_map(|t| {
            let sym = t.get("symbol")?.as_str()?;
            let price: f64 = t.get("price")?.as_str()?.parse().ok()?;
            Some((sym.to_string(), price))
        })
        .collect();

    Ok(arbitrage::scan_triangular(&prices, config))
}
