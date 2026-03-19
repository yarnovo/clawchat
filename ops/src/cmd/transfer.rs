use clawchat_shared::exchange::Exchange;

/// 资金划转 — 现货 ↔ 合约
/// direction: "to-futures" (type=1) or "to-spot" (type=2)
pub async fn transfer(
    exchange: &Exchange,
    direction: &str,
    amount: f64,
    asset: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let transfer_type: u32 = match direction {
        "to-futures" | "spot-to-futures" | "1" => 1,
        "to-spot" | "futures-to-spot" | "2" => 2,
        _ => {
            println!("  错误: 方向必须是 'to-futures' 或 'to-spot'");
            println!("  用法: clawchat transfer to-futures 100 USDT");
            return Ok(());
        }
    };

    let dir_label = if transfer_type == 1 {
        "现货 -> 合约"
    } else {
        "合约 -> 现货"
    };

    println!("\n  资金划转");
    println!("  {}", "─".repeat(40));
    println!("  方向: {dir_label}");
    println!("  金额: {amount} {asset}");

    match exchange
        .transfer_internal(asset, amount, transfer_type)
        .await
    {
        Ok(resp) => {
            if resp.get("dryRun").is_some() {
                println!("  结果: [DRY RUN] 模拟成功");
            } else {
                let tran_id = resp
                    .get("tranId")
                    .and_then(|v| v.as_u64())
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "ok".to_string());
                println!("  结果: 成功 (tranId={tran_id})");
            }
        }
        Err(e) => {
            println!("  结果: 失败 ({e})");
        }
    }

    println!();
    Ok(())
}
