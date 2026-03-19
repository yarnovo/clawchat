//! 配置文件写入 — 将决策写入 trade.json / signal.json / risk.json

use crate::types::TradeOverride;
use std::path::Path;

/// 写 trade.json（pause / resume / hold）
pub fn write_trade_json(strategy_dir: &Path, action: &str, note: &str) -> Result<(), String> {
    let path = strategy_dir.join("trade.json");
    let trade = TradeOverride::new(action, note);
    let json = serde_json::to_string_pretty(&trade)
        .map_err(|e| format!("serialize trade.json: {e}"))?;
    std::fs::write(&path, &json)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(action, note, path = %path.display(), "wrote trade.json");
    Ok(())
}

/// 更新 signal.json 的 position_size 字段
pub fn update_position_size(strategy_dir: &Path, new_value: f64) -> Result<(), String> {
    let path = strategy_dir.join("signal.json");
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    let mut doc: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("parse {}: {e}", path.display()))?;

    doc["position_size"] = serde_json::json!(new_value);

    let json = serde_json::to_string_pretty(&doc)
        .map_err(|e| format!("serialize: {e}"))?;
    std::fs::write(&path, &json)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(new_value, path = %path.display(), "updated position_size");
    Ok(())
}

/// 更新 signal.json 的 status 字段
pub fn update_strategy_status(strategy_dir: &Path, new_status: &str) -> Result<(), String> {
    let path = strategy_dir.join("signal.json");
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    let mut doc: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("parse {}: {e}", path.display()))?;

    doc["status"] = serde_json::json!(new_status);

    let json = serde_json::to_string_pretty(&doc)
        .map_err(|e| format!("serialize: {e}"))?;
    std::fs::write(&path, &json)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(new_status, path = %path.display(), "updated strategy status");
    Ok(())
}

/// 更新 risk.json 的 trailing_stop 字段
pub fn update_trailing_stop(strategy_dir: &Path, new_value: f64) -> Result<(), String> {
    let path = strategy_dir.join("risk.json");
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    let mut doc: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("parse {}: {e}", path.display()))?;

    doc["trailing_stop"] = serde_json::json!(new_value);

    let json = serde_json::to_string_pretty(&doc)
        .map_err(|e| format!("serialize: {e}"))?;
    std::fs::write(&path, &json)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(new_value, path = %path.display(), "updated trailing_stop");
    Ok(())
}

/// 写 requirements/pending/ 文件（建议切 live）
pub fn write_requirement_pending(strategy_name: &str, reason: &str) -> Result<(), String> {
    let dir = clawchat_shared::paths::project_root()
        .join("requirements")
        .join("pending");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("create dir {}: {e}", dir.display()))?;

    let date = chrono::Utc::now().format("%Y-%m-%d");
    let filename = format!("{date}-promote-{strategy_name}.md");
    let path = dir.join(&filename);

    // 避免重复写入
    if path.exists() {
        tracing::debug!(path = %path.display(), "requirement already exists, skipping");
        return Ok(());
    }

    let content = format!(
        "# 建议 {strategy_name} 切换为 live\n\n\
         **来源**: autopilot 生命周期评估\n\n\
         ## 原因\n\n\
         {reason}\n\n\
         ## 建议操作\n\n\
         将 signal.json 的 mode 从 dry-run 改为 live\n"
    );

    std::fs::write(&path, &content)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(path = %path.display(), "wrote lifecycle requirement");
    Ok(())
}

/// 写 issues/pending/ 文件（建议下线）
pub fn write_issue_pending(strategy_name: &str, reason: &str) -> Result<(), String> {
    let dir = clawchat_shared::paths::project_root()
        .join("issues")
        .join("pending");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("create dir {}: {e}", dir.display()))?;

    let date = chrono::Utc::now().format("%Y-%m-%d");
    let filename = format!("{date}-demote-{strategy_name}.md");
    let path = dir.join(&filename);

    // 避免重复写入
    if path.exists() {
        tracing::debug!(path = %path.display(), "issue already exists, skipping");
        return Ok(());
    }

    let content = format!(
        "# 建议下线 {strategy_name}\n\n\
         **来源**: autopilot 生命周期评估\n\n\
         ## 原因\n\n\
         {reason}\n\n\
         ## 建议操作\n\n\
         将 signal.json 的 status 改为 suspended\n"
    );

    std::fs::write(&path, &content)
        .map_err(|e| format!("write {}: {e}", path.display()))?;
    tracing::info!(path = %path.display(), "wrote lifecycle issue");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn write_trade_json_creates_file() {
        let dir = tempfile::tempdir().unwrap();
        write_trade_json(dir.path(), "pause", "test pause").unwrap();
        let contents = std::fs::read_to_string(dir.path().join("trade.json")).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["action"], "pause");
        assert_eq!(parsed["note"], "test pause");
    }

    #[test]
    fn update_position_size_preserves_other_fields() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("signal.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"name":"test","position_size":0.3,"leverage":3}}"#).unwrap();

        update_position_size(dir.path(), 0.42).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["name"], "test");
        assert_eq!(parsed["leverage"], 3);
        assert!((parsed["position_size"].as_f64().unwrap() - 0.42).abs() < f64::EPSILON);
    }

    #[test]
    fn update_strategy_status_works() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("signal.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"name":"test","status":"approved"}}"#).unwrap();

        update_strategy_status(dir.path(), "suspended").unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["status"], "suspended");
    }

    #[test]
    fn update_trailing_stop_works() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("risk.json");
        let mut f = std::fs::File::create(&path).unwrap();
        write!(f, r#"{{"name":"test","trailing_stop":0.02}}"#).unwrap();

        update_trailing_stop(dir.path(), 0.015).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert!((parsed["trailing_stop"].as_f64().unwrap() - 0.015).abs() < f64::EPSILON);
    }
}
