# MIRROR — Setup & Infrastructure Guide

> Status: **Phase 1 backend implemented**. This document describes how to run
> the current prototype and what the production infrastructure (NVIDIA NIM, Supabase,
> Sarvam) will require when those phases are implemented. Items marked
> **[planned]** do not exist in this codebase yet.

## 1. Current prototype (what exists today)

- Stack: React 19, TypeScript, Vite 7, Tailwind CSS, orb-ui, shadcn-style UI primitives.
- Phase 1 backend (implemented): Hono API in `server/` (workspaces, interviews,
  turns, reflections), in-memory or Supabase persistence, NVIDIA NIM reflection
  provider, Vitest suite.
- Frontend interview flow calls the API via the `/api` dev proxy and falls back
  to local demo behaviour when the server is unreachable.

### Run it

```bash
npm install
npm run dev              # local dev server (Vite, port 3000)
npm run dev:server       # Phase 1 API (Hono, port 8787; memory mode without env)
npm run build            # type-check + production build (tsc -b && vite build)
npm run lint             # eslint
npm run typecheck:server # server-only type check
npm test                 # server API test suite (vitest)
npm run preview          # serve the production build
```

Copy `.env.example` to `.env` to enable Supabase persistence and NVIDIA NIM
reflections; with no env vars the API runs in memory mode and `/reflect`
returns `503 reflection_provider_unavailable`.

## 2. Environment variables

The prototype needs **none**. `VITE_*` variables are not referenced anywhere in
`src/` or `vite.config.ts`.

**[implemented]** Production variables (server-side only, never prefixed with
`VITE_` — Vite inlines those into the public bundle):

| Variable | Purpose | Scope |
|---|---|---|
| `NVIDIA_NIM_API_KEY` | LLM calls (structured reflection output) | server only |
| `SARVAM_API_KEY` | STT/TTS realtime voice | server only |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | backend DB | server only |
| `SUPABASE_ANON_KEY` | client, subject to RLS | client-safe |

Rules: keep all secrets in a server runtime (e.g. Supabase Edge Functions
secrets); never import them in `src/`; add `.env*` to delivery exclusions
(the repo `.gitignore` already covers `*.local` and `node_modules` — extend it
with `.env` when the backend lands).

## 3. Database & migrations **[implemented]**

Intended tables (all with `workspace_id` and RLS scoping):

- `workspaces`, `interviews` (status: `in_progress | completed`),
  `turns` (question index, answer text, transcript), `reflections`
  (readiness band, focus, evidence links).

Migration workflow (Supabase CLI): `supabase init` → `supabase migration new …`
→ `supabase db push`. RLS enabled on every table; **no** `anon` policies with
broad `using (true)`; each policy must constrain `workspace_id`.

## 4. Backend API surface **[implemented]**

The QA contract these endpoints must satisfy:

- `GET /health`, `GET /integration-status` — provider liveness, no sensitive data.
- `POST /interviews` — create session; validate env config first.
- `POST /interviews/:id/turns` — accepts only the **next** expected question
  index; rejects empty answers, duplicates, out-of-order turns; refuses
  completion before all four answers.
- `GET /interviews/:id` — session reload.
- `POST /interviews/:id/reflect` — calls NVIDIA NIM with a structured-output
  schema; rejects evidence whose `turn_id` is unknown or whose `quote` is not an
  exact substring of that turn's answer; emits **no numeric readiness without
  evidence**. Provider failures must return a safe, non-5xx-to-user error and
  must be logged **without** answer/prompt content.
- Role-specific views filter strictly by role/workspace (evidence isolation).

## 5. Testing

- Implemented: mocked-provider Vitest suite in `server/__tests__/` covering
  the §4 validation rules (`npm test`). Live-provider smoke runs only when
  credentials are present, reported separately from mocked runs.

## 6. Known limitations (prototype)

- Session/state is lost on refresh (no persistence, no reload).
- Reflection report shows fixed demonstration values (e.g. `62–72`); readiness
  numbers are not computed from answers.
- Voice buttons are UI previews only; Sarvam and NVIDIA NIM are not connected.
- `src/pages/Home.tsx` is an unused Vite scaffold page left in the repo.
- Evidence "quotes" on the report are the full answers, not verified substrings.

## 7. Future: Sarvam realtime-voice phase **[planned]**

- Server-mediated WebSocket session: client audio → Sarvam STT → orchestration
  LLM (NIM) → Sarvam TTS → client playback, with the orb driven by live
  input/output volume.
- Keep API keys server-side; stream transcripts into `turns` rows as they are
  finalised so a dropped connection never loses answers.
- Add interruption handling, language switching (English/हिन्दी/தமிழ்/తెలుగు),
  and a text fallback path identical to today's prototype composer.
