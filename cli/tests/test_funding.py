"""Tests for cmd_funding — 资金费率格式化、CSV 读写、symbol 收集。"""

import csv
import json
from pathlib import Path

from clawchat.cmd_funding import (
    format_rate,
    format_timestamp,
    load_local_history,
    append_to_csv,
    get_strategy_symbols,
    print_current,
    print_history,
    CSV_FIELDS,
)


# ── format_rate ──


def test_format_rate_positive_high():
    result = format_rate(0.001)
    assert "+0.1000%" in result
    # 高费率应包含红色 ANSI
    assert "\033[91m" in result


def test_format_rate_negative_high():
    result = format_rate(-0.001)
    assert "-0.1000%" in result
    # 负费率应包含绿色 ANSI
    assert "\033[92m" in result


def test_format_rate_neutral():
    result = format_rate(0.0001)
    assert "+0.0100%" in result
    # 中性费率无颜色
    assert "\033[91m" not in result
    assert "\033[92m" not in result


def test_format_rate_zero():
    result = format_rate(0.0)
    assert "+0.0000%" in result


def test_format_rate_none():
    result = format_rate(None)
    assert "N/A" in result


# ── format_timestamp ──


def test_format_timestamp_millis():
    # 2026-03-19 10:00:00 UTC = 1773914400000 ms
    result = format_timestamp(1773914400000)
    assert "2026-03-19" in result
    assert "10:00 UTC" in result


def test_format_timestamp_iso():
    result = format_timestamp("2026-03-19T10:00:00Z")
    assert "2026-03-19" in result
    assert "10:00 UTC" in result


def test_format_timestamp_none():
    assert format_timestamp(None) == "N/A"


def test_format_timestamp_invalid():
    result = format_timestamp("not-a-date")
    assert result == "not-a-date"


# ── load_local_history / append_to_csv ──


def test_load_local_history_missing_file(monkeypatch):
    monkeypatch.setattr(
        "clawchat.cmd_funding.FUNDING_CSV",
        Path("/nonexistent/funding.csv"),
    )
    assert load_local_history() == []


def test_append_and_load_csv(tmp_path, monkeypatch):
    csv_path = tmp_path / "funding_rate_history.csv"
    monkeypatch.setattr("clawchat.cmd_funding.FUNDING_CSV", csv_path)
    monkeypatch.setattr("clawchat.cmd_funding.RECORDS_DIR", tmp_path)

    records = [
        {
            "timestamp": "2026-03-19T08:00:00Z",
            "symbol": "NTRN/USDT",
            "funding_rate": 0.0001,
            "next_funding_time": "2026-03-19T16:00:00Z",
        },
        {
            "timestamp": "2026-03-19T08:00:00Z",
            "symbol": "BAN/USDT",
            "funding_rate": -0.0002,
            "next_funding_time": "2026-03-19T16:00:00Z",
        },
    ]
    append_to_csv(records)
    assert csv_path.exists()

    # 加载全部
    loaded = load_local_history()
    assert len(loaded) == 2

    # 按 symbol 过滤
    ntrn = load_local_history("NTRN/USDT")
    assert len(ntrn) == 1
    assert ntrn[0]["symbol"] == "NTRN/USDT"


def test_append_csv_creates_header(tmp_path, monkeypatch):
    csv_path = tmp_path / "funding_rate_history.csv"
    monkeypatch.setattr("clawchat.cmd_funding.FUNDING_CSV", csv_path)
    monkeypatch.setattr("clawchat.cmd_funding.RECORDS_DIR", tmp_path)

    append_to_csv([{
        "timestamp": "2026-03-19T08:00:00Z",
        "symbol": "TEST/USDT",
        "funding_rate": 0.001,
        "next_funding_time": "",
    }])

    content = csv_path.read_text()
    first_line = content.split("\n")[0]
    for field in CSV_FIELDS:
        assert field in first_line


