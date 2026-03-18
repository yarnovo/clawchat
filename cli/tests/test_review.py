"""Tests for cmd_review — live metrics, health assessment, lifecycle transitions."""

import json
import math
from datetime import datetime, timezone, timedelta

from clawchat.cmd_review import (
    compute_live_metrics,
    assess_health,
    generate_performance,
    review_strategy,
    check_probation_upgrade,
    check_degraded_suspension,
    filter_trades_by_window,
    is_active_status,
    PROBATION_DAYS,
    DEGRADED_GRACE_DAYS,
)


def _trade(strategy, symbol, side, price, qty, ts="2026-03-19T10:00:00Z"):
    return {
        "ts": ts,
        "strategy": strategy,
        "symbol": symbol,
        "side": side,
        "price": str(price),
        "qty": qty,
        "order_type": "market",
        "status": "FILLED",
    }


# ── is_active_status ──


def test_is_active_status():
    assert is_active_status("approved") is True
    assert is_active_status("active") is True
    assert is_active_status("suspended") is False
    assert is_active_status("pending") is False
    assert is_active_status(None) is False


# ── compute_live_metrics ──


def test_metrics_no_trades():
    m = compute_live_metrics([], 200.0)
    assert m["roi"] == 0
    assert m["trades"] == 0
    assert m["round_trips"] == 0
    assert m["sharpe"] == 0


def test_metrics_one_round_trip_win():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["round_trips"] == 1
    assert m["wins"] == 1
    assert m["losses"] == 0
    assert m["total_pnl"] == 10.0
    assert m["roi"] == 5.0
    assert m["win_rate"] == 100.0


def test_metrics_one_round_trip_loss():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 90.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["round_trips"] == 1
    assert m["wins"] == 0
    assert m["losses"] == 1
    assert m["total_pnl"] == -10.0
    assert m["win_rate"] == 0.0


