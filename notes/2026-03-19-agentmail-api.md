# AgentMail API 使用经验

## 发送邮件

```bash
POST https://api.agentmail.to/v0/inboxes/{inbox_id}/messages/send
Authorization: Bearer $AGENTMAIL_API_KEY
Content-Type: application/json

{
  "to": "yarnb@qq.com",
  "subject": "主题",
  "text": "纯文本内容",
  "html": "<p>HTML 内容</p>"
}
```

- inbox_id: trader-bot-1@agentmail.to
- to 字段直接传字符串（不需要 object 格式）
- 返回: `{"message_id": "...", "thread_id": "..."}`
- 2026-03-19 测试发送到 yarnb@qq.com 成功
