#!/usr/bin/env python3
"""发送邮件通知到 QQ 邮箱"""

import os
import sys
from datetime import datetime
from agentmail import AgentMail


def send(subject, body):
    client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])
    import time
    draft = client.inboxes.drafts.create(
        inbox_id='trader-bot-1@agentmail.to',
        to=['yarnb@qq.com'],
        subject=subject,
        text=body,
    )
    time.sleep(1)
    result = client.inboxes.drafts.send(
        inbox_id='trader-bot-1@agentmail.to',
        draft_id=draft.draft_id,
    )
    print(f'已发送: {result.message_id}')


def main():
    if len(sys.argv) < 2:
        print("用法: notify.py <subject> [body_parts...]")
        return

    subject = sys.argv[1]
    now = datetime.now().strftime('%Y-%m-%d %H:%M')

    if len(sys.argv) > 2:
        body = '\n\n'.join(sys.argv[2:])
    else:
        body = subject

    send(f'{subject} {now}', body)


if __name__ == '__main__':
    main()
