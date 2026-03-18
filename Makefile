SHELL := /bin/bash
export BASH_ENV := .env

ROOT := $(shell pwd)
PY := cd $(ROOT)/scripts && uv run python

.PHONY: install clean watch account scan backtest pnl check build hft notify report-dev help

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

backtest: ## Backtest (SYMBOL= STRATEGY=scalping DAYS=7 LEVERAGE=5 TIMEFRAME=5m CAPITAL=200)
	@$(PY) backtest.py --symbol $(or $(SYMBOL),BTC/USDT) --strategy $(or $(STRATEGY),scalping) --days $(or $(DAYS),7) --leverage $(or $(LEVERAGE),5) --capital $(or $(CAPITAL),200) --timeframe $(or $(TIMEFRAME),5m)

# === Trading ===

pnl: ## Real P&L from exchange trades
	@$(PY) pnl.py $(SYMBOL) $(HOURS)

check: ## Risk check (stop loss / position / liquidation)
	@$(PY) check.py $(if $(AUTO_STOP),--auto-stop)

# === Engine (Rust) ===

build: ## Build Rust engine (release)
	cd engine && cargo build --release

hft: ## Run Rust HFT engine
	cd engine && cargo run --release

# === Reports ===

report-dev: ## Iteration report (on commit)
	@cd $(ROOT)/scripts && \
	MSG=$$(git -C .. log -1 --format="%H%n%s%n%n%b" 2>&1) && \
	LOG=$$(git -C .. log --oneline -5 2>&1) && \
	DIFF=$$(git -C .. diff --stat HEAD~1 2>&1) && \
	SKILLS=$$(ls -1 ../.claude/skills/ 2>&1) && \
	SCRIPTS=$$(ls -1 . 2>&1) && \
	uv run python notify.py "迭代报告" "== 最新提交 ==" "$$MSG" "== 最近5条 ==" "$$LOG" "== 文件变更 ==" "$$DIFF" "== Skills ==" "$$SKILLS" "== Scripts ==" "$$SCRIPTS"

notify: ## Send email (SUBJECT= BODY=)
	@$(PY) notify.py "$(SUBJECT)" "$(BODY)"

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
