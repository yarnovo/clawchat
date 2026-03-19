use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// trade.json 中的指令动作
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TradeAction {
    /// 默认：不干预，策略信号正常流转
    Hold,
    /// 平掉所有仓位
    CloseAll,
    /// 只平多仓
    CloseLong,
    /// 只平空仓
    CloseShort,
    /// 暂停开仓（保留现有仓位）
    Pause,
    /// 恢复正常交易
    Resume,
    /// 全部平仓 + 暂停（停机）
    Stop,
    /// 减仓（params.percent 指定比例）
    Reduce,
    /// 加仓（params.percent 指定比例, params.direction 指定方向）
    Add,
}

impl Default for TradeAction {
    fn default() -> Self {
        Self::Hold
    }
}

impl TradeAction {
    /// 是否为一次性指令（执行后自动回 hold）
    pub fn is_oneshot(&self) -> bool {
        matches!(
            self,
            TradeAction::CloseAll
                | TradeAction::CloseLong
                | TradeAction::CloseShort
                | TradeAction::Stop
                | TradeAction::Reduce
                | TradeAction::Add
        )
    }
}

/// trade.json 文件结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeOverride {
    #[serde(default)]
    pub action: TradeAction,
    #[serde(default)]
    pub params: TradeParams,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub updated_at: String,
    /// 引擎执行一次性指令后写入时间戳，表示已执行
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub executed_at: Option<String>,
    /// 过期时间（ISO 8601），过期后指令自动失效回 hold
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    /// 条件触发：价格达到条件时才激活
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub condition: Option<TradeCondition>,
}

/// trade override 的附加参数
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TradeParams {
    /// 减仓/加仓比例（0.0 ~ 1.0）
    #[serde(default)]
    pub percent: Option<f64>,
    /// 加仓方向（"long" / "short"），仅 Add 时使用
    #[serde(default)]
    pub direction: Option<String>,
}

/// 条件触发：价格到达指定水平时才激活指令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TradeCondition {
    /// 当前价 >= price 时触发
    PriceAbove { price: f64 },
    /// 当前价 <= price 时触发
    PriceBelow { price: f64 },
}

impl Default for TradeOverride {
    fn default() -> Self {
        Self {
            action: TradeAction::Hold,
            params: TradeParams::default(),
            note: String::new(),
            updated_at: String::new(),
            executed_at: None,
            expires_at: None,
            condition: None,
        }
    }
}

impl TradeOverride {
    /// 从 trade.json 加载，文件不存在 = hold
    pub fn load(path: &Path) -> Self {
        match std::fs::read_to_string(path) {
            Ok(contents) => match serde_json::from_str::<TradeOverride>(&contents) {
                Ok(t) => t,
                Err(e) => {
                    tracing::warn!("failed to parse trade.json: {e}, treating as hold");
                    Self::default()
                }
            },
            Err(_) => Self::default(),
        }
    }

