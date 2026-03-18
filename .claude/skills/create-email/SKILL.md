---
name: create-email
description: 通过 AgentMail API 创建邮箱
user-invocable: true
---

# 创建邮箱

```bash
source .env && cd scripts && uv run python -c "
from agentmail import AgentMail
from agentmail.inboxes.types import CreateInboxRequest
import os

client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])
inbox = client.inboxes.create(request=CreateInboxRequest(username='<USERNAME>'))
print('邮箱:', inbox.inbox_id)
"
```
