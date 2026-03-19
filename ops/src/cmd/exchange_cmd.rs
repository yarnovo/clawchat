use clawchat_shared::config_util::normalize_symbol;
use clawchat_shared::exchange::Exchange;

/// 开多
pub async fn long(
    exchange: &Exchange,
    symbol: &str,
    amount: f64,
    price: Option<f64>,
    lev: Option<u32>,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    println!("\n  开多: {sym} 数量={amount}");

    if let Some(l) = lev {
        println!("  设置杠杆: {l}x");
        // Use the main exchange to set leverage via signed API
        let params = [
            ("symbol", sym.clone()),
            ("leverage", l.to_string()),
        ];
        let _ = exchange.signed_post("/fapi/v1/leverage", &params).await?;
    }

    match price {
        Some(p) => {
            println!("  限价: ${p}");
            let params = [
                ("symbol", sym.clone()),
                ("side", "BUY".to_string()),
                ("type", "LIMIT".to_string()),
                ("positionSide", "LONG".to_string()),
                ("quantity", format!("{amount}")),
                ("price", format!("{p}")),
                ("timeInForce", "GTC".to_string()),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: orderId={order_id} status={status}");
        }
        None => {
            println!("  市价");
            let params = [
                ("symbol", sym.clone()),
                ("side", "BUY".to_string()),
                ("type", "MARKET".to_string()),
                ("positionSide", "LONG".to_string()),
                ("quantity", format!("{amount}")),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: orderId={order_id} status={status}");
        }
    }
    println!();
    Ok(())
}

/// 开空
pub async fn short(
    exchange: &Exchange,
    symbol: &str,
    amount: f64,
    price: Option<f64>,
    lev: Option<u32>,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    println!("\n  开空: {sym} 数量={amount}");

    if let Some(l) = lev {
        println!("  设置杠杆: {l}x");
        let params = [
            ("symbol", sym.clone()),
            ("leverage", l.to_string()),
        ];
        let _ = exchange.signed_post("/fapi/v1/leverage", &params).await?;
    }

    match price {
        Some(p) => {
            println!("  限价: ${p}");
            let params = [
                ("symbol", sym.clone()),
                ("side", "SELL".to_string()),
                ("type", "LIMIT".to_string()),
                ("positionSide", "SHORT".to_string()),
                ("quantity", format!("{amount}")),
                ("price", format!("{p}")),
                ("timeInForce", "GTC".to_string()),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: orderId={order_id} status={status}");
        }
        None => {
            println!("  市价");
            let params = [
                ("symbol", sym.clone()),
                ("side", "SELL".to_string()),
                ("type", "MARKET".to_string()),
                ("positionSide", "SHORT".to_string()),
                ("quantity", format!("{amount}")),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: orderId={order_id} status={status}");
        }
    }
    println!();
    Ok(())
}

/// 平多
pub async fn close_long(
    exchange: &Exchange,
    symbol: &str,
    amount: f64,
    price: Option<f64>,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    println!("\n  平多: {sym} 数量={amount}");

    match price {
        Some(p) => {
            let params = [
                ("symbol", sym.clone()),
                ("side", "SELL".to_string()),
                ("type", "LIMIT".to_string()),
                ("positionSide", "LONG".to_string()),
                ("quantity", format!("{amount}")),
                ("price", format!("{p}")),
                ("timeInForce", "GTC".to_string()),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: status={status}");
        }
        None => {
            let params = [
                ("symbol", sym.clone()),
                ("side", "SELL".to_string()),
                ("type", "MARKET".to_string()),
                ("positionSide", "LONG".to_string()),
                ("quantity", format!("{amount}")),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: status={status}");
        }
    }
    println!();
    Ok(())
}

/// 平空
pub async fn close_short(
    exchange: &Exchange,
    symbol: &str,
    amount: f64,
    price: Option<f64>,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    println!("\n  平空: {sym} 数量={amount}");

    match price {
        Some(p) => {
            let params = [
                ("symbol", sym.clone()),
                ("side", "BUY".to_string()),
                ("type", "LIMIT".to_string()),
                ("positionSide", "SHORT".to_string()),
                ("quantity", format!("{amount}")),
                ("price", format!("{p}")),
                ("timeInForce", "GTC".to_string()),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: status={status}");
        }
        None => {
            let params = [
                ("symbol", sym.clone()),
                ("side", "BUY".to_string()),
                ("type", "MARKET".to_string()),
                ("positionSide", "SHORT".to_string()),
                ("quantity", format!("{amount}")),
            ];
            let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
            let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  结果: status={status}");
        }
    }
    println!();
    Ok(())
}

/// 设置杠杆
pub async fn leverage(
    exchange: &Exchange,
    symbol: &str,
    lev: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    println!("\n  设置杠杆: {sym} {lev}x");

    let params = [
        ("symbol", sym.clone()),
        ("leverage", lev.to_string()),
    ];
    let resp = exchange.signed_post("/fapi/v1/leverage", &params).await?;
    let result_lev = resp
        .get("leverage")
        .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0);
    println!("  结果: leverage={result_lev}");
    println!();
    Ok(())
}

/// 止损单
pub async fn stop_loss(
    exchange: &Exchange,
    symbol: &str,
    side: &str,
    price: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    let (order_side, pos_side) = match side.to_uppercase().as_str() {
        "LONG" => ("SELL", "LONG"),
        "SHORT" => ("BUY", "SHORT"),
        _ => {
            println!("  错误: side 必须是 LONG 或 SHORT");
            return Ok(());
        }
    };

    println!("\n  止损: {sym} {side} @ ${price}");
    let params = [
        ("symbol", sym.clone()),
        ("side", order_side.to_string()),
        ("type", "STOP_MARKET".to_string()),
        ("positionSide", pos_side.to_string()),
        ("stopPrice", format!("{price}")),
        ("closePosition", "true".to_string()),
    ];
    let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
    let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
    let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
    println!("  结果: orderId={order_id} status={status}");
    println!();
    Ok(())
}

/// 止盈单
pub async fn take_profit(
    exchange: &Exchange,
    symbol: &str,
    side: &str,
    price: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    let sym = normalize_symbol(symbol);
    let (order_side, pos_side) = match side.to_uppercase().as_str() {
        "LONG" => ("SELL", "LONG"),
        "SHORT" => ("BUY", "SHORT"),
        _ => {
            println!("  错误: side 必须是 LONG 或 SHORT");
            return Ok(());
        }
    };

    println!("\n  止盈: {sym} {side} @ ${price}");
    let params = [
        ("symbol", sym.clone()),
        ("side", order_side.to_string()),
        ("type", "TAKE_PROFIT_MARKET".to_string()),
        ("positionSide", pos_side.to_string()),
        ("stopPrice", format!("{price}")),
        ("closePosition", "true".to_string()),
    ];
    let resp = exchange.signed_post("/fapi/v1/order", &params).await?;
    let order_id = resp.get("orderId").and_then(|v| v.as_i64()).unwrap_or(0);
    let status = resp.get("status").and_then(|v| v.as_str()).unwrap_or("?");
    println!("  结果: orderId={order_id} status={status}");
    println!();
    Ok(())
}

/// 查看持仓
pub async fn positions(
    exchange: &Exchange,
    symbol: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let all_positions = exchange.get_positions().await?;

    let filtered: Vec<&serde_json::Value> = if let Some(ref sym) = symbol {
        let norm = normalize_symbol(sym);
        all_positions
            .iter()
            .filter(|p| {
                p.get("symbol")
                    .and_then(|v| v.as_str())
                    .map(|s| s == norm)
                    .unwrap_or(false)
            })
            .collect()
    } else {
        all_positions.iter().collect()
    };

    println!("\n  持仓列表:");
    println!(
        "  {:<14} {:<6} {:>10} {:>12} {:>12} {:>12} {:>6}",
        "交易对", "方向", "数量", "开仓价", "标记价", "未实现盈亏", "杠杆"
    );
    println!("  {}", "-".repeat(78));

    if filtered.is_empty() {
        println!("  (无持仓)");
    } else {
        let mut total_pnl = 0.0f64;
        for p in &filtered {
            let sym = p.get("symbol").and_then(|v| v.as_str()).unwrap_or("?");
            let side = p
                .get("positionSide")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let amt: f64 = p
                .get("positionAmt")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let entry: f64 = p
                .get("entryPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let mark: f64 = p
                .get("markPrice")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let pnl: f64 = p
                .get("unrealizedProfit")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let lev = p
                .get("leverage")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            total_pnl += pnl;
            let sign = if pnl >= 0.0 { "+" } else { "" };
            println!(
                "  {sym:<14} {side:<6} {amt:>10.4} ${entry:>10.4} ${mark:>10.4} {sign}${pnl:>10.4} {lev:>5}x"
            );
        }
        let sign = if total_pnl >= 0.0 { "+" } else { "" };
        println!("\n  合计未实现盈亏: {sign}${total_pnl:.4}");
    }
    println!();
    Ok(())
}
