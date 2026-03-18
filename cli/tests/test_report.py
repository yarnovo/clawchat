"""Tests for _report_core — daily/weekly report generation."""

import json
from datetime import datetime, timezone, timedelta

from clawchat._report_core import (
    filter_trades_by_date,
    compute_pnl_by_strategy,
    compute_equity_stats,
    generate_daily_report,
    generate_weekly_report,
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


# ── filter_trades_by_date ──


def test_filter_trades_empty():
    result = filter_trades_by_date(
        [], datetime(2026, 3, 19, tzinfo=timezone.utc), datetime(2026, 3, 20, tzinfo=timezone.utc)
    )
    assert result == []


def test_filter_trades_in_range():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T08:00:00Z"),
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-19T16:00:00Z"),
        _trade("s2", "ETH", "buy", 50, 2, ts="2026-03-20T01:00:00Z"),  # next day
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    result = filter_trades_by_date(trades, start, end)
    assert len(result) == 2


def test_filter_trades_boundary():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T00:00:00Z"),  # exactly at start
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-20T00:00:00Z"),  # exactly at end (excluded)
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    result = filter_trades_by_date(trades, start, end)
    assert len(result) == 1


def test_filter_trades_invalid_ts_skipped():
    trades = [
        {"ts": "not-a-date", "strategy": "s1"},
        {"strategy": "s1"},  # no ts field
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T12:00:00Z"),
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    result = filter_trades_by_date(trades, start, end)
    assert len(result) == 1


# ── compute_pnl_by_strategy ──


def test_pnl_single_round_trip_profit():
    trades = [
        _trade("trend", "BTC", "buy", 100, 1),
        _trade("trend", "BTC", "sell", 110, 1),
    ]
    result = compute_pnl_by_strategy(trades)
    assert "trend" in result
    assert result["trend"]["pnl"] == 10.0
    assert result["trend"]["wins"] == 1
    assert result["trend"]["losses"] == 0
    assert result["trend"]["win_rate"] == 1.0


def test_pnl_single_round_trip_loss():
    trades = [
        _trade("macd", "ETH", "buy", 100, 2),
        _trade("macd", "ETH", "sell", 95, 2),
    ]
    result = compute_pnl_by_strategy(trades)
    assert result["macd"]["pnl"] == -10.0
    assert result["macd"]["wins"] == 0
    assert result["macd"]["losses"] == 1


def test_pnl_short_round_trip():
    trades = [
        _trade("scalp", "BTC", "sell", 100, 1),
        _trade("scalp", "BTC", "buy", 90, 1),
    ]
    result = compute_pnl_by_strategy(trades)
    assert result["scalp"]["pnl"] == 10.0
    assert result["scalp"]["wins"] == 1


def test_pnl_multiple_strategies():
    trades = [
        _trade("s1", "BTC", "buy", 100, 1),
        _trade("s1", "BTC", "sell", 110, 1),
        _trade("s2", "ETH", "sell", 50, 2),
        _trade("s2", "ETH", "buy", 55, 2),
    ]
    result = compute_pnl_by_strategy(trades)
    assert result["s1"]["pnl"] == 10.0
    assert result["s2"]["pnl"] == -10.0


def test_pnl_empty_trades():
    result = compute_pnl_by_strategy([])
    assert result == {}


def test_pnl_no_close():
    """Open without close should show 0 pnl, 0 round trips."""
    trades = [_trade("s1", "BTC", "buy", 100, 1)]
    result = compute_pnl_by_strategy(trades)
    assert result["s1"]["pnl"] == 0.0
    assert result["s1"]["round_trips"] == 0


# ── compute_equity_stats ──


def test_equity_stats_basic():
    rows = [
        {"timestamp": "2026-03-19 08:00:00", "equity": "200"},
        {"timestamp": "2026-03-19 12:00:00", "equity": "210"},
        {"timestamp": "2026-03-19 16:00:00", "equity": "205"},
        {"timestamp": "2026-03-19 20:00:00", "equity": "215"},
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    stats = compute_equity_stats(rows, start, end)
    assert stats["start_equity"] == 200.0
    assert stats["end_equity"] == 215.0
    assert stats["peak"] == 215.0
    assert stats["trough"] == 200.0


def test_equity_stats_drawdown():
    rows = [
        {"timestamp": "2026-03-19 08:00:00", "equity": "200"},
        {"timestamp": "2026-03-19 12:00:00", "equity": "220"},
        {"timestamp": "2026-03-19 16:00:00", "equity": "198"},  # drawdown from 220
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    stats = compute_equity_stats(rows, start, end)
    expected_dd = (220 - 198) / 220 * 100
    assert abs(stats["max_drawdown_pct"] - expected_dd) < 0.01


def test_equity_stats_empty():
    stats = compute_equity_stats(
        [], datetime(2026, 3, 19, tzinfo=timezone.utc), datetime(2026, 3, 20, tzinfo=timezone.utc)
    )
    assert stats["start_equity"] == 0
    assert stats["end_equity"] == 0


def test_equity_stats_out_of_range():
    rows = [
        {"timestamp": "2026-03-18 08:00:00", "equity": "200"},  # before range
    ]
    start = datetime(2026, 3, 19, tzinfo=timezone.utc)
    end = datetime(2026, 3, 20, tzinfo=timezone.utc)
    stats = compute_equity_stats(rows, start, end)
    assert stats["start_equity"] == 0


# ── generate_daily_report ──


def test_daily_report_structure(monkeypatch):
    """Daily report should contain expected markdown sections."""
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {
        "test-strat": {"status": "approved", "symbol": "BTCUSDT", "timeframe": "5m"},
    })

    report = generate_daily_report(datetime(2026, 3, 19))

    assert "# 日报 2026-03-19" in report
    assert "## 总览" in report
    assert "## 策略表现" in report
    assert "## 策略状态" in report
    assert "test-strat" in report
    assert "approved" in report


def test_daily_report_with_trades(monkeypatch):
    trades = [
        _trade("s1", "BTC", "buy", 100, 1, ts="2026-03-19T10:00:00Z"),
        _trade("s1", "BTC", "sell", 110, 1, ts="2026-03-19T14:00:00Z"),
    ]
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: trades)
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {})

    report = generate_daily_report(datetime(2026, 3, 19))

    assert "s1" in report
    assert "$+10.0000" in report


# ── generate_weekly_report ──


def test_weekly_report_structure(monkeypatch):
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {})
    monkeypatch.setattr("clawchat._report_core.load_performance", lambda name: None)

    report = generate_weekly_report(datetime(2026, 3, 19))

    assert "# 周报" in report
    assert "## 总览" in report
    assert "## 策略排名" in report
    assert "## 资金曲线" in report
    assert "## 回撤分析" in report


def test_weekly_report_with_equity(monkeypatch):
    equity = [
        {"timestamp": "2026-03-15 08:00:00", "equity": "200"},
        {"timestamp": "2026-03-17 08:00:00", "equity": "220"},
        {"timestamp": "2026-03-19 08:00:00", "equity": "210"},
    ]
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: equity)
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {})
    monkeypatch.setattr("clawchat._report_core.load_performance", lambda name: None)

    report = generate_weekly_report(datetime(2026, 3, 19))

    assert "$200.00" in report
    assert "$210.00" in report


def test_weekly_report_with_performance(monkeypatch):
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {
        "s1": {"status": "approved"},
    })
    monkeypatch.setattr("clawchat._report_core.load_performance", lambda name: {
        "health": "healthy",
        "live": {"max_drawdown_pct": 5.5},
    })

    report = generate_weekly_report(datetime(2026, 3, 19))

    assert "5.50%" in report
    assert "healthy" in report
