# RESQ — Security & Privacy (v2)

## 1. Authentication model
No accounts. Anonymous session: `POST /v1/sessions` issues a random
256-bit token, sent back via `X-Session-Token`, stored in
`sessionStorage` (clears on tab close — nothing worth protecting
outlives the tab). Sessions expire after 24h server-side.

**Ownership enforcement (new in v2):** `GET /v1/analyses/{id}`
requires the creating session's token and returns 404 otherwise. v1
let anyone with a UUID read someone else's medical description.

## 2. Transport & app security
- HTTPS by default on Vercel and Render.
- CORS locked to the single deployed frontend origin.
- CSP headers, no inline scripts.
- All input re-validated server-side with Pydantic: language ∈
  {en, hi}, category keys and question/option IDs must exist in the
  content registry, description ≤ 2000 chars, answers ≤ 20.
- AI output rendered as structured fields only — never HTML, never
  markdown-interpreted.

## 3. Image handling
- Type checked by magic bytes, never extension; ≤ 3MB.
- Decoded, **EXIF stripped** (photos of injuries carry GPS
  coordinates — this matters), resized/compressed in memory.
- Never written to disk, object storage, or DB; buffer discarded when
  the request ends. Stronger privacy than any retention design, and
  free.

## 4. Prompt injection & output handling
- User text confined to the delimited `USER_DATA` block; the system
  prompt explicitly instructs the model to treat it as data (see
  [05-ai-and-prompts.md](./05-ai-and-prompts.md) §2).
- Output must pass schema → per-language safety filter → language
  check → source whitelist before anyone sees it.
- An injection that *does* steer the model still can't reach the user
  with unvalidated content — worst case is a fallback response.

## 5. Rate limiting & quota abuse
Three layers (detailed in [04-api.md](./04-api.md) §7): IP-keyed
session creation limit, session-keyed analysis limit, Postgres-backed
daily AI budget. The v1 design was session-keyed only — trivially
bypassed by minting sessions, draining the free Gemini quota, which at
$0 budget *is* the denial-of-service target.

## 6. Internal endpoints & secrets
- `POST /internal/cleanup` requires `X-Internal-Secret` (v1 had it
  open).
- Secrets (`GEMINI_API_KEY`, `DATABASE_URL`, `INTERNAL_SECRET`) live
  in Render's dashboard and GitHub Actions secrets. `.env` never
  committed; `.env.example` has placeholders only.
- The frontend has no secrets — only `NEXT_PUBLIC_API_BASE_URL`.

## 7. Data privacy
- Collected: session-scoped answers, optional free-text description,
  chosen language, risk result. Nothing else — no name, phone, email,
  IP persistence, or analytics identity.
- Not collected: images (processed in memory only), location, device
  identifiers.
- Retention: 24h TTL on sessions and their analyses, enforced by the
  scheduled cleanup.
- The consent/disclaimer screen states all of this in one short
  paragraph, **in both languages** — the privacy note is content like
  any other and lives in the message files, subject to the same
  parity check (a Hindi user must not get an English-only privacy
  notice).
- Formal DPDP-Act compliance work is out of scope for a portfolio
  deployment; the data-minimization posture above is the honest
  substitute and worth stating in the README.

## 8. SQL & dependencies
- SQLAlchemy parameterized queries only; no string-built SQL.
- `pip-audit` + `npm audit` in CI, failing on high severity.

## 9. Intentionally out of scope
Audit logging, incident response process, data-subject-request
workflow, distributed rate limiting — appropriate to skip at this
scope; each has its "add back when" note in
[00-overview.md](./00-overview.md).
