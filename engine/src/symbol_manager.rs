//! SymbolManager — 币种全链路生命周期管理
//!
//! 统一管理币种的添加、移除、健康检查。
//! 协调 Gateway（WS 连接）、Ledger（策略配额）、风控（敞口监控）。

#![allow(dead_code)]

use std::collections::HashMap;
use std::time::Instant;

// ── SymbolStatus ──────────────────────────────────────────────

/// 币种状态
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SymbolStatus {
    /// 正常运行中
    Active,
    /// 正在移除（平仓中）
    Removing,
    /// 已冻结（移除完成，保留历史数据）
    Frozen,
}

impl std::fmt::Display for SymbolStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SymbolStatus::Active => write!(f, "active"),
            SymbolStatus::Removing => write!(f, "removing"),
            SymbolStatus::Frozen => write!(f, "frozen"),
        }
    }
}

// ── SymbolHealth ──────────────────────────────────────────────

/// 币种健康状态
#[derive(Debug, Clone)]
pub struct SymbolHealth {
    pub symbol: String,
    pub status: SymbolStatus,
    /// WS 是否有数据流入
    pub ws_connected: bool,
    /// 关联的策略数量
    pub strategy_count: usize,
    /// 活跃持仓数量
    pub position_count: usize,
    /// 总敞口（名义价值）
    pub total_exposure: f64,
    /// 上次收到行情数据距今秒数（None = 从未收到）
    pub last_data_age_secs: Option<f64>,
}

// ── SymbolEntry（内部跟踪）─────────────────────────────────────

/// 内部记录：每个 symbol 的运行状态
struct SymbolEntry {
    /// 大写 symbol，如 "BTCUSDT"
    symbol: String,
    status: SymbolStatus,
    /// 关联的策略名称列表
    strategies: Vec<String>,
    /// 注册时间
    added_at: Instant,
    /// 上次收到行情数据的时间
    last_data_at: Option<Instant>,
    /// 是否已在风控系统注册
    risk_registered: bool,
    /// 是否已在 Ledger 中允许
    ledger_registered: bool,
}

// ── SymbolManager ─────────────────────────────────────────────

/// 币种全链路生命周期管理器
///
/// 负责协调：
/// - Gateway: WS 连接管理
/// - Ledger: 策略配额管理
/// - 风控: 敞口监控注册
/// - Worker: 策略 task 管理
pub struct SymbolManager {
    /// symbol (大写) → SymbolEntry
    symbols: HashMap<String, SymbolEntry>,
}

impl SymbolManager {
    pub fn new() -> Self {
        Self {
            symbols: HashMap::new(),
        }
    }

    /// 添加新币种
    ///
    /// 注册到 Gateway（WS）、Ledger（配额）、风控（敞口监控）。
    /// 如果 symbol 已存在且为 Active 状态，返回 false。
    /// 如果 symbol 为 Frozen 状态，重新激活。
    pub fn add_symbol(&mut self, symbol: &str) -> bool {
        let upper = symbol.to_uppercase();

        if let Some(entry) = self.symbols.get_mut(&upper) {
            match entry.status {
                SymbolStatus::Active => {
                    // 已激活，跳过
                    return false;
                }
                SymbolStatus::Removing => {
                    // 正在移除中，不允许重新添加
                    return false;
                }
                SymbolStatus::Frozen => {
                    // 重新激活
                    entry.status = SymbolStatus::Active;
                    entry.risk_registered = true;
                    entry.ledger_registered = true;
                    entry.last_data_at = None;
                    return true;
                }
            }
        }

        let entry = SymbolEntry {
            symbol: upper.clone(),
            status: SymbolStatus::Active,
            strategies: Vec::new(),
            added_at: Instant::now(),
            last_data_at: None,
            risk_registered: true,
            ledger_registered: true,
        };
        self.symbols.insert(upper, entry);
        true
    }

