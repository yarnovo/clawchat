"""ClawChat CLI 入口 — 统一子命令调度"""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="clawchat",
        description="ClawChat 量化交易工作站",
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    # 行情
    sub.add_parser("watch", help="行情监控")
    sub.add_parser("account", help="账户余额")
    sub.add_parser("scan", help="扫描高波动币种")

    # 回测
    sub.add_parser("backtest", help="回测")
    sub.add_parser("batch-backtest", help="批量回测")
    sub.add_parser("grid-search", help="参数网格搜索")

    # 交易
    sub.add_parser("transfer", help="现货→合约划转")
    sub.add_parser("pnl", help="P&L 查询")
    sub.add_parser("check", help="风控检查")
    sub.add_parser("watcher", help="策略监听器")
    sub.add_parser("status", help="全局状态面板")
    sub.add_parser("strategy-pnl", help="按策略 P&L")
    sub.add_parser("compare", help="实盘 vs 回测对比")

    # 评估
    sub.add_parser("review", help="策略实盘评估（对比回测）")

    # 分析
    sub.add_parser("correlation", help="策略相关性分析")

    # 报告
    sub.add_parser("report", help="报告生成（daily/weekly）")

    # 紧急操作
    sub.add_parser("emergency-close", help="紧急全平（所有或指定策略）")

    # 交易所直接操作
    sub.add_parser("exchange", help="交易所操作（开仓/平仓/止损等）")

    # 解析第一个参数确定子命令，剩余参数传递给子命令
    args, remaining = parser.parse_known_args()

    if args.command is None:
        parser.print_help()
        return

    # 把子命令剩余参数设为 sys.argv，让子命令的 argparse 能正确解析
    sys.argv = [args.command] + remaining

    if args.command == "watch":
        from clawchat.cmd_market import main as cmd
        sys.argv = ["market", "watch"] + remaining
        cmd()
    elif args.command == "account":
        from clawchat.cmd_market import main as cmd
        sys.argv = ["market", "account"] + remaining
        cmd()
    elif args.command == "scan":
        from clawchat.cmd_market import main as cmd
        sys.argv = ["market", "scan"] + remaining
        cmd()
    elif args.command == "backtest":
        from clawchat.cmd_backtest import main as cmd
        cmd()
    elif args.command == "batch-backtest":
        from clawchat.cmd_batch_backtest import main as cmd
        cmd()
    elif args.command == "grid-search":
        from clawchat.cmd_grid_search import main as cmd
        cmd()
    elif args.command == "transfer":
        from clawchat.exchange import main as cmd
        sys.argv = ["exchange", "transfer"] + remaining
        cmd()
    elif args.command == "pnl":
        from clawchat.cmd_pnl import main as cmd
        cmd()
    elif args.command == "check":
        from clawchat.cmd_check import main as cmd
        cmd()
    elif args.command == "watcher":
        from clawchat.cmd_watcher import main as cmd
        cmd()
    elif args.command == "status":
        from clawchat.cmd_status import main as cmd
        cmd()
    elif args.command == "strategy-pnl":
        from clawchat.cmd_strategy_pnl import main as cmd
        cmd()
    elif args.command == "compare":
        from clawchat.cmd_compare import main as cmd
        cmd()
    elif args.command == "review":
        from clawchat.cmd_review import main as cmd
        cmd()
    elif args.command == "correlation":
        from clawchat.cmd_correlation import main as cmd
        cmd()
    elif args.command == "report":
        from clawchat.cmd_report import main as cmd
        cmd()
    elif args.command == "emergency-close":
        from clawchat.cmd_emergency import main as cmd
        cmd()
    elif args.command == "exchange":
        from clawchat.exchange import main as cmd
        cmd()
    else:
        parser.print_help()
