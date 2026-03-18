.PHONY: install clean watch account status start stop projects help

install: ## Install all deps
	uv sync
	@[ -f package.json ] && npm install --silent 2>/dev/null || true

clean: ## Clean cache and venv
	rm -rf .venv node_modules __pycache__ scripts/__pycache__

watch: ## Market prices
	@source .env && cd scripts && uv run python market.py watch

account: ## Account balance
	@source .env && cd scripts && uv run python market.py account

status: ## Grid strategy status
	@source .env && cd scripts && uv run python grid.py status

start: ## Start all grids (dry-run)
	@source .env && cd scripts && pkill -f "grid.py run" 2>/dev/null; \
	nohup uv run python grid.py run --symbol BTC/USDT --lower 70000 --upper 80000 --grids 10 --amount 10 --interval 120 --dry-run > ../data/btc-grid.log 2>&1 & \
	nohup uv run python grid.py run --symbol ETH/USDT --lower 2000 --upper 2800 --grids 10 --amount 10 --interval 120 --dry-run > ../data/eth-grid.log 2>&1 & \
	nohup uv run python grid.py run --symbol HYPER/USDT --lower 0.09 --upper 0.13 --grids 20 --amount 5 --interval 60 --dry-run > ../data/hyper-grid.log 2>&1 & \
	echo "started"

stop: ## Stop all grids
	@pkill -f "grid.py run" 2>/dev/null && echo "stopped" || echo "nothing running"

projects: ## List projects
	@source .env && cd scripts && uv run python projects.py list

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
