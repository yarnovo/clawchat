use clap::{Parser, Subcommand};
use clawchat_shared::config_util::timeframe_to_ms;
use clawchat_shared::data::DataStore;
use discovery::evaluator::{backtest_batch_optimized, BacktestConfig};
use discovery::generator::{ParamGenerator, StrategyType};

#[derive(Parser)]
#[command(name = "discovery", about = "策略发现引擎 — 参数搜索与自动筛选")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 扫描参数空间，发现优秀策略
    Scan {
        /// 策略类型: trend, breakout, rsi, all
        #[arg(long)]
        strategy: String,

        /// 交易对: NTRNUSDT, all（扫描所有有数据的币种）
        #[arg(long)]
        symbol: String,

        /// 回测天数
        #[arg(long, default_value = "90")]
        days: u32,

        /// K 线时间周期: 5m, 15m, all
        #[arg(long, default_value = "5m")]
        timeframe: String,

        /// 参数空间 JSON 字符串（覆盖默认范围）
        /// 例: --params '{"ema_fast":{"min":5,"max":50,"step":2},"ema_slow":{"min":30,"max":200,"step":5}}'
        #[arg(long)]
        params: Option<String>,
    },
    /// 显示发现结果
    Status,
}

fn resolve_strategies(s: &str) -> Vec<StrategyType> {
    if s == "all" {
        StrategyType::all()
    } else {
        match StrategyType::from_str(s) {
            Some(st) => vec![st],
            None => {
                eprintln!("未知策略类型: {s}（可选: trend, breakout, rsi, all）");
                std::process::exit(1);
            }
        }
    }
}

fn resolve_symbols(s: &str, store: &DataStore) -> Vec<String> {
    if s == "all" {
        store.list_symbols()
    } else {
        vec![s.to_uppercase()]
    }
}

fn resolve_timeframes(s: &str) -> Vec<&str> {
    if s == "all" {
        vec!["5m", "15m"]
    } else {
        match s {
            "5m" | "15m" => vec![s],
            _ => {
                eprintln!("不支持的时间周期: {s}（可选: 5m, 15m, all）");
                std::process::exit(1);
            }
        }
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();
    let store = DataStore::new("data");

    match cli.command {
        Commands::Scan {
            strategy,
            symbol,
            days,
            timeframe,
            params,
        } => {
            // 解析 --params JSON 字符串为 ParamRange map
            let param_overrides: Option<std::collections::HashMap<String, discovery::generator::ParamRange>> =
                params.as_ref().map(|json_str| {
                    serde_json::from_str(json_str).unwrap_or_else(|e| {
                        eprintln!("--params JSON 解析失败: {e}");
                        std::process::exit(1);
                    })
                });

            let strategies = resolve_strategies(&strategy);
            let symbols = resolve_symbols(&symbol, &store);
            let timeframes_owned: Vec<String> = resolve_timeframes(&timeframe)
                .into_iter()
                .map(|s| s.to_string())
                .collect();
            let scan_days = days;

            if symbols.is_empty() {
                eprintln!("没有可用数据，请先用 data-engine 下载行情数据");
                std::process::exit(1);
            }

            let bt_config = BacktestConfig::default();
            let discovered_dir = clawchat_shared::paths::discovered_dir();
            std::fs::create_dir_all(&discovered_dir).ok();
            let mut all_results = Vec::new();

            for st in &strategies {
                let pg = ParamGenerator::new(*st);
                let pg = match &param_overrides {
                    Some(overrides) => pg.with_param_overrides(overrides),
                    None => pg,
                };
                let combos = pg.generate();
                println!(
                    "[{:?}] 参数组合: {} (总 {}, 过滤后 {})",
                    st,
                    combos.len(),
                    pg.total_combinations(),
                    combos.len()
                );

                for tf in &timeframes_owned {
                    let tf_ms = timeframe_to_ms(tf).unwrap();

                    for sym in &symbols {
                        println!(
                            "  {} x {} @ {} — {} 组合, {} 天回测",
                            st.engine_name(),
                            sym,
                            tf,
                            combos.len(),
                            scan_days
                        );

                        // 1. 读取 1m K 线并聚合到目标周期
                        let candles_1m = match store.read_candles(sym, "1m", None, None) {
                            Ok(c) => c,
                            Err(e) => {
                                eprintln!("    跳过 {sym}: {e}");
                                continue;
                            }
                        };

                        let candles = if tf_ms == 60_000 {
                            candles_1m
                        } else {
                            DataStore::aggregate_candles(&candles_1m, tf_ms)
                        };

                        // 按天数截取
                        let ms_window = scan_days as u64 * 86_400_000;
                        let candles: Vec<_> = if let Some(last) = candles.last() {
                            let cutoff = last.timestamp.saturating_sub(ms_window);
                            candles
                                .into_iter()
                                .filter(|c| c.timestamp >= cutoff)
                                .collect()
                        } else {
                            eprintln!("    跳过 {sym}: 无 K 线数据");
                            continue;
                        };

                        if candles.len() < 100 {
                            eprintln!(
                                "    跳过 {sym} @ {tf}: K 线不足 ({})",
                                candles.len()
                            );
                            continue;
                        }

                        // 2. 按 70/30 切分（训练集用于批量回测）
                        let split_idx = (candles.len() as f64 * 0.7) as usize;
                        let train_candles = &candles[..split_idx];

                        // 3. Evaluator 批量回测训练集
                        println!(
                            "    回测中... ({} 根 K 线, 训练集 {})",
                            candles.len(),
                            train_candles.len()
                        );
                        let batch_results =
                            backtest_batch_optimized(train_candles, st.engine_name(), &combos, &bt_config);

                        let passing_count = batch_results
                            .iter()
                            .filter(|(_, m)| {
                                m.as_ref()
                                    .is_some_and(|m| clawchat_shared::criteria::passes(m, scan_days))
                            })
                            .count();
                        println!("    通过准入: {passing_count}/{}", batch_results.len());

                        // 4. Selector 筛选
                        let selected = discovery::selector::select(
                            &batch_results,
                            &candles,
                            st.engine_name(),
                            sym,
                            tf,
                            &bt_config,
                            scan_days,
                        );

                        println!("    筛选后: {} 个策略", selected.len());
                        all_results.extend(selected);
                    }
                }
            }

            // 5. 输出
            if all_results.is_empty() {
                println!("\n未发现符合条件的策略");
            } else {
                discovery::output::print_report(&all_results);
                match discovery::output::write_strategy_files(&all_results, &discovered_dir) {
                    Ok(created) => {
                        if created.is_empty() {
                            println!("所有策略目录已存在，无新文件生成");
                        } else {
                            println!("已生成 {} 个策略文件到 discovered/:", created.len());
                            for name in &created {
                                println!("  discovered/{name}/signal.json (status=pending)");
                            }
                            println!("\n运行 /review-discovered 审批上线");
                        }
                    }
                    Err(e) => eprintln!("写入策略文件失败: {e}"),
                }
            }
        }
        Commands::Status => {
            println!("[TODO] 发现结果展示尚未实现");
        }
    }
}
