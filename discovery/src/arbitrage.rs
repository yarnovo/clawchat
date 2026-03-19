//! 跨交易所套利扫描器
//!
//! 三类套利：
//! 1. 现货-永续差价套利（funding rate basis）
//! 2. 跨交易所价差套利（多交易所接入后启用）
//! 3. 三角套利（BTC/USDT → ETH/BTC → ETH/USDT）
//!
//! 现阶段只做扫描发现，不做执行。

use chrono::Utc;
use serde::{Deserialize, Serialize};

// ── 套利机会类型 ─────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArbitrageType {
    /// 现货-永续差价：买现货 + 卖永续，收 funding rate
    SpotPerp,
    /// 跨交易所价差：A 所买 + B 所卖
    CrossExchange,
    /// 三角套利：A/B → B/C → C/A 循环
    Triangular,
}

impl std::fmt::Display for ArbitrageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ArbitrageType::SpotPerp => write!(f, "spot-perp"),
            ArbitrageType::CrossExchange => write!(f, "cross-exchange"),
            ArbitrageType::Triangular => write!(f, "triangular"),
        }
    }
}

// ── 套利机会 ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArbitrageOpportunity {
    /// 套利类型
    pub arb_type: ArbitrageType,
    /// 主交易对
    pub symbol: String,
    /// 描述（如 "BTCUSDT spot-perp basis"）
    pub description: String,
    /// 价差百分比（扣费前）
    pub spread_pct: f64,
    /// 预估净利润百分比（扣除手续费和滑点后）
    pub net_profit_pct: f64,
    /// 年化收益率（funding rate 场景适用）
    pub annualized_pct: f64,
    /// 买入腿信息
    pub buy_leg: LegInfo,
    /// 卖出腿信息
    pub sell_leg: LegInfo,
    /// 扫描时间
    pub scanned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegInfo {
    /// 交易所名称
    pub exchange: String,
    /// 市场类型（spot / perp / futures）
    pub market: String,
    /// 价格
    pub price: f64,
    /// 交易对
    pub symbol: String,
}

// ── 扫描配置 ─────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ScanConfig {
    /// 最低净利润百分比（扣费后），低于此值不记录
    pub min_net_profit_pct: f64,
    /// 单腿手续费率（maker + taker 平均）
    pub fee_rate: f64,
    /// 预估滑点百分比
    pub slippage_pct: f64,
    /// funding rate 结算周期（小时），Binance 为 8
    pub funding_interval_hours: f64,
}

impl Default for ScanConfig {
    fn default() -> Self {
        Self {
            min_net_profit_pct: 0.05,
            fee_rate: 0.0004, // 0.04% maker
            slippage_pct: 0.02,
            funding_interval_hours: 8.0,
        }
    }
}

// ── Spot-Perp Basis 扫描 ────────────────────────────────────

