# RESQ — API Specification v1 (v2 docs)

Base path: `/api/v1`. JSON everywhere except `POST /analyses`
(multipart, because of the optional image).

## Conventions — fixing v1's drift

- **One session identifier.** The `X-Session-Token` header is the only
  way a session is referenced. No session IDs in paths, no session
  fields in bodies. (v1 had all three at once.)
- **One noun per resource.** `sessions`, `content`, `analyses`.
  ("Assessment" is the *frontend* question flow; it produces the
  `answers` array inside an analysis request — it is not an API
  resource. v1's per-answer POST endpoints are gone.)
- **Explicit `lang` on anything human-readable**, validated `en|hi`.
- **Machine codes only in errors.** The frontend owns all user-facing
  wording in both languages (`errors.<CODE>` message keys).

## Endpoints

### `POST /sessions`
Creates an anonymous session. IP-rate-limited (see §7 — this is what
stops session-minting from bypassing the per-session limit).

```json
// 201
{ "token": "…", "expires_at": "2026-09-02T12:00:00Z" }
```

### `GET /content/categories?lang=hi`
Landing grid. Served from the in-process content registry — no DB hit.

```json
{
  "categories": [
    {
      "key": "burn",
      "label": "जलन",
      "label_alt": "Burn",
      "icon": "local_fire_department"
    }
  ]
}
```
`label_alt` is the *other* language — the one deliberate bilingual
field, for the dual-label cards (see [02-i18n.md](./02-i18n.md) §2).

### `GET /content/categories/{key}?lang=hi`
Full definition for the assessment flow: the questions with options
(display text in `lang` only; IDs always English).

```json
{
  "key": "burn",
  "label": "जलन",
  "questions": [
    {
      "id": "burn_size",
      "text": "जलन कितनी बड़ी है?",
      "options": [
        { "id": "smaller_than_palm", "text": "हथेली से छोटी" },
        { "id": "larger_than_palm", "text": "हथेली से बड़ी" }
      ]
    }
  ]
}
```
`escalates_to` metadata stays server-side; the client never needs it.

### `POST /analyses`  — the core endpoint
Headers: `X-Session-Token`. `multipart/form-data`:

| Part | Type | Notes |
|---|---|---|
| `payload` | JSON string | see below |
| `image` | file, optional | ≤3MB, jpeg/png/webp by magic bytes |

```json
{
  "language": "hi",
  "category_key": "burn",
  "patient_context": "child",
  "answers": [
    { "question_id": "burn_size", "option_id": "larger_than_palm" }
  ],
  "description": null
}
```
For the "other" flow: `category_key: "other"`, `answers: null`,
`description` required (≤2000 chars, text or voice transcript,
Hinglish welcome).

```json
// 200
{
  "id": "3f6f…",
  "risk_level": "URGENT",
  "source": "ai",
  "summary": "…",
  "emergency": { "call_112": false, "call_108": false },
  "immediate_actions": [
    { "step": 1, "title": "…", "instruction": "…" }
  ],
  "do_not": ["…"],
  "monitor": ["…"],
  "medical_follow_up": { "required": true, "reason": "…" },
  "video": { "video_id": null },
  "sources": [{ "source_id": "who_burns", "label": "…", "url": "…" }]
}
```
All display strings in the requested language; `risk_level`, `source`,
IDs always English. `source: "rules"` means a hard rule short-circuited
to CRITICAL and the guidance is verified content, not AI output.

### `GET /analyses/{id}`
Headers: `X-Session-Token` — **must be the creating session's token**,
else 404 (not 403: don't confirm existence). Fixes v1's
read-anyone's-analysis-by-UUID privacy hole. Used for refresh
resilience on the result page.

### `GET /health`
DB connectivity check. Also the keep-warm/cold-start-probe target.

### `POST /internal/cleanup`
Headers: `X-Internal-Secret`. TTL deletion (see
[03-database.md](./03-database.md)). Called by GitHub Actions cron.

## Errors

```json
{ "error": { "code": "RATE_LIMITED", "retry_after_seconds": 21 } }
```

| Code | Status | Notes |
|---|---|---|
| `VALIDATION_ERROR` | 422 | includes `fields` detail |
| `SESSION_INVALID` | 401 | missing/expired/unknown token |
| `RATE_LIMITED` | 429 | includes `retry_after_seconds` |
| `IMAGE_REJECTED` | 422 | wrong type or too large |
| `NOT_FOUND` | 404 | |
| `AI_UNAVAILABLE` | — | *not an HTTP error*: the API degrades to fallback and returns 200 with `source: "fallback"` |
| `INTERNAL_ERROR` | 500 | |

## 7. Rate limiting & quota (v1's design didn't survive its platform)

Three layers, each protecting a different thing:

1. **IP-keyed, on `POST /sessions`** — 10/hour/IP, in-memory.
   Without this, the per-session limit is meaningless (mint a session,
   spend it, repeat).
2. **Session-keyed, on `POST /analyses`** — 5/min/session, in-memory.
   Protects the AI quota from a single hot client.
   Both counters reset when the free instance sleeps — documented
   limitation, acceptable because layer 3 is the real backstop.
3. **Daily AI budget, in Postgres** (`daily_usage`, survives sleeps):
   below Gemini's free daily cap (configurable, e.g. 200). At the
   budget — or on any Gemini 429 — the service flips to
   **fallback-only mode** for the rest of the UTC day: 200s with
   `source: "fallback"`, plus `X-RESQ-Degraded: quota` so the UI can
   show its honest one-liner.

`X-RateLimit-Remaining` is returned on rate-limited endpoints.

## Cold start
First request after idle can take 10–30s (free instance waking). The
frontend pings `/health` on load and shows a localized "waking up"
state instead of spinning silently. Not an error; documented behavior.
