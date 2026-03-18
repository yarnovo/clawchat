"""Tests for clawchat emergency-close command."""

import json
import os
import tempfile

import pytest

from clawchat.cmd_emergency import (
    emergency_close,
    load_strategy_symbols,
    log_risk_event,
    normalize_symbol,
)


# ── normalize_symbol ──────────────────────────────────────────

def test_normalize_symbol_ccxt_format():
    assert normalize_symbol("NTRN/USDT:USDT") == "NTRNUSDT"


def test_normalize_symbol_already_clean():
    assert normalize_symbol("NTRNUSDT") == "NTRNUSDT"


def test_normalize_symbol_slash_only():
    assert normalize_symbol("ETH/USDT") == "ETHUSDT"


# ── load_strategy_symbols ────────────────────────────────────

def test_load_strategy_symbols_reads_configs():
    with tempfile.TemporaryDirectory() as d:
        s1 = os.path.join(d, "strat-a")
        os.makedirs(s1)
        with open(os.path.join(s1, "strategy.json"), "w") as f:
            json.dump({"name": "strat-a", "symbol": "NTRNUSDT"}, f)

        s2 = os.path.join(d, "strat-b")
        os.makedirs(s2)
        with open(os.path.join(s2, "strategy.json"), "w") as f:
            json.dump({"name": "strat-b", "symbol": "ETH/USDT"}, f)

        mapping = load_strategy_symbols(d)
        assert mapping["strat-a"] == "NTRNUSDT"
        assert mapping["strat-b"] == "ETHUSDT"


def test_load_strategy_symbols_missing_dir():
    mapping = load_strategy_symbols("/nonexistent/dir")
    assert mapping == {}


def test_load_strategy_symbols_invalid_json():
    with tempfile.TemporaryDirectory() as d:
        s1 = os.path.join(d, "bad")
        os.makedirs(s1)
        with open(os.path.join(s1, "strategy.json"), "w") as f:
            f.write("not json")
        mapping = load_strategy_symbols(d)
        assert "bad" not in mapping


def test_load_strategy_symbols_no_symbol_field():
    with tempfile.TemporaryDirectory() as d:
        s1 = os.path.join(d, "empty")
        os.makedirs(s1)
        with open(os.path.join(s1, "strategy.json"), "w") as f:
            json.dump({"name": "empty"}, f)
        mapping = load_strategy_symbols(d)
        assert "empty" not in mapping


# ── log_risk_event ───────────────────────────────────────────

def test_log_risk_event_writes_jsonl(tmp_path, monkeypatch):
    log_path = tmp_path / "records" / "risk_events.jsonl"
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(log_path),
    )
    log_risk_event("test-strat", "NTRNUSDT", "emergency close long x100")

    content = log_path.read_text()
    record = json.loads(content.strip())
    assert record["strategy"] == "test-strat"
    assert record["symbol"] == "NTRNUSDT"
    assert record["rule"] == "emergency_close"
    assert "emergency close" in record["detail"]


def test_log_risk_event_appends(tmp_path, monkeypatch):
    log_path = tmp_path / "records" / "risk_events.jsonl"
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(log_path),
    )
    log_risk_event("s1", "NTRNUSDT", "first")
    log_risk_event("s2", "ETHUSDT", "second")

    lines = log_path.read_text().strip().split("\n")
    assert len(lines) == 2
    assert json.loads(lines[0])["strategy"] == "s1"
    assert json.loads(lines[1])["strategy"] == "s2"


# ── Mock exchange ────────────────────────────────────────────

class MockExchange:
    """Mock ccxt exchange for testing emergency_close."""

    def __init__(self, positions):
        self._positions = positions
        self.orders = []

    def fetch_positions(self):
        return self._positions

    def create_market_sell_order(self, symbol, amount, params=None):
        order = {"symbol": symbol, "side": "sell", "amount": amount, "status": "closed"}
        self.orders.append(order)
        return order

    def create_market_buy_order(self, symbol, amount, params=None):
        order = {"symbol": symbol, "side": "buy", "amount": amount, "status": "closed"}
        self.orders.append(order)
        return order


def _make_position(symbol, side, contracts, pnl=0.0):
    return {
        "symbol": symbol,
        "side": side,
        "contracts": contracts,
        "unrealizedPnl": pnl,
        "entryPrice": 100.0,
        "markPrice": 101.0,
    }


# ── emergency_close ──────────────────────────────────────────

