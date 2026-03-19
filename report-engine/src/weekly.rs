use chrono::{Datelike, NaiveDate};
use clawchat_shared::paths;
use std::collections::HashMap;
use std::fmt::Write;

use crate::data;

/// Get the Monday of the week containing `date`
fn week_monday(date: NaiveDate) -> NaiveDate {
    let days_from_monday = date.weekday().num_days_from_monday();
    date - chrono::Duration::days(days_from_monday as i64)
}

pub fn generate(date: NaiveDate) -> String {
    let records_dir = paths::records_dir();
    let strategies_dir = paths::strategies_dir();

    let monday = week_monday(date);
    let sunday = monday + chrono::Duration::days(7);

    let from = monday.and_hms_opt(0, 0, 0).unwrap().and_utc();
    let to = sunday.and_hms_opt(0, 0, 0).unwrap().and_utc();

    let trades = data::read_trades(&records_dir, from, to);
    let pnl_records = data::read_pnl(&records_dir, from, to);
    let risk_events = data::read_risk_events(&records_dir, from, to);
    let ledger = data::read_ledger(&records_dir);
    let strategy_configs = data::read_strategy_configs(&strategies_dir);

    let has_data = !trades.is_empty()
        || !pnl_records.is_empty()
        || !risk_events.is_empty()
        || ledger.is_some();

    let week_end = monday + chrono::Duration::days(6);
    let mut out = String::new();
    let _ = writeln!(out, "# 周报 {monday} ~ {week_end}\n");

    if !has_data {
        let _ = writeln!(out, "> 本周无交易数据（引擎未运行或无交易活动）\n");
        let _ = writeln!(out, "## 总览\n");
        let _ = writeln!(out, "- 活跃策略: {} 个", strategy_configs.len());
        let _ = writeln!(out, "- 本周交易: 0 笔");
        let _ = writeln!(out, "- 本周风控事件: 0 个\n");
        return out;
    }

    // ── 总览 ──────────────────────────────────────────────────────
    let _ = writeln!(out, "## 总览\n");

    let week_pnl: f64 = pnl_records.iter().map(|r| r.net_pnl).sum();

    if let Some(ref l) = ledger {
        let total_equity = l.total_equity();
        let start_equity = total_equity - week_pnl;
        let week_return_pct = if start_equity > 0.0 {
            week_pnl / start_equity * 100.0
        } else {
            0.0
        };
        let _ = writeln!(out, "- 周起始资产: ${start_equity:.2}（估算）");
        let _ = writeln!(out, "- 周末资产: ${total_equity:.2}");
        let _ = writeln!(
            out,
            "- 周收益: {:+.2} ({:+.2}%)",
            week_pnl, week_return_pct
        );

        let max_dd = l
            .strategies
            .values()
            .map(|a| a.drawdown_pct())
            .fold(0.0_f64, f64::max);
        let _ = writeln!(out, "- 最大策略回撤: {max_dd:.1}%");
    } else {
        let _ = writeln!(out, "- 周收益: {:+.2}", week_pnl);
    }

    let _ = writeln!(out, "- 本周交易: {} 笔", trades.len());
    let _ = writeln!(out, "- 本周风控事件: {} 个\n", risk_events.len());

    // ── 策略周表现 ────────────────────────────────────────────────
    let _ = writeln!(out, "## 策略周表现\n");

    struct StratWeekStats {
        pnl: f64,
        trades: u32,
        wins: u32,
    }

    let mut strat_stats: HashMap<String, StratWeekStats> = HashMap::new();
    for r in &pnl_records {
        let entry = strat_stats.entry(r.strategy.clone()).or_insert(StratWeekStats {
            pnl: 0.0,
            trades: 0,
            wins: 0,
        });
        entry.pnl += r.net_pnl;
        entry.trades += 1;
        if r.net_pnl > 0.0 {
            entry.wins += 1;
        }
    }

    if strat_stats.is_empty() {
        let _ = writeln!(out, "（本周无策略交易数据）\n");
    } else {
        let _ = writeln!(
            out,
            "| 策略 | 周 PnL | 交易次数 | 胜率 | 建议 |"
        );
        let _ = writeln!(
            out,
            "|------|--------|---------|------|------|"
        );

        let mut sorted: Vec<_> = strat_stats.iter().collect();
        sorted.sort_by(|a, b| b.1.pnl.partial_cmp(&a.1.pnl).unwrap_or(std::cmp::Ordering::Equal));

        for (name, stats) in &sorted {
            let win_rate = if stats.trades > 0 {
                stats.wins as f64 / stats.trades as f64 * 100.0
            } else {
                0.0
            };

            let suggestion = if stats.pnl > 0.0 && win_rate >= 50.0 {
                "继续"
            } else if stats.pnl < 0.0 && stats.trades >= 3 {
                "观察"
            } else if stats.pnl < -2.0 {
                "减配"
            } else {
                "继续"
            };

            let _ = writeln!(
                out,
                "| {name} | {:+.2} | {} | {win_rate:.1}% | {suggestion} |",
                stats.pnl, stats.trades,
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
                "RED"
            } else if dd >= 15.0 {
                "YELLOW"
            } else {
                "OK"
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
    }

    // ── 风控事件汇总 ─────────────────────────────────────────────
    if !risk_events.is_empty() {
        let _ = writeln!(out, "## 风控事件汇总\n");
        let _ = writeln!(out, "| 时间 | 策略 | 规则 | 判定 | 详情 |");
        let _ = writeln!(out, "|------|------|------|------|------|");
        for e in &risk_events {
            let date_part = if e.ts.len() >= 10 { &e.ts[..10] } else { &e.ts };
            let _ = writeln!(
                out,
                "| {} | {} | {} | {} | {} |",
                date_part, e.strategy, e.rule, e.verdict, e.detail,
            );
        }
        let _ = writeln!(out);
    }

    // ── 建议 ──────────────────────────────────────────────────────
    let _ = writeln!(out, "## 建议\n");

    let mut has_suggestion = false;

    let good: Vec<_> = strat_stats
        .iter()
        .filter(|(_, s)| s.pnl > 1.0 && s.trades >= 2)
        .collect();
    if !good.is_empty() {
        has_suggestion = true;
        for (name, stats) in &good {
            let _ = writeln!(
                out,
                "- **{name}** 周 PnL {:+.2}，{} 笔交易 — 可考虑加配",
                stats.pnl, stats.trades,
            );
        }
    }

    let bad: Vec<_> = strat_stats
        .iter()
        .filter(|(_, s)| s.pnl < -1.0 && s.trades >= 2)
        .collect();
    if !bad.is_empty() {
        has_suggestion = true;
        for (name, stats) in &bad {
            let _ = writeln!(
                out,
                "- **{name}** 周 PnL {:+.2}，{} 笔交易 — 建议观察或减配",
                stats.pnl, stats.trades,
            );
        }
    }

    if !has_suggestion {
        let _ = writeln!(out, "- 本周数据不足，暂无调整建议");
    }
    let _ = writeln!(out);

    out
}

pub fn write_report(date: NaiveDate) -> std::io::Result<std::path::PathBuf> {
    let report = generate(date);
    let dir = paths::reports_dir().join("weekly");
    std::fs::create_dir_all(&dir)?;
    let monday = week_monday(date);
    let filename = format!("{monday}.md");
    let path = dir.join(&filename);
    std::fs::write(&path, &report)?;
    Ok(path)
}
