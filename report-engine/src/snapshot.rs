use chrono::Utc;
use clawchat_shared::paths;
use std::collections::HashMap;
use std::fmt::Write;

use crate::data;

pub fn generate(binance_balance: Option<f64>) -> String {
    let records_dir = paths::records_dir();
    let strategies_dir = paths::strategies_dir();
    let now = Utc::now();
    let date = now.date_naive();

    let from = date.and_hms_opt(0, 0, 0).unwrap().and_utc();
    let to = date.succ_opt().unwrap_or(date).and_hms_opt(0, 0, 0).unwrap().and_utc();

    let trades = data::read_trades(&records_dir, from, to);
    let pnl_records = data::read_pnl(&records_dir, from, to);
    let risk_events = data::read_risk_events(&records_dir, from, to);
    let ledger = data::read_ledger(&records_dir);
    let strategy_configs = data::read_strategy_configs(&strategies_dir);
    let autopilot_log = data::read_autopilot_log(5);

    let mut out = String::new();
    let ts = now.format("%Y-%m-%d %H:%M UTC");
    let _ = writeln!(out, "# 状态快照 {ts}\n");

    // ── 1. 账户总览 ────────────────────────────────────────────────
    let _ = writeln!(out, "## 1. 账户总览\n");

    if let Some(ref l) = ledger {
        let virtual_equity = l.total_equity();
        let total_allocated = l.total_allocated();
        let total_pnl = l.total_pnl();
        let global_dd = l.global_drawdown_pct();

        if let Some(balance) = binance_balance {
            let diff = balance - virtual_equity;
            let _ = writeln!(out, "- Binance 真实余额: ${balance:.2}");
            let _ = writeln!(out, "- 虚拟账户总权益: ${virtual_equity:.2}");
            let _ = writeln!(out, "- 差额: ${diff:+.2}");
        } else {
            let _ = writeln!(out, "- Binance 真实余额: N/A（API 未配置或不可用）");
            let _ = writeln!(out, "- 虚拟账户总权益: ${virtual_equity:.2}");
        }
        let _ = writeln!(out, "- 总配额: ${total_allocated:.2}");
        let _ = writeln!(out, "- 总 PnL（已实现+未实现-手续费）: ${total_pnl:+.2}");
        let _ = writeln!(out, "- 全局回撤: {global_dd:.1}%（红线 10%）\n");
    } else {
        let _ = writeln!(out, "- Binance 真实余额: {}", match binance_balance {
            Some(b) => format!("${b:.2}"),
            None => "N/A".to_string(),
        });
        let _ = writeln!(out, "- 虚拟账户总权益: N/A（无 ledger 数据）\n");
    }

    // ── 2. 策略状态快照 ─────────────────────────────────────────────
    let _ = writeln!(out, "## 2. 策略状态快照\n");

    if strategy_configs.is_empty() {
        let _ = writeln!(out, "（无已批准策略）\n");
    } else {
        let _ = writeln!(
            out,
            "| 策略 | 币种 | 周期 | mode | 配额 | 虚拟权益 | PnL | 回撤 | 交易 | 胜率 | 持仓 | trade | 止损/止盈 |"
        );
        let _ = writeln!(
            out,
            "|------|------|------|------|------|---------|-----|------|------|------|------|-------|-----------|"
        );

        for c in &strategy_configs {
            let (equity_str, pnl_str, dd_str, trades_str, wr_str, pos_str) =
                if let Some(ref l) = ledger {
                    if let Some(alloc) = l.strategies.get(&c.name) {
                        let equity = alloc.virtual_equity();
                        let pnl = alloc.total_pnl();
                        let dd = alloc.drawdown_pct();
                        let stats = get_trade_stats(&pnl_records, &c.name);
                        let wr = if stats.0 > 0 {
                            format!("{:.0}%", stats.1 as f64 / stats.0 as f64 * 100.0)
                        } else {
                            "-".to_string()
                        };

                        let pos = if alloc.positions.is_empty() {
                            "-".to_string()
                        } else {
                            alloc.positions.values()
                                .map(|p| format!("{} {:.4}", p.side, p.qty))
                                .collect::<Vec<_>>()
                                .join(", ")
                        };

                        (
                            format!("${equity:.2}"),
                            format!("${pnl:+.2}"),
                            format!("{dd:.1}%"),
                            format!("{}", stats.0),
                            wr,
                            pos,
                        )
                    } else {
                        ("N/A".into(), "N/A".into(), "-".into(), "0".into(), "-".into(), "-".into())
                    }
                } else {
                    ("N/A".into(), "N/A".into(), "-".into(), "0".into(), "-".into(), "-".into())
                };

            let _ = writeln!(
                out,
                "| {} | {} | {} | {} | ${:.0} | {} | {} | {} | {} | {} | {} | {} | {:.0}%/{:.0}% |",
                c.name,
                c.symbol.replace("USDT", ""),
                c.timeframe,
                c.mode,
                c.capital,
                equity_str,
                pnl_str,
                dd_str,
                trades_str,
                wr_str,
                pos_str,
                c.trade_action,
                c.risk_max_loss * 100.0,
                c.risk_max_profit * 100.0,
            );
        }
        let _ = writeln!(out);
    }

    // ── 3. 币种敞口汇总 ─────────────────────────────────────────────
    let _ = writeln!(out, "## 3. 币种敞口汇总\n");

    let mut coin_exposure: HashMap<String, CoinExposure> = HashMap::new();
    let total_equity_for_pct = ledger.as_ref().map(|l| l.total_equity()).unwrap_or(1.0);

    for c in &strategy_configs {
        let coin = c.symbol.replace("USDT", "");
        let entry = coin_exposure.entry(coin).or_default();
        entry.strategy_count += 1;
        entry.total_capital += c.capital;

        if let Some(ref l) = ledger {
            if let Some(alloc) = l.strategies.get(&c.name) {
                entry.total_pnl += alloc.total_pnl();
                for p in alloc.positions.values() {
                    let signed_qty = if p.side == "LONG" { p.qty } else { -p.qty };
                    entry.net_position += signed_qty;
                }
            }
        }
    }

    if coin_exposure.is_empty() {
        let _ = writeln!(out, "（无数据）\n");
    } else {
        let _ = writeln!(
            out,
            "| 币种 | 策略数 | 总配额 | 总 PnL | 净持仓 | 占总资产% |"
        );
        let _ = writeln!(
            out,
            "|------|--------|--------|--------|--------|----------|"
        );

        let mut sorted: Vec<_> = coin_exposure.iter().collect();
        sorted.sort_by(|a, b| b.1.total_capital.partial_cmp(&a.1.total_capital).unwrap_or(std::cmp::Ordering::Equal));

        for (coin, exp) in &sorted {
            let pct = if total_equity_for_pct > 0.0 {
                exp.total_capital / total_equity_for_pct * 100.0
            } else {
                0.0
            };
            let pos_str = if exp.net_position.abs() < 0.0001 {
                "-".to_string()
            } else {
                format!("{:.4}", exp.net_position)
            };
            let _ = writeln!(
                out,
                "| {} | {} | ${:.0} | ${:+.2} | {} | {:.1}% |",
                coin, exp.strategy_count, exp.total_capital, exp.total_pnl, pos_str, pct,
            );
        }
        let _ = writeln!(out);
    }

    // ── 4. 风控状态 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 4. 风控状态\n");

    if let Some(ref l) = ledger {
        let global_dd = l.global_drawdown_pct();
        let dd_status = if global_dd >= 10.0 { "RED" } else if global_dd >= 7.0 { "YELLOW" } else { "OK" };
        let _ = writeln!(out, "- 全局回撤: {global_dd:.1}% / 10% 红线 [{dd_status}]\n");

        let mut yellow = Vec::new();
        let mut red = Vec::new();

        for alloc in l.strategies.values() {
            let dd = alloc.drawdown_pct();
            if dd >= 25.0 {
                red.push(format!("{} ({dd:.1}%)", alloc.strategy_name));
            } else if dd >= 15.0 {
                yellow.push(format!("{} ({dd:.1}%)", alloc.strategy_name));
            }
        }

        if !red.is_empty() {
            let _ = writeln!(out, "- RED (>=25%): {}", red.join(", "));
        }
        if !yellow.is_empty() {
            let _ = writeln!(out, "- YELLOW (>=15%): {}", yellow.join(", "));
        }
        if red.is_empty() && yellow.is_empty() {
            let _ = writeln!(out, "- 所有策略回撤正常");
        }
    } else {
        let _ = writeln!(out, "- 无 ledger 数据");
    }

    // Risk events today
    if !risk_events.is_empty() {
        let _ = writeln!(out, "\n今日风控事件: {} 个", risk_events.len());
        for e in risk_events.iter().take(5) {
            let time = if e.ts.len() >= 19 { &e.ts[11..19] } else { &e.ts };
            let _ = writeln!(out, "  - {time} {}: {} → {}", e.strategy, e.rule, e.verdict);
        }
        if risk_events.len() > 5 {
            let _ = writeln!(out, "  - ...及其他 {} 个", risk_events.len() - 5);
        }
    }

    // Autopilot recent actions
    let _ = writeln!(out);
    if !autopilot_log.is_empty() {
        let _ = writeln!(out, "Autopilot 最近动作:");
        for line in &autopilot_log {
            let _ = writeln!(out, "  - {line}");
        }
    } else {
        let _ = writeln!(out, "Autopilot: 无最近动作记录");
    }
    let _ = writeln!(out);

    // ── 5. 今日交易明细 ──────────────────────────────────────────────
    let _ = writeln!(out, "## 5. 今日交易明细\n");

    if trades.is_empty() {
        let _ = writeln!(out, "（今日无交易）\n");
    } else {
        let _ = writeln!(
            out,
            "| 时间 | 策略 | 方向 | 数量 | 价格 | PnL |"
        );
        let _ = writeln!(
            out,
            "|------|------|------|------|------|-----|"
        );
        for t in &trades {
            let time = if t.ts.len() >= 19 { &t.ts[11..19] } else { &t.ts };
            let pnl_str = match t.pnl {
                Some(p) => format!("${p:+.2}"),
                None => "-".to_string(),
            };
            let _ = writeln!(
                out,
                "| {} | {} | {} {} | {} | {} | {} |",
                time, t.strategy, t.symbol, t.side, t.qty, t.price, pnl_str,
            );
        }
        let _ = writeln!(out);
    }

    // ── 6. 回测参考 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 6. 回测参考\n");

    if strategy_configs.is_empty() {
        let _ = writeln!(out, "（无策略）\n");
    } else {
        let _ = writeln!(
            out,
            "| 策略 | 回测 Sharpe | 回测 ROI | 回测 DD | 实盘 PnL | 偏差 |"
        );
        let _ = writeln!(
            out,
            "|------|-----------|---------|---------|---------|------|"
        );

        for c in &strategy_configs {
            let live_pnl = ledger.as_ref()
                .and_then(|l| l.strategies.get(&c.name))
                .map(|a| a.total_pnl());

            let (pnl_str, deviation) = match live_pnl {
                Some(pnl) => {
                    let dev = if c.bt_roi.abs() > 0.01 && c.capital > 0.0 {
                        let live_roi = pnl / c.capital * 100.0;
                        format!("{:+.1}%", live_roi - c.bt_roi)
                    } else {
                        "-".to_string()
                    };
                    (format!("${pnl:+.2}"), dev)
                }
                None => ("N/A".to_string(), "-".to_string()),
            };

            let _ = writeln!(
                out,
                "| {} | {:.1} | {:.1}% | {:.1}% | {} | {} |",
                c.name, c.bt_sharpe, c.bt_roi, c.bt_dd, pnl_str, deviation,
            );
        }
        let _ = writeln!(out);
    }

    // ── 7. 引擎状态 ──────────────────────────────────────────────────
    let _ = writeln!(out, "## 7. 引擎状态\n");

    let services = [
        ("交易引擎", "engine.pid"),
        ("数据引擎", "data-engine.pid"),
        ("Autopilot", "autopilot.pid"),
    ];

    let _ = writeln!(out, "| 服务 | PID | 状态 | 运行时长 |");
    let _ = writeln!(out, "|------|-----|------|---------|");

    for (label, pid_file) in &services {
        match data::get_service_status(pid_file) {
            Some(status) if status.running => {
                let uptime_str = status.uptime_secs
                    .map(|s| data::format_uptime(s))
                    .unwrap_or_else(|| "N/A".to_string());
                let _ = writeln!(out, "| {} | {} | 运行中 | {} |", label, status.pid, uptime_str);
            }
            Some(status) => {
                let _ = writeln!(out, "| {} | {} | 已停止 | - |", label, status.pid);
            }
            None => {
                let _ = writeln!(out, "| {} | - | 未启动 | - |", label);
            }
        }
    }

    let loaded_count = strategy_configs.len();
    let _ = writeln!(out, "\n- 加载策略数: {loaded_count}");

    if let Some(last_ts) = data::get_data_engine_last_collect() {
        let _ = writeln!(out, "- 数据引擎最后采集: {last_ts}");
    }
    let _ = writeln!(out);

    // Warmup progress
    let candle_counts = data::count_candles_per_strategy();
    let warmup_needed = data::warmup_candles_needed(&strategies_dir);

    if !warmup_needed.is_empty() {
        let _ = writeln!(out, "### 预热状态\n");
        let _ = writeln!(out, "| 策略 | 已聚合 K 线 | 需要 | 状态 |");
        let _ = writeln!(out, "|------|-----------|------|------|");

        let mut warmup_list: Vec<_> = warmup_needed.iter().collect();
        warmup_list.sort_by_key(|(name, _)| name.to_string());

        for (name, needed) in &warmup_list {
            let count = candle_counts.get(*name).copied().unwrap_or(0);
            let status = if count >= **needed { "就绪" } else { "预热中" };
            let _ = writeln!(out, "| {} | {} | {} | {} |", name, count, needed, status);
        }
        let _ = writeln!(out);
    }

    out
}

fn get_trade_stats(pnl_records: &[data::PnlRecord], strategy_name: &str) -> (u32, u32) {
    let mut total = 0u32;
    let mut wins = 0u32;
    for r in pnl_records {
        if r.strategy == strategy_name {
            total += 1;
            if r.net_pnl > 0.0 {
                wins += 1;
            }
        }
    }
    (total, wins)
}

#[derive(Default)]
struct CoinExposure {
    strategy_count: u32,
    total_capital: f64,
    total_pnl: f64,
    net_position: f64,
}

pub async fn write_snapshot() -> std::io::Result<std::path::PathBuf> {
    let binance_balance = data::get_binance_balance().await;
    let report = generate(binance_balance);
    let dir = paths::reports_dir().join("snapshot");
    std::fs::create_dir_all(&dir)?;
    let ts = Utc::now().format("%Y-%m-%d-%H%M%S");
    let filename = format!("{ts}.md");
    let path = dir.join(&filename);
    std::fs::write(&path, &report)?;
    Ok(path)
}
