use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// 币种状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SymbolStatus {
    /// 活跃交易中（有 approved 策略）
    Active,
    /// 数据已就绪（已回填，等待策略发现）
    DataReady,
    /// 无信号（策略发现跑过但没找到好参数）
    NoSignal,
    /// 休眠（曾上线但已下架所有策略）
    Dormant,
    /// 已退市 / 黑名单
    Delisted,
}

impl std::fmt::Display for SymbolStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::DataReady => write!(f, "data_ready"),
            Self::NoSignal => write!(f, "no_signal"),
            Self::Dormant => write!(f, "dormant"),
            Self::Delisted => write!(f, "delisted"),
        }
    }
}

/// 单个币种条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolEntry {
    pub status: SymbolStatus,
    /// 添加时间 (ISO 8601)
    pub added_at: String,
    /// 最近状态更新时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    /// 24h 成交量 (USDT) — 扫描时记录
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volume_24h: Option<f64>,
    /// 备注
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

/// symbols.json 完整结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolRegistry {
    /// 币种映射: "NTRNUSDT" -> SymbolEntry
    pub symbols: HashMap<String, SymbolEntry>,
    /// 黑名单（永不添加）
    #[serde(default)]
    pub blacklist: Vec<String>,
}

impl SymbolRegistry {
    /// 从文件加载
    pub fn load(path: &Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("read {}: {e}", path.display()))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("parse {}: {e}", path.display()))
    }

    /// 保存到文件
    pub fn save(&self, path: &Path) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("serialize symbols: {e}"))?;
        std::fs::write(path, json)
            .map_err(|e| format!("write {}: {e}", path.display()))
    }

    /// 获取所有活跃币种（active + data_ready）
    pub fn active_symbols(&self) -> Vec<String> {
        self.symbols
            .iter()
            .filter(|(_, e)| matches!(e.status, SymbolStatus::Active | SymbolStatus::DataReady))
            .map(|(k, _)| k.clone())
            .collect()
    }

    /// 获取所有可采集数据的币种（非 delisted）
    pub fn data_symbols(&self) -> Vec<String> {
        self.symbols
            .iter()
            .filter(|(_, e)| !matches!(e.status, SymbolStatus::Delisted))
            .map(|(k, _)| k.clone())
            .collect()
    }

    /// 是否已包含该币种
    pub fn contains(&self, symbol: &str) -> bool {
        self.symbols.contains_key(symbol)
    }

    /// 是否在黑名单中
    pub fn is_blacklisted(&self, symbol: &str) -> bool {
        self.blacklist.iter().any(|s| s == symbol)
    }

    /// 添加新币种
    pub fn add_symbol(&mut self, symbol: String, volume_24h: Option<f64>) {
        let now = chrono::Utc::now().to_rfc3339();
        self.symbols.insert(
            symbol,
            SymbolEntry {
                status: SymbolStatus::DataReady,
                added_at: now,
                updated_at: None,
                volume_24h,
                note: None,
            },
        );
    }

    /// 更新币种状态
    pub fn set_status(&mut self, symbol: &str, status: SymbolStatus) {
        if let Some(entry) = self.symbols.get_mut(symbol) {
            entry.status = status;
            entry.updated_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }
}

impl Default for SymbolRegistry {
    fn default() -> Self {
        Self {
            symbols: HashMap::new(),
            blacklist: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_json() {
        let mut reg = SymbolRegistry::default();
        reg.add_symbol("NTRNUSDT".into(), Some(5_000_000.0));
        reg.add_symbol("BARDUSDT".into(), None);
        reg.blacklist.push("LUNAMUSDT".into());

        let json = serde_json::to_string_pretty(&reg).unwrap();
        let parsed: SymbolRegistry = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.symbols.len(), 2);
        assert!(parsed.contains("NTRNUSDT"));
        assert!(parsed.is_blacklisted("LUNAMUSDT"));
        assert!(!parsed.is_blacklisted("NTRNUSDT"));
    }

    #[test]
    fn active_symbols_filters_correctly() {
        let mut reg = SymbolRegistry::default();
        reg.add_symbol("NTRNUSDT".into(), None); // data_ready by default
        reg.add_symbol("BARDUSDT".into(), None);
        reg.set_status("BARDUSDT", SymbolStatus::Active);
        reg.add_symbol("OLDUSDT".into(), None);
        reg.set_status("OLDUSDT", SymbolStatus::Delisted);

        let active = reg.active_symbols();
        assert!(active.contains(&"NTRNUSDT".to_string()));
        assert!(active.contains(&"BARDUSDT".to_string()));
        assert!(!active.contains(&"OLDUSDT".to_string()));
    }

    #[test]
    fn data_symbols_excludes_delisted() {
        let mut reg = SymbolRegistry::default();
        reg.add_symbol("NTRNUSDT".into(), None);
        reg.add_symbol("OLDUSDT".into(), None);
        reg.set_status("OLDUSDT", SymbolStatus::Delisted);

        let data = reg.data_symbols();
        assert!(data.contains(&"NTRNUSDT".to_string()));
        assert!(!data.contains(&"OLDUSDT".to_string()));
    }

    #[test]
    fn set_status_updates_timestamp() {
        let mut reg = SymbolRegistry::default();
        reg.add_symbol("NTRNUSDT".into(), None);
        assert!(reg.symbols["NTRNUSDT"].updated_at.is_none());

        reg.set_status("NTRNUSDT", SymbolStatus::Active);
        assert!(reg.symbols["NTRNUSDT"].updated_at.is_some());
    }
}
