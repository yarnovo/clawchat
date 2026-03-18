"""Tests for report_engine — scheduling logic + single-run mode."""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from clawchat.report_engine import should_run, run_report, SCHEDULE


# ── should_run ──


def test_should_run_daily_at_correct_time():
    sched = {"type": "daily", "hour": 9, "minute": 0}
    now = datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)
    assert should_run(sched, now, {}) is True


def test_should_run_daily_wrong_hour():
    sched = {"type": "daily", "hour": 9, "minute": 0}
    now = datetime(2026, 3, 19, 10, 0, 0, tzinfo=timezone.utc)
    assert should_run(sched, now, {}) is False


def test_should_run_daily_wrong_minute():
    sched = {"type": "daily", "hour": 9, "minute": 0}
    now = datetime(2026, 3, 19, 9, 1, 0, tzinfo=timezone.utc)
    assert should_run(sched, now, {}) is False


def test_should_run_weekly_monday():
    # 2026-03-16 is Monday
    sched = {"type": "weekly", "hour": 9, "minute": 0, "weekday": 0}
    now = datetime(2026, 3, 16, 9, 0, 0, tzinfo=timezone.utc)
    assert now.weekday() == 0  # confirm Monday
    assert should_run(sched, now, {}) is True


def test_should_run_weekly_not_monday():
    # 2026-03-19 is Thursday
    sched = {"type": "weekly", "hour": 9, "minute": 0, "weekday": 0}
    now = datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)
    assert now.weekday() == 3  # Thursday
    assert should_run(sched, now, {}) is False


def test_should_run_no_duplicate_within_interval():
    sched = {"type": "daily", "hour": 9, "minute": 0}
    now = datetime(2026, 3, 19, 9, 0, 30, tzinfo=timezone.utc)
    last_run = {"daily": datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)}
    assert should_run(sched, now, last_run) is False


def test_should_run_after_interval():
    sched = {"type": "daily", "hour": 9, "minute": 0}
    now = datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)
    last_run = {"daily": datetime(2026, 3, 18, 9, 0, 0, tzinfo=timezone.utc)}
    assert should_run(sched, now, last_run) is True


# ── run_report ──


def test_run_report_daily(tmp_path, monkeypatch):
    monkeypatch.setattr("clawchat.report_engine.REPORTS_DIR", tmp_path)
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {})

    now = datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)
    path = run_report("daily", now)

    assert "daily-2026-03-18.md" in path
    content = (tmp_path / "daily-2026-03-18.md").read_text()
    assert "# 日报 2026-03-18" in content


def test_run_report_weekly(tmp_path, monkeypatch):
    monkeypatch.setattr("clawchat.report_engine.REPORTS_DIR", tmp_path)
    monkeypatch.setattr("clawchat._report_core.load_trades", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_equity", lambda: [])
    monkeypatch.setattr("clawchat._report_core.load_strategy_configs", lambda: {})
    monkeypatch.setattr("clawchat._report_core.load_performance", lambda name: None)

    now = datetime(2026, 3, 19, 9, 0, 0, tzinfo=timezone.utc)
    path = run_report("weekly", now)

    assert "weekly-2026-03-18.md" in path
    content = (tmp_path / "weekly-2026-03-18.md").read_text()
    assert "# 周报" in content


# ── SCHEDULE 配置 ──


def test_schedule_has_daily_and_weekly():
    types = [s["type"] for s in SCHEDULE]
    assert "daily" in types
    assert "weekly" in types


def test_schedule_daily_at_0900():
    daily = [s for s in SCHEDULE if s["type"] == "daily"][0]
    assert daily["hour"] == 9
    assert daily["minute"] == 0


def test_schedule_weekly_monday_0900():
    weekly = [s for s in SCHEDULE if s["type"] == "weekly"][0]
    assert weekly["hour"] == 9
    assert weekly["minute"] == 0
    assert weekly["weekday"] == 0  # Monday
