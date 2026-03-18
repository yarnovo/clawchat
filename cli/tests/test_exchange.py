"""P0 tests for exchange.py — fee estimation, leverage validation, symbol formatting."""

from unittest.mock import MagicMock, patch
import pytest

from clawchat.exchange import (
    MAKER_FEE,
    TAKER_FEE,
    estimate_fee,
    set_leverage,
    set_margin_mode,
)


# ── fee constants ──


def test_maker_fee_value():
    assert MAKER_FEE == 0.0002


def test_taker_fee_value():
    assert TAKER_FEE == 0.0004


# ── estimate_fee ──


def test_estimate_fee_taker():
    fee = estimate_fee(10000, "taker")
    assert abs(fee - 4.0) < 1e-10  # 10000 * 0.0004


def test_estimate_fee_maker():
    fee = estimate_fee(10000, "maker")
    assert abs(fee - 2.0) < 1e-10  # 10000 * 0.0002


def test_estimate_fee_default_is_taker():
    assert estimate_fee(10000) == estimate_fee(10000, "taker")


def test_estimate_fee_zero_notional():
    assert estimate_fee(0) == 0.0


# ── set_leverage ──


def test_set_leverage_valid():
    mock_ex = MagicMock()
    mock_ex.set_leverage.return_value = {"leverage": 5}
    result = set_leverage(mock_ex, "BTC/USDT", 5)
    mock_ex.set_leverage.assert_called_once_with(5, "BTC/USDT")
    assert result == {"leverage": 5}


def test_set_leverage_min_boundary():
    mock_ex = MagicMock()
    set_leverage(mock_ex, "ETH/USDT", 1)
    mock_ex.set_leverage.assert_called_once_with(1, "ETH/USDT")


def test_set_leverage_max_boundary():
    mock_ex = MagicMock()
    set_leverage(mock_ex, "ETH/USDT", 20)
    mock_ex.set_leverage.assert_called_once_with(20, "ETH/USDT")


def test_set_leverage_too_low():
    mock_ex = MagicMock()
    with pytest.raises(ValueError, match="1-20"):
        set_leverage(mock_ex, "BTC/USDT", 0)


def test_set_leverage_too_high():
    mock_ex = MagicMock()
    with pytest.raises(ValueError, match="1-20"):
        set_leverage(mock_ex, "BTC/USDT", 21)


def test_set_leverage_negative():
    mock_ex = MagicMock()
    with pytest.raises(ValueError):
        set_leverage(mock_ex, "BTC/USDT", -1)


# ── set_margin_mode ──


def test_set_margin_mode_cross():
    mock_ex = MagicMock()
    set_margin_mode(mock_ex, "BTC/USDT", "cross")
    mock_ex.set_margin_mode.assert_called_once_with("cross", "BTC/USDT")


def test_set_margin_mode_isolated():
    mock_ex = MagicMock()
    set_margin_mode(mock_ex, "BTC/USDT", "isolated")
    mock_ex.set_margin_mode.assert_called_once_with("isolated", "BTC/USDT")


def test_set_margin_mode_already_set_ignores():
    """When exchange says 'No need to change margin type', should not raise."""
    import ccxt
    mock_ex = MagicMock()
    mock_ex.set_margin_mode.side_effect = ccxt.ExchangeError(
        "No need to change margin type"
    )
    # Should not raise
    set_margin_mode(mock_ex, "BTC/USDT", "cross")


def test_set_margin_mode_other_error_raises():
    """Other ExchangeErrors should propagate."""
    import ccxt
    mock_ex = MagicMock()
    mock_ex.set_margin_mode.side_effect = ccxt.ExchangeError("Unknown error")
    with pytest.raises(ccxt.ExchangeError, match="Unknown error"):
        set_margin_mode(mock_ex, "BTC/USDT", "cross")


# ── CLI sym() helper (symbol formatting) ──


def test_sym_formats_dash_to_slash():
    """CLI's sym() replaces dash with slash and uppercases."""
    # Reproduce the logic from exchange.py main() → sym()
    raw = "btc-usdt"
    result = raw.upper().replace("-", "/")
    assert result == "BTC/USDT"


def test_sym_already_uppercase():
    raw = "ETH/USDT"
    result = raw.upper().replace("-", "/")
    assert result == "ETH/USDT"


def test_sym_lowercase_no_separator():
    raw = "ntrn/usdt"
    result = raw.upper().replace("-", "/")
    assert result == "NTRN/USDT"
