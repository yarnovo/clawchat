SHELL := /bin/bash
export BASH_ENV := .env

ENGINE := cd engine &&
CLI := cd cli &&

.PHONY: build hft status watcher report-engine report-daily report-weekly install clean test help

# === Engine (Rust) ===

build: ## Build Rust engine (release)
	$(ENGINE) cargo build --release

hft: ## Run Rust HFT engine
	$(ENGINE) cargo run --release --bin hft-engine

# === Ops ===

status: ## Global status dashboard
	$(CLI) source ../.env && uv run python -m clawchat status

watcher: ## Strategy watcher (auto deploy/stop engines)
	$(CLI) uv run python -m clawchat watcher

# === Reports ===

report-engine: ## Run report engine (daily/weekly scheduler)
	$(CLI) uv run python -m clawchat.report_engine

report-daily: ## Generate daily report (once)
	$(CLI) uv run python -m clawchat.report_engine --once daily

report-weekly: ## Generate weekly report (once)
	$(CLI) uv run python -m clawchat.report_engine --once weekly

install: ## Install all deps
	$(CLI) uv sync

clean: ## Clean cache and venv
	rm -rf cli/.venv cli/src/clawchat/__pycache__

# === Test ===

test: ## Run all tests (Rust + Python)
	$(ENGINE) cargo test
	$(CLI) uv run pytest -q

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
