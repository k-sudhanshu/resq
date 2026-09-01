# RESQ — Overview, Scope & Architecture Review Log

RESQ is a bilingual (English/Hindi) AI first-aid assistant for India.
It gives step-by-step guidance for common emergencies (burn, cut,
fracture, choking, poisoning, "other"), escalates critical cases to
112/108, and works even when the AI is unavailable.

This document set is **v2**, written after a full architecture review. The
budget constraint is unchanged: **$0/month, free tiers only**, but the
structure is designed so nothing has to be rewritten when it grows.

## Core principles (unchanged from v1, still correct)

1. **AI is not the system.** The AI is one untrusted component. Schema
   validation, a safety filter, and a deterministic risk engine sit
   between the model and the user.
2. **Hard rules can only escalate risk, never downgrade it.**
3. **Degrade gracefully.** AI down or quota exhausted → verified
   fallback guidance, clearly labeled, still risk-checked.
4. **Privacy by default.** No accounts, no image persistence, short TTL
   on everything else.

## What the review found and how v2 fixes it

### 1. i18n was a footnote, not a design (critical)
v1 had a `language` column, a `?lang=` query param, and two JSON files.
It never answered: where Hindi *content* lives, how the AI is made to
answer in Hindi, how unsafe Hindi output is filtered, how locale is
carried in URLs, what font renders Devanagari (Manrope, the chosen
font, **has no Devanagari glyphs**), or what language voice input uses.
**Fix:** a dedicated language design — see [02-i18n.md](./02-i18n.md).
Summary: English and Hindi content live in fully separated,
structurally identical trees (`content/en/`, `content/hi/`,
`messages/en.json`, `messages/hi.json`) with a CI parity check; all
keys/IDs/enums/logs are English-only; the AI is instructed to answer in
the requested language and its output is language-verified; the safety
filter has per-language banned-phrase lists; routes are locale-prefixed
(`/en/...`, `/hi/...`).

### 2. The example hard rule was medically wrong (critical)
```python
if answers.get("not_breathing") and not answers.get("responsive"):
    return "CRITICAL"
```
"Not breathing" alone is CRITICAL; requiring unresponsiveness *as well*
would under-triage a non-breathing patient. Deeper problem: safety
rules were hardcoded Python, disconnected from the question definitions
they depend on.
**Fix:** rules are declared on the answer options themselves in the
question YAML (`escalates_to: CRITICAL`), and the risk engine is a
small generic max-severity merge. Rules and questions can never drift
apart. See [05-ai-and-prompts.md](./05-ai-and-prompts.md) §6.

### 3. API inconsistencies and a privacy hole (high)
- `POST /assessment/session/{id}/answers` used a path `id` while auth
  used a token header — two identifiers for the same thing.
- `POST /analysis` also took `session_id` as a form field — a third way.
- One HTTP round trip *per answered question* — pointlessly chatty on
  flaky mobile networks, the exact target environment.
- `GET /analysis/{id}` had no auth — anyone with a UUID could read
  someone's medical description.
- Naming drifted between `emergencies`, `assessment`, `analysis`.
**Fix:** answers are collected client-side and submitted once with
`POST /v1/analyses`; the session token header is the only session
identifier; reading an analysis requires the owning session's token;
resource names are unified (`sessions`, `content`, `analyses`). See
[04-api.md](./04-api.md).

### 4. Quota/rate-limit design didn't survive its own platform (high)
The daily Gemini-quota counter was in-memory, but the chosen free tier
*sleeps after 15 idle minutes* — the counter would reset all day and
protect nothing. Rate limiting was keyed only on `session_token`, and
sessions were free to mint, so the limit was bypassable in a loop —
draining the free Gemini quota, the one resource that matters.
**Fix:** daily quota counter is one upserted row in Postgres; rate
limiting is IP-keyed on `POST /v1/sessions` and session-keyed on
`POST /v1/analyses`; Gemini 429s immediately flip fallback-only mode
for the rest of the UTC day. See [04-api.md](./04-api.md) §7 and
[05-ai-and-prompts.md](./05-ai-and-prompts.md) §8.

### 5. Smaller but real issues (fixed in place)
- `/internal/cleanup` was unauthenticated → now requires
  `X-Internal-Secret`.
- `@app.on_event("startup")` is deprecated in FastAPI → lifespan
  context manager.
- Backend returned English human-readable error messages → backend now
  returns machine codes only; the frontend localizes all user-facing
  text (error text must exist in Hindi too).
- 3 DB tables where 2 suffice → `assessment_answers` rows folded into
  a `answers` JSONB column on the analysis (answers are only ever read
  back as a unit).
- Render free Postgres expires after 90 days → default choice is
  **Neon** for the DB, which doesn't.
- The mockups show "Guides" and "History" nav items with no backing
  API or scope → explicitly cut from v1 scope (see
  [09-user-flows.md](./09-user-flows.md) §7) rather than left dangling.

## What stays deliberately out of scope at $0

Same list as v1, still correct: Redis, object storage, circuit
breakers, multi-instance failover, full observability stack, admin
CMS, audit tables. Each doc notes the "add back when" trigger where
relevant. The upgrade path never requires changing domain logic —
that's what the provider/repository abstractions are for.

## Known free-tier constraints designed around

- **Backend sleeps when idle** (Render free) → frontend shows a
  "waking up" state; optional uptime ping keeps it warm.
- **Gemini free quota is small** → mock provider everywhere except
  prod, Postgres-backed daily budget, automatic fallback-only mode.
- **Free Postgres is ~0.5GB** → fine; only small text rows with 24h TTL.

## Reading order

| Doc | Contents |
|---|---|
| [01-architecture.md](./01-architecture.md) | System architecture, request lifecycle |
| [02-i18n.md](./02-i18n.md) | Full EN/HI language design |
| [03-database.md](./03-database.md) | Two-table schema, TTL cleanup |
| [04-api.md](./04-api.md) | REST API v1 |
| [05-ai-and-prompts.md](./05-ai-and-prompts.md) | Provider abstraction, actual prompts, risk engine, safety filter |
| [06-security-privacy.md](./06-security-privacy.md) | Auth, secrets, image handling, privacy stance |
| [07-deployment.md](./07-deployment.md) | Free-tier stack, CI/CD |
| [08-repo-structure.md](./08-repo-structure.md) | Repo layout and module boundaries |
| [09-user-flows.md](./09-user-flows.md) | Screen-by-screen flows mapped to routes and API calls |
