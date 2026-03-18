#!/usr/bin/env python3
"""风控检查 — 止损/仓位/爆仓保护"""

import sys
from datetime import datetime
from futures_exchange import get_futures_exchange, get_positions, close_all


# ── 风控阈值 ──────────────────────────────────────────────
MAX_LOSS_PER_POSITION = -0.05   # 单笔最大亏损 -5%
MAX_LOSS_TOTAL = -0.10          # 总计最大亏损 -10%
MAX_PROFIT_PER_POSITION = 0.10  # 单笔盈利 +10% 自动止盈
MAX_PROFIT_TOTAL = 0.20         # 总利润 +20% 全部止盈
MAX_POSITION_RATIO = 0.30       # 单币种最大仓位占比 30%
MIN_LIQUIDATION_DISTANCE = 0.10 # 强平距离最小 10%
MAX_LEVERAGE = 20               # 最大杠杆


def check_positions(exchange):
    """检查所有持仓的风控状态"""
    positions = get_positions(exchange)
    balance = exchange.fetch_balance()
    total_equity = float(balance.get('USDT', {}).get('total', 0) or 0)

    alerts = []
    warnings = []

    if not positions:
        return {'status': 'OK', 'alerts': [], 'warnings': [], 'positions': 0, 'equity': total_equity}

    total_unrealized = 0

    for p in positions:
        sym = p.get('symbol', '')
        side = p.get('side', '')
        contracts = float(p.get('contracts', 0) or 0)
        entry = float(p.get('entryPrice', 0) or 0)
        mark = float(p.get('markPrice', 0) or 0)
        pnl = float(p.get('unrealizedPnl', 0) or 0)
        notional = float(p.get('notional', 0) or abs(contracts * mark))
        leverage = float(p.get('leverage', 1) or 1)
        liq_price = float(p.get('liquidationPrice', 0) or 0)

        total_unrealized += pnl

        # 检查 1: 单笔亏损
        if total_equity > 0:
            loss_ratio = pnl / total_equity
            if loss_ratio < MAX_LOSS_PER_POSITION:
                alerts.append(f"STOP LOSS: {sym} {side} 亏损 {loss_ratio:.1%} 超过阈值 {MAX_LOSS_PER_POSITION:.0%}")

        # 检查 1b: 单笔止盈
        if total_equity > 0:
            profit_ratio = pnl / total_equity
            if profit_ratio > MAX_PROFIT_PER_POSITION:
                alerts.append(f"TAKE PROFIT: {sym} {side} 盈利 +{profit_ratio:.1%} 超过阈值 +{MAX_PROFIT_PER_POSITION:.0%}")

        # 检查 2: 仓位占比
        if total_equity > 0:
            position_ratio = abs(notional) / total_equity
            if position_ratio > MAX_POSITION_RATIO:
                warnings.append(f"仓位过大: {sym} 占比 {position_ratio:.0%} > {MAX_POSITION_RATIO:.0%}")

        # 检查 3: 爆仓距离
        if liq_price > 0 and mark > 0:
            if side == 'long':
                liq_distance = (mark - liq_price) / mark
            else:
                liq_distance = (liq_price - mark) / mark

            if liq_distance < MIN_LIQUIDATION_DISTANCE:
                alerts.append(f"爆仓风险: {sym} 距强平 {liq_distance:.1%} < {MIN_LIQUIDATION_DISTANCE:.0%}")

        # 检查 4: 杠杆
        if leverage > MAX_LEVERAGE:
            warnings.append(f"杠杆过高: {sym} {leverage}x > {MAX_LEVERAGE}x")

    # 检查 5: 总亏损
    if total_equity > 0:
        total_loss_ratio = total_unrealized / total_equity
        if total_loss_ratio < MAX_LOSS_TOTAL:
            alerts.append(f"STOP LOSS 总亏损触发: 亏损 {total_loss_ratio:.1%} 超过阈值 {MAX_LOSS_TOTAL:.0%}")

    # 检查 6: 总止盈
    if total_equity > 0:
        total_profit_ratio = total_unrealized / total_equity
        if total_profit_ratio > MAX_PROFIT_TOTAL:
            alerts.append(f"TAKE PROFIT 总止盈触发: 盈利 +{total_profit_ratio:.1%} 超过阈值 +{MAX_PROFIT_TOTAL:.0%}")

    status = 'ALERT' if alerts else ('WARNING' if warnings else 'OK')
    return {
        'status': status,
        'alerts': alerts,
        'warnings': warnings,
        'positions': len(positions),
        'equity': total_equity,
        'unrealized_pnl': total_unrealized,
    }


def show_check(exchange, auto_stop=False):
    """显示风控检查结果"""
    result = check_positions(exchange)

    print(f"\n{'='*60}")
    print(f"  风控检查  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    status_icon = {'OK': 'PASS', 'WARNING': 'WARN', 'ALERT': 'FAIL'}
    print(f"\n  状态: [{status_icon[result['status']]}]")
    print(f"  持仓: {result['positions']} 个")
    print(f"  权益: ${result['equity']:.2f}")

    if 'unrealized_pnl' in result:
        sign = '+' if result['unrealized_pnl'] >= 0 else ''
        print(f"  未实现盈亏: {sign}${result['unrealized_pnl']:.4f}")

    if result['alerts']:
        print(f"\n  --- ALERTS ---")
        for a in result['alerts']:
            print(f"  [!] {a}")

    if result['warnings']:
        print(f"\n  --- WARNINGS ---")
        for w in result['warnings']:
            print(f"  [?] {w}")

    if not result['alerts'] and not result['warnings']:
        print(f"\n  所有检查通过")

    # 自动止损/止盈
    if auto_stop and result['alerts']:
        print(f"\n  --- 自动平仓执行 ---")
        positions = get_positions(exchange)
        for p in positions:
            sym = p['symbol']
            print(f"  平仓 {sym}...")
            try:
                close_all(exchange, sym)
                print(f"  {sym} 已平仓")
            except Exception as e:
                print(f"  {sym} 平仓失败: {e}")

    print()
    return result


def main():
    exchange = get_futures_exchange()
    auto_stop = '--auto-stop' in sys.argv
    show_check(exchange, auto_stop)


if __name__ == '__main__':
    main()
