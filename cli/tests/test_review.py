"""Tests for cmd_review — live metrics computation, health assessment, performance generation."""

import json
import math

from clawchat.cmd_review import (
    compute_live_metrics,
    assess_health,
    generate_performance,
    review_strategy,
    load_strategy_config,
)


def _trade(strategy, symbol, side, price, qty):
    return {
        "ts": "2026-03-19T10:00:00Z",
        "strategy": strategy,
        "symbol": symbol,
        "side": side,
        "price": str(price),
        "qty": qty,
        "order_type": "market",
        "status": "FILLED",
    }


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
    assert m["roi"] == 5.0  # 10/200 * 100
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
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),  # +20
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),  # -10
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
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),  # +20
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 110.0, 1.0),  # -10
    ]
    m = compute_live_metrics(trades, 200.0)
    # avg_win=20, avg_loss=10, pf=20/10=2.0
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
        _trade("test", "BTCUSDT", "sell", 120.0, 1.0),  # +20, peak=20
        _trade("test", "BTCUSDT", "buy", 120.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 100.0, 1.0),  # -20, cumulative=0, dd=20/20=100%
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["max_drawdown_pct"] == 100.0


def test_metrics_sharpe_positive():
    # Varying positive wins → positive sharpe (needs non-zero std)
    trades = [
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 102.0, 1.0),  # +2
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 103.0, 1.0),  # +3
        _trade("test", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test", "BTCUSDT", "sell", 101.0, 1.0),  # +1
    ]
    m = compute_live_metrics(trades, 200.0)
    assert m["sharpe"] > 0


def test_metrics_ignores_zero_price():
    trades = [
        _trade("test", "BTCUSDT", "buy", 0, 1.0),  # price=0, ignored
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


# ── review_strategy with real files (tmp dir) ──


def test_review_strategy_writes_performance_json(tmp_path, monkeypatch):
    """review_strategy should write performance.json to strategy dir."""
    import clawchat.cmd_review as mod

    # Set up strategy dir
    strat_dir = tmp_path / "strategies" / "test-strat"
    strat_dir.mkdir(parents=True)
    cfg = {
        "name": "test-strat",
        "status": "approved",
        "capital": 200,
        "backtest": {
            "return_pct": 10.0,
            "win_rate": 0.5,
            "profit_factor": 2.0,
            "max_drawdown_pct": 15.0,
        },
    }
    (strat_dir / "strategy.json").write_text(json.dumps(cfg))

    # Monkeypatch STRATEGIES_DIR
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")

    trades = [
        _trade("test-strat", "BTCUSDT", "buy", 100.0, 1.0),
        _trade("test-strat", "BTCUSDT", "sell", 110.0, 1.0),
    ]

    perf = review_strategy("test-strat", trades, verbose=False)
    assert perf is not None
    assert perf["health"] in ("healthy", "warning", "degraded", "no_data")
    assert perf["live"]["round_trips"] == 1

    # Verify performance.json was written
    perf_file = strat_dir / "performance.json"
    assert perf_file.exists()
    saved = json.loads(perf_file.read_text())
    assert saved["strategy"] == "test-strat"
    assert saved["live"]["total_pnl"] == 10.0


def test_review_strategy_no_strategy_json(tmp_path, monkeypatch):
    """Missing strategy.json → returns None."""
    import clawchat.cmd_review as mod
    monkeypatch.setattr(mod, "STRATEGIES_DIR", tmp_path / "strategies")
    (tmp_path / "strategies").mkdir(parents=True)
    result = review_strategy("nonexistent", [], verbose=False)
    assert result is None


def test_review_strategy_no_trades(tmp_path, monkeypatch):
    """No trades → health=no_data, still writes performance.json."""
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
