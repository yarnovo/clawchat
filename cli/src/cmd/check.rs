use chrono::Local;
use clawchat_shared::exchange::Exchange;

const DEFAULT_MAX_LOSS_PER_TRADE: f64 = 0.05;
const DEFAULT_MAX_DAILY_LOSS: f64 = 0.10;
const DEFAULT_MAX_PROFIT_PER_TRADE: f64 = 0.10;
const DEFAULT_MAX_PROFIT_TOTAL: f64 = 0.20;
const DEFAULT_MAX_POSITION_RATIO: f64 = 0.30;
const DEFAULT_MIN_LIQUIDATION_DISTANCE: f64 = 0.10;
const DEFAULT_MAX_LEVERAGE: f64 = 20.0;
const DEFAULT_MAX_DRAWDOWN_WARNING: f64 = 0.20;
const DEFAULT_MAX_DRAWDOWN_STOP: f64 = 0.30;

/// 风控检查 — 校验策略配置与持仓风险
pub async fn check(
    exchange: &Exchange,
    _strategy: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let positions = exchange.get_positions().await?;
    let account = exchange.get_account().await?;
    let total_equity: f64 = account
        .get("totalWalletBalance")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let mut alerts: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut total_unrealized = 0.0f64;

    let now = Local::now().format("%Y-%m-%d %H:%M:%S");
    println!("\n{}", "=".repeat(60));
    println!("  风控检查  {now}");
    println!("{}", "=".repeat(60));

    if positions.is_empty() {
        println!("\n  状态: [PASS]");
        println!("  持仓: 0 个");
        println!("  权益: ${total_equity:.2}");
        println!("\n  所有检查通过");
        println!();
        return Ok(());
    }

    for p in &positions {
        let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
        let side = p.get("positionSide").and_then(|v| v.as_str()).unwrap_or("?");
        let amt: f64 = p
            .get("positionAmt")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let entry_price: f64 = p
            .get("entryPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let mark_price: f64 = p
            .get("markPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let pnl: f64 = p
            .get("unrealizedProfit")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let notional: f64 = p
            .get("notional")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(|| (amt * mark_price).abs());
        let leverage_val: f64 = p
            .get("leverage")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(1.0);
        let liq_price: f64 = p
            .get("liquidationPrice")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        total_unrealized += pnl;
        let is_long = side == "LONG" || amt > 0.0;

        // Check 1: single trade loss
        if total_equity > 0.0 {
            let loss_ratio = pnl / total_equity;
            if loss_ratio < -DEFAULT_MAX_LOSS_PER_TRADE {
                alerts.push(format!(
                    "STOP LOSS: {sym} {side} 亏损 {:.1}% 超过阈值 {:.0}%",
                    loss_ratio * 100.0,
                    -DEFAULT_MAX_LOSS_PER_TRADE * 100.0
                ));
            }
        }

        // Check 1b: single trade profit
        if total_equity > 0.0 {
            let profit_ratio = pnl / total_equity;
            if profit_ratio > DEFAULT_MAX_PROFIT_PER_TRADE {
                alerts.push(format!(
                    "TAKE PROFIT: {sym} {side} 盈利 +{:.1}% 超过阈值 +{:.0}%",
                    profit_ratio * 100.0,
                    DEFAULT_MAX_PROFIT_PER_TRADE * 100.0
                ));
            }
        }

        // Check 2: position ratio
        if total_equity > 0.0 {
            let position_ratio = notional.abs() / total_equity;
            if position_ratio > DEFAULT_MAX_POSITION_RATIO {
                warnings.push(format!(
                    "仓位过大: {sym} 占比 {:.0}% > {:.0}%",
                    position_ratio * 100.0,
                    DEFAULT_MAX_POSITION_RATIO * 100.0
                ));
            }
        }

        // Check 3: liquidation distance
        if liq_price > 0.0 && mark_price > 0.0 {
            let liq_distance = if is_long {
                (mark_price - liq_price) / mark_price
            } else {
                (liq_price - mark_price) / mark_price
            };
            if liq_distance < DEFAULT_MIN_LIQUIDATION_DISTANCE {
                alerts.push(format!(
                    "爆仓风险: {sym} 距强平 {:.1}% < {:.0}%",
                    liq_distance * 100.0,
                    DEFAULT_MIN_LIQUIDATION_DISTANCE * 100.0
                ));
            }
        }

        // Check 4: leverage
        if leverage_val > DEFAULT_MAX_LEVERAGE {
            warnings.push(format!(
                "杠杆过高: {sym} {leverage_val}x > {DEFAULT_MAX_LEVERAGE}x"
            ));
        }

        // Check 5b: drawdown from entry
        if entry_price > 0.0 && mark_price > 0.0 {
            let dd = if is_long {
                (entry_price - mark_price) / entry_price
            } else {
                (mark_price - entry_price) / entry_price
            };
            if dd > 0.0 {
                if dd >= DEFAULT_MAX_DRAWDOWN_STOP {
                    alerts.push(format!(
                        "回撤止损: {sym} {side} 回撤 {:.1}% >= {:.0}%",
                        dd * 100.0,
                        DEFAULT_MAX_DRAWDOWN_STOP * 100.0
                    ));
                } else if dd >= DEFAULT_MAX_DRAWDOWN_WARNING {
                    warnings.push(format!(
                        "回撤预警: {sym} {side} 回撤 {:.1}% >= {:.0}%",
                        dd * 100.0,
                        DEFAULT_MAX_DRAWDOWN_WARNING * 100.0
                    ));
                }
            }
        }
    }

    // Check 5: total loss
    if total_equity > 0.0 {
        let total_loss_ratio = total_unrealized / total_equity;
        if total_loss_ratio < -DEFAULT_MAX_DAILY_LOSS {
            alerts.push(format!(
                "STOP LOSS 总亏损触发: 亏损 {:.1}% 超过阈值 {:.0}%",
                total_loss_ratio * 100.0,
                -DEFAULT_MAX_DAILY_LOSS * 100.0
            ));
        }
    }

    // Check 6: total profit
    if total_equity > 0.0 {
        let total_profit_ratio = total_unrealized / total_equity;
        if total_profit_ratio > DEFAULT_MAX_PROFIT_TOTAL {
            alerts.push(format!(
                "TAKE PROFIT 总止盈触发: 盈利 +{:.1}% 超过阈值 +{:.0}%",
                total_profit_ratio * 100.0,
                DEFAULT_MAX_PROFIT_TOTAL * 100.0
            ));
        }
    }

    let status = if !alerts.is_empty() {
        "FAIL"
    } else if !warnings.is_empty() {
        "WARN"
    } else {
        "PASS"
    };

    println!("\n  状态: [{status}]");
    println!("  持仓: {} 个", positions.len());
    println!("  权益: ${total_equity:.2}");
    let sign = if total_unrealized >= 0.0 { "+" } else { "" };
    println!("  未实现盈亏: {sign}${total_unrealized:.4}");

    if !alerts.is_empty() {
        println!("\n  --- ALERTS ---");
        for a in &alerts {
            println!("  [!] {a}");
        }
    }

    if !warnings.is_empty() {
        println!("\n  --- WARNINGS ---");
        for w in &warnings {
            println!("  [?] {w}");
        }
    }

    if alerts.is_empty() && warnings.is_empty() {
        println!("\n  所有检查通过");
    }

    println!();
    Ok(())
}
