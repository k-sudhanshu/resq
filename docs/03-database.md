# RESQ — Database Schema (v2)

## Where it runs
One free Postgres instance on **Neon** (free tier: ~0.5GB, does not
expire — Render's free Postgres is deleted after 90 days, which is
disqualifying for a long-lived portfolio link). Storage is trivially
sufficient: small text rows with a 24h TTL, no images ever.

## What is deliberately *not* in the database
Categories, questions, fallback guidance, trusted sources, safety
lists — all version-controlled YAML in `backend/app/content/`, loaded
at startup (see [02-i18n.md](./02-i18n.md)). Fewer tables, no content
migrations, and the EN/HI parity check runs in CI instead of needing
DB constraints.

## Tables — two, plus one quota row

v1 had a third table, `assessment_answers`, written one row per
answered question. Answers are only ever read back as a unit with
their analysis, and v2 submits them in one request — so they are a
JSONB column, not a table.

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| token | text unique not null | random 256-bit, client-stored |
| language | text not null | `en` \| `hi` — last used, analytics only; every request still carries `lang` explicitly |
| created_at | timestamptz not null | |
| expires_at | timestamptz not null | now() + 24h |

### `analyses`
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | returned to client for re-fetch |
| session_id | uuid fk → sessions, not null | reads require the owning session's token |
| language | text not null | language of this result |
| category_key | text not null | content key, or `other` |
| patient_context | text not null | `self` \| `other_adult` \| `child` \| `unknown` |
| answers | jsonb | `[{"question_id": "...", "option_id": "..."}]`, null for the `other` flow |
| description | text | free text from the `other` flow, capped at 2000 chars |
| had_image | boolean not null | the image itself is never stored anywhere |
| source | text not null | `ai` \| `fallback` \| `rules` (rules = critical short-circuit, no AI call) |
| risk_level | text not null | `CRITICAL` \| `URGENT` \| `NON_URGENT` |
| response | jsonb not null | the full validated response object |
| created_at | timestamptz not null | |

### `daily_usage`
One row per UTC day; the Gemini budget counter. In Postgres because
the free-tier backend sleeps and would lose an in-memory counter many
times a day.

| Column | Type | Notes |
|---|---|---|
| day | date pk | UTC |
| ai_calls | integer not null default 0 | `UPDATE ... SET ai_calls = ai_calls + 1 RETURNING ai_calls` — atomic, race-free |

## Indexes
- `sessions(token)` unique
- `sessions(expires_at)` — cleanup scan
- `analyses(session_id)`
- `analyses(created_at)` — cleanup scan

## Cleanup
`POST /internal/cleanup` (requires `X-Internal-Secret`) deletes
sessions past `expires_at` (analyses cascade) and `daily_usage` rows
older than 7 days. Triggered by a GitHub Actions scheduled workflow —
free, and it doubles as a keep-warm ping. No in-process background
loop: the instance sleeps, so a loop inside it is a coin flip.

## Migrations
Alembic, `alembic upgrade head` as the Render pre-deploy command. Two
tables and a counter — migrations stay trivial.
