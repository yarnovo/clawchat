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

impl Default for TradeOverride {
    fn default() -> Self {
        Self {
            action: TradeAction::Hold,
            params: TradeParams::default(),
            note: String::new(),
            updated_at: String::new(),
            executed_at: None,
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
            Err(_) => Self::default(), // file missing = hold
        }
    }

    /// 保存到 trade.json（一次性指令执行后写回 executed_at）
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
        let t = TradeOverride::load(Path::new("/nonexistent/trade.json"));
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
    fn trade_override_load_pause() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"action":"pause","note":"maintenance"}}"#).unwrap();

        let t = TradeOverride::load(&path);
        assert_eq!(t.action, TradeAction::Pause);
        assert!(t.is_paused());
        assert!(!t.needs_execution()); // pause is not oneshot
    }

    #[test]
    fn trade_override_load_reduce_with_params() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"action":"reduce","params":{{"percent":0.5}}}}"#).unwrap();

        let t = TradeOverride::load(&path);
        assert_eq!(t.action, TradeAction::Reduce);
        assert_eq!(t.params.percent, Some(0.5));
        assert!(t.needs_execution());
    }

    #[test]
    fn trade_override_load_invalid_json_returns_hold() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");
        std::fs::write(&path, "not valid json").unwrap();

        let t = TradeOverride::load(&path);
        assert_eq!(t.action, TradeAction::Hold);
    }

    #[test]
    fn trade_override_save_and_reload() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");

        let t = TradeOverride {
            action: TradeAction::Stop,
            params: TradeParams::default(),
            note: "stop all".to_string(),
            updated_at: "2026-03-18T12:00:00Z".to_string(),
            executed_at: None,
        };
        t.save(&path);

        let loaded = TradeOverride::load(&path);
        assert_eq!(loaded.action, TradeAction::Stop);
        assert_eq!(loaded.note, "stop all");
    }

    #[test]
    fn trade_override_mark_executed() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");

        let mut t = TradeOverride {
            action: TradeAction::CloseAll,
            params: TradeParams::default(),
            note: "emergency close".to_string(),
            updated_at: "2026-03-18T12:00:00Z".to_string(),
            executed_at: None,
        };
        assert!(t.needs_execution());

        t.mark_executed(&path);
        assert!(t.executed_at.is_some());
        assert!(!t.needs_execution());

        // Verify it was written to disk
        let loaded = TradeOverride::load(&path);
        assert!(loaded.executed_at.is_some());
    }

    #[test]
    fn trade_override_needs_execution_after_executed() {
        let t = TradeOverride {
            action: TradeAction::CloseAll,
            executed_at: Some("2026-03-18T12:00:00Z".to_string()),
            ..Default::default()
        };
        assert!(!t.needs_execution());
    }

    #[test]
    fn trade_override_is_paused() {
        assert!(TradeOverride { action: TradeAction::Pause, ..Default::default() }.is_paused());
        assert!(TradeOverride { action: TradeAction::Stop, ..Default::default() }.is_paused());
        assert!(!TradeOverride { action: TradeAction::Hold, ..Default::default() }.is_paused());
        assert!(!TradeOverride { action: TradeAction::Resume, ..Default::default() }.is_paused());
    }

    // ── decision_gate_allows_signal tests ──

    #[test]
    fn decision_gate_hold_allows() {
        let t = TradeOverride::default();
        assert!(decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_resume_allows() {
        let t = TradeOverride { action: TradeAction::Resume, ..Default::default() };
        assert!(decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_pause_blocks() {
        let t = TradeOverride { action: TradeAction::Pause, ..Default::default() };
        assert!(!decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_stop_blocks() {
        let t = TradeOverride { action: TradeAction::Stop, ..Default::default() };
        assert!(!decision_gate_allows_signal(&t));
    }

    #[test]
    fn decision_gate_oneshot_pending_blocks() {
        let t = TradeOverride {
            action: TradeAction::CloseAll,
            executed_at: None,
            ..Default::default()
        };
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

    // ── serde roundtrip tests ──

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
        assert!(t.note.is_empty());
        assert!(t.executed_at.is_none());
    }

    #[test]
    fn trade_params_percent_and_direction() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("trade.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(
            f,
            r#"{{"action":"add","params":{{"percent":0.3,"direction":"long"}}}}"#
        )
        .unwrap();

        let t = TradeOverride::load(&path);
        assert_eq!(t.action, TradeAction::Add);
        assert_eq!(t.params.percent, Some(0.3));
        assert_eq!(t.params.direction.as_deref(), Some("long"));
        assert!(t.needs_execution());
    }

    #[test]
    fn trade_params_direction_none_by_default() {
        let t: TradeOverride = serde_json::from_str(
            r#"{"action":"add","params":{"percent":0.5}}"#
        ).unwrap();
        assert_eq!(t.params.percent, Some(0.5));
        assert!(t.params.direction.is_none());
    }
}
