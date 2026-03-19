SHELL := /bin/bash
export BASH_ENV := .env

.PHONY: build hft autopilot status watcher report-engine report-daily report-weekly snapshot data-engine data-backfill data-status data-validate discover discover-scan discover-status start-data stop-data status-data start-engine stop-engine status-engine start-autopilot stop-autopilot status-autopilot start-all stop-all status-all install clean test help

# === Build ===

build: ## Build all binaries (release)
	cargo build --release

# === Engine (Rust) ===

hft: ## Run multi-strategy engine (per-strategy mode from signal.json)
	cargo run --release -p hft-engine

# === Autopilot (Rust) ===

autopilot: ## Run autopilot (algorithm-driven trade control)
	cargo run --release -p autopilot

# === CLI (Rust) ===

status: ## Global status dashboard
	cargo run --release -p clawchat-ops -- status

watcher: ## Strategy watcher (auto deploy/stop engines)
	cargo run --release -p clawchat-ops -- watcher

# === Reports ===

report-engine: ## Run report engine (daily/weekly scheduler)
	cargo run --release -p clawchat-ops -- report-engine

report-daily: ## Generate daily report
	cargo run --release -p report-engine -- daily

report-weekly: ## Generate weekly report
	cargo run --release -p report-engine -- weekly

snapshot: ## Generate status snapshot (real-time overview)
	cargo run --release -p report-engine -- snapshot

# === Data Engine ===

data-engine: ## Start data engine (real-time kline collection)
	cargo run --release -p data-engine -- run

data-backfill: ## Backfill historical klines (default 180 days)
	cargo run --release -p data-engine -- backfill --days 180

data-status: ## Show data collection status
	cargo run --release -p data-engine -- status

data-validate: ## Validate data quality
	cargo run --release -p data-engine -- validate

# === Discovery ===

discover: ## Run strategy discovery scan (all strategies, all symbols)
	cargo run --release -p discovery -- scan --strategy all --symbol all

discover-scan: ## Run discovery scan for specific strategy/symbol
	@echo "Usage: make discover-scan STRATEGY=trend SYMBOL=NTRNUSDT DAYS=90"
	cargo run --release -p discovery -- scan --strategy $(STRATEGY) --symbol $(SYMBOL) --days $(DAYS)

discover-status: ## Show discovery results
	cargo run --release -p discovery -- status

# === 后台服务管理 ===

start-data: ## Start data engine in background
	@mkdir -p .pid logs
	@if [ -f .pid/data-engine.pid ] && kill -0 $$(cat .pid/data-engine.pid) 2>/dev/null; then \
		echo "数据引擎已在运行 (PID $$(cat .pid/data-engine.pid))"; \
	else \
		nohup cargo run --release -p data-engine -- run > logs/data-engine.log 2>&1 & \
		echo $$! > .pid/data-engine.pid; \
		echo "数据引擎已启动 (PID $$!)"; \
		echo "日志: logs/data-engine.log"; \
	fi

stop-data: ## Stop data engine
	@if [ -f .pid/data-engine.pid ]; then \
		PID=$$(cat .pid/data-engine.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "数据引擎已停止 (PID $$PID)"; \
		else \
			echo "数据引擎未在运行 (PID $$PID 已退出)"; \
		fi; \
		rm -f .pid/data-engine.pid; \
	else \
		echo "数据引擎未在运行（无 PID 文件）"; \
	fi

status-data: ## Check data engine status
	@if [ -f .pid/data-engine.pid ] && kill -0 $$(cat .pid/data-engine.pid) 2>/dev/null; then \
		echo "✅ 数据引擎运行中 (PID $$(cat .pid/data-engine.pid))"; \
		echo "   日志: $$(tail -1 logs/data-engine.log 2>/dev/null || echo '无')"; \
	else \
		echo "❌ 数据引擎未运行"; \
	fi

start-engine: ## Start trading engine in background (per-strategy mode from signal.json)
	@mkdir -p .pid logs
	@if [ -f .pid/engine.pid ] && kill -0 $$(cat .pid/engine.pid) 2>/dev/null; then \
		echo "交易引擎已在运行 (PID $$(cat .pid/engine.pid))"; \
	else \
		nohup cargo run --release -p hft-engine > logs/engine.log 2>&1 & \
		echo $$! > .pid/engine.pid; \
		echo "交易引擎已启动 (PID $$!)"; \
		echo "日志: logs/engine.log"; \
	fi

stop-engine: ## Stop trading engine
	@if [ -f .pid/engine.pid ]; then \
		PID=$$(cat .pid/engine.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "交易引擎已停止 (PID $$PID)"; \
		else \
			echo "交易引擎未在运行 (PID $$PID 已退出)"; \
		fi; \
		rm -f .pid/engine.pid; \
	else \
		echo "交易引擎未在运行（无 PID 文件）"; \
	fi

status-engine: ## Check trading engine status
	@if [ -f .pid/engine.pid ] && kill -0 $$(cat .pid/engine.pid) 2>/dev/null; then \
		echo "✅ 交易引擎运行中 (PID $$(cat .pid/engine.pid))"; \
		echo "   日志: $$(tail -1 logs/engine.log 2>/dev/null || echo '无')"; \
	else \
		echo "❌ 交易引擎未运行"; \
	fi

start-autopilot: ## Start autopilot in background
	@mkdir -p .pid logs
	@if [ -f .pid/autopilot.pid ] && kill -0 $$(cat .pid/autopilot.pid) 2>/dev/null; then \
		echo "Autopilot 已在运行 (PID $$(cat .pid/autopilot.pid))"; \
	else \
		nohup cargo run --release -p autopilot > logs/autopilot.log 2>&1 & \
		echo $$! > .pid/autopilot.pid; \
		echo "Autopilot 已启动 (PID $$!)"; \
		echo "日志: logs/autopilot.log"; \
	fi

stop-autopilot: ## Stop autopilot
	@if [ -f .pid/autopilot.pid ]; then \
		PID=$$(cat .pid/autopilot.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "Autopilot 已停止 (PID $$PID)"; \
		else \
			echo "Autopilot 未在运行 (PID $$PID 已退出)"; \
		fi; \
		rm -f .pid/autopilot.pid; \
	else \
		echo "Autopilot 未在运行（无 PID 文件）"; \
	fi

status-autopilot: ## Check autopilot status
	@if [ -f .pid/autopilot.pid ] && kill -0 $$(cat .pid/autopilot.pid) 2>/dev/null; then \
		echo "✅ Autopilot 运行中 (PID $$(cat .pid/autopilot.pid))"; \
		echo "   日志: $$(tail -1 logs/autopilot.log 2>/dev/null || echo '无')"; \
	else \
		echo "❌ Autopilot 未运行"; \
	fi

# === Phase 3: 一键管理 ===

start-all: ## Start all services (data + engine + autopilot)
	@$(MAKE) start-data
	@sleep 2
	@$(MAKE) start-engine
	@sleep 1
	@$(MAKE) start-autopilot

stop-all: ## Stop all services
	@$(MAKE) stop-autopilot
	@$(MAKE) stop-engine
	@$(MAKE) stop-data

status-all: ## Check all services status
	@$(MAKE) status-data
	@$(MAKE) status-engine
	@$(MAKE) status-autopilot

# === Deps ===

install: ## Install Rust toolchain deps
	cargo fetch

clean: ## Clean build artifacts
	cargo clean

# === Test ===

test: ## Run all tests
	cargo test --workspace

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
