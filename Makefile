VERSION := $(shell cat VERSION)

# ---- 开发 ----
.PHONY: dev dev-stop logs

# 本地开发：Docker DB + 本地后端 + Vite 前端
dev:
	docker compose up -d
	cd server && pnpm dev &
	cd app && pnpm dev &
	@echo ""
	@echo "  Database: postgres://clawchat:clawchat@localhost:5432/clawchat"
	@echo "  Server:   http://localhost:3000 (local)"
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

# ---- 部署 ----
.PHONY: deploy-up deploy-down deploy-logs

deploy-up:
	docker compose --profile deploy up -d --build

deploy-down:
	docker compose --profile deploy down

deploy-logs:
	docker compose --profile deploy logs -f

# ---- AgentKit ----
.PHONY: agentkit-build agentkit-test agentkit-run agentkit-eval agentkit-image

agentkit-build:
	cd agentkit && pnpm build

agentkit-image:
	docker build -t agentkit-base:latest -f agentkit/agentkit-base/Dockerfile .

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
.PHONY: db-reset db-seed db-backup db-restore

db-reset:
	docker exec clawchat-postgres psql -U clawchat -d clawchat -c \
		"DROP TABLE IF EXISTS messages CASCADE; DROP TABLE IF EXISTS agent_skills CASCADE; DROP TABLE IF EXISTS agents CASCADE; DROP TABLE IF EXISTS accounts CASCADE; DROP TABLE IF EXISTS skills CASCADE; DROP TYPE IF EXISTS agent_status CASCADE; DROP TYPE IF EXISTS message_role CASCADE;"
	cd server && npx drizzle-kit push --force
	cd server && npx tsx --env-file=.env src/db/seed.ts
	@echo ""
	@echo "  DB reset + seed 完成"
	@echo "  默认账号: admin / 123456"
	@echo ""

db-seed:
	cd server && npx tsx --env-file=.env src/db/seed.ts

db-backup:
	bash scripts/db-backup.sh

db-restore:
	@test -n "$(FILE)" || (echo "Usage: make db-restore FILE=backups/xxx.sql.gz" && exit 1)
	bash scripts/db-restore.sh $(FILE)

# ---- Common ----
.PHONY: setup version clean

setup:
	lefthook install

version:
	@echo $(VERSION)

clean:
	cd app && flutter clean