def test_metrics_short_trade():
    trades = [
        _trade("test", "BTCUSDT", "sell", 100.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 90.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["total_pnl"] == 10.0
    assert m["wins"] == 1


def test_metrics_mixed_win_loss():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["round_trips"] == 2
    assert m["wins"] == 1
    assert m["losses"] == 1
    assert m["total_pnl"] == 10.0
    assert m["win_rate"] == 50.0


def test_metrics_profit_factor():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["profit_factor"] == 2.0


def test_metrics_profit_factor_no_losses():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["profit_factor"] == "inf"


def test_metrics_drawdown():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 100.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["max_drawdown_pct"] == 100.0


def test_metrics_sharpe_positive():
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 102.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 103.0, 1.0),
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 101.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["sharpe"] > 0


def test_metrics_ignores_zero_price():
    trades = [
        _trade("test", "BTCUSDT", "buy", 0, 1.0),
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["round_trips"] == 1
    assert m["total_pnl"] == 10.0


# ── assess_health ──


def test_health_no_backtest():
    live = {"roi": 5.0, "win_rate": 50.0, "profit_factor": 2.0, "max_drawdown_pct": 10.0}
    assert assess_health(live, None) == "no_backtest"


def test_health_healthy():
    live = {"roi": 10.0, "win_rate": 50.0, "profit_factor": 2.0, "max_drawdown_pct": 10.0}
    bt = {"return_pct": 10.0, "win_rate": 0.5, "profit_factor": 2.0}
    assert assess_health(live, bt) == "healthy"


def test_health_warning_low_roi():
    live = {"roi": 2.0, "win_rate": 50.0, "profit_factor": 2.0, "max_drawdown_pct": 10.0}
    bt = {"return_pct": 10.0, "win_rate": 0.5, "profit_factor": 2.0}
    assert assess_health(live, bt) == "warning"


def test_health_degraded_multiple_warnings():
    live = {"roi": 1.0, "win_rate": 10.0, "profit_factor": 0.3, "max_drawdown_pct": 40.0}
    bt = {"return_pct": 20.0, "win_rate": 0.5, "profit_factor": 2.0}
    assert assess_health(live, bt) == "degraded"


def test_health_high_drawdown_triggers_warning():
    live = {"roi": 10.0, "win_rate": 50.0, "profit_factor": 2.0, "max_drawdown_pct": 35.0}
    bt = {"return_pct": 10.0, "win_rate": 0.5, "profit_factor": 2.0}
    assert assess_health(live, bt) == "warning"


# ── filter_trades_by_window ──


def test_filter_trades_recent():
    now = datetime.now(timezone.utc)
    recent = (now - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    old = (now - timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ")

    trades = [
        _trade("t", "X", "buy", 100, 1, ts=recent),
        _trade("t", "X", "sell", 110, 1, ts=old),
    ]
    filtered = filter_trades_by_window(trades, days=7)
    assert len(filtered) == 1
    assert filtered[0]["ts"] == recent


def test_filter_trades_all_recent():
    now = datetime.now(timezone.utc)
    ts = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    trades = [_trade("t", "X", "buy", 100, 1, ts=ts)]
    assert len(filter_trades_by_window(trades, days=7)) == 1


def test_filter_trades_all_old():
    ts = "2020-01-01T00:00:00Z"
    trades = [_trade("t", "X", "buy", 100, 1, ts=ts)]
    assert len(filter_trades_by_window(trades, days=7)) == 0


def test_filter_trades_missing_ts():
    trades = [{"strategy": "t", "symbol": "X", "side": "buy"}]
    assert len(filter_trades_by_window(trades, days=7)) == 0


# ── check_probation_upgrade ──


def _good_live_7d():
    return {
        "roi": 3.0,
        "round_trips": 15,
        "win_rate": 50.0,
        "max_drawdown_pct": 8.0,
    }


def test_probation_upgrade_success():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, _good_live_7d(), bt, now=now) == "active"


def test_probation_no_upgrade_too_early():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-05"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)  # only 5 days
    assert check_probation_upgrade(cfg, _good_live_7d(), bt, now=now) is None


def test_probation_no_upgrade_not_enough_trades():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    live = _good_live_7d()
    live["round_trips"] = 5  # < 10
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, live, bt, now=now) is None


def test_probation_no_upgrade_negative_roi():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    live = _good_live_7d()
    live["roi"] = -1.0
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, live, bt, now=now) is None


def test_probation_no_upgrade_low_win_rate():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    live = _good_live_7d()
    live["win_rate"] = 30.0  # < 50*0.8=40
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, live, bt, now=now) is None


def test_probation_no_upgrade_high_drawdown():
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    live = _good_live_7d()
    live["max_drawdown_pct"] = 20.0  # > 10*1.5=15
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, live, bt, now=now) is None


def test_probation_no_upgrade_not_approved():
    cfg = {
        "status": "active",
        "lifecycle": {"approved": "2026-03-01"},
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, _good_live_7d(), bt, now=now) is None


def test_probation_uses_approved_date_fallback():
    """Falls back to cfg.approved_date when lifecycle.approved is missing."""
    cfg = {
        "status": "approved",
        "approved_date": "2026-03-01",
    }
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, _good_live_7d(), bt, now=now) == "active"


def test_probation_no_approved_date():
    """No approved date at all → no upgrade."""
    cfg = {"status": "approved"}
    bt = {"win_rate": 0.5, "max_drawdown_pct": 10.0}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, _good_live_7d(), bt, now=now) is None


def test_probation_no_backtest_still_upgrades():
    """No backtest → skip backtest-relative checks, still can upgrade."""
    cfg = {
        "status": "approved",
        "lifecycle": {"approved": "2026-03-01"},
    }
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_probation_upgrade(cfg, _good_live_7d(), None, now=now) == "active"


# ── check_degraded_suspension ──


def test_degraded_suspension_triggers():
    cfg = {
        "status": "approved",
        "lifecycle": {"degraded_since": "2026-03-01"},
    }
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_degraded_suspension(cfg, "degraded", now=now) == "suspended"


