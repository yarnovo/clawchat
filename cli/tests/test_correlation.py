"""Tests for cmd_correlation — Pearson correlation, daily PnL, matrix building."""

import math

from clawchat.cmd_correlation import (
    pearson,
    trades_to_daily_pnl,
    build_correlation_matrix,
    format_matrix,
    _extract_date,
)


def _trade(strategy, symbol, side, price, qty, ts="2026-03-19T10:00:00Z"):
    return {
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "side": side,
        "price": str(price),
        "qty": qty,
    }


# ── pearson ──


def test_pearson_perfect_positive():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [2.0, 4.0, 6.0, 8.0, 10.0]
    r = pearson(x, y)
    assert r is not None
    assert abs(r - 1.0) < 1e-10


def test_pearson_perfect_negative():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [10.0, 8.0, 6.0, 4.0, 2.0]
    r = pearson(x, y)
    assert r is not None
    assert abs(r - (-1.0)) < 1e-10


def test_pearson_no_correlation():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [3.0, 3.0, 3.0, 3.0, 3.0]  # zero std
    r = pearson(x, y)
    assert r is None  # std_y == 0


def test_pearson_too_few_points():
    assert pearson([1.0, 2.0], [3.0, 4.0]) is None
    assert pearson([], []) is None


def test_pearson_length_mismatch():
    assert pearson([1.0, 2.0, 3.0], [1.0, 2.0]) is None


def test_pearson_uncorrelated():
    # orthogonal-ish data
    x = [1.0, -1.0, 1.0, -1.0]
    y = [1.0, 1.0, -1.0, -1.0]
    r = pearson(x, y)
    assert r is not None
    assert abs(r) < 0.01


# ── _extract_date ──


def test_extract_date_iso():
    assert _extract_date("2026-03-19T10:00:00Z") == "2026-03-19"


def test_extract_date_with_offset():
    assert _extract_date("2026-03-19T10:00:00+08:00") == "2026-03-19"


def test_extract_date_empty():
    assert _extract_date("") == "unknown"


def test_extract_date_invalid():
    assert _extract_date("not-a-date") == "unknown"


# ── trades_to_daily_pnl ──


def test_daily_pnl_single_round_trip():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T08:00:00Z"),
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-19T16:00:00Z"),
    ]
    result = trades_to_daily_pnl(trades)
    assert "s1" in result
    assert result["s1"]["2026-03-19"] == 10.0


def test_daily_pnl_multiple_days():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T08:00:00Z"),
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-19T16:00:00Z"),
        _trade("s1", "BTC", "buy", 110, 1, ts="2026-03-20T08:00:00Z"),
        _trade("s1", "BTC", "sell", 105, 1, ts="2026-03-20T16:00:00Z"),
    ]
    result = trades_to_daily_pnl(trades)
    assert result["s1"]["2026-03-19"] == 10.0
    assert result["s1"]["2026-03-20"] == -5.0


def test_daily_pnl_multiple_strategies():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T10:00:00Z"),
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-19T14:00:00Z"),
        _trade("s2", "ETH", "sell", 50, 2, ts="2026-03-19T10:00:00Z"),
        _trade("s2", "ETH", "buy", 45, 2, ts="2026-03-19T14:00:00Z"),
    ]
    result = trades_to_daily_pnl(trades)
    assert result["s1"]["2026-03-19"] == 10.0
    assert result["s2"]["2026-03-19"] == 10.0  # short profit


def test_daily_pnl_empty():
    result = trades_to_daily_pnl([])
    assert result == {}


def test_daily_pnl_no_close():
    trades = [_trade("s1", "BTC", "buy", 100, 1)]
    result = trades_to_daily_pnl(trades)
    assert result["s1"] == {}


# ── build_correlation_matrix ──


def test_matrix_perfect_correlation():
    daily_pnl = {
        "s1": {"2026-03-17": 10, "2026-03-18": -5, "2026-03-19": 8},
        "s2": {"2026-03-17": 20, "2026-03-18": -10, "2026-03-19": 16},
    }
    strategies, matrix = build_correlation_matrix(daily_pnl)
    assert set(strategies) == {"s1", "s2"}
    assert matrix[("s1", "s1")] == 1.0
    assert matrix[("s2", "s2")] == 1.0
    r = matrix[("s1", "s2")]
    assert r is not None
    assert abs(r - 1.0) < 1e-10


def test_matrix_insufficient_data():
    daily_pnl = {
        "s1": {"2026-03-17": 10},
        "s2": {"2026-03-18": 20},
    }
    strategies, matrix = build_correlation_matrix(daily_pnl)
    assert matrix[("s1", "s2")] is None  # no common dates


def test_matrix_symmetric():
    daily_pnl = {
        "s1": {"2026-03-17": 10, "2026-03-18": -5, "2026-03-19": 8, "2026-03-20": 3},
        "s2": {"2026-03-17": -2, "2026-03-18": 7, "2026-03-19": -1, "2026-03-20": 5},
    }
    strategies, matrix = build_correlation_matrix(daily_pnl)
    r12 = matrix[("s1", "s2")]
    r21 = matrix[("s2", "s1")]
    assert r12 == r21


def test_matrix_three_strategies():
    daily_pnl = {
        "a": {"d1": 1, "d2": 2, "d3": 3},
        "b": {"d1": 1, "d2": 2, "d3": 3},
        "c": {"d1": 3, "d2": 2, "d3": 1},
    }
    strategies, matrix = build_correlation_matrix(daily_pnl)
    assert len(strategies) == 3
    # a and b perfectly correlated
    assert abs(matrix[("a", "b")] - 1.0) < 1e-10
    # a and c perfectly anti-correlated
    assert abs(matrix[("a", "c")] - (-1.0)) < 1e-10


# ── format_matrix ──


def test_format_matrix_empty():
    result = format_matrix([], {})
    assert "无策略数据" in result


def test_format_matrix_output():
    strategies = ["s1", "s2"]
    matrix = {
        ("s1", "s1"): 1.0,
        ("s2", "s2"): 1.0,
        ("s1", "s2"): 0.85,
        ("s2", "s1"): 0.85,
    }
    output = format_matrix(strategies, matrix)
    assert "s1" in output
    assert "s2" in output
    assert "1.00" in output
    assert "+0.85" in output