    /// 移除币种
    ///
    /// 流程：标记为 Removing → 冻结 Ledger 配额 → 标记为 Frozen。
    /// 调用方负责在移除前平仓和停止 Worker。
    /// 返回该 symbol 关联的策略列表（用于外部平仓/停止 worker）。
    pub fn remove_symbol(&mut self, symbol: &str) -> Vec<String> {
        let upper = symbol.to_uppercase();

        let Some(entry) = self.symbols.get_mut(&upper) else {
            return Vec::new();
        };

        if entry.status == SymbolStatus::Frozen {
            return Vec::new();
        }

        let strategies = entry.strategies.clone();

        // 标记为 Removing
        entry.status = SymbolStatus::Removing;
        // 取消风控注册
        entry.risk_registered = false;
        // 冻结 Ledger 配额
        entry.ledger_registered = false;

        strategies
    }

    /// 完成移除（平仓/停 worker 后调用）
    ///
    /// 将 symbol 状态从 Removing 变为 Frozen。
    pub fn finalize_removal(&mut self, symbol: &str) {
        let upper = symbol.to_uppercase();
        if let Some(entry) = self.symbols.get_mut(&upper) {
            if entry.status == SymbolStatus::Removing {
                entry.status = SymbolStatus::Frozen;
                entry.strategies.clear();
            }
        }
    }

    /// 健康检查
    pub fn health_check(&self, symbol: &str) -> Option<SymbolHealth> {
        let upper = symbol.to_uppercase();
        let entry = self.symbols.get(&upper)?;

        let last_data_age_secs = entry.last_data_at.map(|t| t.elapsed().as_secs_f64());

        // WS 连接判定：30 秒内有数据视为正常
        let ws_connected = match last_data_age_secs {
            Some(age) => age < 30.0,
            None => false,
        };

        Some(SymbolHealth {
            symbol: upper,
            status: entry.status.clone(),
            ws_connected,
            strategy_count: entry.strategies.len(),
            position_count: 0, // 由外部 Ledger 填充
            total_exposure: 0.0, // 由外部 Ledger 填充
            last_data_age_secs,
        })
    }

    /// 列出所有管理的 symbol 及其状态
    pub fn list_symbols(&self) -> Vec<(String, SymbolStatus)> {
        let mut result: Vec<_> = self
            .symbols
            .iter()
            .map(|(sym, entry)| (sym.clone(), entry.status.clone()))
            .collect();
        result.sort_by(|a, b| a.0.cmp(&b.0));
        result
    }

    /// 获取所有活跃 symbol
    pub fn active_symbols(&self) -> Vec<String> {
        self.symbols
            .iter()
            .filter(|(_, e)| e.status == SymbolStatus::Active)
            .map(|(sym, _)| sym.clone())
            .collect()
    }

    /// 注册策略到 symbol
    ///
    /// 策略与 symbol 的多对一关系：一个 symbol 可以有多个策略。
    pub fn register_strategy(&mut self, symbol: &str, strategy_name: &str) -> bool {
        let upper = symbol.to_uppercase();
        let Some(entry) = self.symbols.get_mut(&upper) else {
            return false;
        };
        if entry.status != SymbolStatus::Active {
            return false;
        }
        if !entry.strategies.contains(&strategy_name.to_string()) {
            entry.strategies.push(strategy_name.to_string());
        }
        true
    }

    /// 从 symbol 取消注册策略
    pub fn unregister_strategy(&mut self, symbol: &str, strategy_name: &str) {
        let upper = symbol.to_uppercase();
        if let Some(entry) = self.symbols.get_mut(&upper) {
            entry.strategies.retain(|s| s != strategy_name);
        }
    }

    /// 获取 symbol 关联的策略列表
    pub fn strategies_for_symbol(&self, symbol: &str) -> Vec<String> {
        let upper = symbol.to_uppercase();
        self.symbols
            .get(&upper)
            .map(|e| e.strategies.clone())
            .unwrap_or_default()
    }

    /// 更新行情数据时间戳（每次收到 WS 数据时调用）
    pub fn update_data_timestamp(&mut self, symbol: &str) {
        let upper = symbol.to_uppercase();
        if let Some(entry) = self.symbols.get_mut(&upper) {
            entry.last_data_at = Some(Instant::now());
        }
    }

    /// 获取 symbol 状态
    pub fn status(&self, symbol: &str) -> Option<SymbolStatus> {
        let upper = symbol.to_uppercase();
        self.symbols.get(&upper).map(|e| e.status.clone())
    }

