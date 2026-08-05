SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
export
endif

GEOOPS_DATABASE_URL ?= postgresql://geoops:geoops@localhost:5432/geoops_dev
GEOOPS_TEST_DATABASE_URL ?= $(GEOOPS_DATABASE_URL)

.PHONY: setup dev stop lint typecheck test test-unit test-integration build e2e check docker-check wait-db

setup:
	@test -f .env || cp .env.example .env
	uv sync
	pnpm install
	pnpm --filter @geoops/web exec playwright install chromium

docker-check:
	@command -v docker >/dev/null || (echo "Docker is required for this command. Install Docker and retry." && exit 1)
	@docker compose version >/dev/null || (echo "Docker Compose is required for this command." && exit 1)

wait-db: docker-check
	@for attempt in {1..30}; do \
		container_id=$$(docker compose ps -q db); \
		if [ -n "$$container_id" ]; then \
			status=$$(docker inspect --format='{{.State.Health.Status}}' "$$container_id" 2>/dev/null || true); \
			if [ "$$status" = "healthy" ]; then \
				echo "PostGIS is healthy"; \
				exit 0; \
			fi; \
		fi; \
		echo "Waiting for PostGIS healthcheck ($$attempt/30)..."; \
		sleep 2; \
	done; \
	docker compose ps; \
	exit 1

dev: docker-check
	@echo "Starting PostGIS, FastAPI and the GeoOps web app."
	@echo "API: http://127.0.0.1:$${GEOOPS_API_PORT:-8000}"
	@echo "Web: http://127.0.0.1:5173"
	@echo "Stop with Ctrl-C, then run 'make stop' to stop PostGIS."
	docker compose up -d db
	$(MAKE) wait-db
	trap 'kill 0' EXIT; \
	uv run uvicorn geoops_api.main:app --reload --host 0.0.0.0 --port $${GEOOPS_API_PORT:-8000} & \
	pnpm --filter @geoops/web dev & \
	wait

stop: docker-check
	docker compose stop

lint:
	uv run ruff check services tests
	pnpm --filter @geoops/web lint

typecheck:
	uv run mypy services/api services/ingestion
	pnpm --filter @geoops/web typecheck

test-unit:
	uv run pytest -m "not integration"
	pnpm --filter @geoops/web test

test-integration: docker-check
	docker compose up -d db
	$(MAKE) wait-db
	GEOOPS_TEST_DATABASE_URL="$(GEOOPS_TEST_DATABASE_URL)" uv run pytest -m integration

test: test-unit test-integration

build:
	uv build
	pnpm --filter @geoops/web build

e2e:
	pnpm --filter @geoops/web e2e

check:
	docker compose config >/dev/null
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test
	$(MAKE) build
	$(MAKE) e2e
