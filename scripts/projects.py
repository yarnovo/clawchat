#!/usr/bin/env python3
"""项目管理器 — 每个 project = 子账户 + 资金 + 策略"""

import os
import json
import ccxt
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "projects"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_exchange():
    return ccxt.binance({
        'apiKey': os.environ.get('BINANCE_API_KEY'),
        'secret': os.environ.get('BINANCE_API_SECRET'),
        'options': {'defaultType': 'spot', 'fetchMarkets': ['spot']},
    })


def project_file(name):
    return DATA_DIR / f"{name}.json"


def load_project(name):
    f = project_file(name)
    return json.loads(f.read_text()) if f.exists() else None


def save_project(name, data):
    project_file(name).write_text(json.dumps(data, indent=2, default=str))


def create_project(name, fund=0):
    if load_project(name):
        print(f"  项目 {name} 已存在")
        return
    exchange = get_exchange()
    result = exchange.sapi_post_sub_account_virtualsubaccount({'subAccountString': name})
    email = result['email']
    print(f"  子账户: {email}")

    project = {
        'name': name, 'email': email, 'fund': 0,
        'strategy': None, 'status': 'active',
        'mode': 'testnet',  # testnet → live
        'promote_threshold': 10.0,  # 利润达标后可 promote
        'created_at': datetime.now().isoformat(),
    }

    if fund > 0:
        try:
            exchange.sapi_post_sub_account_universaltransfer({
                'fromAccountType': 'SPOT',
                'toAccountType': 'SPOT',
                'toEmail': email,
                'asset': 'USDT',
                'amount': fund,
            })
            project['fund'] = fund
            print(f"  已划转 {fund} USDT")
        except Exception as e:
            print(f"  划转失败: {e}")

    save_project(name, project)
    print(f"  项目 {name} 创建完成")


def fund_project(name, amount):
    project = load_project(name)
    if not project:
        print(f"  项目 {name} 不存在")
        return
    exchange = get_exchange()
    try:
        exchange.sapi_post_sub_account_universaltransfer({
            'fromAccountType': 'SPOT',
            'toAccountType': 'SPOT',
            'toEmail': project['email'],
            'asset': 'USDT',
            'amount': amount,
        })
        project['fund'] += amount
        save_project(name, project)
        print(f"  已追加 {amount} USDT，总计: {project['fund']} USDT")
    except Exception as e:
        print(f"  划转失败: {e}")


def show_info(name):
    project = load_project(name)
    if not project:
        print(f"  项目 {name} 不存在")
        return
    exchange = get_exchange()
    try:
        balances = exchange.sapi_get_sub_account_assets({'email': project['email']})
        assets = balances.get('balances', [])
    except Exception:
        assets = []

    mode = project.get('mode', 'testnet')
    threshold = project.get('promote_threshold', 10.0)
    print(f"\n  项目: {project['name']}  子账户: {project['email']}")
    print(f"  资金: {project['fund']}U  策略: {project.get('strategy') or '-'}  状态: {project['status']}")
    print(f"  模式: {mode}  promote 阈值: ${threshold}")
    if assets:
        for a in assets:
            free = float(a.get('free', 0))
            if free > 0:
                print(f"  {a['asset']:<8} {free}")
    print()


def promote_project(name):
    """测试网验证通过，切换到实盘"""
    project = load_project(name)
    if not project:
        print(f"  项目 {name} 不存在")
        return
    if project.get('mode') == 'live':
        print(f"  项目 {name} 已经是实盘模式")
        return
    project['mode'] = 'live'
    project['promoted_at'] = datetime.now().isoformat()
    save_project(name, project)
    print(f"  项目 {name} 已 promote 到实盘！")
    print(f"  注意：需要重启策略进程使其连接主网")


def close_project(name):
    project = load_project(name)
    if not project:
        print(f"  项目 {name} 不存在")
        return
    project['status'] = 'closed'
    save_project(name, project)
    print(f"  项目 {name} 已关闭")


def show_list():
    projects = []
    for f in DATA_DIR.glob("*.json"):
        projects.append(json.loads(f.read_text()))
    if not projects:
        print("  暂无项目")
        return
    print(f"\n  {'项目':<15} {'资金':>8} {'策略':<10} {'模式':<10} {'状态':<8}")
    print(f"  {'─'*55}")
    for p in projects:
        mode = p.get('mode', 'testnet')
        print(f"  {p['name']:<15} {p['fund']:>6}U  {p.get('strategy') or '-':<10} {mode:<10} {p['status']:<8}")
    print()


def main():
    import argparse
    parser = argparse.ArgumentParser(description='项目管理')
    sub = parser.add_subparsers(dest='cmd')

    p = sub.add_parser('create')
    p.add_argument('name')
    p.add_argument('--fund', type=float, default=0)

    sub.add_parser('list')

    p = sub.add_parser('info')
    p.add_argument('name')

    p = sub.add_parser('fund')
    p.add_argument('name')
    p.add_argument('--amount', type=float, required=True)

    p = sub.add_parser('promote')
    p.add_argument('name')

    p = sub.add_parser('close')
    p.add_argument('name')

    args = parser.parse_args()
    if args.cmd == 'create':
        create_project(args.name, args.fund)
    elif args.cmd == 'list':
        show_list()
    elif args.cmd == 'info':
        show_info(args.name)
    elif args.cmd == 'fund':
        fund_project(args.name, args.amount)
    elif args.cmd == 'promote':
        promote_project(args.name)
    elif args.cmd == 'close':
        close_project(args.name)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
