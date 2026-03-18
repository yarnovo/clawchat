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

pnl: ## Live P&L (real money profit)
	@$(PY) runner.py pnl

stoploss: ## Run stoploss check only
	@$(PY) runner.py stoploss

check: ## Check promote + stoploss
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

# === Reports ===

report-brief: ## Operations brief (every 30m)
	@cd $(ROOT)/scripts && \
	PNL=$$(uv run python runner.py pnl 2>&1) && \
	CHECK=$$(uv run python runner.py check 2>&1) && \
	LIVE=$$(cat $(ROOT)/data/strategies.json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'实盘:{sum(1 for s in d if s.get(\"mode\")==\"live\")} 模拟:{sum(1 for s in d if s.get(\"mode\")!=\"live\")} 总:{len(d)}')" 2>/dev/null || echo '-') && \
	PROCS=$$(ps aux | grep -E "grid.py run|rsi.py run|bollinger.py run" | grep -v grep | wc -l | tr -d ' ') && \
	uv run python notify.py "运营快报" "== KPI 进度 ==" "$$PNL" "策略: $$LIVE | 进程: $$PROCS 个" "== promote + 风控 ==" "$$CHECK"

report-daily: ## Operations daily (daily 20:00)
	@cd $(ROOT)/scripts && \
	PNL=$$(uv run python runner.py pnl 2>&1) && \
	GRID=$$(uv run python grid.py status 2>&1) && \
	RSI=$$(uv run python rsi.py status 2>&1) && \
	BOLL=$$(uv run python bollinger.py status 2>&1) && \
	RUNNER=$$(uv run python runner.py status 2>&1) && \
	ACCOUNT=$$(uv run python market.py account 2>&1) && \
	MARKET=$$(uv run python market.py watch 2>&1) && \
	PROCS=$$(ps aux | grep -E "grid.py run|rsi.py run|bollinger.py run" | grep -v grep | wc -l | tr -d ' ') && \
	uv run python notify.py "运营日报" "== 实盘盈亏 ==" "$$PNL" "== 策略归因 ==" "$$GRID" "$$RSI" "$$BOLL" "== 策略配置 ==" "$$RUNNER" "== 持仓 ==" "$$ACCOUNT" "== 行情 ==" "$$MARKET" "进程: $$PROCS 个"

report-dev: ## Iteration report (on commit)
	@cd $(ROOT)/scripts && \
	MSG=$$(git -C .. log -1 --format="%H%n%s%n%n%b" 2>&1) && \
	LOG=$$(git -C .. log --oneline -5 2>&1) && \
	DIFF=$$(git -C .. diff --stat HEAD~1 2>&1) && \
	SKILLS=$$(ls -1 ../.claude/skills/ 2>&1) && \
	SCRIPTS=$$(ls -1 . 2>&1) && \
	uv run python notify.py "迭代报告" "== 最新提交 ==" "$$MSG" "== 最近5条 ==" "$$LOG" "== 文件变更 ==" "$$DIFF" "== Skills ==" "$$SKILLS" "== Scripts ==" "$$SCRIPTS"

report: report-brief ## Alias for report-brief

notify: ## Send email (SUBJECT= BODY=)
	@$(PY) notify.py "$(SUBJECT)" "$(BODY)"

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