/// 从 Binance premium index 数据中扫描 spot-perp basis 套利机会。
///
/// `premium_indices`: Binance /fapi/v1/premiumIndex 返回的数据
/// `spot_prices`: symbol -> spot price 的映射（从 /api/v3/ticker/price 获取）
pub fn scan_spot_perp_basis(
    premium_indices: &[PremiumIndexData],
    spot_prices: &std::collections::HashMap<String, f64>,
    config: &ScanConfig,
) -> Vec<ArbitrageOpportunity> {
    let mut opportunities = Vec::new();
    let now = Utc::now().to_rfc3339();
    let total_fee = config.fee_rate * 2.0 + config.slippage_pct / 100.0;
    let periods_per_year = 365.0 * 24.0 / config.funding_interval_hours;

    for idx in premium_indices {
        // 需要同时有 perp mark price 和 spot price
        let Some(&spot_price) = spot_prices.get(&idx.symbol) else {
            continue;
        };
        if spot_price <= 0.0 || idx.mark_price <= 0.0 {
            continue;
        }

        let funding_rate = idx.last_funding_rate;

        // 正 funding rate: 多头付空头 → 买现货 + 空永续 = 收 funding
        // 负 funding rate: 空头付多头 → 方向反转（不常见，暂不处理）
        if funding_rate <= 0.0 {
            continue;
        }

        // Basis = (perp_price - spot_price) / spot_price
        let basis_pct = (idx.mark_price - spot_price) / spot_price * 100.0;

        // 单次 funding 收益
        let funding_pct = funding_rate * 100.0;

        // 净利润 = funding 收益 - 手续费（开仓 + 平仓两腿各一次）
        let net_profit_pct = funding_pct - total_fee * 100.0;

        if net_profit_pct < config.min_net_profit_pct {
            continue;
        }

        // 年化
        let annualized = net_profit_pct * periods_per_year;

        opportunities.push(ArbitrageOpportunity {
            arb_type: ArbitrageType::SpotPerp,
            symbol: idx.symbol.clone(),
            description: format!(
                "{} basis {:.3}%, funding {:.4}%/8h",
                idx.symbol, basis_pct, funding_pct
            ),
            spread_pct: basis_pct,
            net_profit_pct,
            annualized_pct: annualized,
            buy_leg: LegInfo {
                exchange: "binance".into(),
                market: "spot".into(),
                price: spot_price,
                symbol: idx.symbol.clone(),
            },
            sell_leg: LegInfo {
                exchange: "binance".into(),
                market: "perp".into(),
                price: idx.mark_price,
                symbol: idx.symbol.clone(),
            },
            scanned_at: now.clone(),
        });
    }

    // 按年化收益率从高到低排序
    opportunities.sort_by(|a, b| b.annualized_pct.partial_cmp(&a.annualized_pct).unwrap_or(std::cmp::Ordering::Equal));
    opportunities
}

// ── 跨交易所价差扫描 ────────────────────────────────────────

/// 跨交易所价差扫描（框架，需要多交易所接入后实现）
///
/// `exchange_prices`: exchange_name -> (symbol -> price)
pub fn scan_cross_exchange(
    exchange_prices: &std::collections::HashMap<String, std::collections::HashMap<String, f64>>,
    config: &ScanConfig,
) -> Vec<ArbitrageOpportunity> {
    let mut opportunities = Vec::new();
    let now = Utc::now().to_rfc3339();
    let total_fee = config.fee_rate * 2.0 + config.slippage_pct / 100.0;

    // 收集所有交易所名
    let exchanges: Vec<&String> = exchange_prices.keys().collect();
    if exchanges.len() < 2 {
        return opportunities;
    }

    // 收集所有出现的 symbol
    let mut all_symbols: std::collections::HashSet<String> = std::collections::HashSet::new();
    for prices in exchange_prices.values() {
        for sym in prices.keys() {
            all_symbols.insert(sym.clone());
        }
    }

    for symbol in &all_symbols {
        // 找最低买价和最高卖价
        let mut best_buy: Option<(&str, f64)> = None;
        let mut best_sell: Option<(&str, f64)> = None;

        for (exchange, prices) in exchange_prices {
            if let Some(&price) = prices.get(symbol) {
                if price <= 0.0 {
                    continue;
                }
                match best_buy {
                    Some((_, bp)) if price < bp => best_buy = Some((exchange, price)),
                    None => best_buy = Some((exchange, price)),
                    _ => {}
                }
                match best_sell {
                    Some((_, sp)) if price > sp => best_sell = Some((exchange, price)),
                    None => best_sell = Some((exchange, price)),
                    _ => {}
                }
            }
        }

        let (Some((buy_ex, buy_price)), Some((sell_ex, sell_price))) = (best_buy, best_sell) else {
            continue;
        };

        // 不同交易所之间才有套利
        if buy_ex == sell_ex {
            continue;
        }

        let spread_pct = (sell_price - buy_price) / buy_price * 100.0;
        let net_profit_pct = spread_pct - total_fee * 100.0;

        if net_profit_pct < config.min_net_profit_pct {
            continue;
        }

        opportunities.push(ArbitrageOpportunity {
            arb_type: ArbitrageType::CrossExchange,
            symbol: symbol.clone(),
            description: format!(
                "{}: buy@{} {:.4} sell@{} {:.4} spread {:.3}%",
                symbol, buy_ex, buy_price, sell_ex, sell_price, spread_pct
            ),
            spread_pct,
            net_profit_pct,
            annualized_pct: 0.0, // 跨交易所套利不计年化
            buy_leg: LegInfo {
                exchange: buy_ex.to_string(),
                market: "perp".into(),
                price: buy_price,
                symbol: symbol.clone(),
            },
            sell_leg: LegInfo {
                exchange: sell_ex.to_string(),
                market: "perp".into(),
                price: sell_price,
                symbol: symbol.clone(),
            },
            scanned_at: now.clone(),
        });
    }

    opportunities.sort_by(|a, b| b.net_profit_pct.partial_cmp(&a.net_profit_pct).unwrap_or(std::cmp::Ordering::Equal));
    opportunities
}

