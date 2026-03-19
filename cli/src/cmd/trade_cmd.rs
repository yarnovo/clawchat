use crate::Ctx;

const VALID_ACTIONS: &[&str] = &[
    "pause", "resume", "stop", "close_all", "close_long", "close_short",
];

/// 写 trade.json 到指定策略目录
pub fn run(
    ctx: &Ctx,
    action: &str,
    strategy: &str,
    note: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    if !VALID_ACTIONS.contains(&action) {
        eprintln!(
            "错误: 无效 action '{action}'，合法值: {}",
            VALID_ACTIONS.join(" / ")
        );
        std::process::exit(1);
    }

    let strategy_dir = ctx.strategies_dir.join(strategy);
    if !strategy_dir.exists() {
        eprintln!(
            "错误: 策略目录不存在 {}",
            strategy_dir.display()
        );
        std::process::exit(1);
    }

    let trade = serde_json::json!({
        "action": action,
        "params": {},
        "note": note.unwrap_or(""),
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    let path = strategy_dir.join("trade.json");
    let content = serde_json::to_string_pretty(&trade)?;
    std::fs::write(&path, &content)?;

    if ctx.json {
        println!("{}", content);
    } else {
        println!("已写入 {}: action={action}", path.display());
    }

    Ok(())
}
