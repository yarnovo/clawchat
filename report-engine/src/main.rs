mod daily;
mod data;
mod snapshot;
mod weekly;

use chrono::NaiveDate;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "report-engine", about = "ClawChat 报告引擎")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// 生成日报
    Daily {
        /// 指定日期 (YYYY-MM-DD)，默认今天
        #[arg(long)]
        date: Option<String>,
    },
    /// 生成周报
    Weekly {
        /// 指定日期 (YYYY-MM-DD)，默认今天（会自动定位到本周）
        #[arg(long)]
        date: Option<String>,
    },
    /// 生成状态快照（实时全景，输出 reports/snapshot-{时间戳}.md）
    Snapshot,
}

fn parse_date(s: Option<&str>) -> NaiveDate {
    match s {
        Some(d) => NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .unwrap_or_else(|e| {
                eprintln!("日期格式错误 '{d}': {e}，使用今天");
                chrono::Utc::now().date_naive()
            }),
        None => chrono::Utc::now().date_naive(),
    }
}

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Command::Daily { date } => {
            let d = parse_date(date.as_deref());
            match daily::write_report(d) {
                Ok(path) => {
                    println!("日报已生成: {}", path.display());
                }
                Err(e) => {
                    eprintln!("生成日报失败: {e}");
                    std::process::exit(1);
                }
            }
        }
        Command::Weekly { date } => {
            let d = parse_date(date.as_deref());
            match weekly::write_report(d) {
                Ok(path) => {
                    println!("周报已生成: {}", path.display());
                }
                Err(e) => {
                    eprintln!("生成周报失败: {e}");
                    std::process::exit(1);
                }
            }
        }
        Command::Snapshot => {
            match snapshot::write_snapshot().await {
                Ok(path) => {
                    println!("快照已生成: {}", path.display());
                }
                Err(e) => {
                    eprintln!("生成快照失败: {e}");
                    std::process::exit(1);
                }
            }
        }
    }
}
