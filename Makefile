VERSION := $(shell cat VERSION)

# ---- App (Flutter) ----
.PHONY: app-run app-serve app-build-web app-build-ios app-build-android

app-run:
	cd app && flutter run -d chrome

app-serve: app-build-web
	@echo "Serving at http://localhost:5555"
	cd app/build/web && python3 -m http.server 5555

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

# ---- IM Server (Hono/TypeScript) ----
.PHONY: im-dev im-install im-db-push

im-install:
	cd im-server && npm install

im-dev:
	cd im-server && npm run dev

im-db-push:
	cd im-server && npx prisma db push

# ---- Container Server (Hono/TypeScript) ----
.PHONY: container-install container-dev

container-install:
	cd container-server && npm install

container-dev:
	cd container-server && npm run dev

# ---- OpenClaw Server (Hono/TypeScript) ----
.PHONY: openclaw-install openclaw-dev openclaw-build-image

openclaw-install:
	cd openclaw-server && npm install

openclaw-dev:
	cd openclaw-server && npm run dev

openclaw-build-image:
	cd openclaw && docker build -t openclaw:local .

# ---- MCP Server (Python/FastAPI) ----
.PHONY: mcp-dev mcp-install

mcp-install:
	cd mcp-server && uv sync

mcp-dev:
	cd mcp-server && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ---- Docker ----
.PHONY: dev-up dev-down dev-logs deploy-up deploy-down

dev-up:
	docker compose up -d

dev-down:
	docker compose down

dev-logs:
	docker compose logs -f

deploy-up:
	docker compose --profile deploy up -d --build

deploy-down:
	docker compose --profile deploy down

# ---- Common ----
.PHONY: setup version clean

setup:
	lefthook install

version:
	@echo $(VERSION)

clean:
	rm -f cli/clawchat
	cd app && flutter clean
