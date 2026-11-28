# Shared foundation for the six interview features

Rules for all features: levels in words only, no scores or percentages, quote only the learner's own words, text only (no audio stored), calm plain copy, every UI string passes the copy scan.

## Interview length and early end
- `totalFor(interview)` in `server/domain/questions.ts` is `questionCap ?? 4`. Use it, never `TOTAL_QUESTIONS`, for anything per interview. Practice is always four.
- `canComplete(interview, turns, { early })`: practice needs every answer. A `kind: 'screen'` interview may end early (time cap or the learner ends the call) with at least one answer. `POST /interviews/:id/complete` takes `{ "early": true }`; `/reflect` works from saved turns for an early screen.
- `POST /interviews` with `kind: 'screen'` needs `questions` (5 to 8 strings ending in `?`); this is test-only plumbing. The screen feature replaces it with its own builder. It seeds all questions, sets `questionCap`, `timeCapSeconds` (`timeCapMinutes` x 60), `startedAt`, `targetId`.
- The client follows `session.questionCap` (App state `questionCap`); never put a question count in UI copy.

## Database and `SCREEN_DB_READY`
- Owner applies `supabase/migrations/0009_variable_length_interviews.sql` (idempotent), then sets `SCREEN_DB_READY=1`.
- Until then the Supabase repo keeps screen metadata in a server-side Map and clamps a screen to 4 questions. `GET /capabilities` reports `screenLongCalls` accordingly.

## New stores
Types are in `server/repo/types.ts`: answer attempts, stories, resume claims, gap matches, replay schedule. Memory implements them; Supabase throws `PersistenceError('storage_not_ready')` (503 `storage_not_ready`). Deleting a target drops its matches; `deleteProfile` and `deleteAllNewData(ws)` clear all five.

## Client seam: `src/lib/data.ts`
Feature code calls only this module (never fetch or localStorage). `getCapabilities()`, `answerAttempts.{add,list,deleteAll}`, `stories.{create,list,get,update,remove,removeAll}`, `resumeClaims.{replace,list}`, `gapMatches.{replace,list}`, `replay.{upsert,list,remove}`, `clearAll()`. Server routes when `/capabilities` says `newData: 'server'` (memory mode), otherwise localStorage (`mirror.data.v1.*`). Same rows and ordering either way. Reset calls `data.clearAll()`, which also hits `DELETE /data`.

## Route modules (`server/routes/`)
`registerReplayRoutes`, `registerStoriesRoutes`, `registerMatchRoutes`, `registerAloudRoutes`, `registerScreenRoutes` take `(api, { repo, provider, env })` and are called from `app.ts`. Plain CRUD already exists: `/replay/attempts` (GET, POST, DELETE), `/stories` and `/stories/:id`, `/resume/claims` (GET, PUT, DELETE), `/targets/:id/match` (GET, PUT; body and reply `{ matches }`), `/practice/schedule` (GET, PUT, DELETE `?itemId=`). Workspace middleware and 64 KB caps are mounted in `app.ts`. Add feature logic in your own file; if you change a reply shape, update `data.ts` in the same commit.

## Analyser: `src/lib/analyse.ts`
`analyseAnswer(text)` returns words, sentences, fillers (with spans), vague phrases (with a plain `why`) and STAR flags. Pure and deterministic. Every span is an exact substring of the input. `countWords`, `DID`, `CHANGED` live here; `Interview.tsx` imports them.

## Copy scan: `src/copyScan.ts`
Exports `BANNED`, `scan`, `scanHtml` (needs jsdom), `walkData`. Add `src/copy.<feature>.test.tsx` with `// @vitest-environment jsdom` instead of editing `src/copy.test.tsx`. Allowlist entries go in `src/copyAllowlist.ts` with a reason.

## Who owns what
Replay: `src/features/replay`, `routes/replay.ts` logic. Screen: `domain/screening.ts`, `routes/screen.ts`, `src/features/screen`. Match: `domain/resume.ts`, `routes/match.ts`. Stories: `src/stories`, `routes/stories.ts`. Aloud: `src/practice/sql/aloud`, `routes/aloud.ts`. Spaced: `src/practice/replay.ts`, `stats.ts`.