// ── 三角套利扫描 ─────────────────────────────────────────────

/// 三角套利路径
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriangularPath {
    pub legs: [(String, f64); 3], // [(pair, price); 3]
    pub profit_pct: f64,
}

/// 三角套利扫描：检测 A/USDT → B/A → B/USDT 循环中的价差。
///
/// `prices`: symbol -> price 的映射（如 BTCUSDT -> 60000, ETHBTC -> 0.05, ETHUSDT -> 3000）
pub fn scan_triangular(
    prices: &std::collections::HashMap<String, f64>,
    config: &ScanConfig,
) -> Vec<ArbitrageOpportunity> {
    let mut opportunities = Vec::new();
    let now = Utc::now().to_rfc3339();
    let total_fee_pct = (config.fee_rate * 3.0 + config.slippage_pct / 100.0 * 3.0) * 100.0;

    // 常见 quote 资产
    let quotes = ["USDT", "BTC", "ETH", "BNB"];

    // 提取 base/quote 对
    let pairs: Vec<(&str, &str, f64)> = prices
        .iter()
        .filter_map(|(sym, &price)| {
            for q in &quotes {
                if sym.ends_with(q) && sym.len() > q.len() {
                    let base = &sym[..sym.len() - q.len()];
                    return Some((base, *q, price));
                }
            }
            None
        })
        .collect();

    // 三角路径：A/USDT, B/A, B/USDT
    // 策略：用 USDT 买 A，用 A 买 B，用 B 换 USDT
    // 利润 = (1/price_A_USDT) * (1/price_B_A) * price_B_USDT - 1
    for &(base_a, quote_a, price_a) in &pairs {
        if quote_a != "USDT" || price_a <= 0.0 {
            continue;
        }
        for &(base_b, quote_b, price_ba) in &pairs {
            if quote_b != base_a || price_ba <= 0.0 {
                continue;
            }
            // 找 base_b/USDT
            let key_b_usdt = format!("{base_b}USDT");
            let Some(&price_b_usdt) = prices.get(&key_b_usdt) else {
                continue;
            };
            if price_b_usdt <= 0.0 {
                continue;
            }

            // 三角利润：USDT → A → B → USDT
            let result = (1.0 / price_a) * (1.0 / price_ba) * price_b_usdt;
            let profit_pct = (result - 1.0) * 100.0;
            let net_profit_pct = profit_pct - total_fee_pct;

            if net_profit_pct < config.min_net_profit_pct {
                continue;
            }

            let key_a = format!("{base_a}USDT");
            let _key_ba = format!("{base_b}{base_a}");

            opportunities.push(ArbitrageOpportunity {
                arb_type: ArbitrageType::Triangular,
                symbol: key_b_usdt.clone(),
                description: format!(
                    "USDT→{}→{}→USDT profit {:.3}% (net {:.3}%)",
                    base_a, base_b, profit_pct, net_profit_pct
                ),
                spread_pct: profit_pct,
                net_profit_pct,
                annualized_pct: 0.0,
                buy_leg: LegInfo {
                    exchange: "binance".into(),
                    market: "spot".into(),
                    price: price_a,
                    symbol: key_a,
                },
                sell_leg: LegInfo {
                    exchange: "binance".into(),
                    market: "spot".into(),
                    price: price_b_usdt,
                    symbol: key_b_usdt.clone(),
                },
                scanned_at: now.clone(),
            });
        }
    }

    opportunities.sort_by(|a, b| b.net_profit_pct.partial_cmp(&a.net_profit_pct).unwrap_or(std::cmp::Ordering::Equal));
    opportunities
}

