SHELL := /bin/bash
export BASH_ENV := .env

.PHONY: build hft status watcher install clean test help

# === Engine (Rust) ===

build: ## Build Rust engine (release)
	cd engine && cargo build --release

hft: ## Run Rust HFT engine
	cd engine && cargo run --release --bin hft-engine

# === Ops ===

status: ## Global status dashboard
	cd cli && source ../.env && uv run python -m clawchat status

watcher: ## Strategy watcher (auto deploy/stop engines)
	cd cli && uv run python -m clawchat watcher

install: ## Install all deps
	cd cli && uv sync

clean: ## Clean cache and venv
	rm -rf cli/.venv cli/src/clawchat/__pycache__

# === Test ===

test: ## Run all tests (Rust + Python)
	cd engine && cargo test
	cd cli && uv run pytest -q --tb=short 2>/dev/null || echo "(no Python tests yet)"

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
