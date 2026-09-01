# Local development

The [root README](../README.md) has the commands. This document records the
decisions behind the local setup and where it deliberately differs from
production.

## Local runs on SQLite, production on Postgres

Requiring Docker or a Postgres install before anyone can see the app run is a
real cost for a project meant to be picked up and finished. Locally the
database is a single SQLite file; production is Neon Postgres.

The gap is kept small on purpose:

| Concern | How it stays portable |
| --- | --- |
| UUID keys | SQLAlchemy `Uuid`, which renders as CHAR on SQLite and native `uuid` on Postgres |
| JSON columns | `JSON().with_variant(JSONB, "postgresql")` — JSONB only where it exists |
| Daily counter increment | Plain `UPDATE ... SET x = x + 1`, then `INSERT` if no row matched, rather than a dialect-specific upsert |
| Timestamps | Always written as timezone-aware UTC; `as_utc()` re-attaches UTC on read, because SQLite drops `tzinfo` |
| Cascading deletes | Performed explicitly in the repository, because SQLite only honours `ON DELETE CASCADE` when foreign keys are enabled per connection |
| Migrations | The same Alembic revisions run against both; `render_as_batch` keeps SQLite able to alter tables |

Switching is a single environment variable:

```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
```

Run the test suite against Postgres before deploying a schema change. That is
the one thing SQLite cannot tell you.

## The AI provider is mocked everywhere except production

`AI_PROVIDER` defaults to `mock` in local development and in CI. The free
Gemini tier is small enough that a day of ordinary development could exhaust
it, and a test suite that depends on a live model is not a test suite.

`MockAIProvider` returns the verified content for the requested category and
language, prefixed with `[mock AI]` so it is obvious which path served a
response. It also accepts triggers in the description to force each failure
mode — see the README table. Those triggers are what the `tests/ai_cases`
suite uses, so every degradation path is exercised on every run.

Before deploying, run the `tests/ai_cases` scenarios once by hand against
`AI_PROVIDER=gemini`. The mock proves the pipeline handles bad output; only
the real model tells you how often it produces it.

## What local development cannot show you

| Not reproduced locally | Where it is handled |
| --- | --- |
| Cold starts (the free instance sleeping) | `ColdStartNotice`, shown when `/health` does not answer immediately |
| Real Gemini latency, refusals, and quota errors | Timeout, single retry, and fallback in the analysis pipeline |
| Postgres-specific SQL behaviour | Run the suite against a Postgres `DATABASE_URL` before schema changes |
| Cross-device Web Speech support | Feature-detected; the UI falls back to typing |

## Ports

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 (redirects to `/en`) |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

`ALLOWED_ORIGINS` in `backend/.env` must list the frontend origin; requests
from anywhere else are rejected by CORS.
