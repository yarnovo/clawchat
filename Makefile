SHELL := /bin/bash
export BASH_ENV := .env

ROOT := $(shell pwd)
PY := cd $(ROOT)/scripts && uv run python

.PHONY: install clean watch account scan backtest batch-backtest grid-search pnl strategy-pnl compare check watcher status build hft transfer help

# === Setup ===

install: ## Install all deps
	uv sync
	@[ -f package.json ] && npm install --silent 2>/dev/null || true

clean: ## Clean cache and venv
	rm -rf .venv node_modules __pycache__ scripts/__pycache__

# === Market ===

watch: ## Market prices
	@$(PY) market.py watch

account: ## Account balance
	@$(PY) market.py account

scan: ## Scan high volatility coins
	@$(PY) market.py scan

# === Backtest ===

backtest: ## Backtest (SYMBOL= STRATEGY=scalping DAYS=7 LEVERAGE=5 TIMEFRAME=5m CAPITAL=200 PARAMS=)
	@$(PY) backtest.py --symbol $(or $(SYMBOL),BTC/USDT) --strategy $(or $(STRATEGY),scalping) --days $(or $(DAYS),7) --leverage $(or $(LEVERAGE),5) --capital $(or $(CAPITAL),200) --timeframe $(or $(TIMEFRAME),5m) $(if $(PARAMS),--params '$(PARAMS)')

batch-backtest: ## Batch backtest N coins x M strategies (SYMBOLS= STRATEGIES= TOP=15 DAYS=14 TIMEFRAME=5m)
	@$(PY) batch_backtest.py $(if $(SYMBOLS),--symbols $(SYMBOLS)) $(if $(STRATEGIES),--strategies $(STRATEGIES)) $(if $(LEVERAGES),--leverages $(LEVERAGES)) --top $(or $(TOP),15) --days $(or $(DAYS),14) --timeframe $(or $(TIMEFRAME),5m) --capital $(or $(CAPITAL),200)

grid-search: ## Grid search params (SYMBOL= STRATEGY= DAYS=14 TIMEFRAME=5m LEVERAGE=3)
	@$(PY) grid_search.py --symbol $(or $(SYMBOL),BTC/USDT) --strategy $(or $(STRATEGY),trend) --days $(or $(DAYS),14) --timeframe $(or $(TIMEFRAME),5m) --leverage $(or $(LEVERAGE),3) --capital $(or $(CAPITAL),200)

# === Trading ===

transfer: ## Transfer USDT spot→futures (AMOUNT=197)
	@$(PY) futures_exchange.py transfer $(or $(AMOUNT),197)

pnl: ## Real P&L from exchange trades
	@$(PY) pnl.py $(SYMBOL) $(HOURS)

check: ## Risk check (stop loss / position / liquidation)
	@$(PY) check.py $(if $(AUTO_STOP),--auto-stop)

watcher: ## Strategy watcher (auto deploy/stop engines from strategies/)
	@$(PY) strategy_watcher.py

status: ## Global status dashboard (engines/account/positions/risk/strategies)
	@$(PY) status.py

strategy-pnl: ## P&L by strategy (from trades.jsonl)
	@$(PY) strategy_pnl.py

compare: ## Live vs backtest compare (STRATEGY=)
	@$(PY) live_vs_backtest.py $(STRATEGY)

# === Engine (Rust) ===

build: ## Build Rust engine (release)
	cd engine && cargo build --release

hft: ## Run Rust HFT engine
	cd engine && cargo run --release --bin hft-engine

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
