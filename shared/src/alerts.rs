//! 告警系统 — 统一定义告警级别和事件，写入 records/alerts.jsonl

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

// ── 告警级别 ────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertLevel {
    /// 红色：立即通知（全局风控触发、单日亏损超限、引擎异常退出、API 连续失败）
    Red,
    /// 黄色：定时汇总（策略暂停/缩仓、资金费率异常、容量利用率高、连续亏损）
    Yellow,
    /// 信息：记录（状态变更、常规事件）
    Info,
}

impl std::fmt::Display for AlertLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertLevel::Red => write!(f, "RED"),
            AlertLevel::Yellow => write!(f, "YELLOW"),
            AlertLevel::Info => write!(f, "INFO"),
        }
    }
}

// ── 告警事件 ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    /// ISO 8601 时间戳
    pub timestamp: String,
    /// 告警级别
    pub level: AlertLevel,
    /// 来源组件（engine / autopilot / global_risk 等）
    pub source: String,
    /// 关联策略名（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    /// 告警消息
    pub message: String,
}

impl AlertEvent {
    pub fn new(
        level: AlertLevel,
        source: impl Into<String>,
        strategy: Option<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            timestamp: Utc::now().to_rfc3339(),
            level,
            source: source.into(),
            strategy,
            message: message.into(),
        }
    }
}

// ── 告警配置 ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    /// 是否启用文件渠道（写 records/alerts.jsonl）
    #[serde(default = "default_true")]
    pub file_enabled: bool,
    /// 是否启用 webhook 渠道
    #[serde(default)]
    pub webhook_enabled: bool,
    /// Webhook URL（红色告警立即 POST）
    #[serde(default)]
    pub webhook_url: String,
    /// 是否启用邮件通知（红色告警调 ops notify）
    #[serde(default)]
    pub email_enabled: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AlertConfig {
    fn default() -> Self {
        Self {
            file_enabled: true,
            webhook_enabled: false,
            webhook_url: String::new(),
            email_enabled: false,
        }
    }
}

impl AlertConfig {
    /// 从 config/alerts.json 加载配置，文件不存在则返回默认值
    pub fn load(path: &Path) -> Self {
        match std::fs::read_to_string(path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }
}

// ── emit_alert ─────────────────────────────────────────────────

/// 将告警事件追加写入 records/alerts.jsonl
///
/// 这是同步操作，适合在引擎和 autopilot 中调用。
/// 如果写入失败，只打 tracing::error 不 panic。
pub fn emit_alert(records_dir: &Path, event: &AlertEvent) {
    // 1. 写文件
    let alerts_path = records_dir.join("alerts.jsonl");
    match serde_json::to_string(event) {
        Ok(line) => {
            let mut file = match std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&alerts_path)
            {
                Ok(f) => f,
                Err(e) => {
                    tracing::error!(path = %alerts_path.display(), "open alerts.jsonl: {e}");
                    return;
                }
            };
            if let Err(e) = writeln!(file, "{}", line) {
                tracing::error!(path = %alerts_path.display(), "write alerts.jsonl: {e}");
            }
        }
        Err(e) => {
            tracing::error!("serialize AlertEvent: {e}");
        }
    }

    // 2. 日志输出
    match event.level {
        AlertLevel::Red => {
            tracing::error!(
                level = %event.level,
                source = %event.source,
                strategy = ?event.strategy,
                "ALERT: {}",
                event.message
            );
        }
        AlertLevel::Yellow => {
            tracing::warn!(
                level = %event.level,
                source = %event.source,
                strategy = ?event.strategy,
                "ALERT: {}",
                event.message
            );
        }
        AlertLevel::Info => {
            tracing::info!(
                level = %event.level,
                source = %event.source,
                strategy = ?event.strategy,
                "ALERT: {}",
                event.message
            );
        }
    }
}

/// 读取 alerts.jsonl 中的告警事件
pub fn read_alerts(records_dir: &Path) -> Vec<AlertEvent> {
    let path = records_dir.join("alerts.jsonl");
    let contents = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    contents
        .lines()
        .filter_map(|line| serde_json::from_str::<AlertEvent>(line).ok())
        .collect()
}

// ── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alert_event_serialization() {
        let event = AlertEvent::new(
            AlertLevel::Red,
            "global_risk",
            None,
            "总回撤 11.0% >= 10% 红线",
        );
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"level\":\"red\""));
        assert!(json.contains("global_risk"));

        let parsed: AlertEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.level, AlertLevel::Red);
        assert_eq!(parsed.source, "global_risk");
    }

    #[test]
    fn alert_event_with_strategy() {
        let event = AlertEvent::new(
            AlertLevel::Yellow,
            "autopilot",
            Some("ntrn-trend-v2-5m".to_string()),
            "连续亏损 3 笔",
        );
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("ntrn-trend-v2-5m"));
    }

    #[test]
    fn emit_alert_writes_file() {
        let dir = tempfile::tempdir().unwrap();
        let event = AlertEvent::new(AlertLevel::Info, "test", None, "test alert");
        emit_alert(dir.path(), &event);

        let alerts = read_alerts(dir.path());
        assert_eq!(alerts.len(), 1);
        assert_eq!(alerts[0].source, "test");
        assert_eq!(alerts[0].message, "test alert");
    }

    #[test]
    fn emit_alert_appends() {
        let dir = tempfile::tempdir().unwrap();
        emit_alert(
            dir.path(),
            &AlertEvent::new(AlertLevel::Red, "a", None, "first"),
        );
        emit_alert(
            dir.path(),
            &AlertEvent::new(AlertLevel::Yellow, "b", None, "second"),
        );

        let alerts = read_alerts(dir.path());
        assert_eq!(alerts.len(), 2);
        assert_eq!(alerts[0].message, "first");
        assert_eq!(alerts[1].message, "second");
    }

    #[test]
    fn alert_config_default() {
        let config = AlertConfig::default();
        assert!(config.file_enabled);
        assert!(!config.webhook_enabled);
        assert!(!config.email_enabled);
    }

    #[test]
    fn alert_config_from_json() {
        let json = r#"{"file_enabled":true,"webhook_enabled":true,"webhook_url":"https://example.com/hook","email_enabled":false}"#;
        let config: AlertConfig = serde_json::from_str(json).unwrap();
        assert!(config.webhook_enabled);
        assert_eq!(config.webhook_url, "https://example.com/hook");
    }

    #[test]
    fn read_alerts_empty_dir() {
        let dir = tempfile::tempdir().unwrap();
        let alerts = read_alerts(dir.path());
        assert!(alerts.is_empty());
    }

    #[test]
    fn alert_level_display() {
        assert_eq!(format!("{}", AlertLevel::Red), "RED");
        assert_eq!(format!("{}", AlertLevel::Yellow), "YELLOW");
        assert_eq!(format!("{}", AlertLevel::Info), "INFO");
    }
}
