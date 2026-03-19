SHELL := /bin/bash
export BASH_ENV := .env

.PHONY: build hft hft-dry autopilot status watcher report-engine report-daily report-weekly data-engine data-backfill data-status data-validate discover discover-scan discover-status install clean test help

# === Build ===

build: ## Build all binaries (release)
	cargo build --release

# === Engine (Rust) ===

hft: ## Run multi-strategy engine (all approved strategies)
	cargo run --release -p hft-engine

hft-dry: ## Run engine in dry-run mode (no real orders)
	cargo run --release -p hft-engine -- --dry-run

# === Autopilot (Rust) ===

autopilot: ## Run autopilot (algorithm-driven trade control)
	cargo run --release -p autopilot -- --strategies-dir strategies

# === CLI (Rust) ===

status: ## Global status dashboard
	cargo run --release -p clawchat -- status

watcher: ## Strategy watcher (auto deploy/stop engines)
	cargo run --release -p clawchat -- watcher

# === Reports ===

report-engine: ## Run report engine (daily/weekly scheduler)
	cargo run --release -p clawchat -- report-engine

report-daily: ## Generate daily report
	cargo run --release -p report-engine -- daily

report-weekly: ## Generate weekly report
	cargo run --release -p report-engine -- weekly

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
