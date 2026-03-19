use chrono::NaiveDate;
use clawchat_shared::paths;
use std::collections::HashMap;
use std::fmt::Write;

use crate::data;

pub fn generate(date: NaiveDate) -> String {
    let records_dir = paths::records_dir();
    let strategies_dir = paths::strategies_dir();

    let from = date
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc();
    let to = date
        .succ_opt()
        .unwrap_or(date)
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc();

    let trades = data::read_trades(&records_dir, from, to);
    let pnl_records = data::read_pnl(&records_dir, from, to);
    let risk_events = data::read_risk_events(&records_dir, from, to);
    let signals = data::read_signals(&records_dir, from, to);
    let ledger = data::read_ledger(&records_dir);
    let strategy_configs = data::read_strategy_configs(&strategies_dir);

    let has_data = !trades.is_empty()
        || !pnl_records.is_empty()
        || !risk_events.is_empty()
        || ledger.is_some();

    let mut out = String::new();
    let _ = writeln!(out, "# 日报 {date}\n");

    if !has_data {
        let _ = writeln!(out, "> 今日无交易数据（引擎未运行或无交易活动）\n");
        let _ = writeln!(out, "## 总览\n");
        let _ = writeln!(out, "- 活跃策略: {} 个", strategy_configs.len());
        let _ = writeln!(out, "- 当日交易: 0 笔");
        let _ = writeln!(out, "- 当日信号: 0 个\n");
        write_strategy_list(&mut out, &strategy_configs);
        return out;
    }

    // ── 总览 ──────────────────────────────────────────────────────
    let _ = writeln!(out, "## 总览\n");

    // Total asset from ledger
    if let Some(ref l) = ledger {
        let total_equity: f64 = l
            .strategies
            .values()
            .map(|a| a.virtual_equity())
            .sum();
        let _ = writeln!(out, "- 总资产: ${total_equity:.2}");
    } else {
        let _ = writeln!(out, "- 总资产: N/A（无 ledger 数据）");
    }

    // Daily PnL
    let daily_pnl: f64 = pnl_records.iter().map(|r| r.net_pnl).sum();
    let total_equity_for_pct = ledger
        .as_ref()
        .map(|l| {
            l.strategies
                .values()
                .map(|a| a.virtual_equity())
                .sum::<f64>()
        })
        .unwrap_or(0.0);
    let pnl_pct = if total_equity_for_pct > 0.0 {
        daily_pnl / total_equity_for_pct * 100.0
    } else {
        0.0
    };
    let _ = writeln!(
        out,
        "- 当日盈亏: {:+.2} ({:+.2}%)",
        daily_pnl, pnl_pct
    );
    let _ = writeln!(out, "- 活跃策略: {} 个", strategy_configs.len());
    let _ = writeln!(out, "- 当日交易: {} 笔", trades.len());
    let _ = writeln!(out, "- 当日信号: {} 个\n", signals.len());

    // ── 策略 PnL 排行 ────────────────────────────────────────────
    let _ = writeln!(out, "## 策略 PnL 排行\n");

    // Aggregate PnL by strategy
    let mut strat_pnl: HashMap<String, (f64, f64, u32, u32)> = HashMap::new(); // (daily_net, cumulative, trades, wins)
    for r in &pnl_records {
        let entry = strat_pnl.entry(r.strategy.clone()).or_default();
        entry.0 += r.net_pnl;
        entry.2 += 1;
        if r.net_pnl > 0.0 {
            entry.3 += 1;
        }
    }

    // Cumulative PnL from ledger
    if let Some(ref l) = ledger {
        for (name, alloc) in &l.strategies {
            if let Some(entry) = strat_pnl.get_mut(name) {
                entry.1 = alloc.realized_pnl - alloc.fees_paid - alloc.funding_paid;
            }
        }
    }

    if strat_pnl.is_empty() {
        let _ = writeln!(out, "（今日无策略 PnL 数据）\n");
    } else {
        let _ = writeln!(
            out,
            "| 策略 | 当日 PnL | 累计 PnL | 交易次数 | 胜率 |"
        );
        let _ = writeln!(
            out,
            "|------|----------|----------|---------|------|"
        );

        let mut sorted: Vec<_> = strat_pnl.iter().collect();
        sorted.sort_by(|a, b| b.1 .0.partial_cmp(&a.1 .0).unwrap_or(std::cmp::Ordering::Equal));

        for (name, (daily, cumulative, trade_count, wins)) in &sorted {
            let win_rate = if *trade_count > 0 {
                *wins as f64 / *trade_count as f64 * 100.0
            } else {
                0.0
            };
            let _ = writeln!(
                out,
                "| {name} | {:+.2} | {:+.2} | {trade_count} | {win_rate:.1}% |",
                daily, cumulative,
            );
        }
        let _ = writeln!(out);
    }

    // ── 风控状态 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 风控状态\n");

    if let Some(ref l) = ledger {
        let _ = writeln!(
            out,
            "| 策略 | 虚拟权益 | 配额 | 回撤 | 状态 |"
        );
        let _ = writeln!(
            out,
            "|------|---------|------|------|------|"
        );

        let mut allocs: Vec<_> = l.strategies.values().collect();
        allocs.sort_by(|a, b| a.strategy_name.cmp(&b.strategy_name));

        for alloc in &allocs {
            let equity = alloc.virtual_equity();
            let dd = alloc.drawdown_pct();
            let status = if dd >= 25.0 {
                "🔴 暂停"
            } else if dd >= 15.0 {
                "⚠️ 黄灯"
            } else {
                "✅"
            };
            let _ = writeln!(
                out,
                "| {} | ${:.2} | ${:.0} | {:.1}% | {} |",
                alloc.strategy_name,
                equity,
                alloc.allocated_capital,
                dd,
                status,
            );
        }
        let _ = writeln!(out);
    } else {
        let _ = writeln!(out, "（无 ledger 数据）\n");
    }

    // ── 交易明细 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 交易明细\n");

    if trades.is_empty() {
        let _ = writeln!(out, "（今日无交易）\n");
    } else {
        let _ = writeln!(
            out,
            "| 时间 | 策略 | 币种 | 方向 | 数量 | 价格 | 状态 |"
        );
        let _ = writeln!(
            out,
            "|------|------|------|------|------|------|------|"
        );
        for t in &trades {
            let time = if t.ts.len() >= 19 {
                &t.ts[11..19]
            } else {
                &t.ts
            };
            let _ = writeln!(
                out,
                "| {} | {} | {} | {} | {} | {} | {} |",
                time, t.strategy, t.symbol, t.side, t.qty, t.price, t.status,
            );
        }
        let _ = writeln!(out);
    }

    // ── 风控事件 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 风控事件\n");

    if risk_events.is_empty() {
        let _ = writeln!(out, "（今日无风控事件）\n");
    } else {
        let _ = writeln!(out, "| 时间 | 策略 | 规则 | 判定 | 详情 |");
        let _ = writeln!(out, "|------|------|------|------|------|");
        for e in &risk_events {
            let time = if e.ts.len() >= 19 {
                &e.ts[11..19]
            } else {
                &e.ts
            };
            let _ = writeln!(
                out,
                "| {} | {} | {} | {} | {} |",
                time, e.strategy, e.rule, e.verdict, e.detail,
            );
        }
        let _ = writeln!(out);
    }

    out
}

fn write_strategy_list(out: &mut String, configs: &[data::StrategyInfo]) {
    if configs.is_empty() {
        let _ = writeln!(out, "（无已批准策略）");
        return;
    }
    let _ = writeln!(out, "## 活跃策略\n");
    let _ = writeln!(out, "| 策略 | 币种 | 周期 | 配额 | 杠杆 |");
    let _ = writeln!(out, "|------|------|------|------|------|");
    for c in configs {
        let _ = writeln!(
            out,
            "| {} | {} | {} | ${:.0} | {}x |",
            c.name, c.symbol, c.timeframe, c.capital, c.leverage,
        );
    }
    let _ = writeln!(out);
}

pub fn write_report(date: NaiveDate) -> std::io::Result<std::path::PathBuf> {
    let report = generate(date);
    let reports_dir = paths::reports_dir();
    std::fs::create_dir_all(&reports_dir)?;
    let filename = format!("daily-{date}.md");
    let path = reports_dir.join(&filename);
    std::fs::write(&path, &report)?;
    Ok(path)
}