def test_degraded_suspension_too_early():
    cfg = {
        "status": "approved",
        "lifecycle": {"degraded_since": "2026-03-05"},
    }
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)  # only 5 days
    assert check_degraded_suspension(cfg, "degraded", now=now) is None


def test_degraded_suspension_not_degraded():
    cfg = {
        "status": "approved",
        "lifecycle": {"degraded_since": "2026-03-01"},
    }
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_degraded_suspension(cfg, "healthy", now=now) is None


def test_degraded_suspension_no_degraded_since():
    cfg = {"status": "approved", "lifecycle": {}}
    now = datetime(2026, 3, 10, tzinfo=timezone.utc)
    assert check_degraded_suspension(cfg, "degraded", now=now) is None


# ── generate_performance ──


def test_generate_performance_structure():
    live = {"roi": 5.0, "trades": 10, "round_trips": 5}
    bt = {"return_pct": 10.0}
    perf = generate_performance("test-strat", live, bt, "healthy")
    assert perf["strategy"] == "test-strat"
    assert perf["health"] == "healthy"
    assert perf["live"] == live
    assert perf["backtest"] == bt
    assert "reviewed_at" in perf


def test_generate_performance_no_backtest():
    live = {"roi": 5.0}
    perf = generate_performance("test-strat", live, None, "no_backtest")
    assert "backtest" not in perf


# ── review_strategy integration ──


