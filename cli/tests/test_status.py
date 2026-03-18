"""Tests for cmd_status health monitoring functions."""

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest import mock

import pytest

from clawchat.cmd_status import (
    _format_updated,
    _load_last_trade_by_strategy,
    _load_signals_by_strategy,
    _read_state_summary,
)


# ── _format_updated ──────────────────────────────────────────


def test_format_updated_none():
    result = _format_updated(None)
    assert "\033[31m" in result  # red


def test_format_updated_question_mark():
    result = _format_updated("?")
    assert "\033[31m" in result  # red


def test_format_updated_recent():
    ts = (datetime.now(timezone.utc) - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = _format_updated(ts)
    assert "\033[32m" in result  # green
    assert "2m ago" in result


def test_format_updated_stale():
    ts = (datetime.now(timezone.utc) - timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = _format_updated(ts)
    assert "\033[31m" in result  # red
    assert "30m ago" in result


def test_format_updated_exact_threshold():
    ts = (datetime.now(timezone.utc) - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = _format_updated(ts)
    assert "\033[31m" in result  # red (>= 10 min)


def test_format_updated_just_under_threshold():
    ts = (datetime.now(timezone.utc) - timedelta(minutes=9)).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = _format_updated(ts)
    assert "\033[32m" in result  # green (< 10 min)


def test_format_updated_invalid_string():
    result = _format_updated("not-a-date")
    assert result == "not-a-date"


# ── _load_signals_by_strategy ────────────────────────────────


def test_load_signals_missing_file(tmp_path):
    with mock.patch("clawchat.cmd_status.SIGNALS_FILE", tmp_path / "nope.jsonl"):
        counts = _load_signals_by_strategy()
    assert dict(counts) == {}


def test_load_signals_counts(tmp_path):
    f = tmp_path / "signals.jsonl"
    lines = [
        json.dumps({"strategy": "strat-a", "signal": "buy"}),
        json.dumps({"strategy": "strat-a", "signal": "sell"}),
        json.dumps({"strategy": "strat-b", "signal": "buy"}),
    ]
    f.write_text("\n".join(lines))
    with mock.patch("clawchat.cmd_status.SIGNALS_FILE", f):
        counts = _load_signals_by_strategy()
    assert counts["strat-a"] == 2
    assert counts["strat-b"] == 1


def test_load_signals_bad_line(tmp_path):
    f = tmp_path / "signals.jsonl"
    f.write_text('{"strategy":"a","signal":"buy"}\nBAD_LINE\n{"strategy":"a","signal":"sell"}')
    with mock.patch("clawchat.cmd_status.SIGNALS_FILE", f):
        counts = _load_signals_by_strategy()
    assert counts["a"] == 2


# ── _load_last_trade_by_strategy ─────────────────────────────


def test_load_last_trade_missing_file(tmp_path):
    with mock.patch("clawchat.cmd_status.TRADES_FILE", tmp_path / "nope.jsonl"):
        last = _load_last_trade_by_strategy()
    assert last == {}


def test_load_last_trade_returns_last(tmp_path):
    f = tmp_path / "trades.jsonl"
    lines = [
        json.dumps({"strategy": "strat-a", "ts": "2026-03-18T10:00:00Z"}),
        json.dumps({"strategy": "strat-a", "ts": "2026-03-18T12:00:00Z"}),
        json.dumps({"strategy": "strat-b", "ts": "2026-03-18T11:00:00Z"}),
    ]
    f.write_text("\n".join(lines))
    with mock.patch("clawchat.cmd_status.TRADES_FILE", f):
        last = _load_last_trade_by_strategy()
    assert last["strat-a"] == "2026-03-18T12:00:00Z"
    assert last["strat-b"] == "2026-03-18T11:00:00Z"


# ── _read_state_summary ─────────────────────────────────────


def test_read_state_summary_no_dir():
    assert _read_state_summary(None) is None


def test_read_state_summary_no_state_file(tmp_path):
    assert _read_state_summary(tmp_path) is None


def test_read_state_summary_full(tmp_path):
    ts = (datetime.now(timezone.utc) - timedelta(minutes=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    state = {
        "last_updated": ts,
        "indicators": {"candle_count": 42},
        "trade_stats": {"total": 5, "wins": 3, "losses": 2, "realized_pnl": 1.23},
    }
    d = tmp_path / "my-strat"
    d.mkdir()
    (d / "state.json").write_text(json.dumps(state))

    sig = {"my-strat": 7}
    trades = {"my-strat": "2026-03-18T14:00:00Z"}
    result = _read_state_summary(d, sig, trades)

    assert "candles=42" in result
    assert "signals=7" in result
    assert "trades=5" in result
    assert "3W/2L" in result
    assert "+$1.2300" in result
    assert "03-18 14:00" in result
    assert "\033[32m" in result  # green (recent)


def test_read_state_summary_stale(tmp_path):
    ts = (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    state = {
        "last_updated": ts,
        "indicators": {},
        "trade_stats": {"total": 0, "wins": 0, "losses": 0, "realized_pnl": 0.0},
    }
    d = tmp_path / "stale-strat"
    d.mkdir()
    (d / "state.json").write_text(json.dumps(state))

    result = _read_state_summary(d, {}, {})
    assert "\033[31m" in result  # red (stale)
    assert "candles=?" in result
    assert "last_trade=-" in result


def test_read_state_summary_bad_json(tmp_path):
    d = tmp_path / "bad-strat"
    d.mkdir()
    (d / "state.json").write_text("NOT JSON")
    assert _read_state_summary(d) is None


def test_read_state_summary_no_signals_no_trades(tmp_path):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    state = {
        "last_updated": ts,
        "indicators": {"candle_count": 10},
        "trade_stats": {"total": 0, "wins": 0, "losses": 0, "realized_pnl": 0.0},
    }
    d = tmp_path / "clean-strat"
    d.mkdir()
    (d / "state.json").write_text(json.dumps(state))

    result = _read_state_summary(d)
    assert "signals=0" in result
    assert "last_trade=-" in result
