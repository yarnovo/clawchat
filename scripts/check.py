#!/usr/bin/env python3
"""风控检查 — 止损/仓位/爆仓保护，支持按策略独立风控阈值"""

import sys
from datetime import datetime
from futures_exchange import get_futures_exchange, get_positions, close_all


# ── 全局默认风控阈值（无 risk.json 时使用）──────────────────
DEFAULT_RISK = {
    'max_loss_per_trade': 0.05,        # 单笔最大亏损 5%
    'max_daily_loss': 0.10,            # 总计最大亏损 10%
    'max_profit_per_trade': 0.10,      # 单笔盈利 +10% 自动止盈
    'max_profit_total': 0.20,          # 总利润 +20% 全部止盈
    'max_position_ratio': 0.30,        # 单币种最大仓位占比 30%
    'min_liquidation_distance': 0.10,  # 强平距离最小 10%
    'max_leverage': 20,                # 最大杠杆
    'max_drawdown_warning': 0.20,      # 回撤预警
    'max_drawdown_stop': 0.30,         # 回撤止损
}

# 兼容旧常量引用
MAX_LOSS_PER_POSITION = -DEFAULT_RISK['max_loss_per_trade']
MAX_LOSS_TOTAL = -DEFAULT_RISK['max_daily_loss']
MAX_PROFIT_PER_POSITION = DEFAULT_RISK['max_profit_per_trade']
MAX_PROFIT_TOTAL = DEFAULT_RISK['max_profit_total']
MAX_POSITION_RATIO = DEFAULT_RISK['max_position_ratio']
MIN_LIQUIDATION_DISTANCE = DEFAULT_RISK['min_liquidation_distance']
MAX_LEVERAGE = DEFAULT_RISK['max_leverage']


def _get_risk(symbol, risk_by_symbol):
    """获取某 symbol 的风控配置，未匹配则返回全局默认值。
    symbol 为 ccxt 格式如 'PIPPIN/USDT:USDT'，risk_by_symbol 键为 'PIPPINUSDT'。
    """
    if not risk_by_symbol:
        return DEFAULT_RISK
    raw = symbol.replace('/', '').replace(':USDT', '')
    return risk_by_symbol.get(raw, DEFAULT_RISK)


def check_positions(exchange, risk_by_symbol=None):
    """检查所有持仓的风控状态。
    risk_by_symbol: {normalized_symbol: risk_config_dict}，按策略独立风控。
    """
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

        # 获取该持仓对应的风控配置
        risk = _get_risk(sym, risk_by_symbol)
        max_loss = -risk.get('max_loss_per_trade', DEFAULT_RISK['max_loss_per_trade'])
        max_profit = risk.get('max_profit_per_trade', DEFAULT_RISK['max_profit_per_trade'])
        max_pos_ratio = risk.get('max_position_ratio', DEFAULT_RISK['max_position_ratio'])
        min_liq_dist = risk.get('min_liquidation_distance', DEFAULT_RISK['min_liquidation_distance'])
        max_lev = risk.get('max_leverage', DEFAULT_RISK['max_leverage'])
        dd_warning = risk.get('max_drawdown_warning', DEFAULT_RISK['max_drawdown_warning'])
        dd_stop = risk.get('max_drawdown_stop', DEFAULT_RISK['max_drawdown_stop'])

        strategy_tag = risk.get('name', '')
        tag = f"[{strategy_tag}] " if strategy_tag else ""

        # 检查 1: 单笔亏损
        if total_equity > 0:
            loss_ratio = pnl / total_equity
            if loss_ratio < max_loss:
                alerts.append(f"STOP LOSS: {tag}{sym} {side} 亏损 {loss_ratio:.1%} 超过阈值 {max_loss:.0%}")

        # 检查 1b: 单笔止盈
        if total_equity > 0:
            profit_ratio = pnl / total_equity
            if profit_ratio > max_profit:
                alerts.append(f"TAKE PROFIT: {tag}{sym} {side} 盈利 +{profit_ratio:.1%} 超过阈值 +{max_profit:.0%}")

        # 检查 2: 仓位占比
        if total_equity > 0:
            position_ratio = abs(notional) / total_equity
            if position_ratio > max_pos_ratio:
                warnings.append(f"仓位过大: {tag}{sym} 占比 {position_ratio:.0%} > {max_pos_ratio:.0%}")

        # 检查 3: 爆仓距离
        if liq_price > 0 and mark > 0:
            if side == 'long':
                liq_distance = (mark - liq_price) / mark
            else:
                liq_distance = (liq_price - mark) / mark

            if liq_distance < min_liq_dist:
                alerts.append(f"爆仓风险: {tag}{sym} 距强平 {liq_distance:.1%} < {min_liq_dist:.0%}")

        # 检查 4: 杠杆
        if leverage > max_lev:
            warnings.append(f"杠杆过高: {tag}{sym} {leverage}x > {max_lev}x")

        # 检查 5b: 单持仓回撤预警/止损（相对入场价）
        if entry > 0 and mark > 0:
            if side == 'long':
                dd = (entry - mark) / entry
            else:
                dd = (mark - entry) / entry
            if dd > 0:
                if dd >= dd_stop:
                    alerts.append(f"回撤止损: {tag}{sym} {side} 回撤 {dd:.1%} >= {dd_stop:.0%}")
                elif dd >= dd_warning:
                    warnings.append(f"回撤预警: {tag}{sym} {side} 回撤 {dd:.1%} >= {dd_warning:.0%}")

    # 检查 5: 总亏损（用全局默认值）
    global_max_loss_total = -DEFAULT_RISK['max_daily_loss']
    if total_equity > 0:
        total_loss_ratio = total_unrealized / total_equity
        if total_loss_ratio < global_max_loss_total:
            alerts.append(f"STOP LOSS 总亏损触发: 亏损 {total_loss_ratio:.1%} 超过阈值 {global_max_loss_total:.0%}")

    # 检查 6: 总止盈（用全局默认值）
    global_max_profit_total = DEFAULT_RISK['max_profit_total']
    if total_equity > 0:
        total_profit_ratio = total_unrealized / total_equity
        if total_profit_ratio > global_max_profit_total:
            alerts.append(f"TAKE PROFIT 总止盈触发: 盈利 +{total_profit_ratio:.1%} 超过阈值 +{global_max_profit_total:.0%}")

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
