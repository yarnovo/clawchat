"""P0 tests for backtest calc_metrics() — sharpe, drawdown, win_rate, profit_factor."""

import math

from clawchat.cmd_backtest import calc_metrics


def _make_result(trades, equity_curve, capital=200.0, final_balance=None):
    """Helper to build a result dict for calc_metrics."""
    if final_balance is None:
        final_balance = equity_curve[-1] if equity_curve else capital
    return {
        "trades": trades,
        "equity_curve": equity_curve,
        "initial_capital": capital,
        "final_balance": final_balance,
    }


def _make_trade(pnl, fees=0.0):
    return {"pnl": pnl, "fees": fees}


# ── zero trades ──


def test_no_trades_returns_zeroes():
    result = _make_result([], [200.0])
    m = calc_metrics(result, "5m")
    assert m["total_trades"] == 0
    assert m["roi"] == 0
    assert m["sharpe"] == 0
    assert m["win_rate"] == 0
    assert m["profit_factor"] == 0
    assert m["max_drawdown"] == 0


# ── ROI ──


def test_roi_positive():
    trades = [_make_trade(20)]
    result = _make_result(trades, [200, 220], capital=200, final_balance=220)
    m = calc_metrics(result, "5m")
    assert abs(m["roi"] - 10.0) < 1e-10  # (20/200)*100


def test_roi_negative():
    trades = [_make_trade(-50)]
    result = _make_result(trades, [200, 150], capital=200, final_balance=150)
    m = calc_metrics(result, "5m")
    assert abs(m["roi"] - (-25.0)) < 1e-10  # (-50/200)*100


# ── win_rate ──


def test_win_rate_all_wins():
    trades = [_make_trade(10), _make_trade(5), _make_trade(3)]
    result = _make_result(trades, [200, 210, 215, 218], final_balance=218)
    m = calc_metrics(result, "5m")
    assert abs(m["win_rate"] - 100.0) < 1e-10


def test_win_rate_all_losses():
    trades = [_make_trade(-10), _make_trade(-5)]
    result = _make_result(trades, [200, 190, 185], final_balance=185)
    m = calc_metrics(result, "5m")
    assert abs(m["win_rate"] - 0.0) < 1e-10


def test_win_rate_mixed():
    trades = [_make_trade(10), _make_trade(-5), _make_trade(8), _make_trade(-3)]
    result = _make_result(trades, [200, 210, 205, 213, 210], final_balance=210)
    m = calc_metrics(result, "5m")
    assert abs(m["win_rate"] - 50.0) < 1e-10  # 2/4


def test_win_rate_zero_pnl_counts_as_loss():
    """A trade with pnl=0 should count as a loss (pnl <= 0)."""
    trades = [_make_trade(0)]
    result = _make_result(trades, [200, 200], final_balance=200)
    m = calc_metrics(result, "5m")
    assert m["win_rate"] == 0.0
    assert m["losses"] == 1


# ── profit_factor ──


def test_profit_factor_basic():
    trades = [_make_trade(20), _make_trade(-10)]
    result = _make_result(trades, [200, 220, 210], final_balance=210)
    m = calc_metrics(result, "5m")
    # avg_win=20, avg_loss=10, pf=2.0
    assert abs(m["profit_factor"] - 2.0) < 1e-10


def test_profit_factor_no_losses():
    trades = [_make_trade(10), _make_trade(20)]
    result = _make_result(trades, [200, 210, 230], final_balance=230)
    m = calc_metrics(result, "5m")
    assert m["profit_factor"] == float("inf")


def test_profit_factor_no_wins():
    trades = [_make_trade(-10), _make_trade(-20)]
    result = _make_result(trades, [200, 190, 170], final_balance=170)
    m = calc_metrics(result, "5m")
    # avg_win=0, avg_loss=15, pf=0/15=0
    assert m["profit_factor"] == 0.0


# ── max_drawdown ──


def test_drawdown_no_drawdown():
    """Monotonically increasing equity has zero drawdown."""
    trades = [_make_trade(10), _make_trade(10)]
    result = _make_result(trades, [200, 210, 220], final_balance=220)
    m = calc_metrics(result, "5m")
    assert m["max_drawdown"] == 0
    assert m["max_drawdown_pct"] == 0


def test_drawdown_simple():
    trades = [_make_trade(20), _make_trade(-30)]
    result = _make_result(trades, [200, 220, 190], final_balance=190)
    m = calc_metrics(result, "5m")
    # peak=220, dd=30, dd_pct=30/220*100
    assert abs(m["max_drawdown"] - 30.0) < 1e-10
    assert abs(m["max_drawdown_pct"] - (30 / 220 * 100)) < 1e-8


def test_drawdown_multiple_peaks():
    """Drawdown should track the worst drawdown across multiple peaks."""
    trades = [_make_trade(50), _make_trade(-20), _make_trade(40), _make_trade(-60)]
    equity = [200, 250, 230, 270, 210]
    result = _make_result(trades, equity, final_balance=210)
    m = calc_metrics(result, "5m")
    # peak1=250, dd1=20; peak2=270, dd2=60
    assert abs(m["max_drawdown"] - 60.0) < 1e-10
    assert abs(m["max_drawdown_pct"] - (60 / 270 * 100)) < 1e-8


# ── sharpe ──


def test_sharpe_zero_with_flat_equity():
    """Flat equity → zero std → sharpe = 0."""
    trades = [_make_trade(0)]
    result = _make_result(trades, [200, 200, 200], final_balance=200)
    m = calc_metrics(result, "5m")
    assert m["sharpe"] == 0


def test_sharpe_positive_with_consistent_growth():
    """Consistent positive returns → positive sharpe."""
    equity = [200, 201, 202, 203, 204, 205]
    trades = [_make_trade(1)] * 5
    result = _make_result(trades, equity, final_balance=205)
    m = calc_metrics(result, "5m")
    assert m["sharpe"] > 0


def test_sharpe_uses_correct_annualization():
    """Verify annualization factor matches timeframe."""
    equity = [200, 202, 204, 206]
    trades = [_make_trade(2)] * 3
    result = _make_result(trades, equity, final_balance=206)

    m_5m = calc_metrics(result, "5m")
    m_1h = calc_metrics(result, "1h")

    # 5m has more periods per year → higher annualized sharpe
    # ppy_5m=105120, ppy_1h=8760, ratio = sqrt(105120/8760) ≈ 3.464
    ratio = math.sqrt(105120 / 8760)
    assert abs(m_5m["sharpe"] / m_1h["sharpe"] - ratio) < 0.01


# ── fees ──


def test_total_fees():
    trades = [_make_trade(10, fees=0.5), _make_trade(-5, fees=0.3)]
    result = _make_result(trades, [200, 210, 205], final_balance=205)
    m = calc_metrics(result, "5m")
    assert abs(m["total_fees"] - 0.8) < 1e-10


# ── expectancy ──


def test_expectancy():
    trades = [_make_trade(10), _make_trade(-5), _make_trade(8)]
    result = _make_result(trades, [200, 210, 205, 213], final_balance=213)
    m = calc_metrics(result, "5m")
    # (10 + -5 + 8) / 3 = 4.333...
    assert abs(m["expectancy"] - 13 / 3) < 1e-10
