---
name: report
description: 发送项目状态报告邮件到 QQ 邮箱
user-invocable: true
---

# 项目状态报告

## 执行

```bash
source .env && cd scripts

GRID_STATUS=$(uv run python grid.py status 2>&1)
MARKET=$(uv run python market.py watch 2>&1)
PROJECTS=$(uv run python projects.py list 2>&1)
PROCS=$(ps aux | grep "grid.py run" | grep -v grep | wc -l | tr -d ' ')

uv run python -c "
from agentmail import AgentMail
from datetime import datetime
import os, sys

client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])
now = datetime.now().strftime('%Y-%m-%d %H:%M')

body = f'''ClawChat 交易工作站状态报告
{now}

== 项目 ==
{sys.argv[1]}

== 网格策略 ==
{sys.argv[2]}

== 行情 ==
{sys.argv[3]}

== 系统 ==
后台进程: {sys.argv[4]} 个运行中
模式: dry-run 模拟
'''

draft = client.inboxes.drafts.create(
    inbox_id='trader-bot-1@agentmail.to',
    to=['yarnb@qq.com'],
    subject=f'ClawChat 状态报告 {now}',
    text=body,
)
client.inboxes.drafts.send(
    inbox_id='trader-bot-1@agentmail.to',
    draft_id=draft.draft_id,
)
print('邮件已发送')
" "$PROJECTS" "$GRID_STATUS" "$MARKET" "$PROCS"
```
