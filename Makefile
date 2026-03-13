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

# ---- Server (Python/FastAPI) ----
.PHONY: server-dev server-install

server-install:
	cd server && uv sync

server-dev:
	cd server && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

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
