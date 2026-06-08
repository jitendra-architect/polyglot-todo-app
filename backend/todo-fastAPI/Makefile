.PHONY: dev worker test test-cov lint format install install-dev docker-up docker-up-pg

PORT ?= 8000

dev:
	PORT=$(PORT) ./scripts/dev.sh

worker:
	./scripts/worker.sh

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	pytest

test-cov:
	pytest --cov=app --cov-report=term-missing

lint:
	ruff check app

format:
	ruff format app

docker-up:
	docker compose --profile mongodb up --build

docker-up-pg:
	DB_PROFILE=postgresql docker compose --profile postgresql up --build