def test_review_strategy_writes_performance_json(tmp_path, monkeypatch):
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "test-strat"
    strat_dir.mkdir(parents=True)
    cfg = {
        "name": "test-strat",
        "status": "approved",
        "capital": 200,
        "backtest": {
            "return_pct": 10.0, "win_rate": 0.5,
            "profit_factor": 2.0, "max_drawdown_pct": 15.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    trades = [
        _trade("test-strat", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test-strat", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    perf = review_strategy("test-strat", trades, verbose=False)
    assert perf is not None
    assert perf["health"] in ("healthy", "warning", "degraded", "no_data")
    assert perf["live"]["round_trips"] == 1

    perf_file = strat_dir / "performance.json"
    assert perf_file.exists()
    saved = json.loads(perf_file.read_text())
    assert saved["strategy"] == "test-strat"
    assert saved["live"]["total_pnl"] == 10.0


def test_review_strategy_no_strategy_json(tmp_path, monkeypatch):
    import clawchat.cmd_review as mod
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")
    (tmp_path / "strategies").mkdir(parents=True)
    result = review_strategy("nonexistent", [], verbose=False)
    assert result is None


def test_review_strategy_no_trades(tmp_path, monkeypatch):
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "empty-strat"
    strat_dir.mkdir(parents=True)
    cfg = {"name": "empty-strat", "status": "approved", "capital": 200}
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    perf = review_strategy("empty-strat", [], verbose=False)
    assert perf is not None
    assert perf["health"] == "no_data"
    assert (strat_dir / "performance.json").exists()


def test_review_strategy_probation_upgrade(tmp_path, monkeypatch):
    """approved + 7 days + good metrics → auto upgrade to active."""
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "upgrade-strat"
    strat_dir.mkdir(parents=True)

    now = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
    approved_date = (now - timedelta(days=8)).strftime("%Y-%m-%d")

    cfg = {
        "name": "upgrade-strat",
        "status": "approved",
        "capital": 200,
        "lifecycle": {"approved": approved_date},
        "backtest": {
            "return_pct": 10.0, "win_rate": 0.5,
            "profit_factor": 2.0, "max_drawdown_pct": 15.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    # Generate 12 winning round trips with recent timestamps
    trades = []
    for i in range(12):
        ts = (now - timedelta(hours=i * 2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        trades.append(_trade("upgrade-strat", "BTCUSDT", "buy", 100.0, 1.0, ts=ts))
        trades.append(_trade("upgrade-strat", "BTCUSDT", "sell", 102.0, 1.0, ts=ts))

    perf = review_strategy("upgrade-strat", trades, verbose=False, now=now)
    assert perf is not None
    assert "transition" in perf
    assert perf["transition"]["to"] == "active"

    # Verify strategy.json was updated
    saved = json.loads((strat_dir / "strategy.json").read_text())
    assert saved["status"] == "active"
    assert saved["lifecycle"]["probation_end"] is not None


def test_review_strategy_degraded_suspension(tmp_path, monkeypatch):
    """degraded for 7+ days → auto suspend."""
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "bad-strat"
    strat_dir.mkdir(parents=True)

    now = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
    degraded_since = (now - timedelta(days=8)).strftime("%Y-%m-%d")

    cfg = {
        "name": "bad-strat",
        "status": "approved",
        "capital": 200,
        "lifecycle": {"degraded_since": degraded_since},
        "backtest": {
            "return_pct": 50.0, "win_rate": 0.8,
            "profit_factor": 5.0, "max_drawdown_pct": 5.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    # Bad trades that will trigger degraded health
    trades = [
        _trade("bad-strat", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("bad-strat", "BTCUSDT", "sell", 80.0, 1.0),  # big loss
        _trade("bad-strat", "BTCUSDT", "buy", 80.0, 1.0),
        _trade("bad-strat", "BTCUSDT", "sell", 60.0, 1.0),  # big loss
    ]

    perf = review_strategy("bad-strat", trades, verbose=False, now=now)
    assert perf is not None
    assert perf["health"] == "degraded"
    assert "transition" in perf
    assert perf["transition"]["to"] == "suspended"

    saved = json.loads((strat_dir / "strategy.json").read_text())
    assert saved["status"] == "suspended"


def test_review_updates_lifecycle_last_review(tmp_path, monkeypatch):
    """review should update lifecycle.last_review."""
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "ts-strat"
    strat_dir.mkdir(parents=True)
    cfg = {"name": "ts-strat", "status": "approved", "capital": 200}
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    now = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
    review_strategy("ts-strat", [], verbose=False, now=now)

    saved = json.loads((strat_dir / "strategy.json").read_text())
    assert saved["lifecycle"]["last_review"] == "2026-03-19"


def test_review_sets_degraded_since_on_first_degraded(tmp_path, monkeypatch):
    """First degraded review should set lifecycle.degraded_since."""
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "degrade-strat"
    strat_dir.mkdir(parents=True)
    cfg = {
        "name": "degrade-strat",
        "status": "approved",
        "capital": 200,
        "backtest": {
            "return_pct": 50.0, "win_rate": 0.8,
            "profit_factor": 5.0, "max_drawdown_pct": 5.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    # Bad trades
    trades = [
        _trade("degrade-strat", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("degrade-strat", "BTCUSDT", "sell", 80.0, 1.0),
        _trade("degrade-strat", "BTCUSDT", "buy", 80.0, 1.0),
        _trade("degrade-strat", "BTCUSDT", "sell", 60.0, 1.0),
    ]

    now = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
    perf = review_strategy("degrade-strat", trades, verbose=False, now=now)
    assert perf["health"] == "degraded"

    saved = json.loads((strat_dir / "strategy.json").read_text())
    assert saved["lifecycle"]["degraded_since"] == "2026-03-19"


def test_review_clears_degraded_since_on_recovery(tmp_path, monkeypatch):
    """Healthy review should clear lifecycle.degraded_since."""
    import clawchat.cmd_review as mod
    strat_dir = tmp_path / "strategies" / "recover-strat"
    strat_dir.mkdir(parents=True)
    cfg = {
        "name": "recover-strat",
        "status": "active",
        "capital": 200,
        "lifecycle": {"degraded_since": "2026-03-10"},
        "backtest": {
            "return_pct": 10.0, "win_rate": 0.5,
            "profit_factor": 2.0, "max_drawdown_pct": 15.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    # Good trades
    trades = [
        _trade("recover-strat", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("recover-strat", "BTCUSDT", "sell", 110.0, 1.0),
    ]
    now = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
    perf = review_strategy("recover-strat", trades, verbose=False, now=now)

    saved = json.loads((strat_dir / "strategy.json").read_text())
    assert "degraded_since" not in saved["lifecycle"]
