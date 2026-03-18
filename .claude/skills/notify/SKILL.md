---
name: notify
description: 发送邮件通知到用户 QQ 邮箱
user-invocable: true
---

# 邮件通知

从 `trader-bot-1@agentmail.to` 发送邮件到用户 QQ 邮箱 `yarnb@qq.com`。

## 用法

用户说"通知我"、"发邮件"、"notify"时触发。

## 执行

```bash
source .env && uv run python -c "
from agentmail import AgentMail
import os

client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])

draft = client.inboxes.drafts.create(
    inbox_id='trader-bot-1@agentmail.to',
    to=['yarnb@qq.com'],
    subject='<SUBJECT>',
    text='<BODY>',
)
client.inboxes.drafts.send(
    inbox_id='trader-bot-1@agentmail.to',
    draft_id=draft.draft_id,
)
print('已发送')
"
```

## 说明

- 发件人: `trader-bot-1@agentmail.to`
- 收件人: `yarnb@qq.com`
- 根据场景填写 subject 和 body（如行情预警、策略触发、任务完成等）
