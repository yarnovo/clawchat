VERSION := $(shell cat VERSION)

# ---- 本地开发（全 Docker）----
.PHONY: dev dev-stop reload logs

dev:
	docker compose up -d --build
	cd promo-video && npx remotion studio --port 3200 &
	@echo "All services starting. Logs: make logs"
	@echo "Web UI: http://localhost:8080"
	@echo "Remotion Studio: http://localhost:3200"

dev-stop:
	docker compose down
	-pkill -f "remotion studio" 2>/dev/null
	@echo "All dev services stopped"

reload: app-build-web skill-build-web
	docker compose restart nginx
	@echo "Ready at http://localhost:8080"

logs:
	docker compose logs -f

# 单服务日志/重启
.PHONY: logs-im logs-agent logs-container logs-openclaw logs-nanoclaw logs-ironclaw logs-mcp logs-skill-registry logs-skill-browser
.PHONY: restart-im restart-agent restart-container restart-openclaw restart-nanoclaw restart-ironclaw restart-mcp restart-skill-registry restart-skill-browser

logs-im:
	docker compose logs -f im-server

logs-agent:
	docker compose logs -f agent-server

logs-container:
	docker compose logs -f container-server

logs-openclaw:
	docker compose logs -f openclaw-server

logs-nanoclaw:
	docker compose logs -f nanoclaw-server

logs-ironclaw:
	docker compose logs -f ironclaw-server

logs-mcp:
	docker compose logs -f mcp-server

restart-im:
	docker compose restart im-server

restart-agent:
	docker compose restart agent-server

restart-container:
	docker compose restart container-server

restart-openclaw:
	docker compose restart openclaw-server

restart-nanoclaw:
	docker compose restart nanoclaw-server

restart-ironclaw:
	docker compose restart ironclaw-server

restart-mcp:
	docker compose restart mcp-server

logs-skill-registry:
	docker compose logs -f skill-registry-server

restart-skill-registry:
	docker compose restart skill-registry-server

logs-skill-browser:
	docker compose logs -f skill-browser

restart-skill-browser:
	docker compose restart skill-browser

# 监控日志
diagnose:
	@bash scripts/diagnose.sh

logs-grafana:
	docker compose logs -f grafana

logs-loki:
	docker compose logs -f loki

logs-prometheus:
	docker compose logs -f prometheus

# ---- App (Flutter) ----
.PHONY: app-run app-build-web app-build-ios app-build-android

app-run:
	cd app && flutter run -d chrome

app-build-web:
	cd app && flutter build web

skill-build-web:
	cd skill-browser && npm run build

app-build-ios:
	cd app && flutter build ios

app-build-android:
	cd app && flutter build apk

# ---- CLI (Go) ----
.PHONY: cli-build cli-run

cli-build:
	cd cli && go build -ldflags "-X main.version=$(VERSION)" -o clawchat .

cli-run: cli-build
	./cli/clawchat

# ---- DB 备份/恢复 ----
.PHONY: db-backup db-backup-list db-restore

db-backup:
	bash scripts/db-backup.sh

db-backup-list:
	@ls -lh backups/*.sql.gz 2>/dev/null || echo "No backups found in backups/"

db-restore:
	@test -n "$(FILE)" || (echo "Usage: make db-restore FILE=backups/xxx.sql.gz" && exit 1)
	bash scripts/db-restore.sh $(FILE)

# ---- DB 管理（通过容器执行）----
.PHONY: db-push db-studio

db-push:
	docker compose exec im-server npx prisma db push

db-studio:
	cd im-server && npx prisma studio --port 5556

# ---- OpenClaw 镜像 ----
.PHONY: openclaw-build-image openclaw-build-agent

openclaw-build-image:
	cd openclaw && docker build -t openclaw:local .

openclaw-build-agent:
	docker build -f openclaw-server/Dockerfile.agent -t openclaw-agent:local .

# ---- NanoClaw 镜像 ----
.PHONY: nanoclaw-build nanoclaw-build-agent

nanoclaw-build:
	cd nanoclaw/container && ./build.sh

nanoclaw-build-agent:
	docker build -f nanoclaw-server/Dockerfile.agent -t nanoclaw-agent:local .

# ---- IronClaw 镜像 ----
.PHONY: ironclaw-build ironclaw-build-agent

ironclaw-build:
	cd ironclaw && docker build -t ironclaw:local .

ironclaw-build-agent:
	@echo "IronClaw agent uses ironclaw:local directly (no wrapper needed)"
	@echo "Run 'make ironclaw-build' first"

# ---- Promo Video (Remotion) ----
.PHONY: promo-install promo-dev promo-render

promo-install:
	cd promo-video && npm install

promo-dev:
	cd promo-video && npm run dev

promo-render:
	cd promo-video && npm run render

# ---- 线上部署 ----
.PHONY: deploy-up deploy-down deploy-logs

deploy-up:
	docker compose -f docker-compose.deploy.yml up -d --build

deploy-down:
	docker compose -f docker-compose.deploy.yml down

deploy-logs:
	docker compose -f docker-compose.deploy.yml logs -f

# ---- E2E Tests (Playwright) ----
.PHONY: e2e-install e2e-test

e2e-install:
	cd e2e && npm install && npx playwright install chromium

e2e-test:
	cd e2e && npx playwright test

# ---- Submodule ----
.PHONY: skills-sync

skills-sync:
	git submodule update --remote skills
	cd skills && git diff --name-only | xargs -r git update-index --assume-unchanged
	@echo "skills submodule synced & macOS case-sensitivity diff suppressed"

# ---- Common ----
.PHONY: setup version clean

setup:
	lefthook install

version:
	@echo $(VERSION)

clean:
	rm -f cli/clawchat
	cd app && flutter clean
