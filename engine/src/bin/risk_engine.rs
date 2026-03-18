//! 独立 Rust 风控引擎 — 每 N 秒检查持仓，触发止损/止盈/利润保护自动平仓
//!
//! 架构：
//!   交易引擎（Rust）— 负责交易
//!   风控引擎（Rust）— 负责止损止盈，独立进程  ← 本文件
//!   Python 守护     — 30 秒兜底

use hft_engine::exchange::Exchange;
use hft_engine::risk::RiskConfig;

use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

const ENGINE_REGISTRY: &str = "/tmp/hft-engines.json";
const HIGH_WATER_FILE: &str = "reports/high_water_rust.json";
const CHECK_INTERVAL_SECS: u64 = 10;

// ── 策略目录扫描 ─────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct StrategyJson {
    name: Option<String>,
    symbol: Option<String>,
    capital: Option<f64>,
}

/// {normalized_symbol: (strategy_name, risk_config, capital)}
type RiskMap = HashMap<String, (String, RiskConfig, f64)>;

/// 扫描 strategies/ 目录 + engine registry，构建风控配置映射
fn load_risk_configs(strategies_dir: &Path) -> RiskMap {
    let mut map = RiskMap::new();

    // 读 engine registry 获取活跃策略
    let registry = read_engine_registry();

    // 扫描 strategies/*/
    if let Ok(entries) = std::fs::read_dir(strategies_dir) {
        for entry in entries.flatten() {
            let dir = entry.path();
            if !dir.is_dir() {
                continue;
            }

            let strategy_file = dir.join("strategy.json");
            if !strategy_file.exists() {
                continue;
            }

            let Ok(contents) = std::fs::read_to_string(&strategy_file) else {
                continue;
            };
            let Ok(cfg) = serde_json::from_str::<StrategyJson>(&contents) else {
                continue;
            };

            let name = cfg.name.unwrap_or_else(|| dir.file_name().unwrap().to_string_lossy().to_string());
            let symbol = cfg
                .symbol
                .map(|s| normalize_symbol(&s))
                .unwrap_or_default();
            let capital = cfg.capital.unwrap_or(200.0);

            if symbol.is_empty() {
                continue;
            }

            // 加载 risk.json
            let risk_file = dir.join("risk.json");
            let risk_config = RiskConfig::load(&risk_file);

            map.insert(symbol.clone(), (name, risk_config, capital));
        }
    }

    // 补充 registry 中的策略（如果 strategies/ 没覆盖到）
    for (reg_name, norm_symbol, _) in &registry {
        if !map.contains_key(norm_symbol) && !norm_symbol.is_empty() {
            tracing::info!("registry strategy {reg_name}/{norm_symbol} has no strategies/ dir, using defaults");
            map.insert(
                norm_symbol.clone(),
                (reg_name.clone(), RiskConfig::default(), 200.0),
            );
        }
    }

    map
}

fn normalize_symbol(s: &str) -> String {
    s.replace("/", "").replace(":USDT", "")
}

fn read_engine_registry() -> Vec<(String, String, String)> {
    let Ok(contents) = std::fs::read_to_string(ENGINE_REGISTRY) else {
        return vec![];
    };
    let Ok(raw) = serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&contents)
    else {
        return vec![];
    };

    raw.into_iter()
        .map(|(key, val)| {
            if let Some(obj) = val.as_object() {
                let symbol = obj
                    .get("symbol")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let strategy = obj
                    .get("strategy")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                (key, symbol, strategy)
            } else {
                // 旧格式: key=symbol, val=strategy_name
                let strategy = val.as_str().unwrap_or("").to_string();
                (strategy.clone(), key, strategy)
            }
        })
        .collect()
}

// ── 高水位管理 ───────────────────────────────────────────────

type HighWaterMarks = HashMap<String, f64>;

