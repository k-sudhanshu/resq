# RESQ — Deployment & CI/CD (v2)

## 1. The free stack

```
Frontend:  Next.js → Vercel Hobby            (free)
Backend:   FastAPI container → Render        (free web service)
Database:  Postgres → Neon                   (free, non-expiring)
AI:        Gemini API free tier
Storage:   none (images never persisted)
Cache:     none (in-process content registry)
Cron:      GitHub Actions scheduled workflows (free)
Errors:    Sentry free tier (frontend + backend)
```
**$0/month.** Tradeoff: the backend sleeps after ~15 idle minutes and
cold-starts in 10–30s — handled in UX, not hidden (see below).

Platform choices, decided rather than left open (v1 said "Railway or
Render, either works" and "Railway/Render/Neon" for the DB — v2 picks):
- **Render** for the backend: pre-deploy command support (Alembic) and
  a predictable free web service.
- **Neon** for Postgres: Render's free Postgres is **deleted after 90
  days** — unacceptable for a long-lived portfolio link; Neon's free
  tier persists.

## 2. Environments & variables

```
# backend (Render dashboard)
DATABASE_URL=            # Neon connection string
GEMINI_API_KEY=
AI_PROVIDER=gemini       # mock everywhere except production
ALLOWED_ORIGIN=https://resq-<you>.vercel.app
INTERNAL_SECRET=         # for /internal/cleanup
DAILY_AI_BUDGET=200      # below Gemini free daily cap
SENTRY_DSN=

# frontend (Vercel dashboard)
NEXT_PUBLIC_API_BASE_URL=https://resq-api.onrender.com
NEXT_PUBLIC_SENTRY_DSN=
```
Local dev: `docker-compose.yml` runs Postgres only; `AI_PROVIDER=mock`
so nothing local ever touches Gemini quota.

## 3. CI (GitHub Actions, on push/PR)

```
lint            ruff + eslint
typecheck       mypy + tsc
content checks  YAML schema validation
                + EN/HI parity test (content trees and message files
                  must have identical keys/IDs — a missing Hindi
                  translation fails the build)
tests           pytest (unit + integration + ai_cases, MockAIProvider
                only — CI never calls Gemini) ; frontend tests
audit           pip-audit + npm audit (fail on high severity)
build           docker build ; next build
```
Deploys are the platforms' own auto-deploy-on-push to `main` (Vercel
and Render both support it) — no deploy step to maintain in CI.
Render pre-deploy command: `alembic upgrade head`.

## 4. Scheduled workflows (GitHub Actions cron)

- **Cleanup**: hourly `POST $API/internal/cleanup` with
  `X-Internal-Secret` — enforces the 24h TTL
  ([03-database.md](./03-database.md)).
- **Keep-warm** (optional): `GET $API/health` every 10 minutes so the
  demo link feels instant to a recruiter. Zero cost, noticeably better
  first impression.

## 5. Health & cold start
`/health` checks DB connectivity. The frontend pings it on first load;
while it's unresponsive it shows the localized "waking up the server…"
state (`ColdStartNotice`) instead of an error or a blank spinner.

## 6. Monitoring
Sentry free tier on both apps; structured console logs (request id,
language, category, risk level, source, latency) readable in Render's
log viewer. Log lines are English-only machine text — no user content,
no PII, no Hindi strings in logs (see [02-i18n.md](./02-i18n.md) §1).
No OTel/Prometheus/Grafana at this scale.

## 7. README talking points (worth writing down for reviewers)
- Modular monolith over microservices, and why that's the right call
  at this scale.
- Images never persisted — privacy-by-design choice, not a gap.
- Bilingual by construction: separated content trees + CI parity check
  means Hindi can never silently lag English.
- Graceful degradation: quota-aware fallback mode demonstrated live.
- The documented upgrade path (Redis, R2, multi-instance) that needs
  no domain-logic changes.
