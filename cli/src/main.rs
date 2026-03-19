pub mod backtest;
mod cmd;
pub mod report;
mod util;

use clap::{Parser, Subcommand};
use clawchat_shared::exchange::Exchange;

// ── CLI 定义 ────────────────────────────────────────────────

#[derive(Parser)]
#[command(name = "clawchat", about = "ClawChat 量化交易工作站")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// 行情监控
    Watch {
        /// 自选列表（可选，空则使用默认）
        symbols: Vec<String>,
    },
    /// 账户余额
    Account,
    /// 扫描高波动币种
    Scan {
        /// 返回前 N 个
        #[arg(long, default_value_t = 20)]
        top: usize,
        /// 最小 24h 成交量（USDT）
        #[arg(long, default_value_t = 10_000_000.0)]
        min_vol: f64,
    },
    /// 单策略回测
    Backtest {
        /// 交易对，如 BTCUSDT
        #[arg(long)]
        symbol: String,
        /// 策略名
        #[arg(long)]
        strategy: String,
        /// 回测天数
        #[arg(long, default_value_t = 14)]
        days: u32,
        /// K 线周期
        #[arg(long, default_value = "1h")]
        timeframe: String,
        /// 杠杆倍数
        #[arg(long, default_value_t = 1)]
        leverage: u32,
        /// 起始资金
        #[arg(long, default_value_t = 200.0)]
        capital: f64,
        /// 仓位比例 (0.0-1.0)
        #[arg(long, default_value_t = 0.5)]
        position_size: f64,
        /// 策略参数 JSON
        #[arg(long)]
        params: Option<String>,
    },
    /// 批量回测
    BatchBacktest {
        /// 回测天数
        #[arg(long, default_value_t = 14)]
        days: u32,
        /// K 线周期
        #[arg(long, default_value = "5m")]
        timeframe: String,
        /// 取前 N 个高波动币种
        #[arg(long, default_value_t = 15)]
        top_symbols: usize,
    },
    /// 参数网格搜索
    GridSearch {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 策略名
        #[arg(long)]
        strategy: String,
        /// 回测天数
        #[arg(long, default_value_t = 7)]
        days: u32,
        /// K 线周期
        #[arg(long, default_value = "15m")]
        timeframe: String,
    },
    /// 资金划转
    Transfer {
        /// 方向: spot-to-futures 或 futures-to-spot
        #[arg(long)]
        direction: String,
        /// 金额
        #[arg(long)]
        amount: f64,
        /// 资产类型
        #[arg(long, default_value = "USDT")]
        asset: String,
    },
    /// P&L 查询
    Pnl {
        /// 币种（可选）
        #[arg(long)]
        symbol: Option<String>,
        /// 回溯小时数
        #[arg(long, default_value_t = 24)]
        hours: u32,
    },
    /// 风控检查
    Check {
        /// 策略名（可选，空则检查全部）
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 策略监听器守护进程
    Watcher,
    /// 全局状态面板
    Status,
    /// 按策略 P&L
    StrategyPnl {
        /// 统计天数
        #[arg(long, default_value_t = 7)]
        days: u32,
    },
    /// 实盘 vs 回测对比
    Compare {
        /// 策略名（可选）
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 策略实盘评估
    Review {
        /// 策略名（可选）
        #[arg(long)]
        strategy: Option<String>,
        /// 自动评估模式
        #[arg(long)]
        auto: bool,
    },
    /// 策略相关性矩阵
    Correlation {
        /// 统计天数
        #[arg(long, default_value_t = 30)]
        days: u32,
    },
    /// 资金费率
    Funding {
        /// 币种（可选）
        #[arg(long)]
        symbol: Option<String>,
    },
    /// 风控事件日志
    RiskLog {
        /// 策略名（可选）
        #[arg(long)]
        strategy: Option<String>,
        /// 回溯天数
        #[arg(long, default_value_t = 7)]
        days: u32,
    },
    /// 紧急全平
    EmergencyClose {
        /// 策略名（可选，空则全部平仓）
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 交易所直接操作
    Exchange {
        #[command(subcommand)]
        action: ExchangeAction,
    },
}

#[derive(Subcommand)]
enum ExchangeAction {
    /// 开多
    Long {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 数量
        #[arg(long)]
        amount: f64,
        /// 限价（可选，空则市价）
        #[arg(long)]
        price: Option<f64>,
        /// 杠杆倍数（可选）
        #[arg(long)]
        leverage: Option<u32>,
    },
    /// 开空
    Short {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 数量
        #[arg(long)]
        amount: f64,
        /// 限价（可选）
        #[arg(long)]
        price: Option<f64>,
        /// 杠杆倍数（可选）
        #[arg(long)]
        leverage: Option<u32>,
    },
    /// 平多
    CloseLong {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 数量
        #[arg(long)]
        amount: f64,
        /// 限价（可选）
        #[arg(long)]
        price: Option<f64>,
    },
    /// 平空
    CloseShort {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 数量
        #[arg(long)]
        amount: f64,
        /// 限价（可选）
        #[arg(long)]
        price: Option<f64>,
    },
    /// 设置杠杆
    Leverage {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 杠杆倍数
        #[arg(long)]
        leverage: u32,
    },
    /// 止损单
    StopLoss {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 方向: long 或 short
        #[arg(long)]
        side: String,
        /// 触发价格
        #[arg(long)]
        price: f64,
    },
    /// 止盈单
    TakeProfit {
        /// 交易对
        #[arg(long)]
        symbol: String,
        /// 方向: long 或 short
        #[arg(long)]
        side: String,
        /// 触发价格
        #[arg(long)]
        price: f64,
    },
    /// 查看持仓
    Positions {
        /// 币种（可选）
        #[arg(long)]
        symbol: Option<String>,
    },
}

// ── main ────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("clawchat=info".parse()?),
        )
        .init();

    // 加载 .env
    dotenvy::dotenv().ok();

    // 创建交易所客户端
    let exchange = Exchange::new(
        std::env::var("BINANCE_API_KEY").unwrap_or_default(),
        std::env::var("BINANCE_API_SECRET").unwrap_or_default(),
        std::env::var("BINANCE_BASE_URL")
            .unwrap_or_else(|_| "https://fapi.binance.com".to_string()),
        false,
    );

    let cli = Cli::parse();

    match cli.command {
        // ── 行情 ────────────────────────────────
        Command::Watch { symbols } => {
            let syms = if symbols.is_empty() {
                None
            } else {
                Some(symbols)
            };
            cmd::watch::watch(&exchange, syms).await?;
        }
        Command::Account => {
            cmd::watch::account(&exchange).await?;
        }
        Command::Scan { top, min_vol } => {
            cmd::watch::scan(&exchange, top, min_vol).await?;
        }

        // ── 回测 ────────────────────────────────
        Command::Backtest {
            symbol,
            strategy,
            days,
            timeframe,
            leverage,
            capital,
            position_size,
            params,
        } => {
            cmd::backtest::backtest(
                &exchange,
                &symbol,
                &strategy,
                days,
                &timeframe,
                leverage,
                capital,
                position_size,
                params.as_deref(),
            )
            .await?;
        }
        Command::BatchBacktest {
            days,
            timeframe,
            top_symbols,
        } => {
            cmd::batch_backtest::batch_backtest(&exchange, days, &timeframe, top_symbols).await?;
        }
        Command::GridSearch {
            symbol,
            strategy,
            days,
            timeframe,
        } => {
            cmd::grid_search::grid_search(&exchange, &symbol, &strategy, days, &timeframe).await?;
        }

        // ── 交易 ────────────────────────────────
        Command::Transfer {
            direction,
            amount,
            asset,
        } => {
            cmd::transfer::transfer(&exchange, &direction, amount, &asset).await?;
        }
        Command::Pnl { symbol, hours } => {
            cmd::pnl::pnl(&exchange, symbol, hours).await?;
        }
        Command::Check { strategy } => {
            cmd::check::check(&exchange, strategy).await?;
        }
        Command::Watcher => {
            cmd::watcher::watcher().await?;
        }
        Command::Status => {
            cmd::status::status(&exchange).await?;
        }
        Command::StrategyPnl { days } => {
            cmd::strategy_pnl::strategy_pnl(days)?;
        }
        Command::Compare { strategy } => {
            cmd::compare::compare(strategy)?;
        }

        // ── 评估 ────────────────────────────────
        Command::Review { strategy, auto } => {
            cmd::review::review(strategy, auto)?;
        }

        // ── 分析 ────────────────────────────────
        Command::Correlation { days } => {
            cmd::correlation::correlation(days)?;
        }
        Command::Funding { symbol } => {
            cmd::funding::funding(&exchange, symbol).await?;
        }

        // ── 风控 ────────────────────────────────
        Command::RiskLog { strategy, days } => {
            cmd::risk_log::risk_log(strategy, days)?;
        }

        // ── 紧急操作 ────────────────────────────
        Command::EmergencyClose { strategy } => {
            cmd::emergency::emergency_close(&exchange, strategy).await?;
        }

        // ── 交易所直接操作 ──────────────────────
        Command::Exchange { action } => match action {
            ExchangeAction::Long {
                symbol,
                amount,
                price,
                leverage,
            } => {
                cmd::exchange_cmd::long(&exchange, &symbol, amount, price, leverage).await?;
            }
            ExchangeAction::Short {
                symbol,
                amount,
                price,
                leverage,
            } => {
                cmd::exchange_cmd::short(&exchange, &symbol, amount, price, leverage).await?;
            }
            ExchangeAction::CloseLong {
                symbol,
                amount,
                price,
            } => {
                cmd::exchange_cmd::close_long(&exchange, &symbol, amount, price).await?;
            }
            ExchangeAction::CloseShort {
                symbol,
                amount,
                price,
            } => {
                cmd::exchange_cmd::close_short(&exchange, &symbol, amount, price).await?;
            }
            ExchangeAction::Leverage { symbol, leverage } => {
                cmd::exchange_cmd::leverage(&exchange, &symbol, leverage).await?;
            }
            ExchangeAction::StopLoss {
                symbol,
                side,
                price,
            } => {
                cmd::exchange_cmd::stop_loss(&exchange, &symbol, &side, price).await?;
            }
            ExchangeAction::TakeProfit {
                symbol,
                side,
                price,
            } => {
                cmd::exchange_cmd::take_profit(&exchange, &symbol, &side, price).await?;
            }
            ExchangeAction::Positions { symbol } => {
                cmd::exchange_cmd::positions(&exchange, symbol).await?;
            }
        },
    }

    Ok(())
}
