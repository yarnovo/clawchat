use crate::Ctx;
use reqwest::Client;
use serde_json::json;

const DEFAULT_INBOX: &str = "trader-bot-1@agentmail.to";
const DEFAULT_TO: &str = "yarnb@qq.com";
const AGENTMAIL_API: &str = "https://api.agentmail.to/v0/inboxes";

pub async fn notify(
    _ctx: &Ctx,
    subject: &str,
    body: &str,
    body_file: Option<&str>,
) -> Result<(), Box<dyn std::error::Error>> {
    let api_key = std::env::var("AGENTMAIL_API_KEY")
        .map_err(|_| "AGENTMAIL_API_KEY not set in .env")?;

    let inbox = std::env::var("AGENTMAIL_INBOX").unwrap_or_else(|_| DEFAULT_INBOX.to_string());
    let to = std::env::var("NOTIFY_EMAIL").unwrap_or_else(|_| DEFAULT_TO.to_string());

    // 如果指定了 body_file，从文件读取内容
    let text = if let Some(file_path) = body_file {
        std::fs::read_to_string(file_path)
            .map_err(|e| format!("读取 {file_path} 失败: {e}"))?
    } else {
        body.to_string()
    };

    let url = format!("{AGENTMAIL_API}/{inbox}/messages/send");

    let payload = json!({
        "to": to,
        "subject": subject,
        "text": text,
    });

    let client = Client::new();
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await?;

    if resp.status().is_success() {
        let result: serde_json::Value = resp.json().await?;
        println!("邮件已发送 → {to}");
        println!("  subject: {subject}");
        println!("  message_id: {}", result["message_id"].as_str().unwrap_or("?"));
    } else {
        let status = resp.status();
        let body = resp.text().await?;
        eprintln!("发送失败 ({}): {}", status, body);
    }

    Ok(())
}
