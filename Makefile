.PHONY: setup backend frontend test lint smoke migrate clean

BACKEND := backend
FRONTEND := frontend
E2E := e2e
PY := $(BACKEND)/.venv/bin/python

## One-time setup: virtualenv, dependencies, database, env files.
setup:
	cd $(BACKEND) && python3 -m venv .venv
	$(PY) -m pip install --quiet --upgrade pip
	$(PY) -m pip install -r $(BACKEND)/requirements-dev.txt
	test -f $(BACKEND)/.env || cp $(BACKEND)/.env.example $(BACKEND)/.env
	cd $(BACKEND) && .venv/bin/alembic upgrade head
	cd $(FRONTEND) && npm install
	test -f $(FRONTEND)/.env.local || cp $(FRONTEND)/.env.example $(FRONTEND)/.env.local
	@echo "Setup complete. Run 'make backend' and 'make frontend' in two terminals."

## API on http://localhost:8000 (docs at /docs)
backend:
	cd $(BACKEND) && .venv/bin/uvicorn app.main:app --reload --port 8000

## UI on http://localhost:3000
frontend:
	cd $(FRONTEND) && npm run dev

test:
	cd $(BACKEND) && .venv/bin/python -m pytest -q
	cd $(FRONTEND) && npm test

lint:
	cd $(BACKEND) && .venv/bin/ruff check .
	cd $(FRONTEND) && npm run typecheck
	cd $(FRONTEND) && npm run lint

## Browser walkthrough of both languages. Needs both servers already running;
## downloads Chromium into e2e/browsers on first use.
smoke:
	cd $(E2E) && npm install && npm run setup && npm run smoke

migrate:
	cd $(BACKEND) && .venv/bin/alembic upgrade head

## Wipe the local database and start from empty tables.
clean:
	rm -f $(BACKEND)/resq.db $(BACKEND)/tests/test_resq.db
	cd $(BACKEND) && .venv/bin/alembic upgrade head
