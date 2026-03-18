SHELL := /bin/bash
export BASH_ENV := .env

PY := cd scripts && uv run python

.PHONY: install clean watch account klines scan status backtest start stop projects project-create project-info report notify help

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

status: ## Grid strategy status
	@$(PY) grid.py status

backtest: ## Backtest (SYMBOL= LOWER= UPPER= GRIDS=10 AMOUNT=50 DAYS=30)
	@$(PY) grid.py backtest --symbol $(or $(SYMBOL),BTC/USDT) --lower $(LOWER) --upper $(UPPER) --grids $(or $(GRIDS),10) --amount $(or $(AMOUNT),50) --days $(or $(DAYS),30)

start: ## Start all grids (dry-run)
	@pkill -f "grid.py run" 2>/dev/null || true
	@cd scripts && \
	nohup uv run python grid.py run --symbol BTC/USDT --lower 70000 --upper 80000 --grids 10 --amount 10 --interval 120 --dry-run > ../data/btc-grid.log 2>&1 & \
	nohup uv run python grid.py run --symbol ETH/USDT --lower 2000 --upper 2800 --grids 10 --amount 10 --interval 120 --dry-run > ../data/eth-grid.log 2>&1 & \
	nohup uv run python grid.py run --symbol HYPER/USDT --lower 0.09 --upper 0.13 --grids 20 --amount 5 --interval 60 --dry-run > ../data/hyper-grid.log 2>&1 & \
	echo "started"

stop: ## Stop all grids
	@pkill -f "grid.py run" 2>/dev/null && echo "stopped" || echo "nothing running"

# === Projects ===

projects: ## List projects
	@$(PY) projects.py list

project-create: ## Create project (NAME= FUND=0)
	@$(PY) projects.py create $(NAME) --fund $(or $(FUND),0)

project-info: ## Project info (NAME=)
	@$(PY) projects.py info $(NAME)

# === Notify ===

report: ## Send status report email
	@cd scripts && \
	GRID=$$(uv run python grid.py status 2>&1) && \
	MARKET=$$(uv run python market.py watch 2>&1) && \
	PROJ=$$(uv run python projects.py list 2>&1) && \
	PROCS=$$(ps aux | grep "grid.py run" | grep -v grep | wc -l | tr -d ' ') && \
	uv run python notify.py "ClawChat 状态报告" "$$PROJ" "$$GRID" "$$MARKET" "进程: $$PROCS 个 | dry-run"

notify: ## Send email (SUBJECT= BODY=)
	@$(PY) notify.py "$(SUBJECT)" "$(BODY)"

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
