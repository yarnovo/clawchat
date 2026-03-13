VERSION := $(shell cat VERSION)

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

# ---- Server (Python/FastAPI) ----
.PHONY: server-dev server-install

server-install:
	cd server && uv sync

server-dev:
	cd server && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ---- Common ----
.PHONY: version clean

version:
	@echo $(VERSION)

clean:
	rm -f cli/clawchat
	cd app && flutter clean
