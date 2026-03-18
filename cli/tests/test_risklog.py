"""Tests for cmd_risklog — 风控事件查询."""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

from clawchat.cmd_risklog import format_event, load_events, print_stats, risk_log


def _make_event(rule="block", strategy="test-strat", symbol="BTCUSDT",
                pnl=0.0, detail="", ts=None):
    """构造一条风控事件。"""
    if ts is None:
        ts = datetime.now(timezone.utc).isoformat()
    return {
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "rule": rule,
        "pnl": pnl,
        "detail": detail,
    }


# ── load_events ──────────────────────────────────────────


def test_load_events_empty_file(tmp_path):
    f = tmp_path / "empty.jsonl"
    f.write_text("")
    assert load_events(path=f) == []


def test_load_events_missing_file(tmp_path):
    f = tmp_path / "no_such_file.jsonl"
    assert load_events(path=f) == []


def test_load_events_all(tmp_path):
    f = tmp_path / "events.jsonl"
    events = [_make_event(rule="block"), _make_event(rule="close_position")]
    f.write_text("\n".join(json.dumps(e) for e in events))
    result = load_events(path=f)
    assert len(result) == 2


def test_load_events_filter_strategy(tmp_path):
    f = tmp_path / "events.jsonl"
    events = [
        _make_event(strategy="aaa"),
        _make_event(strategy="bbb"),
        _make_event(strategy="aaa"),
    ]
    f.write_text("\n".join(json.dumps(e) for e in events))
    result = load_events(path=f, strategy="aaa")
    assert len(result) == 2
    assert all(e["strategy"] == "aaa" for e in result)


def test_load_events_filter_days(tmp_path):
    f = tmp_path / "events.jsonl"
    now = datetime.now(timezone.utc)
    events = [
        _make_event(ts=(now - timedelta(days=1)).isoformat()),   # within 3 days
        _make_event(ts=(now - timedelta(days=10)).isoformat()),  # outside 3 days
        _make_event(ts=(now - timedelta(hours=2)).isoformat()),  # within 3 days
    ]
    f.write_text("\n".join(json.dumps(e) for e in events))
    result = load_events(path=f, days=3)
    assert len(result) == 2


def test_load_events_filter_both(tmp_path):
    f = tmp_path / "events.jsonl"
    now = datetime.now(timezone.utc)
    events = [
        _make_event(strategy="aaa", ts=(now - timedelta(hours=1)).isoformat()),
        _make_event(strategy="bbb", ts=(now - timedelta(hours=1)).isoformat()),
        _make_event(strategy="aaa", ts=(now - timedelta(days=10)).isoformat()),
    ]
    f.write_text("\n".join(json.dumps(e) for e in events))
    result = load_events(path=f, strategy="aaa", days=3)
    assert len(result) == 1
    assert result[0]["strategy"] == "aaa"


def test_load_events_malformed_json(tmp_path):
    f = tmp_path / "events.jsonl"
    f.write_text('{"rule":"block"}\nNOT_JSON\n{"rule":"close_position"}')
    result = load_events(path=f)
    assert len(result) == 2


# ── format_event ──────────────────────────────────────────


def test_format_event_block():
    rec = _make_event(rule="block", pnl=-1.5, detail="cooldown")
    line = format_event(rec)
    assert "\033[33m" in line  # yellow for block
    assert "block" in line
    assert "-$1.5000" in line
    assert "cooldown" in line


def test_format_event_close_position():
    rec = _make_event(rule="close_position", pnl=5.0)
    line = format_event(rec)
    assert "\033[31m" in line  # red for close_position
    assert "+$5.0000" in line


def test_format_event_positive_pnl_sign():
    rec = _make_event(pnl=0.0)
    line = format_event(rec)
    assert "+$0.0000" in line


def test_format_event_negative_pnl_sign():
    rec = _make_event(pnl=-2.3456)
    line = format_event(rec)
    assert "-$2.3456" in line


# ── print_stats ──────────────────────────────────────────


def test_print_stats_empty(capsys):
    print_stats([])
    assert capsys.readouterr().out == ""


def test_print_stats_by_rule(capsys):
    events = [
        _make_event(rule="block"),
        _make_event(rule="block"),
        _make_event(rule="close_position"),
    ]
    print_stats(events)
    out = capsys.readouterr().out
    assert "block" in out
    assert "2次" in out
    assert "close_position" in out
    assert "1次" in out


def test_print_stats_multi_strategy(capsys):
    events = [
        _make_event(strategy="aaa"),
        _make_event(strategy="aaa"),
        _make_event(strategy="bbb"),
    ]
    print_stats(events)
    out = capsys.readouterr().out
    assert "aaa" in out
    assert "bbb" in out


def test_print_stats_single_strategy_no_strat_section(capsys):
    events = [_make_event(strategy="aaa"), _make_event(strategy="aaa")]
    print_stats(events)
    out = capsys.readouterr().out
    # 只有一个策略时不显示策略统计
    lines = out.strip().split("\n")
    # 应该只有统计标题 + rule 行，没有策略行
    strat_lines = [l for l in lines if "aaa" in l]
    assert len(strat_lines) == 0


# ── risk_log (integration) ──────────────────────────────────


def test_risk_log_no_events(capsys, tmp_path):
    f = tmp_path / "events.jsonl"
    f.write_text("")
    risk_log(path=f)
    out = capsys.readouterr().out
    assert "无事件" in out


def test_risk_log_with_events(capsys, tmp_path):
    f = tmp_path / "events.jsonl"
    events = [_make_event(rule="block", pnl=-1.0), _make_event(rule="close_position", pnl=3.0)]
    f.write_text("\n".join(json.dumps(e) for e in events))
    risk_log(path=f)
    out = capsys.readouterr().out
    assert "共 2 条事件" in out
    assert "block" in out
    assert "close_position" in out


def test_risk_log_with_strategy_filter(capsys, tmp_path):
    f = tmp_path / "events.jsonl"
    events = [_make_event(strategy="aaa"), _make_event(strategy="bbb")]
    f.write_text("\n".join(json.dumps(e) for e in events))
    risk_log(strategy="aaa", path=f)
    out = capsys.readouterr().out
    assert "[aaa]" in out
    assert "共 1 条事件" in out


def test_risk_log_with_days_title(capsys, tmp_path):
    f = tmp_path / "events.jsonl"
    f.write_text("")
    risk_log(days=7, path=f)
    out = capsys.readouterr().out
    assert "最近 7 天" in out
