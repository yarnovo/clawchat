#!/usr/bin/env python3
"""发送邮件通知到 QQ 邮箱，同时存档到本地"""

import os
import sys
import time
from datetime import datetime
from pathlib import Path
from agentmail import AgentMail

ROOT = Path(__file__).parent.parent
REPORTS_DIR = ROOT / "reports"


def save_local(subject, body, report_type="daily"):
    """按类型和日期存档到 reports/"""
    type_dir = REPORTS_DIR / report_type
    type_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now()
    filename = now.strftime('%Y-%m-%d_%H-%M-%S') + '.md'
    content = f"# {subject}\n\n{body}\n"
    (type_dir / filename).write_text(content)


def send(subject, body):
    # 存本地
    save_local(subject, body)

    # 发邮件
    client = AgentMail(api_key=os.environ['AGENTMAIL_API_KEY'])
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
