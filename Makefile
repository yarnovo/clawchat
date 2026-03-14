VERSION := $(shell cat VERSION)

# ---- 本地开发（全 Docker）----
.PHONY: dev dev-stop reload logs

dev:
	docker compose up -d --build
	@echo "All services starting. Logs: make logs"
	@echo "Web UI: http://localhost:8080"

dev-stop:
	docker compose down
	@echo "All dev services stopped"

reload: app-build-web
	docker compose restart nginx
	@echo "Ready at http://localhost:8080"

logs:
	docker compose logs -f

# 单服务日志/重启
.PHONY: logs-im logs-agent logs-container logs-openclaw logs-mcp
.PHONY: restart-im restart-agent restart-container restart-openclaw restart-mcp

logs-im:
	docker compose logs -f im-server

logs-agent:
	docker compose logs -f agent-server

logs-container:
	docker compose logs -f container-server

logs-openclaw:
	docker compose logs -f openclaw-server

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

restart-mcp:
	docker compose restart mcp-server

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

# ---- Common ----
.PHONY: setup version clean

setup:
	lefthook install

version:
	@echo $(VERSION)

clean:
	rm -f cli/clawchat
	cd app && flutter clean