// ── 输入数据类型 ─────────────────────────────────────────────

/// Premium index 数据（从 Binance API 解析）
#[derive(Debug, Clone)]
pub struct PremiumIndexData {
    pub symbol: String,
    pub mark_price: f64,
    pub last_funding_rate: f64,
    pub next_funding_time: u64,
}

/// 将 records/arbitrage.jsonl 追加写入一条机会记录
pub fn log_opportunity(records_dir: &std::path::Path, opp: &ArbitrageOpportunity) {
    let path = records_dir.join("arbitrage.jsonl");
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(line) = serde_json::to_string(opp) {
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
        {
            use std::io::Write;
            let _ = writeln!(file, "{}", line);
        }
    }
}

/// 读取 records/arbitrage.jsonl 中的历史机会
pub fn read_opportunities(records_dir: &std::path::Path) -> Vec<ArbitrageOpportunity> {
    let path = records_dir.join("arbitrage.jsonl");
    let contents = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    contents
        .lines()
        .filter_map(|line| serde_json::from_str::<ArbitrageOpportunity>(line).ok())
        .collect()
}

// ── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn default_config() -> ScanConfig {
        ScanConfig::default()
    }

    // ── Spot-Perp Basis ──────────────────────────────────────

    #[test]
    fn spot_perp_positive_funding_detected() {
        let config = ScanConfig {
            min_net_profit_pct: 0.0,
            fee_rate: 0.0002,     // low fees for test
            slippage_pct: 0.005,  // low slippage for test
            ..default_config()
        };
        let indices = vec![PremiumIndexData {
            symbol: "BTCUSDT".into(),
            mark_price: 60100.0,
            last_funding_rate: 0.001, // 0.1% per 8h
            next_funding_time: 0,
        }];
        let mut spot = HashMap::new();
        spot.insert("BTCUSDT".into(), 60000.0);

        let opps = scan_spot_perp_basis(&indices, &spot, &config);
        assert!(!opps.is_empty());
        assert_eq!(opps[0].arb_type, ArbitrageType::SpotPerp);
        assert_eq!(opps[0].symbol, "BTCUSDT");
        assert!(opps[0].net_profit_pct > 0.0);
        assert!(opps[0].annualized_pct > 0.0);
    }

    #[test]
    fn spot_perp_negative_funding_ignored() {
        let config = default_config();
        let indices = vec![PremiumIndexData {
            symbol: "BTCUSDT".into(),
            mark_price: 59900.0,
            last_funding_rate: -0.001,
            next_funding_time: 0,
        }];
        let mut spot = HashMap::new();
        spot.insert("BTCUSDT".into(), 60000.0);

        let opps = scan_spot_perp_basis(&indices, &spot, &config);
        assert!(opps.is_empty());
    }

    #[test]
    fn spot_perp_low_funding_filtered() {
        let config = ScanConfig {
            min_net_profit_pct: 0.1,
            ..default_config()
        };
        let indices = vec![PremiumIndexData {
            symbol: "BTCUSDT".into(),
            mark_price: 60001.0,
            last_funding_rate: 0.0001, // 0.01% — too low
            next_funding_time: 0,
        }];
        let mut spot = HashMap::new();
        spot.insert("BTCUSDT".into(), 60000.0);

        let opps = scan_spot_perp_basis(&indices, &spot, &config);
        assert!(opps.is_empty());
    }

    #[test]
    fn spot_perp_missing_spot_price_skipped() {
        let config = default_config();
        let indices = vec![PremiumIndexData {
            symbol: "BTCUSDT".into(),
            mark_price: 60100.0,
            last_funding_rate: 0.001,
            next_funding_time: 0,
        }];
        let spot = HashMap::new(); // empty

        let opps = scan_spot_perp_basis(&indices, &spot, &config);
        assert!(opps.is_empty());
    }

    #[test]
    fn spot_perp_sorted_by_annualized() {
        let config = ScanConfig {
            min_net_profit_pct: 0.0,
            ..default_config()
        };
        let indices = vec![
            PremiumIndexData {
                symbol: "ETHUSDT".into(),
                mark_price: 3010.0,
                last_funding_rate: 0.002, // higher
                next_funding_time: 0,
            },
            PremiumIndexData {
                symbol: "BTCUSDT".into(),
                mark_price: 60010.0,
                last_funding_rate: 0.001, // lower
                next_funding_time: 0,
            },
        ];
        let mut spot = HashMap::new();
        spot.insert("ETHUSDT".into(), 3000.0);
        spot.insert("BTCUSDT".into(), 60000.0);

        let opps = scan_spot_perp_basis(&indices, &spot, &config);
        assert!(opps.len() >= 2);
        assert!(opps[0].annualized_pct >= opps[1].annualized_pct);
        assert_eq!(opps[0].symbol, "ETHUSDT");
    }

    // ── Cross-Exchange ───────────────────────────────────────

    #[test]
    fn cross_exchange_detects_spread() {
        let config = ScanConfig {
            min_net_profit_pct: 0.0,
            fee_rate: 0.0001,
            slippage_pct: 0.0,
            ..default_config()
        };
        let mut exchanges: HashMap<String, HashMap<String, f64>> = HashMap::new();

        let mut binance = HashMap::new();
        binance.insert("BTCUSDT".into(), 60000.0);
        exchanges.insert("binance".into(), binance);

        let mut okx = HashMap::new();
        okx.insert("BTCUSDT".into(), 60100.0); // higher on OKX
        exchanges.insert("okx".into(), okx);

        let opps = scan_cross_exchange(&exchanges, &config);
        assert!(!opps.is_empty());
        assert_eq!(opps[0].arb_type, ArbitrageType::CrossExchange);
        assert_eq!(opps[0].buy_leg.exchange, "binance");
        assert_eq!(opps[0].sell_leg.exchange, "okx");
    }

    #[test]
    fn cross_exchange_same_exchange_ignored() {
        let config = default_config();
        let mut exchanges: HashMap<String, HashMap<String, f64>> = HashMap::new();

        let mut binance = HashMap::new();
        binance.insert("BTCUSDT".into(), 60000.0);
        exchanges.insert("binance".into(), binance);

        // Only one exchange → no opportunities
        let opps = scan_cross_exchange(&exchanges, &config);
        assert!(opps.is_empty());
    }

    #[test]
    fn cross_exchange_small_spread_filtered() {
        let config = ScanConfig {
            min_net_profit_pct: 0.5,
            ..default_config()
        };
        let mut exchanges: HashMap<String, HashMap<String, f64>> = HashMap::new();

        let mut binance = HashMap::new();
        binance.insert("BTCUSDT".into(), 60000.0);
        exchanges.insert("binance".into(), binance);

        let mut okx = HashMap::new();
        okx.insert("BTCUSDT".into(), 60001.0); // tiny spread
        exchanges.insert("okx".into(), okx);

        let opps = scan_cross_exchange(&exchanges, &config);
        assert!(opps.is_empty());
    }

    // ── Triangular ───────────────────────────────────────────

    #[test]
    fn triangular_detects_profit() {
        let config = ScanConfig {
            min_net_profit_pct: 0.0,
            fee_rate: 0.0,
            slippage_pct: 0.0,
            ..default_config()
        };
        let mut prices = HashMap::new();
        // Intentional mispricing: BTC=60000, ETH=3000, ETH/BTC=0.048
        // Fair ETH/BTC = 3000/60000 = 0.05
        // Path: USDT → BTC (buy at 60000) → ETH (buy ETH/BTC at 0.048) → USDT (sell at 3000)
        // Result: (1/60000) * (1/0.048) * 3000 = 1.0417 → 4.17% profit
        prices.insert("BTCUSDT".into(), 60000.0);
        prices.insert("ETHBTC".into(), 0.048);
        prices.insert("ETHUSDT".into(), 3000.0);

        let opps = scan_triangular(&prices, &config);
        assert!(!opps.is_empty());
        assert_eq!(opps[0].arb_type, ArbitrageType::Triangular);
        assert!(opps[0].net_profit_pct > 4.0);
    }

    #[test]
    fn triangular_no_profit_filtered() {
        let config = ScanConfig {
            min_net_profit_pct: 0.1,
            fee_rate: 0.001,
            slippage_pct: 0.05,
            ..default_config()
        };
        let mut prices = HashMap::new();
        // Fair prices: no arb
        prices.insert("BTCUSDT".into(), 60000.0);
        prices.insert("ETHBTC".into(), 0.05);
        prices.insert("ETHUSDT".into(), 3000.0);

        let opps = scan_triangular(&prices, &config);
        assert!(opps.is_empty());
    }

    // ── Log / Read ───────────────────────────────────────────

    #[test]
    fn log_and_read_opportunities() {
        let dir = tempfile::tempdir().unwrap();
        let opp = ArbitrageOpportunity {
            arb_type: ArbitrageType::SpotPerp,
            symbol: "BTCUSDT".into(),
            description: "test".into(),
            spread_pct: 0.1,
            net_profit_pct: 0.05,
            annualized_pct: 18.25,
            buy_leg: LegInfo {
                exchange: "binance".into(),
                market: "spot".into(),
                price: 60000.0,
                symbol: "BTCUSDT".into(),
            },
            sell_leg: LegInfo {
                exchange: "binance".into(),
                market: "perp".into(),
                price: 60100.0,
                symbol: "BTCUSDT".into(),
            },
            scanned_at: "2026-03-19T00:00:00Z".into(),
        };
        log_opportunity(dir.path(), &opp);
        log_opportunity(dir.path(), &opp);

        let loaded = read_opportunities(dir.path());
        assert_eq!(loaded.len(), 2);
        assert_eq!(loaded[0].symbol, "BTCUSDT");
        assert_eq!(loaded[0].arb_type, ArbitrageType::SpotPerp);
    }

    #[test]
    fn read_empty_dir() {
        let dir = tempfile::tempdir().unwrap();
        let loaded = read_opportunities(dir.path());
        assert!(loaded.is_empty());
    }

    #[test]
    fn arb_type_display() {
        assert_eq!(format!("{}", ArbitrageType::SpotPerp), "spot-perp");
        assert_eq!(format!("{}", ArbitrageType::CrossExchange), "cross-exchange");
        assert_eq!(format!("{}", ArbitrageType::Triangular), "triangular");
    }

    #[test]
    fn arb_type_serialization() {
        let json = serde_json::to_string(&ArbitrageType::SpotPerp).unwrap();
        assert_eq!(json, "\"spot_perp\"");
        let parsed: ArbitrageType = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, ArbitrageType::SpotPerp);
    }
}
