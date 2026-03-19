pub mod backtest;
mod cmd;
pub mod report;
mod util;

use clap::{Parser, Subcommand};
use clawchat_shared::exchange::Exchange;
use std::path::PathBuf;

// ── CLI 定义 ────────────────────────────────────────────────

#[derive(Parser)]
#[command(name = "clawchat", about = "ClawChat 量化工具集")]
struct Cli {
    #[command(subcommand)]
    command: Command,

    /// 策略目录（默认从 shared::paths 获取）
    #[arg(long, global = true)]
    strategies_dir: Option<PathBuf>,

    /// 记录目录（默认从 shared::paths 获取）
    #[arg(long, global = true)]
    records_dir: Option<PathBuf>,

    /// JSON 格式输出
    #[arg(long, global = true)]
    json: bool,
}

pub struct Ctx {
    pub exchange: Exchange,
    pub strategies_dir: PathBuf,
    pub records_dir: PathBuf,
    pub json: bool,
}

#[derive(Subcommand)]
enum Command {
    // ── 查询 ──
    /// 总览面板（账户+策略+风控）
    Status {
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 虚拟账户详情
    Ledger {
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 盈亏查询
    Pnl {
        #[arg(long)]
        strategy: Option<String>,
        #[arg(long)]
        symbol: Option<String>,
        #[arg(long, default_value_t = 7)]
        days: u32,
    },
    /// 当前持仓
    Positions {
        #[arg(long)]
        symbol: Option<String>,
    },
    /// 风控事件日志
    RiskLog {
        #[arg(long)]
        strategy: Option<String>,
        #[arg(long, default_value_t = 7)]
        days: u32,
    },
    /// 资金费率
    Funding {
        #[arg(long)]
        symbol: Option<String>,
    },
    /// 数据引擎状态
    DataStatus,

    // ── 分析 ──
    /// 单策略回测
    Backtest {
        #[arg(long)]
        symbol: String,
        #[arg(long)]
        strategy: String,
        #[arg(long, default_value_t = 14)]
        days: u32,
        #[arg(long, default_value = "1h")]
        timeframe: String,
        #[arg(long, default_value_t = 1)]
        leverage: u32,
        #[arg(long, default_value_t = 200.0)]
        capital: f64,
        #[arg(long, default_value_t = 0.5)]
        position_size: f64,
        #[arg(long)]
        params: Option<String>,
    },
    /// 实盘 vs 回测对比
    Compare {
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 策略相关性矩阵
    Correlation {
        #[arg(long, default_value_t = 30)]
        days: u32,
    },
    /// 策略健康评估（纯计算输出，不写文件）
    Evaluate {
        #[arg(long)]
        strategy: Option<String>,
    },

    // ── 操作 ──
    /// 写 trade.json 控制引擎
    Trade {
        /// pause / resume / stop / close_all / close_long / close_short
        action: String,
        #[arg(long)]
        strategy: String,
        #[arg(long)]
        note: Option<String>,
    },
    /// 资金划转
    Transfer {
        #[arg(long)]
        direction: String,
        #[arg(long)]
        amount: f64,
        #[arg(long, default_value = "USDT")]
        asset: String,
    },
    /// 紧急全平
    Emergency {
        #[arg(long)]
        strategy: Option<String>,
    },
    /// 交易所直接操作
    Exchange {
        #[command(subcommand)]
        action: ExchangeAction,
    },

    // ── 通知 ──
    /// 发送邮件通知
    Notify {
        /// 邮件主题
        #[arg(long)]
        subject: String,
        /// 邮件正文
        #[arg(long, default_value = "")]
        body: String,
        /// 从文件读取正文
        #[arg(long)]
        body_file: Option<String>,
    },

    // ── 市场 ──
    /// 行情监控
    Watch {
        symbols: Vec<String>,
    },
    /// 扫描高波动币种
    Scan {
        #[arg(long, default_value_t = 20)]
        top: usize,
        #[arg(long, default_value_t = 10_000_000.0)]
        min_vol: f64,
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

    let ctx = Ctx {
        exchange,
        strategies_dir: cli
            .strategies_dir
            .unwrap_or_else(|| clawchat_shared::paths::strategies_dir()),
        records_dir: cli
            .records_dir
            .unwrap_or_else(|| clawchat_shared::paths::records_dir()),
        json: cli.json,
    };

    match cli.command {
        // ── 查询 ──────────────────────────────────
        Command::Status { strategy } => {
            cmd::status::status(&ctx, strategy).await?;
        }
        Command::Ledger { strategy } => {
            cmd::ledger::run(&ctx, strategy)?;
        }
        Command::Pnl {
            strategy,
            symbol,
            days,
        } => {
            cmd::pnl::pnl(&ctx, strategy, symbol, days).await?;
        }
        Command::Positions { symbol } => {
            cmd::exchange_cmd::positions(&ctx.exchange, symbol).await?;
        }
        Command::RiskLog { strategy, days } => {
            cmd::risk_log::risk_log(&ctx, strategy, days)?;
        }
        Command::Funding { symbol } => {
            cmd::funding::funding(&ctx, symbol).await?;
        }
        Command::DataStatus => {
            cmd::data_status::run(&ctx)?;
        }

        // ── 分析 ──────────────────────────────────
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
                &ctx.exchange,
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
        Command::Compare { strategy } => {
            cmd::compare::compare(&ctx, strategy)?;
        }
        Command::Correlation { days } => {
            cmd::correlation::correlation(&ctx, days)?;
        }
        Command::Evaluate { strategy } => {
            cmd::evaluate::run(&ctx, strategy)?;
        }

        // ── 操作 ──────────────────────────────────
        Command::Trade {
            action,
            strategy,
            note,
        } => {
            cmd::trade_cmd::run(&ctx, &action, &strategy, note.as_deref())?;
        }
        Command::Transfer {
            direction,
            amount,
            asset,
        } => {
            cmd::transfer::transfer(&ctx.exchange, &direction, amount, &asset).await?;
        }
        Command::Emergency { strategy } => {
            cmd::emergency::emergency_close(&ctx, strategy).await?;
        }

        // ── 交易所直接操作 ────────────────────────
        Command::Exchange { action } => match action {
            ExchangeAction::Long {
                symbol,
                amount,
                price,
                leverage,
            } => {
                cmd::exchange_cmd::long(&ctx.exchange, &symbol, amount, price, leverage).await?;
            }
            ExchangeAction::Short {
                symbol,
                amount,
                price,
                leverage,
            } => {
                cmd::exchange_cmd::short(&ctx.exchange, &symbol, amount, price, leverage).await?;
            }
            ExchangeAction::CloseLong {
                symbol,
                amount,
                price,
            } => {
                cmd::exchange_cmd::close_long(&ctx.exchange, &symbol, amount, price).await?;
            }
            ExchangeAction::CloseShort {
                symbol,
                amount,
                price,
            } => {
                cmd::exchange_cmd::close_short(&ctx.exchange, &symbol, amount, price).await?;
            }
            ExchangeAction::Leverage { symbol, leverage } => {
                cmd::exchange_cmd::leverage(&ctx.exchange, &symbol, leverage).await?;
            }
            ExchangeAction::StopLoss {
                symbol,
                side,
                price,
            } => {
                cmd::exchange_cmd::stop_loss(&ctx.exchange, &symbol, &side, price).await?;
            }
            ExchangeAction::TakeProfit {
                symbol,
                side,
                price,
            } => {
                cmd::exchange_cmd::take_profit(&ctx.exchange, &symbol, &side, price).await?;
            }
            ExchangeAction::Positions { symbol } => {
                cmd::exchange_cmd::positions(&ctx.exchange, symbol).await?;
            }
        },

        // ── 通知 ──────────────────────────────────
        Command::Notify { subject, body, body_file } => {
            cmd::notify::notify(&ctx, &subject, &body, body_file.as_deref()).await?;
        }

        // ── 市场 ──────────────────────────────────
        Command::Watch { symbols } => {
            let syms = if symbols.is_empty() {
                None
            } else {
                Some(symbols)
            };
            cmd::watch::watch(&ctx.exchange, syms).await?;
        }
        Command::Scan { top, min_vol } => {
            cmd::watch::scan(&ctx.exchange, top, min_vol).await?;
        }
    }

    Ok(())
}