def test_append_csv_no_duplicate_header(tmp_path, monkeypatch):
    csv_path = tmp_path / "funding_rate_history.csv"
    monkeypatch.setattr("clawchat.cmd_funding.FUNDING_CSV", csv_path)
    monkeypatch.setattr("clawchat.cmd_funding.RECORDS_DIR", tmp_path)

    record = {
        "timestamp": "2026-03-19T08:00:00Z",
        "symbol": "TEST/USDT",
        "funding_rate": 0.001,
        "next_funding_time": "",
    }
    append_to_csv([record])
    append_to_csv([record])

    lines = csv_path.read_text().strip().split("\n")
    header_count = sum(1 for l in lines if l.startswith("timestamp"))
    assert header_count == 1


def test_load_local_history_limit(tmp_path, monkeypatch):
    csv_path = tmp_path / "funding_rate_history.csv"
    monkeypatch.setattr("clawchat.cmd_funding.FUNDING_CSV", csv_path)
    monkeypatch.setattr("clawchat.cmd_funding.RECORDS_DIR", tmp_path)

    records = [
        {
            "timestamp": f"2026-03-{19+i:02d}T08:00:00Z",
            "symbol": "TEST/USDT",
            "funding_rate": 0.0001 * i,
            "next_funding_time": "",
        }
        for i in range(10)
    ]
    append_to_csv(records)

    loaded = load_local_history(limit=3)
    assert len(loaded) == 3


# ── get_strategy_symbols ──


def test_get_strategy_symbols(tmp_path, monkeypatch):
    monkeypatch.setattr("clawchat.cmd_funding.STRATEGIES_DIR", tmp_path)

    # 创建策略目录
    (tmp_path / "ntrn-trend").mkdir()
    (tmp_path / "ntrn-trend" / "strategy.json").write_text(
        json.dumps({"symbol": "NTRNUSDT"})
    )
    (tmp_path / "ban-bollinger").mkdir()
    (tmp_path / "ban-bollinger" / "strategy.json").write_text(
        json.dumps({"symbol": "BANUSDT"})
    )
    # 重复 symbol 应去重
    (tmp_path / "ntrn-fast").mkdir()
    (tmp_path / "ntrn-fast" / "strategy.json").write_text(
        json.dumps({"symbol": "NTRNUSDT"})
    )

    symbols = get_strategy_symbols()
    assert "BAN/USDT" in symbols
    assert "NTRN/USDT" in symbols
    assert len(symbols) == 2  # 去重


def test_get_strategy_symbols_empty(tmp_path, monkeypatch):
    monkeypatch.setattr("clawchat.cmd_funding.STRATEGIES_DIR", tmp_path)
    assert get_strategy_symbols() == []


def test_get_strategy_symbols_invalid_json(tmp_path, monkeypatch):
    monkeypatch.setattr("clawchat.cmd_funding.STRATEGIES_DIR", tmp_path)
    (tmp_path / "broken").mkdir()
    (tmp_path / "broken" / "strategy.json").write_text("not json")
    assert get_strategy_symbols() == []


# ── print_current ──


def test_print_current_no_error(capsys):
    results = [
        {
            "symbol": "NTRN/USDT",
            "funding_rate": 0.0001,
            "next_funding_time": 1773914400000,
            "mark_price": 0.35,
        },
    ]
    print_current(results)
    out = capsys.readouterr().out
    assert "NTRN/USDT" in out
    assert "0.0100%" in out


def test_print_current_with_error(capsys):
    results = [
        {
            "symbol": "FAIL/USDT",
            "funding_rate": None,
            "next_funding_time": None,
            "mark_price": None,
            "error": "some error",
        },
    ]
    print_current(results)
    out = capsys.readouterr().out
    assert "FAIL/USDT" in out
    assert "获取失败" in out


# ── print_history ──


def test_print_history_empty(capsys):
    print_history([], "TEST/USDT")
    out = capsys.readouterr().out
    assert "无历史资金费率记录" in out


def test_print_history_with_data(capsys):
    records = [
        {"timestamp": 1773914400000, "funding_rate": 0.0001},
        {"timestamp": 1773943200000, "funding_rate": -0.0002},
    ]
    print_history(records, "TEST/USDT")
    out = capsys.readouterr().out
    assert "TEST/USDT" in out
    assert "平均费率" in out
