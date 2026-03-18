---
name: create-email
description: 通过 AgentMail API 创建邮箱
user-invocable: true
---

# 创建邮箱

通过 AgentMail API 创建一个新的邮箱地址。

## 用法

用户说"创建邮箱"、"新建邮箱"、"create email"时触发。

## 参数

- `username`（可选）：邮箱用户名，不指定则随机生成

## 执行

```bash
source /Users/yarnb/agent-projects/clawchat/.env && python3 -c "
from agentmail import AgentMail
from agentmail.inboxes.types import CreateInboxRequest
import os, sys

client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])

username = sys.argv[1] if len(sys.argv) > 1 else None
inbox = client.inboxes.create(request=CreateInboxRequest(username=username))
print('邮箱地址:', inbox.inbox_id)
print('创建时间:', inbox.created_at)
" $ARGS
```

## 查看已有邮箱

```bash
source /Users/yarnb/agent-projects/clawchat/.env && python3 -c "
from agentmail import AgentMail
import os

client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])
result = client.inboxes.list()
for ib in result.inboxes:
    print(ib.inbox_id)
"
```
