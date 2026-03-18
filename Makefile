SHELL := /bin/bash
export BASH_ENV := .env

.PHONY: build hft watcher install clean help

# === Engine (Rust) ===

build: ## Build Rust engine (release)
	cd engine && cargo build --release

hft: ## Run Rust HFT engine
	cd engine && cargo run --release --bin hft-engine

# === Ops ===

watcher: ## Strategy watcher (auto deploy/stop engines)
	cd cli && uv run python -m clawchat watcher

install: ## Install all deps
	cd cli && uv sync

clean: ## Clean cache and venv
	rm -rf cli/.venv cli/src/clawchat/__pycache__

# === Help ===

.DEFAULT_GOAL := help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