    /// 保存到 trade.json
    pub fn save(&self, path: &Path) {
        let json = match serde_json::to_string_pretty(self) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("failed to serialize trade.json: {e}");
                return;
            }
        };
        if let Err(e) = std::fs::write(path, json) {
            tracing::warn!("failed to write trade.json: {e}");
        }
    }

    /// 标记已执行并写回文件
    pub fn mark_executed(&mut self, path: &Path) {
        self.executed_at = Some(
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        );
        self.save(path);
    }

    /// 是否需要执行（一次性指令且未执行过）
    pub fn needs_execution(&self) -> bool {
        self.action.is_oneshot() && self.executed_at.is_none()
    }

    /// 是否处于暂停状态（pause 或 stop 后）
    pub fn is_paused(&self) -> bool {
        matches!(self.action, TradeAction::Pause | TradeAction::Stop)
    }

    /// 指令是否有效：检查过期时间和条件触发
    pub fn is_active(&self, current_price: f64) -> bool {
        // 1. 过期检查
        if let Some(ref exp) = self.expires_at {
            if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(exp) {
                if Utc::now() >= expires {
                    return false;
                }
            }
        }
        // 2. 条件检查
        if let Some(ref cond) = self.condition {
            match cond {
                TradeCondition::PriceAbove { price } => {
                    if current_price < *price {
                        return false;
                    }
                }
                TradeCondition::PriceBelow { price } => {
                    if current_price > *price {
                        return false;
                    }
                }
            }
        }
        true
    }

    /// Create a new trade override with action and note (for autopilot)
    pub fn new(action: &str, note: &str) -> Self {
        let trade_action: TradeAction = serde_json::from_value(
            serde_json::Value::String(action.to_string())
        ).unwrap_or_default();

        Self {
            action: trade_action,
            params: TradeParams::default(),
            note: note.to_string(),
            updated_at: chrono::Utc::now()
                .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
            executed_at: None,
            expires_at: None,
            condition: None,
        }
    }
}

