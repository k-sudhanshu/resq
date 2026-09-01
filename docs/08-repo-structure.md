# RESQ — Repo Structure & Module Boundaries (v2)

## Top level

```
resq/
├── frontend/
├── backend/
├── docs/                      # this folder
├── .github/workflows/
│   ├── ci.yml
│   ├── cleanup.yml            # hourly TTL cleanup (cron)
│   └── keepwarm.yml           # optional /health ping (cron)
├── docker-compose.yml         # local dev: postgres only
└── README.md
```

## Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css                    # Tailwind layers, Hindi line-height boost
│   │   └── [locale]/                      # 'en' | 'hi' — every page lives here
│   │       ├── layout.tsx                 # locale provider, <html lang>, fonts
│   │       ├── page.tsx                   # landing: search + category grid
│   │       ├── consent/page.tsx           # disclaimer + privacy note (first visit)
│   │       ├── describe/page.tsx          # "other" flow: text/voice + image
│   │       ├── assess/[category]/page.tsx # question flow + optional image
│   │       └── result/[id]/page.tsx       # guidance / emergency screen
│   ├── components/                        # pages stay thin; each screen is one component
│   │   ├── layout/
│   │   │   ├── TopBar.tsx                 # logo + LanguageToggle
│   │   │   ├── LanguageToggle.tsx         # EN | हिंदी, swaps locale prefix in URL
│   │   │   └── ColdStartNotice.tsx        # "waking up the server…"
│   │   ├── landing/
│   │   │   ├── LandingScreen.tsx          # search + grid + cold-start/error states
│   │   │   └── CategoryCard.tsx           # label + label_alt (the dual-label exception)
│   │   ├── consent/ConsentScreen.tsx
│   │   ├── assess/
│   │   │   ├── AssessScreen.tsx           # one question at a time, holds the answers
│   │   │   ├── OptionButton.tsx           # 56px+ touch targets
│   │   │   ├── ProgressBar.tsx
│   │   │   └── PatientContextPicker.tsx   # age bands: baby / child / adult / elderly
│   │   ├── describe/DescribeScreen.tsx    # free text + voice + patient context
│   │   ├── input/
│   │   │   ├── VoiceInput.tsx             # Web Speech API, lang from locale
│   │   │   └── ImagePicker.tsx            # client-side size/type pre-check
│   │   ├── result/
│   │   │   ├── ResultScreen.tsx           # fetches and composes the pieces below
│   │   │   ├── EmergencyCallout.tsx       # CRITICAL: one-tap 112 / 108
│   │   │   ├── ActionSteps.tsx            # numbered, instruction-xl type
│   │   │   ├── GuidanceLists.tsx          # do-not / monitor / follow-up / sources
│   │   │   └── DegradedNotice.tsx         # fallback / quota mode banner
│   │   ├── AnalyzingScreen.tsx            # progress states during POST /analyses
│   │   ├── ErrorNotice.tsx                # error code → localised message + retry
│   │   ├── Icon.tsx                       # inline SVG, never an icon font
│   │   └── Icon.data.ts                   # generated glyph paths (see scripts/)
│   ├── lib/
│   │   ├── api.ts                         # typed client for API v1
│   │   ├── session.ts                     # token in sessionStorage
│   │   ├── speech.ts                      # locale → 'en-IN' | 'hi-IN'
│   │   └── types.ts                       # mirrors backend response schemas
│   ├── i18n/
│   │   ├── routing.ts                     # next-intl config: locales, default 'en'
│   │   ├── navigation.ts                  # locale-aware Link / router
│   │   └── request.ts
│   └── proxy.ts                           # next-intl locale middleware
├── messages/
│   ├── en.json                            # ALL user-facing UI text incl. errors.*
│   └── hi.json                            # identical key set (CI-enforced)
├── scripts/build-icons.mjs                # regenerates Icon.data.ts from Material Symbols
└── tests/
    └── messages-parity.test.mjs           # en.json / hi.json key equality