fn load_high_water() -> HighWaterMarks {
    let path = Path::new(HIGH_WATER_FILE);
    if let Ok(contents) = std::fs::read_to_string(path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

fn save_high_water(hwm: &HighWaterMarks) {
    let path = Path::new(HIGH_WATER_FILE);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(hwm) {
        if let Err(e) = std::fs::write(path, json) {
            tracing::warn!("failed to save high water marks: {e}");
        }
    }
}

// ── 风控检查逻辑 ─────────────────────────────────────────────

struct PositionInfo {
    symbol: String,
    position_side: String, // "LONG" / "SHORT" / "BOTH"
    position_amt: f64,
    #[allow(dead_code)]
    entry_price: f64,
    unrealized_pnl: f64,
    notional: f64,
}

fn parse_positions(raw: &[serde_json::Value]) -> Vec<PositionInfo> {
    raw.iter()
        .filter_map(|p| {
            let amt: f64 = p
                .get("positionAmt")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            if amt.abs() < f64::EPSILON {
                return None;
            }
            Some(PositionInfo {
                symbol: p
                    .get("symbol")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                position_side: p
                    .get("positionSide")
                    .and_then(|v| v.as_str())
                    .unwrap_or("BOTH")
                    .to_string(),
                position_amt: amt,
                entry_price: p
                    .get("entryPrice")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0),
                unrealized_pnl: p
                    .get("unrealizedProfit")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0),
                notional: p
                    .get("notional")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(0.0)
                    .abs(),
            })
        })
        .collect()
}

/// 执行一轮风控检查，返回被平仓的 symbol 列表
async fn run_check(
    exchange: &Exchange,
    risk_map: &RiskMap,
    hwm: &mut HighWaterMarks,
    total_balance: f64,
) -> Vec<String> {
    let mut closed = Vec::new();
    let mut hwm_updated = false;

    let positions = match exchange.get_positions().await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("failed to get positions: {e}");
            return closed;
        }
    };

    let parsed = parse_positions(&positions);
    if parsed.is_empty() {
        // 清理不再有持仓的高水位
        if !hwm.is_empty() {
            hwm.clear();
            save_high_water(hwm);
        }
        return closed;
    }

    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    tracing::info!("[{now}] checking {} positions, balance=${total_balance:.2}", parsed.len());

    for pos in &parsed {
        let norm_sym = &pos.symbol;
        let key = format!("{}:{}", pos.symbol, pos.position_side);

        // 查找风控配置
        let (strategy_name, risk_cfg, capital) = match risk_map.get(norm_sym) {
            Some(r) => (&r.0, &r.1, r.2),
            None => {
                tracing::debug!("no risk config for {norm_sym}, skipping");
                continue;
            }
        };

        let pnl = pos.unrealized_pnl;

        // ── 1. 单笔止损检查 ──
        if capital > 0.0 && pnl < 0.0 {
            let loss_ratio = -pnl / capital;
            if loss_ratio >= risk_cfg.max_loss_per_trade {
                tracing::warn!(
                    "[{now}] [STOP LOSS] [{strategy_name}] {norm_sym} {} loss={pnl:.4} ({:.2}% >= {:.2}%)",
                    pos.position_side,
                    loss_ratio * 100.0,
                    risk_cfg.max_loss_per_trade * 100.0
                );
                match exchange.close_position(norm_sym, pos.position_amt).await {
                    Ok(_) => {
                        tracing::info!("  {norm_sym} closed (stop loss)");
                        closed.push(norm_sym.clone());
                        hwm.remove(&key);
                        hwm_updated = true;
                    }
                    Err(e) => tracing::error!("  {norm_sym} close failed: {e}"),
                }
                continue;
            }
        }

        // ── 2. 单笔止盈检查 ──
        if capital > 0.0 && pnl > 0.0 {
            let profit_ratio = pnl / capital;
            if profit_ratio >= risk_cfg.max_profit_per_trade {
                tracing::warn!(
                    "[{now}] [TAKE PROFIT] [{strategy_name}] {norm_sym} {} profit={pnl:.4} ({:.2}% >= {:.2}%)",
                    pos.position_side,
                    profit_ratio * 100.0,
                    risk_cfg.max_profit_per_trade * 100.0
                );
                match exchange.close_position(norm_sym, pos.position_amt).await {
                    Ok(_) => {
                        tracing::info!("  {norm_sym} closed (take profit)");
                        closed.push(norm_sym.clone());
                        hwm.remove(&key);
                        hwm_updated = true;
                    }
                    Err(e) => tracing::error!("  {norm_sym} close failed: {e}"),
                }
                continue;
            }
        }

        // ── 3. 仓位占比检查 ──
        if total_balance > 0.0 && pos.notional > 0.0 {
            let ratio = pos.notional / total_balance;
            if ratio > risk_cfg.max_position_ratio {
                tracing::warn!(
                    "[{now}] [POSITION LIMIT] [{strategy_name}] {norm_sym} ratio={:.2}% > {:.2}%",
                    ratio * 100.0,
                    risk_cfg.max_position_ratio * 100.0
                );
                // 警告但不自动平仓（仓位过大可能是正常杠杆操作）
            }
        }

        // ── 4. 高水位利润保护 ──
        if pnl > 0.0 {
            let prev_hwm = *hwm.get(&key).unwrap_or(&0.0);
            if pnl > prev_hwm {
                hwm.insert(key.clone(), pnl);
                hwm_updated = true;
            }

            let current_hwm = *hwm.get(&key).unwrap_or(&0.0);
            if current_hwm > 0.0 {
                let protection_line = current_hwm * (1.0 - risk_cfg.max_drawdown_stop);
                if pnl <= protection_line {
                    tracing::warn!(
                        "[{now}] [PROFIT PROTECT] [{strategy_name}] {norm_sym} {} hwm=+${current_hwm:.4} → +${pnl:.4}, protecting profit",
                        pos.position_side
                    );
                    match exchange.close_position(norm_sym, pos.position_amt).await {
                        Ok(_) => {
                            tracing::info!("  {norm_sym} closed (profit protection)");
                            closed.push(norm_sym.clone());
                            hwm.remove(&key);
                            hwm_updated = true;
                        }
                        Err(e) => tracing::error!("  {norm_sym} close failed: {e}"),
                    }
                    continue;
                }
            }
        } else {
            // 亏损时清除高水位
            if hwm.contains_key(&key) {
                hwm.remove(&key);
                hwm_updated = true;
            }
        }
    }

    // 清理不再存在的持仓的高水位
    let active_keys: std::collections::HashSet<String> = parsed
        .iter()
        .map(|p| format!("{}:{}", p.symbol, p.position_side))
        .collect();
    let stale: Vec<String> = hwm
        .keys()
        .filter(|k| !active_keys.contains(*k))
        .cloned()
        .collect();
    if !stale.is_empty() {
        for k in &stale {
            hwm.remove(k);
        }
        hwm_updated = true;
    }

    if hwm_updated {
        save_high_water(hwm);
    }

    closed
}