/// 决策门：trade override 过滤策略信号
/// 返回 true = 允许信号通过，false = 拦截
pub fn decision_gate_allows_signal(trade_override: &TradeOverride) -> bool {
    match trade_override.action {
        TradeAction::Hold | TradeAction::Resume => true,
        TradeAction::Pause | TradeAction::Stop => false,
        // 一次性指令已执行后恢复为 hold 语义
        _ if trade_override.executed_at.is_some() => true,
        // 一次性指令未执行前拦截策略信号
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn trade_action_default_is_hold() {
        assert_eq!(TradeAction::default(), TradeAction::Hold);
    }

    #[test]
    fn trade_action_oneshot_variants() {
        assert!(TradeAction::CloseAll.is_oneshot());
        assert!(TradeAction::CloseLong.is_oneshot());
        assert!(TradeAction::CloseShort.is_oneshot());
        assert!(TradeAction::Stop.is_oneshot());
        assert!(TradeAction::Reduce.is_oneshot());
        assert!(TradeAction::Add.is_oneshot());
        assert!(!TradeAction::Hold.is_oneshot());
        assert!(!TradeAction::Pause.is_oneshot());
        assert!(!TradeAction::Resume.is_oneshot());
    }

    #[test]
    fn trade_override_default_is_hold() {
        let t = TradeOverride::default();
        assert_eq!(t.action, TradeAction::Hold);
        assert!(t.executed_at.is_none());
        assert!(!t.is_paused());
    }

    #[test]
    fn trade_override_load_missing_file() {
        let t = TradeOverride::load(std::path::Path::new("/nonexistent/trade.json"));
        assert_eq!(t.action, TradeAction::Hold);
    }

    #[test]
    fn trade_override_load_valid_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"action":"close_all","note":"emergency","updated_at":"2026-03-18T12:00:00Z"}}"#).unwrap();

        let t = TradeOverride::load(&path);
        assert_eq!(t.action, TradeAction::CloseAll);
        assert_eq!(t.note, "emergency");
        assert!(t.executed_at.is_none());
        assert!(t.needs_execution());
    }

    #[test]
    fn trade_action_serde_all_variants() {
        let actions = vec![
            (TradeAction::Hold, "\"hold\""),
            (TradeAction::CloseAll, "\"close_all\""),
            (TradeAction::CloseLong, "\"close_long\""),
            (TradeAction::CloseShort, "\"close_short\""),
            (TradeAction::Pause, "\"pause\""),
            (TradeAction::Resume, "\"resume\""),
            (TradeAction::Stop, "\"stop\""),
            (TradeAction::Reduce, "\"reduce\""),
            (TradeAction::Add, "\"add\""),
        ];

        for (action, expected_json) in actions {
            let json = serde_json::to_string(&action).unwrap();
            assert_eq!(json, expected_json, "serialize {:?}", action);
            let parsed: TradeAction = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, action, "deserialize {}", json);
        }
    }

    #[test]
    fn trade_override_empty_json_is_hold() {
        let t: TradeOverride = serde_json::from_str("{}").unwrap();
        assert_eq!(t.action, TradeAction::Hold);
    }

    #[test]
    fn decision_gate_hold_allows() {
        let t = TradeOverride::default();
        assert!(decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_pause_blocks() {
        let t = TradeOverride { action: TradeAction::Pause, ..Default::default() };
        assert!(!decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_oneshot_executed_allows() {
        let t = TradeOverride {
            action: TradeAction::CloseAll,
            executed_at: Some("2026-03-18T12:00:00Z".to_string()),
            ..Default::default()
        };
        assert!(decision_gate_allows_signal(&t));
    }

    #[test]
    fn is_active_no_expiry_no_condition() {
        let t = TradeOverride { action: TradeAction::Pause, ..Default::default() };
        assert!(t.is_active(100.0));
    }

    #[test]
    fn is_active_past_expiry() {
        let t = TradeOverride {
            action: TradeAction::Pause,
            expires_at: Some("2020-01-01T00:00:00Z".to_string()),
            ..Default::default()
        };
        assert!(!t.is_active(100.0));
    }

    #[test]
    fn is_active_price_above_met() {
        let t = TradeOverride {
            action: TradeAction::CloseAll,
            condition: Some(TradeCondition::PriceAbove { price: 50.0 }),
            ..Default::default()
        };
        assert!(t.is_active(60.0));
        assert!(!t.is_active(49.0));
    }

    #[test]
    fn is_active_price_below_met() {
        let t = TradeOverride {
            action: TradeAction::CloseAll,
            condition: Some(TradeCondition::PriceBelow { price: 50.0 }),
            ..Default::default()
        };
        assert!(t.is_active(40.0));
        assert!(!t.is_active(51.0));
    }

    /// 读取 strategies/ 下所有 trade.json 并验证反序列化 + roundtrip
    #[test]
    fn parse_all_trade_json_files() {
        let strategies_dir = crate::paths::strategies_dir();
        let mut count = 0;
        if !strategies_dir.exists() {
            // 如果没有 strategies 目录，用 hardcoded JSON 测试
            let json = r#"{"action":"close_all","params":{"percent":50},"note":"test","updated_at":"2026-03-19T01:24:00Z","executed_at":null}"#;
            let parsed: TradeOverride = serde_json::from_str(json).unwrap();
            assert_eq!(parsed.action, TradeAction::CloseAll);
            let roundtrip = serde_json::to_string(&parsed).unwrap();
            let _: TradeOverride = serde_json::from_str(&roundtrip).unwrap();
            return;
        }

        for entry in std::fs::read_dir(&strategies_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path().join("trade.json");
            if !path.exists() {
                continue;
            }
            let contents = std::fs::read_to_string(&path)
                .unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
            let parsed: TradeOverride = serde_json::from_str(&contents)
                .unwrap_or_else(|e| panic!("parse {}: {e}", path.display()));

            // roundtrip
            let json = serde_json::to_string_pretty(&parsed).unwrap();
            let reparsed: TradeOverride = serde_json::from_str(&json)
                .unwrap_or_else(|e| panic!("roundtrip {}: {e}", path.display()));

            assert_eq!(parsed.action, reparsed.action, "action mismatch in {}", path.display());
            assert_eq!(parsed.note, reparsed.note, "note mismatch in {}", path.display());
            count += 1;
        }

        if count == 0 {
            // fallback: hardcoded JSON
            let json = r#"{"action":"pause","note":"manual pause","updated_at":"2026-03-19T00:00:00Z"}"#;
            let parsed: TradeOverride = serde_json::from_str(json).unwrap();
            assert_eq!(parsed.action, TradeAction::Pause);
        }
        eprintln!("validated {count} trade.json files");
    }
}
