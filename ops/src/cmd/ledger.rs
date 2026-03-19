use colored::Colorize;
use crate::Ctx;

/// 虚拟账户详情 — 读取 ledger.json 展示策略配额和权益
pub fn run(ctx: &Ctx, strategy: Option<String>) -> Result<(), Box<dyn std::error::Error>> {
    let ledger_path = ctx.records_dir.join("ledger.json");
    if !ledger_path.exists() {
        if ctx.json {
            println!("{{\"error\": \"Ledger 未初始化，请先运行交易引擎\"}}");
        } else {
            println!("\n  Ledger 未初始化，请先运行交易引擎");
        }
        return Ok(());
    }

    let content = std::fs::read_to_string(&ledger_path)?;
    let ledger: serde_json::Value = serde_json::from_str(&content)?;

    if ctx.json {
        if let Some(ref name) = strategy {
            let strat = ledger.get("strategies").and_then(|s| s.get(name.as_str()));
            match strat {
                Some(s) => println!("{}", serde_json::to_string_pretty(s)?),
                None => println!("{{\"error\": \"策略 '{}' 不在 Ledger 中\"}}", name),
            }
        } else {
            println!("{}", serde_json::to_string_pretty(&ledger)?);
        }
        return Ok(());
    }

    let _total_capital: f64 = ledger
        .get("total_capital")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let strategies = ledger
        .get("strategies")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    // Single strategy detail
    if let Some(ref name) = strategy {
        match strategies.get(name.as_str()) {
            Some(s) => print_strategy_detail(name, s),
            None => println!("\n  策略 '{}' 不在 Ledger 中", name),
        }
        return Ok(());
    }

    // Overview
    let mut total_equity = 0.0f64;
    let mut total_allocated = 0.0f64;

    struct Row {
        name: String,
        allocated: f64,
        equity: f64,
        pnl: f64,
        drawdown: f64,
        has_positions: bool,
    }

    let mut rows: Vec<Row> = Vec::new();

    for (name, alloc) in &strategies {
        let allocated = alloc.get("allocated_capital").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let realized = alloc.get("realized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let unrealized = alloc.get("unrealized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let fees = alloc.get("fees_paid").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let funding = alloc.get("funding_paid").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let peak = alloc.get("peak_equity").and_then(|v| v.as_f64()).unwrap_or(allocated);

        let equity = allocated + realized + unrealized - fees - funding;
        let pnl = equity - allocated;
        let dd = if peak > 0.0 { ((peak - equity) / peak * 100.0).max(0.0) } else { 0.0 };
        let has_pos = alloc
            .get("positions")
            .and_then(|v| v.as_object())
            .map(|m| !m.is_empty())
            .unwrap_or(false);

        total_equity += equity;
        total_allocated += allocated;

        rows.push(Row { name: name.clone(), allocated, equity, pnl, drawdown: dd, has_positions: has_pos });
    }

    rows.sort_by(|a, b| a.name.cmp(&b.name));

    let safety_cushion = total_equity - total_allocated;

    println!("\n  {}\n", "=== 虚拟账户 ===".bold());
    println!(
        "  总资产: ${:.2}  配额: ${:.2}  安全垫: ${:.2}\n",
        total_equity, total_allocated, safety_cushion
    );
    println!(
        "  {:<24} {:>8} {:>10} {:>10} {:>8}  状态",
        "策略", "配额", "权益", "PnL", "回撤"
    );
    println!("  {}", "─".repeat(72));

    for row in &rows {
        let sign = if row.pnl >= 0.0 { "+" } else { "" };
        let pnl_str = format!("{sign}${:.2}", row.pnl);
        let dd_str = format!("{:.1}%", row.drawdown);
        let status_icon = if row.drawdown > 10.0 {
            "!!"
        } else if row.has_positions {
            "ok"
        } else {
            "--"
        };
        let pnl_colored = if row.pnl >= 0.0 {
            pnl_str.green().to_string()
        } else {
            pnl_str.red().to_string()
        };
        let dd_colored = if row.drawdown > 10.0 {
            dd_str.red().to_string()
        } else if row.drawdown > 5.0 {
            dd_str.yellow().to_string()
        } else {
            dd_str.to_string()
        };
        println!(
            "  {:<24} ${:>7.2} ${:>9.2} {:>10} {:>8}  {status_icon}",
            row.name, row.allocated, row.equity, pnl_colored, dd_colored
        );
    }

    println!();
    Ok(())
}

fn print_strategy_detail(name: &str, alloc: &serde_json::Value) {
    let allocated = alloc.get("allocated_capital").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let realized = alloc.get("realized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let unrealized = alloc.get("unrealized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let fees = alloc.get("fees_paid").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let funding = alloc.get("funding_paid").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let peak = alloc.get("peak_equity").and_then(|v| v.as_f64()).unwrap_or(allocated);

    let equity = allocated + realized + unrealized - fees - funding;
    let dd = if peak > 0.0 { ((peak - equity) / peak * 100.0).max(0.0) } else { 0.0 };

    println!("\n  === {} ===\n", name.bold());
    println!("  配额资金:     ${:.2}", allocated);
    println!("  虚拟权益:     ${:.2}", equity);
    println!("  已实现 PnL:   {:+.4}", realized);
    println!("  未实现 PnL:   {:+.4}", unrealized);
    println!("  手续费:       ${:.4}", fees);
    println!("  资金费:       ${:.4}", funding);
    println!("  高水位:       ${:.2}", peak);
    println!("  回撤:         {:.1}%", dd);

    let positions = alloc
        .get("positions")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    if positions.is_empty() {
        println!("\n  持仓: (无)");
    } else {
        println!("\n  持仓:");
        println!(
            "    {:<16} {:<6} {:>10} {:>12} {:>12}",
            "币种", "方向", "数量", "开仓价", "未实现PnL"
        );
        println!("    {}", "─".repeat(58));
        for (sym, pos) in &positions {
            let side = pos.get("side").and_then(|v| v.as_str()).unwrap_or("?");
            let qty: f64 = pos.get("qty").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let entry: f64 = pos.get("entry_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let upnl: f64 = pos.get("unrealized_pnl").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let sign = if upnl >= 0.0 { "+" } else { "" };
            println!(
                "    {:<16} {:<6} {:>10.4} ${:>11.4} {sign}${:>10.4}",
                sym, side, qty, entry, upnl
            );
        }
    }
    println!();
}