```

Boundary rules:
- No literal user-facing string in any component — everything through
  `messages/*.json`.
- `lib/api.ts` is the only place that knows the backend exists.
- Locale is read from the route param only; no component keeps its own
  language state.
- Icons are inline SVG, not an icon font. An icon font is a ligature font, so
  a failed download renders the icon's English name ("block", "visibility") as
  visible text — including on a Hindi screen.

## Backend

```
backend/
├── app/
│   ├── main.py                        # app factory, lifespan (content load, DB)
│   ├── core/
│   │   ├── settings.py                # env config incl. AI_PROVIDER, DAILY_AI_BUDGET
│   │   ├── errors.py                  # error codes → HTTP responses (codes only)
│   │   ├── rate_limit.py              # in-memory IP + session limiters
│   │   └── logging.py                 # structured, English-only, no PII
│   ├── api/
│   │   └── v1/
│   │       ├── deps.py                # session-token auth, lang validation
│   │       ├── sessions.py            # POST /sessions
│   │       ├── content.py             # GET /content/categories[...]
│   │       ├── analyses.py            # POST /analyses, GET /analyses/{id}
│   │       └── internal.py            # POST /internal/cleanup, GET /health
│   ├── domain/                        # pure logic — no I/O, no framework imports
│   │   ├── risk.py                    # SEVERITY, merge_risk, evaluate_rules
│   │   └── types.py                   # RiskLevel, PatientContext, Language enums
│   ├── services/
│   │   ├── analysis_service.py        # THE pipeline (01-architecture.md §3)
│   │   ├── ai/
│   │   │   ├── provider.py            # AIProvider ABC
│   │   │   ├── gemini.py
│   │   │   └── mock.py
│   │   ├── prompt_builder.py          # system + language clause + USER_DATA block
│   │   ├── output_guard.py            # schema → safety filter → language check → source whitelist
│   │   ├── image_service.py           # magic bytes, EXIF strip, in-memory resize
│   │   ├── fallback_service.py        # per-category/per-language KB lookup
│   │   └── quota_service.py           # daily_usage row, fallback-only mode flag
│   ├── content/
│   │   ├── registry.py                # startup loader + EN/HI parity validation
│   │   ├── en/
│   │   │   ├── categories.yaml
│   │   │   ├── questions/{burn,cut,fracture,choking,poisoning}.yaml
│   │   │   └── fallback/{burn,...,other}.yaml
│   │   ├── hi/                        # mirror of en/ — same files, same IDs
│   │   ├── safety/
│   │   │   ├── en.yaml                # banned phrases, per language
│   │   │   └── hi.yaml
│   │   ├── trusted_sources.yaml       # language-neutral: ids + per-lang labels/urls
│   │   └── videos.yaml                # category → video id, per language if needed
│   ├── prompts/
│   │   └── system.txt                 # English; language clause injected at runtime
│   ├── db/
│   │   ├── models.py                  # sessions, analyses, daily_usage
│   │   ├── engine.py
│   │   └── repositories/
│   │       ├── sessions.py
│   │       └── analyses.py
│   └── schemas/
│       ├── api.py                     # request/response models for api/v1
│       └── ai.py                      # AIRequestContext, AIGuidance
├── alembic/
├── tests/
│   ├── unit/                          # domain/risk, output_guard, prompt_builder,
│   │   └── test_content_parity.py     #   and the EN/HI parity test
│   ├── integration/                   # API against test Postgres + MockAIProvider
│   └── ai_cases/                      # bilingual scenario fixtures (05 §9)
├── Dockerfile
└── pyproject.toml
```

Boundary rules:
- `domain/` imports only the standard library — safety logic must be
  trivially unit-testable and impossible to entangle with I/O.
- Routes never touch SQLAlchemy or providers directly; they call
  services.
- `analysis_service.py` is the only module that knows the pipeline
  order; everything it calls is independently replaceable.
- Content is read via `registry.py` only — nothing else opens YAML at
  request time.
- Naming is uniform end to end: `analyses` (API) = `analyses` (table)
  = `analysis_service` (orchestrator); "assessment" appears only in
  frontend flow naming, matching what the user experiences.

## What's intentionally absent
No `media_service` / S3 client, no `circuit_breaker.py`, no audit
repo, no admin routes, no translation micro-service. Each has its
trigger condition in [00-overview.md](./00-overview.md).