// ── main ─────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("risk_engine=info".parse().unwrap()),
        )
        .init();

    let _ = dotenvy::dotenv();

    // 读取 API 凭证
    let api_key = std::env::var("BINANCE_API_KEY").expect("BINANCE_API_KEY not set");
    let api_secret = std::env::var("BINANCE_API_SECRET").expect("BINANCE_API_SECRET not set");
    let base_url = std::env::var("BINANCE_BASE_URL")
        .unwrap_or_else(|_| "https://fapi.binance.com".to_string());
    let dry_run = std::env::var("DRY_RUN")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    let exchange = Exchange::from_credentials(api_key, api_secret, base_url, dry_run);

    // 策略目录
    let strategies_dir = PathBuf::from(
        std::env::var("STRATEGIES_DIR").unwrap_or_else(|_| "strategies".to_string()),
    );

    tracing::info!("========================================");
    tracing::info!("  Rust 风控引擎启动");
    tracing::info!("  间隔: {}s", CHECK_INTERVAL_SECS);
    tracing::info!("  策略目录: {}", strategies_dir.display());
    tracing::info!("  高水位: {HIGH_WATER_FILE}");
    tracing::info!("  dry_run: {dry_run}");
    tracing::info!("========================================");

    // 加载高水位
    let mut hwm = load_high_water();
    if !hwm.is_empty() {
        tracing::info!("恢复 {} 个高水位记录", hwm.len());
    }

    // 主循环
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(CHECK_INTERVAL_SECS));

    loop {
        interval.tick().await;

        // 每轮重新加载风控配置（支持热更新）
        let risk_map = load_risk_configs(&strategies_dir);
        if !risk_map.is_empty() {
            tracing::debug!("loaded {} risk configs: {:?}", risk_map.len(), risk_map.keys().collect::<Vec<_>>());
        }

        // 获取账户余额
        let total_balance = match exchange.get_balance().await {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("failed to get balance: {e}");
                continue;
            }
        };

        // 执行风控检查
        let closed = run_check(&exchange, &risk_map, &mut hwm, total_balance).await;

        if closed.is_empty() {
            let now = chrono::Utc::now().format("%H:%M:%S");
            tracing::info!("[{now}] OK  balance=${total_balance:.2}  configs={}", risk_map.len());
        } else {
            tracing::warn!("closed {} positions: {:?}", closed.len(), closed);
        }
    }
}