def test_emergency_close_all_positions(tmp_path, monkeypatch):
    log_path = tmp_path / "records" / "risk_events.jsonl"
    monkeypatch.setattr("clawchat.cmd_emergency.RISK_EVENTS_LOG", str(log_path))

    positions = [
        _make_position("NTRN/USDT:USDT", "long", 100, 5.0),
        _make_position("ETH/USDT:USDT", "short", 0.5, -2.0),
    ]
    ex = MockExchange(positions)
    results = emergency_close(ex)

    assert len(results) == 2
    assert results[0]["symbol"] == "NTRN/USDT:USDT"
    assert results[0]["side"] == "long"
    assert results[0]["status"] == "closed"
    assert results[1]["symbol"] == "ETH/USDT:USDT"
    assert results[1]["side"] == "short"
    assert ex.orders[0]["side"] == "sell"   # close long = sell
    assert ex.orders[1]["side"] == "buy"    # close short = buy

    # risk events logged
    lines = log_path.read_text().strip().split("\n")
    assert len(lines) == 2


def test_emergency_close_no_positions(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )
    ex = MockExchange([])
    results = emergency_close(ex)
    assert results == []
    assert "无持仓" in capsys.readouterr().out


def test_emergency_close_skips_zero_contracts(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )
    positions = [
        _make_position("NTRN/USDT:USDT", "long", 0),
        _make_position("ETH/USDT:USDT", "short", 0.5, -1.0),
    ]
    ex = MockExchange(positions)
    results = emergency_close(ex)
    assert len(results) == 1
    assert results[0]["symbol"] == "ETH/USDT:USDT"


def test_emergency_close_by_strategy(tmp_path, monkeypatch):
    log_path = tmp_path / "records" / "risk_events.jsonl"
    monkeypatch.setattr("clawchat.cmd_emergency.RISK_EVENTS_LOG", str(log_path))

    # Create strategy dir
    strat_dir = tmp_path / "strategies" / "ntrn-trend"
    strat_dir.mkdir(parents=True)
    (strat_dir / "strategy.json").write_text(
        json.dumps({"name": "ntrn-trend", "symbol": "NTRNUSDT"})
    )

    positions = [
        _make_position("NTRN/USDT:USDT", "long", 100, 5.0),
        _make_position("ETH/USDT:USDT", "short", 0.5, -2.0),
    ]
    ex = MockExchange(positions)
    results = emergency_close(
        ex, strategy_name="ntrn-trend",
        strategies_dir=str(tmp_path / "strategies"),
    )

    # Only NTRN should be closed
    assert len(results) == 1
    assert results[0]["symbol"] == "NTRN/USDT:USDT"
    assert len(ex.orders) == 1


def test_emergency_close_strategy_not_found(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )
    ex = MockExchange([_make_position("NTRN/USDT:USDT", "long", 100)])
    results = emergency_close(
        ex, strategy_name="nonexistent",
        strategies_dir=str(tmp_path / "strategies"),
    )
    assert results == []
    assert "未找到" in capsys.readouterr().out


def test_emergency_close_strategy_no_matching_position(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )
    strat_dir = tmp_path / "strategies" / "ntrn-trend"
    strat_dir.mkdir(parents=True)
    (strat_dir / "strategy.json").write_text(
        json.dumps({"name": "ntrn-trend", "symbol": "NTRNUSDT"})
    )

    # Only ETH position, no NTRN
    positions = [_make_position("ETH/USDT:USDT", "short", 0.5)]
    ex = MockExchange(positions)
    results = emergency_close(
        ex, strategy_name="ntrn-trend",
        strategies_dir=str(tmp_path / "strategies"),
    )
    assert results == []
    assert "无持仓" in capsys.readouterr().out


def test_emergency_close_handles_order_error(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )

    class FailExchange(MockExchange):
        def create_market_sell_order(self, symbol, amount, params=None):
            raise Exception("API error")

    positions = [_make_position("NTRN/USDT:USDT", "long", 100)]
    ex = FailExchange(positions)
    results = emergency_close(ex)

    assert len(results) == 1
    assert "error" in results[0]["status"]


def test_emergency_close_multiple_same_symbol(tmp_path, monkeypatch):
    """Multiple positions for the same symbol (long + short)."""
    monkeypatch.setattr(
        "clawchat.cmd_emergency.RISK_EVENTS_LOG",
        str(tmp_path / "records" / "risk_events.jsonl"),
    )
    positions = [
        _make_position("NTRN/USDT:USDT", "long", 100, 5.0),
        _make_position("NTRN/USDT:USDT", "short", 50, -1.0),
    ]
    ex = MockExchange(positions)
    results = emergency_close(ex)
    assert len(results) == 2
    assert ex.orders[0]["side"] == "sell"  # close long
    assert ex.orders[1]["side"] == "buy"   # close short