    /// 检查 symbol 是否为活跃状态
    pub fn is_active(&self, symbol: &str) -> bool {
        self.status(symbol) == Some(SymbolStatus::Active)
    }

    /// symbol 是否在风控系统注册
    pub fn is_risk_registered(&self, symbol: &str) -> bool {
        let upper = symbol.to_uppercase();
        self.symbols
            .get(&upper)
            .map(|e| e.risk_registered)
            .unwrap_or(false)
    }

    /// symbol 是否在 Ledger 中允许
    pub fn is_ledger_registered(&self, symbol: &str) -> bool {
        let upper = symbol.to_uppercase();
        self.symbols
            .get(&upper)
            .map(|e| e.ledger_registered)
            .unwrap_or(false)
    }

    /// 管理的 symbol 总数
    pub fn count(&self) -> usize {
        self.symbols.len()
    }

    /// 活跃 symbol 数量
    pub fn active_count(&self) -> usize {
        self.symbols
            .values()
            .filter(|e| e.status == SymbolStatus::Active)
            .count()
    }
}

impl Default for SymbolManager {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── add_symbol ──────────────────────────────────────────────

    #[test]
    fn add_new_symbol() {
        let mut mgr = SymbolManager::new();
        assert!(mgr.add_symbol("btcusdt"));
        assert_eq!(mgr.count(), 1);
        assert!(mgr.is_active("BTCUSDT"));
    }

