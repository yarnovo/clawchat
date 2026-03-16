VERSION := $(shell cat VERSION)

# ---- 开发 ----
.PHONY: dev dev-stop logs

dev:
	docker compose up -d --build
	cd app && pnpm dev &
	@echo ""
	@echo "  Server:   http://localhost:3000 (Docker)"
	@echo "  Frontend: http://localhost:5173 (Vite)"
	@echo ""

dev-stop:
	docker compose down
	-pkill -f "vite" 2>/dev/null
	@echo "Stopped"

logs:
	docker compose logs -f

logs-server:
	docker compose logs -f server

restart-server:
	docker compose restart server

# ---- AgentKit ----
.PHONY: agentkit-build agentkit-test agentkit-run agentkit-eval

agentkit-build:
	cd agentkit && pnpm build

agentkit-test:
	cd agentkit/core && npx vitest run

agentkit-run:
	@test -n "$(AGENT)" || (echo "Usage: make agentkit-run AGENT=agents/legal-assistant" && exit 1)
	cd agentkit && node cli/dist/main.js run $(AGENT)

agentkit-eval:
	@test -n "$(AGENT)" || (echo "Usage: make agentkit-eval AGENT=agents/legal-assistant" && exit 1)
	cd agentkit && node cli/dist/main.js eval $(AGENT)

agentkit-info:
	@test -n "$(AGENT)" || (echo "Usage: make agentkit-info AGENT=agents/legal-assistant" && exit 1)
	cd agentkit && node cli/dist/main.js info $(AGENT)

# ---- App (Flutter) ----
.PHONY: app-run app-build-web

app-run:
	cd app && flutter run -d chrome

app-build-web:
	cd app && flutter build web

# ---- Promo Video ----
.PHONY: promo-dev promo-render

promo-dev:
	cd promo-video && npx remotion studio --port 3200

promo-render:
	cd promo-video && npm run render

# ---- DB ----
.PHONY: db-backup db-restore

db-backup:
	bash scripts/db-backup.sh

db-restore:
	@test -n "$(FILE)" || (echo "Usage: make db-restore FILE=backups/xxx.sql.gz" && exit 1)
	bash scripts/db-restore.sh $(FILE)

# ---- Deploy ----
.PHONY: deploy-up deploy-down deploy-logs

deploy-up:
	docker compose -f docker-compose.deploy.yml up -d --build

deploy-down:
	docker compose -f docker-compose.deploy.yml down

deploy-logs:
	docker compose -f docker-compose.deploy.yml logs -f

# ---- Common ----
.PHONY: setup version clean

setup:
	lefthook install

version:
	@echo $(VERSION)

clean:
	cd app && flutter clean
