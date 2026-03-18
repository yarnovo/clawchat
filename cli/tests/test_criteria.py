"""P0 tests for criteria.passes()"""

from clawchat.criteria import CRITERIA, passes


def _good_metrics():
    """All metrics above thresholds."""
    return {
        "roi": 20.0,
        "sharpe": 6.0,
        "max_drawdown_pct": 15.0,
        "total_trades": 30,
        "win_rate": 50.0,
        "profit_factor": 2.0,
    }


# ── passes with good data ──


def test_passes_all_good():
    assert passes(_good_metrics(), days=14) is True


def test_passes_well_above_thresholds():
    m = _good_metrics()
    m["roi"] = 100.0
    m["sharpe"] = 20.0
    assert passes(m, days=30) is True


# ── days boundary ──


def test_fails_days_below_min():
    assert passes(_good_metrics(), days=13) is False


def test_passes_days_exact_min():
    assert passes(_good_metrics(), days=14) is True


# ── roi boundary (> 15, strict) ──


def test_fails_roi_equal_threshold():
    m = _good_metrics()
    m["roi"] = 15.0  # > 15 required, not >=
    assert passes(m, days=14) is False


def test_fails_roi_below_threshold():
    m = _good_metrics()
    m["roi"] = 14.9
    assert passes(m, days=14) is False


def test_passes_roi_just_above():
    m = _good_metrics()
    m["roi"] = 15.01
    assert passes(m, days=14) is True


# ── sharpe boundary (> 5, strict) ──


def test_fails_sharpe_equal_threshold():
    m = _good_metrics()
    m["sharpe"] = 5.0
    assert passes(m, days=14) is False


def test_fails_sharpe_below():
    m = _good_metrics()
    m["sharpe"] = 4.9
    assert passes(m, days=14) is False


# ── max_drawdown boundary (< 20, strict) ──


def test_fails_drawdown_equal_threshold():
    m = _good_metrics()
    m["max_drawdown_pct"] = 20.0
    assert passes(m, days=14) is False


def test_fails_drawdown_above():
    m = _good_metrics()
    m["max_drawdown_pct"] = 25.0
    assert passes(m, days=14) is False


def test_passes_drawdown_just_below():
    m = _good_metrics()
    m["max_drawdown_pct"] = 19.99
    assert passes(m, days=14) is True


# ── total_trades boundary (>= 20) ──


def test_fails_trades_below_min():
    m = _good_metrics()
    m["total_trades"] = 19
    assert passes(m, days=14) is False


def test_passes_trades_exact_min():
    m = _good_metrics()
    m["total_trades"] = 20
    assert passes(m, days=14) is True


# ── win_rate boundary (>= 45) ──


def test_fails_win_rate_below():
    m = _good_metrics()
    m["win_rate"] = 44.9
    assert passes(m, days=14) is False


def test_passes_win_rate_exact():
    m = _good_metrics()
    m["win_rate"] = 45.0
    assert passes(m, days=14) is True


# ── profit_factor boundary (>= 1.8) ──


def test_fails_profit_factor_below():
    m = _good_metrics()
    m["profit_factor"] = 1.79
    assert passes(m, days=14) is False


def test_passes_profit_factor_exact():
    m = _good_metrics()
    m["profit_factor"] = 1.8
    assert passes(m, days=14) is True


# ── multiple failures ──


def test_fails_multiple_criteria():
    m = _good_metrics()
    m["roi"] = 5.0
    m["sharpe"] = 1.0
    m["max_drawdown_pct"] = 50.0
    assert passes(m, days=5) is False


# ── CRITERIA dict sanity ──


def test_criteria_keys_exist():
    expected = {
        "min_days", "min_return_pct", "min_sharpe",
        "max_drawdown_pct", "min_trades", "min_win_rate",
        "min_profit_factor",
    }
    assert set(CRITERIA.keys()) == expected
