# RESQ — System Architecture (v2)

## 1. Shape of the system

A **modular monolith**: one Next.js frontend, one FastAPI backend, one
Postgres database. Free tier throughout. Modules inside the monolith
have strict boundaries (see [08-repo-structure.md](./08-repo-structure.md))
so that any of them could be extracted later — none should be today.

```
        Browser — Next.js on Vercel
        /en/... and /hi/... locale-prefixed routes
        UI strings from messages/{en,hi}.json (bundled, no API call)
                        │
                 HTTPS + CORS (single allowed origin)
                        │
        ┌───────────────▼────────────────┐
        │   FastAPI monolith (Render)    │  single free instance,
        │                                │  sleeps when idle
        │  api/v1 ─► services ─► domain  │
        │                │               │
        │        content registry        │  YAML: content/en + content/hi
        │        (in-process, loaded     │  loaded at startup, immutable
        │         at startup)            │  per deploy
        └───────┬────────────────┬───────┘
                │                │
        ┌───────▼──────┐   ┌─────▼──────────────┐
        │ Postgres     │   │ AI provider         │
        │ (Neon free)  │   │  GeminiProvider     │
        │ sessions,    │   │  MockAIProvider     │
        │ analyses,    │   │ (env-selected)      │
        │ quota row    │   └─────┬──────────────┘
        └──────────────┘         │
                                 ▼
                    validate (Pydantic schema)
                                 │
                    safety filter (per-language banned phrases)
                                 │
                    language check (output matches requested lang)
                                 │
                    risk engine (config-driven hard rules;
                                 rules only escalate)
                                 │
              ┌──────────────────┼──────────────────┐
           CRITICAL           URGENT            NON_URGENT
              │                  │                  │
        Emergency screen    Guidance screen    Guidance screen
        one-tap 112 / 108
```

## 2. Responsibilities per layer (backend)

| Layer | Owns | Never does |
|---|---|---|
| `api/v1` | HTTP: routing, headers, status codes, request/response schemas, rate limiting | business logic, AI calls, SQL |
| `services` | orchestration: analysis pipeline, AI providers, prompt building, image processing, safety filter, fallback | HTTP concerns, raw SQL |
| `domain` | pure logic: risk levels, risk merge, triage rules evaluation — no I/O, fully unit-testable | anything async, anything imported from services |
| `content` | loading + validating YAML content for both languages at startup, parity checking | request-time file reads |
| `db` | SQLAlchemy models, repositories, engine/session management | business decisions |

Dependency direction: `api → services → (domain, content, db)`.
`domain` imports nothing from the other layers.

## 3. The analysis pipeline (the one important request)

`POST /v1/analyses` is where everything converges. Steps, in order:

1. **Auth + rate limit** — valid `X-Session-Token`, session-keyed
   limiter (and the daily Gemini budget check).
2. **Validate input** — Pydantic: `language ∈ {en, hi}`, known
   `category_key` or `other`, answers reference real question/option
   IDs, description length caps, image ≤ 3MB with correct magic bytes.
3. **Hard-rule pre-check** — evaluate `escalates_to` flags on the
   structured answers. If any answer is flagged CRITICAL, respond
   immediately with the category's verified critical guidance from
   content — **no AI call at all**. Fastest possible path for the
   worst cases, and it saves quota.
4. **Image handling (if present)** — decode, strip EXIF, resize/
   compress in memory; the buffer lives only for this request.
5. **AI call** — prompt built from a template + delimited user data
   block, in the requested output language; 8s timeout, one retry.
6. **Validate output** — Pydantic schema → per-language safety filter
   → output-language check. Any failure counts as an AI failure.
7. **Risk merge** — final risk = max(hard-rule risk, AI risk).
8. **Fallback** — any failure in 5–6 routes to the fallback knowledge
   base for the category/language; result is marked `source:
   "fallback"` and still passes through step 7.
9. **Persist + respond** — one row in `analyses` (JSONB response,
   answers, language, risk, source; never the image), return the
   result with its `id` so a refresh can re-fetch it.

## 4. What replaces the usual infrastructure at $0

| Usual thing | Replaced by | Revisit when |
|---|---|---|
| Redis cache | in-process dict of content, loaded at startup | content must change without redeploy |
| Redis rate limiting | in-memory per-process counters (documented reset-on-sleep caveat) | second instance |
| Redis quota counter | single upserted Postgres row (`daily_usage`) — survives instance sleep, which the in-memory version did not | never, this is fine |
| S3 image storage | no storage at all: process in memory, discard | images must be retained for review |
| Job scheduler | GitHub Actions cron hitting `POST /internal/cleanup` with a secret header | job volume grows |
| Circuit breaker | try/timeout/retry-once/fallback per request | multi-instance + real SLA |

## 5. Failure modes, stated honestly

- **Backend asleep:** first request takes 10–30s. The frontend shows a
  "waking up" state (health-check ping with friendly copy), not an
  error.
- **Gemini quota exhausted:** automatic fallback-only mode for the
  rest of the UTC day; the UI shows an honest one-line notice.
- **Postgres unreachable:** `/health` fails, platform restarts the
  instance. Analyses cannot be persisted; the API still returns
  fallback guidance (serving guidance beats saving a row).
- **Whole instance down:** it's down. Single instance is an accepted,
  documented scope limit.
