# RESQ — User Flows (v2)

Maps each screen to routes, states, and API calls. Every screen exists
identically in `/en/...` and `/hi/...`; only the language differs.

## 0. First visit — consent & disclaimer
Route: `/{locale}/consent` (redirected here until accepted;
acceptance flag in `localStorage`, no server round trip).
- Short disclaimer ("not a substitute for professional care") +
  one-paragraph privacy note, both localized.
- Accept → `POST /v1/sessions` (token → `sessionStorage`) → landing.

## 1. Landing — "What happened?"
Route: `/{locale}`
- On load: `GET /health` ping; while unresponsive show
  `ColdStartNotice` ("waking up…", localized).
- `GET /v1/content/categories?lang={locale}` → grid of cards, each
  with `label` + small `label_alt` (the dual-language exception).
- Search filters the grid client-side (both label fields).
- Top bar: `EN | हिंदी` toggle — swaps the URL locale prefix,
  preserving the current path.
- Tap a category → flow 2. Tap "Other" → flow 3.

## 2. Path A — predefined emergency
Route: `/{locale}/assess/{category}`
1. `GET /v1/content/categories/{key}?lang={locale}` → questions.
2. Patient context first: "How old is the injured person?" (baby
   under 1 / child 1–12 / adult 13–60 / elderly over 60). Age is what
   changes first aid — CPR technique, choking help, medicine doses —
   so the app asks for an age band, not "who is it?".
3. One question per screen, thick progress bar on top, large option
   buttons; answers accumulate **client-side** (no per-answer API
   call — v1's chattiness removed).
4. Optional photo step: client pre-checks size/type; skippable in
   one tap — never blocks the flow.
5. Submit → flow 4.

## 3. Path B — "Other" / custom problem
Route: `/{locale}/describe`
- Free-text field + mic button. Voice uses Web Speech API with
  `lang = hi-IN | en-IN` from the locale; transcript lands in the
  field, editable before submit.
- Hinglish input is fine — sent verbatim, the model handles it.
- Patient context picker + optional photo, then submit → flow 4.

## 4. Analyzing
Screen state during `POST /v1/analyses`
- One multipart request: `payload` JSON (+ `image` if any).
- Localized progress copy; calm shader background per the design
  system.
- Response `id` → navigate to `/{locale}/result/{id}`.
- If the response carries `X-RESQ-Degraded: quota` or
  `source: "fallback"`, the result page shows `DegradedNotice`
  ("AI guidance temporarily unavailable — showing verified basic
  first-aid steps", localized).
- Request failure after retry → localized error keyed by the API
  error code, with a retry button.

## 5. Result — three risk tiers
Route: `/{locale}/result/{id}`
- Refresh-safe: page re-fetches `GET /v1/analyses/{id}` with the
  session token (owner-only).

**CRITICAL**: red reserved for exactly this.
One-tap call buttons — `tel:112` and `tel:108` — above the fold,
then the immediate actions to take while help arrives.

**URGENT / NON_URGENT**: summary, numbered
`ActionSteps` (instruction-xl type), Do/Don't, what to monitor,
medical follow-up card (URGENT states it prominently), optional
`VideoCard`, `SourceList`. `DegradedNotice` when `source ≠ "ai"`.

## 6. Language switch mid-flow
The toggle is always available and swaps the locale prefix in place:
- Landing/assessment: same screen re-renders in the other language
  (content re-fetched with the new `lang`; client-side answers keep
  their IDs, which are language-neutral).
- Result page: the stored analysis was *generated* in one language; a
  re-fetch doesn't translate it. The page shows the result in its
  generation language plus a localized notice offering to re-run the
  analysis in the new language (one tap, counts against rate limit).
  This honest behavior beats silently mixing languages.

## 7. Explicitly out of scope
Guides and History have no backing API, storage, or requirement.
If ever added: Guides = static localized content pages (no API
needed); History = list of the session's analyses (one endpoint).
The top bar ships with logo + language toggle only.
