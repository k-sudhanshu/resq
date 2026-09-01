# RESQ Documentation (v2)

RESQ is a bilingual (English/Hindi) AI first-aid assistant for India —
free-tier hosted, built as a real, finishable project that demonstrates
production-grade engineering judgment.

These docs are the source of truth for implementation. Point
Cursor/Antigravity at this folder as project context; each document is
written to be directly actionable.

## Reading order

1. [00-overview.md](./00-overview.md) — scope, principles, and the
   full review log of what v2 fixed and why
2. [01-architecture.md](./01-architecture.md) — system architecture
   and the analysis pipeline
3. [02-i18n.md](./02-i18n.md) — the English/Hindi language design
   (content separation, locale routing, AI output language, fonts)
4. [03-database.md](./03-database.md) — two tables + a quota row
5. [04-api.md](./04-api.md) — REST API v1
6. [05-ai-and-prompts.md](./05-ai-and-prompts.md) — provider
   abstraction, full prompt text, risk engine, output validation
7. [06-security-privacy.md](./06-security-privacy.md) — auth, image
   handling, rate limiting, privacy stance
8. [07-deployment.md](./07-deployment.md) — free-tier stack and CI/CD
9. [08-repo-structure.md](./08-repo-structure.md) — repo layout and
   module boundary rules
10. [09-user-flows.md](./09-user-flows.md) — screens mapped to
    routes and API calls
11. [10-local-development.md](./10-local-development.md) — how the local
    setup differs from production and why

## Related material

- [RESQ-Architecture-Interview.pdf](./RESQ-Architecture-Interview.pdf)
  — 8-page visual brief for interviews (architecture, API names, why this flow)
- `stitch_resq_emergency_assistant/emergency_response_systems/DESIGN.md`
  — design tokens used by the frontend

## Implementation status

The architecture in these documents is implemented and running locally. See
the [root README](../README.md) to start it, and
[10-local-development.md](./10-local-development.md) for how the local setup
differs from production.

| Built | Not built yet |
| --- | --- |
| Backend: sessions, content, analysis pipeline, rules engine, output guard, quota service, cleanup | Deployment to Vercel / Render / Neon |
| Content: twenty-two categories plus free text, in English and Hindi, with parity enforced | Curated video ids (`content/videos.yaml` is stubbed) |
| Frontend: locale routing, consent, landing, assessment, free text with voice, result | A verified run against the real Gemini provider |
| Tests: risk engine, safety filter, image handling, every endpoint, bilingual scenarios, all degradation paths, browser smoke test in both languages | Real-device testing on a slow connection |
