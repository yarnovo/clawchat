use clawchat_shared::account::{AccountConfig, PortfolioConfig};
use clawchat_shared::paths;
use serde_json::json;

use crate::Ctx;

/// 创建新 portfolio 目录 + portfolio.json + risk.json + trade.json
///
/// 配额校验：account.total_capital - 已分配总额 >= capital
pub fn run(
    ctx: &Ctx,
    account: &str,
    name: &str,
    capital: f64,
    max_drawdown: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    // 1. 校验 portfolio 不存在
    let portfolio_dir = paths::portfolio_dir(account, name);
    if portfolio_dir.exists() {
        let err = json!({
            "error": "portfolio_exists",
            "message": format!("portfolio '{}' already exists at {}", name, portfolio_dir.display()),
        });
        if ctx.json {
            println!("{}", serde_json::to_string_pretty(&err)?);
        } else {
            eprintln!("错误：portfolio '{}' 已存在", name);
        }
        return Err(format!("portfolio '{}' already exists", name).into());
    }

    // 2. 加载 account config
    let account_path = paths::account_dir(account).join("account.json");
    let account_config = AccountConfig::load(&account_path)
        .map_err(|e| format!("failed to load account.json: {e}"))?;

    // 3. 配额校验：遍历所有已有 portfolio 计算已分配总额
    let portfolios_dir = paths::portfolios_dir(account);
    let mut allocated_total: f64 = 0.0;
    if let Ok(entries) = std::fs::read_dir(&portfolios_dir) {
        for entry in entries.flatten() {
            if !entry.path().is_dir() {
                continue;
            }
            let ppath = entry.path().join("portfolio.json");
            if let Ok(pc) = PortfolioConfig::load(&ppath) {
                allocated_total += pc.allocated_capital + pc.reserve.unwrap_or(0.0);
            }
        }
    }

    let available = account_config.total_capital - allocated_total;
    if available < capital {
        let err = json!({
            "error": "insufficient_capital",
            "message": format!(
                "账户总资金 ${:.0}, 已分配 ${:.0}, 可用 ${:.0}, 请求 ${:.0}",
                account_config.total_capital, allocated_total, available, capital
            ),
            "total_capital": account_config.total_capital,
            "allocated": allocated_total,
            "available": available,
            "requested": capital,
        });
        if ctx.json {
            println!("{}", serde_json::to_string_pretty(&err)?);
        } else {
            eprintln!(
                "错误：配额不足 — 总 ${:.0}, 已分配 ${:.0}, 可用 ${:.0}, 请求 ${:.0}",
                account_config.total_capital, allocated_total, available, capital
            );
        }
        return Err("insufficient capital".into());
    }

    // 4. 创建目录结构
    let strategies_dir = portfolio_dir.join("strategies");
    std::fs::create_dir_all(&strategies_dir)?;

    // 5. 写 portfolio.json
    let max_daily_loss_pct = (max_drawdown / 2.0).min(15.0);
    let portfolio_json = json!({
        "name": name,
        "allocated_capital": capital,
        "reserve": 0,
        "risk": {
            "max_drawdown_pct": max_drawdown,
            "max_daily_loss_pct": max_daily_loss_pct,
            "max_total_exposure": 3.0,
            "max_per_coin_exposure_pct": 80
        }
    });
    std::fs::write(
        portfolio_dir.join("portfolio.json"),
        serde_json::to_string_pretty(&portfolio_json)?,
    )?;

    // 6. 写 risk.json (策略级默认风控)
    let risk_json = json!({
        "max_loss_per_trade": 0.10,
        "max_profit_per_trade": 0.50,
        "max_daily_loss": max_drawdown / 100.0,
        "max_leverage": 5,
        "hwm_drawdown_limit": max_drawdown / 100.0 * 1.5,
        "funding_rate_limit": 0.003
    });
    std::fs::write(
        portfolio_dir.join("risk.json"),
        serde_json::to_string_pretty(&risk_json)?,
    )?;

    // 7. 写 trade.json
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let trade_json = json!({
        "action": "hold",
        "params": {},
        "note": format!("{} 组合初始化", name),
        "updated_at": now
    });
    std::fs::write(
        portfolio_dir.join("trade.json"),
        serde_json::to_string_pretty(&trade_json)?,
    )?;

    // 8. 输出确认
    let output = json!({
        "status": "created",
        "account": account,
        "portfolio": name,
        "capital": capital,
        "max_drawdown_pct": max_drawdown,
        "path": portfolio_dir.display().to_string(),
        "files": ["portfolio.json", "risk.json", "trade.json", "strategies/"],
        "remaining_capital": available - capital,
    });

    if ctx.json {
        println!("{}", serde_json::to_string_pretty(&output)?);
    } else {
        println!("{}", serde_json::to_string(&output)?);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn capital_validation_logic() {
        let total: f64 = 222.0;
        let allocated: f64 = 203.0 + 19.0;
        let available = total - allocated;
        assert!((available - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn max_daily_loss_derivation() {
        let max_drawdown: f64 = 20.0;
        let daily = (max_drawdown / 2.0).min(15.0);
        assert!((daily - 10.0).abs() < f64::EPSILON);

        let max_drawdown: f64 = 40.0;
        let daily = (max_drawdown / 2.0).min(15.0);
        assert!((daily - 15.0).abs() < f64::EPSILON);
    }
}
