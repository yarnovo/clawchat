SHELL := /bin/bash
export BASH_ENV := .env

ROOT := $(shell pwd)
PY := cd $(ROOT)/scripts && uv run python

.PHONY: install clean watch account klines scan status backtest start stop projects project-create project-info promote demote report notify help

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

klines: ## Klines (SYMBOL=BTC/USDT TF=1h LIMIT=10)
	@$(PY) market.py klines $(or $(SYMBOL),BTC/USDT) $(or $(TF),1h) $(or $(LIMIT),10)

scan: ## Scan high volatility coins
	@$(PY) market.py scan

# === Strategy ===

status: ## All strategy status
	@$(PY) grid.py status
	@$(PY) rsi.py status
	@$(PY) bollinger.py status
	@$(PY) runner.py status

start: ## Start all strategies
	@$(PY) runner.py start

stop: ## Stop all strategies
	@$(PY) runner.py stop

check: ## Check auto-promote conditions
	@$(PY) runner.py check

promote: ## Promote to live (SYMBOL=)
	@$(PY) runner.py promote $(SYMBOL)

demote: ## Demote to dryrun (SYMBOL=)
	@$(PY) runner.py demote $(SYMBOL)

backtest: ## Backtest (SYMBOL= LOWER= UPPER= GRIDS=10 AMOUNT=50 DAYS=30)
	@$(PY) grid.py backtest --symbol $(or $(SYMBOL),BTC/USDT) --lower $(LOWER) --upper $(UPPER) --grids $(or $(GRIDS),10) --amount $(or $(AMOUNT),50) --days $(or $(DAYS),30)

# === Projects ===

projects: ## List projects
	@$(PY) projects.py list

project-create: ## Create project (NAME= FUND=0)
	@$(PY) projects.py create $(NAME) --fund $(or $(FUND),0)

project-info: ## Project info (NAME=)
	@$(PY) projects.py info $(NAME)

# === Notify ===

report: ## Send status report email
	@cd $(ROOT)/scripts && \
	GRID=$$(uv run python grid.py status 2>&1) && \
	RSI=$$(uv run python rsi.py status 2>&1) && \
	MARKET=$$(uv run python market.py watch 2>&1) && \
	RUNNER=$$(uv run python runner.py status 2>&1) && \
	PROCS=$$(ps aux | grep -E "grid.py run|rsi.py run" | grep -v grep | wc -l | tr -d ' ') && \
	uv run python notify.py "ClawChat 状态报告" "$$GRID" "$$RSI" "$$RUNNER" "$$MARKET" "进程: $$PROCS 个"

notify: ## Send email (SUBJECT= BODY=)
	@$(PY) notify.py "$(SUBJECT)" "$(BODY)"

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
