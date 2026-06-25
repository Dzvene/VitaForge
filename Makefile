# VitaForge — dev shortcuts. Run from the repo root.
# On Windows use Git Bash, or run the underlying commands directly.

BE = backend
PY = $(BE)/venv/Scripts/python.exe   # Windows venv; use venv/bin/python on *nix

.PHONY: install db-up db-down migrate run test lint tach check

install:
	cd $(BE) && python -m venv venv && $(PY) -m pip install -r requirements.txt

db-up:
	docker compose up -d db

db-down:
	docker compose down

migrate:
	cd $(BE) && $(PY) -m alembic upgrade head

run:
	cd $(BE) && $(PY) -m uvicorn app.main:app --reload --port 8000

test:
	cd $(BE) && $(PY) -m pytest

lint:
	cd $(BE) && $(PY) -m ruff check app tests

tach:
	cd $(BE) && $(PY) -m tach check

# Full gate: boundaries + lint + tests.
check: tach lint test