    #[test]
    fn add_symbol_normalizes_to_uppercase() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("ethusdt");
        assert!(mgr.is_active("ETHUSDT"));
        assert!(mgr.is_active("ethusdt"));
    }

    #[test]
    fn add_duplicate_symbol_returns_false() {
        let mut mgr = SymbolManager::new();
        assert!(mgr.add_symbol("BTCUSDT"));
        assert!(!mgr.add_symbol("BTCUSDT"));
        assert!(!mgr.add_symbol("btcusdt")); // case insensitive
        assert_eq!(mgr.count(), 1);
    }

    #[test]
    fn add_symbol_while_removing_returns_false() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.remove_symbol("BTCUSDT");
        assert!(!mgr.add_symbol("BTCUSDT"));
    }

    #[test]
    fn add_symbol_reactivates_frozen() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.remove_symbol("BTCUSDT");
        mgr.finalize_removal("BTCUSDT");
        assert_eq!(mgr.status("BTCUSDT"), Some(SymbolStatus::Frozen));

        assert!(mgr.add_symbol("BTCUSDT"));
        assert!(mgr.is_active("BTCUSDT"));
        assert!(mgr.is_risk_registered("BTCUSDT"));
        assert!(mgr.is_ledger_registered("BTCUSDT"));
    }

    // ── remove_symbol ───────────────────────────────────────────

    #[test]
    fn remove_symbol_returns_strategies() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.register_strategy("BTCUSDT", "btc-trend-5m");
        mgr.register_strategy("BTCUSDT", "btc-scalp-1m");

        let strats = mgr.remove_symbol("BTCUSDT");
        assert_eq!(strats.len(), 2);
        assert!(strats.contains(&"btc-trend-5m".to_string()));
        assert!(strats.contains(&"btc-scalp-1m".to_string()));
        assert_eq!(mgr.status("BTCUSDT"), Some(SymbolStatus::Removing));
    }

    #[test]
    fn remove_nonexistent_symbol_returns_empty() {
        let mut mgr = SymbolManager::new();
        let strats = mgr.remove_symbol("SOLUSDT");
        assert!(strats.is_empty());
    }

    #[test]
    fn remove_frozen_symbol_returns_empty() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.remove_symbol("BTCUSDT");
        mgr.finalize_removal("BTCUSDT");

        let strats = mgr.remove_symbol("BTCUSDT");
        assert!(strats.is_empty());
    }

    #[test]
    fn remove_symbol_deregisters_risk_and_ledger() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        assert!(mgr.is_risk_registered("BTCUSDT"));
        assert!(mgr.is_ledger_registered("BTCUSDT"));

        mgr.remove_symbol("BTCUSDT");
        assert!(!mgr.is_risk_registered("BTCUSDT"));
        assert!(!mgr.is_ledger_registered("BTCUSDT"));
    }

    // ── finalize_removal ────────────────────────────────────────

    #[test]
    fn finalize_removal_transitions_to_frozen() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.register_strategy("BTCUSDT", "strat1");
        mgr.remove_symbol("BTCUSDT");
        mgr.finalize_removal("BTCUSDT");

        assert_eq!(mgr.status("BTCUSDT"), Some(SymbolStatus::Frozen));
        assert!(mgr.strategies_for_symbol("BTCUSDT").is_empty());
    }

    #[test]
    fn finalize_removal_noop_for_active() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.finalize_removal("BTCUSDT"); // should be noop
        assert!(mgr.is_active("BTCUSDT"));
    }

    // ── health_check ────────────────────────────────────────────

    #[test]
    fn health_check_no_data_not_connected() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");

        let health = mgr.health_check("BTCUSDT").unwrap();
        assert_eq!(health.status, SymbolStatus::Active);
        assert!(!health.ws_connected);
        assert!(health.last_data_age_secs.is_none());
    }

    #[test]
    fn health_check_with_recent_data() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.update_data_timestamp("BTCUSDT");

        let health = mgr.health_check("BTCUSDT").unwrap();
        assert!(health.ws_connected);
        assert!(health.last_data_age_secs.unwrap() < 1.0);
    }

    #[test]
    fn health_check_nonexistent_returns_none() {
        let mgr = SymbolManager::new();
        assert!(mgr.health_check("BTCUSDT").is_none());
    }

    #[test]
    fn health_check_shows_strategy_count() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.register_strategy("BTCUSDT", "s1");
        mgr.register_strategy("BTCUSDT", "s2");

        let health = mgr.health_check("BTCUSDT").unwrap();
        assert_eq!(health.strategy_count, 2);
    }

    // ── list_symbols ────────────────────────────────────────────

    #[test]
    fn list_symbols_sorted() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("ETHUSDT");
        mgr.add_symbol("BTCUSDT");
        mgr.add_symbol("SOLUSDT");

        let list = mgr.list_symbols();
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].0, "BTCUSDT");
        assert_eq!(list[1].0, "ETHUSDT");
        assert_eq!(list[2].0, "SOLUSDT");
    }

    #[test]
    fn list_symbols_shows_mixed_status() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.add_symbol("ETHUSDT");
        mgr.add_symbol("SOLUSDT");
        mgr.remove_symbol("ETHUSDT");
        mgr.finalize_removal("ETHUSDT");

        let list = mgr.list_symbols();
        let btc = list.iter().find(|(s, _)| s == "BTCUSDT").unwrap();
        let eth = list.iter().find(|(s, _)| s == "ETHUSDT").unwrap();
        let sol = list.iter().find(|(s, _)| s == "SOLUSDT").unwrap();
        assert_eq!(btc.1, SymbolStatus::Active);
        assert_eq!(eth.1, SymbolStatus::Frozen);
        assert_eq!(sol.1, SymbolStatus::Active);
    }

    // ── active_symbols ──────────────────────────────────────────

    #[test]
    fn active_symbols_excludes_non_active() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.add_symbol("ETHUSDT");
        mgr.add_symbol("SOLUSDT");
        mgr.remove_symbol("ETHUSDT");

        let active = mgr.active_symbols();
        assert_eq!(active.len(), 2);
        assert!(!active.contains(&"ETHUSDT".to_string()));
    }

    // ── register/unregister strategy ────────────────────────────

    #[test]
    fn register_strategy_success() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        assert!(mgr.register_strategy("BTCUSDT", "btc-trend-5m"));
        assert_eq!(mgr.strategies_for_symbol("BTCUSDT"), vec!["btc-trend-5m"]);
    }

    #[test]
    fn register_strategy_dedup() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.register_strategy("BTCUSDT", "btc-trend-5m");
        mgr.register_strategy("BTCUSDT", "btc-trend-5m"); // duplicate
        assert_eq!(mgr.strategies_for_symbol("BTCUSDT").len(), 1);
    }

    #[test]
    fn register_strategy_fails_for_nonexistent_symbol() {
        let mut mgr = SymbolManager::new();
        assert!(!mgr.register_strategy("BTCUSDT", "strat1"));
    }

    #[test]
    fn register_strategy_fails_for_frozen_symbol() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.remove_symbol("BTCUSDT");
        mgr.finalize_removal("BTCUSDT");
        assert!(!mgr.register_strategy("BTCUSDT", "strat1"));
    }

    #[test]
    fn unregister_strategy() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.register_strategy("BTCUSDT", "s1");
        mgr.register_strategy("BTCUSDT", "s2");
        mgr.unregister_strategy("BTCUSDT", "s1");
        assert_eq!(mgr.strategies_for_symbol("BTCUSDT"), vec!["s2"]);
    }

    #[test]
    fn unregister_strategy_nonexistent_noop() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.unregister_strategy("BTCUSDT", "nope"); // no panic
    }

    // ── update_data_timestamp ───────────────────────────────────

    #[test]
    fn update_data_timestamp_sets_last_data() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.update_data_timestamp("BTCUSDT");
        let health = mgr.health_check("BTCUSDT").unwrap();
        assert!(health.last_data_age_secs.is_some());
    }

    #[test]
    fn update_data_timestamp_nonexistent_noop() {
        let mut mgr = SymbolManager::new();
        mgr.update_data_timestamp("NOTHERE"); // no panic
    }

    // ── counts ──────────────────────────────────────────────────

    #[test]
    fn count_and_active_count() {
        let mut mgr = SymbolManager::new();
        mgr.add_symbol("BTCUSDT");
        mgr.add_symbol("ETHUSDT");
        mgr.add_symbol("SOLUSDT");
        mgr.remove_symbol("ETHUSDT");
        mgr.finalize_removal("ETHUSDT");

        assert_eq!(mgr.count(), 3);
        assert_eq!(mgr.active_count(), 2);
    }

    // ── Default trait ───────────────────────────────────────────

    #[test]
    fn default_creates_empty() {
        let mgr = SymbolManager::default();
        assert_eq!(mgr.count(), 0);
        assert!(mgr.list_symbols().is_empty());
    }

    // ── SymbolStatus Display ────────────────────────────────────

    #[test]
    fn symbol_status_display() {
        assert_eq!(format!("{}", SymbolStatus::Active), "active");
        assert_eq!(format!("{}", SymbolStatus::Removing), "removing");
        assert_eq!(format!("{}", SymbolStatus::Frozen), "frozen");
    }

    // ── full lifecycle ──────────────────────────────────────────

    #[test]
    fn full_lifecycle_add_use_remove_reactivate() {
        let mut mgr = SymbolManager::new();

        // 1. Add symbol
        assert!(mgr.add_symbol("NTRNUSDT"));
        assert!(mgr.is_active("NTRNUSDT"));
        assert!(mgr.is_risk_registered("NTRNUSDT"));
        assert!(mgr.is_ledger_registered("NTRNUSDT"));

        // 2. Register strategies
        mgr.register_strategy("NTRNUSDT", "ntrn-trend-5m");
        mgr.register_strategy("NTRNUSDT", "ntrn-breakout-5m");
        assert_eq!(mgr.strategies_for_symbol("NTRNUSDT").len(), 2);

        // 3. Simulate data flow
        mgr.update_data_timestamp("NTRNUSDT");
        let health = mgr.health_check("NTRNUSDT").unwrap();
        assert!(health.ws_connected);
        assert_eq!(health.strategy_count, 2);

        // 4. Remove symbol
        let strats = mgr.remove_symbol("NTRNUSDT");
        assert_eq!(strats.len(), 2);
        assert_eq!(mgr.status("NTRNUSDT"), Some(SymbolStatus::Removing));
        assert!(!mgr.is_risk_registered("NTRNUSDT"));

        // 5. Finalize removal
        mgr.finalize_removal("NTRNUSDT");
        assert_eq!(mgr.status("NTRNUSDT"), Some(SymbolStatus::Frozen));
        assert!(mgr.strategies_for_symbol("NTRNUSDT").is_empty());

        // 6. Reactivate
        assert!(mgr.add_symbol("NTRNUSDT"));
        assert!(mgr.is_active("NTRNUSDT"));
        assert!(mgr.is_risk_registered("NTRNUSDT"));
    }
}
