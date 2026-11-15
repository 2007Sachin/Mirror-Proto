# Practice hub + real insights: contract

Goal: replace the vague Today screen with real statistics, and replace "Stories" with a **Practice** hub: four hands-on tracks (SQL, Python, Stats and A/B testing, Case simulator) that run inside the product, record every attempt, and feed Today.

Shared types: `src/practice/types.ts` (read it first; do not change it, tell the lead if you need a change).

## Research findings that drive the design (verified where marked)
- Show descriptive counts and coverage. Never a readiness score or percent-ready (nothing validates it). Always show n with any rate.
- No streak counter that resets to zero, no red "behind" states, no leaderboards (streak-loss anxiety is documented; verified via Duolingo and gamification sources).
- SQL appears in almost every analyst loop (joins, aggregation, window functions, CTEs); A/B testing next (power, sample size, SRM, novelty, peeking); Python in a large share (algorithms at easy-medium, strings/dicts, cleaning). Prep-site sources, no measured frequency: do not claim "most asked at <company>".
- SQL in the browser: sql.js (already installed). Python: Pyodide in a Web Worker, loaded lazily only when a Python item opens, with a visible "downloading the Python runtime (about 10 MB)" state and a worker timeout (10 s) that terminates and respawns the worker. Do not rely on SharedArrayBuffer. No pandas in v1 (large download): plain Python only; say so.
- Simulators feel real when they pair a messy dataset with an ambiguous brief, a stakeholder question and a decision at the end.

## Track module contract
Each track lives in `src/practice/<track>/` and exports `trackModule: TrackModule` from `src/practice/<track>/index.ts`:
- `items`: catalog metadata only (no heavy imports in index.ts except `React.lazy` for `Drill`).
- `Drill`: `React.lazy(() => import('./Drill'))`, default-exported component with `DrillProps`. It shows ONE item, lets the person answer, shows the result in words, calls `onAttempt` after every submitted answer, and `onClose` when they leave. It must not call the network. Unmounting mid-run must be safe.
- Light palette only: reuse `.mirror-landing` tokens and classes (`.ml-glass .ml-btn .ml-btn--quiet .ml-eyebrow .ml-sr`); copy the visual patterns from `src/pages/target/SqlRound.tsx` and `sqlRound.css`. No new colours. Buttons >= 44px, visible focus, responsive to 360px, nothing overflows the page.
- Copy rules: plain, short sentences. No scores, percentages or grades. Never the words "agentic", "evidence", "reflection", "evaluation".
- `topics` use exactly these names (so coverage works):
  - sql: `Filtering and NULLs`, `Joins`, `Aggregation`, `Subqueries and CTEs`, `Window functions`, `Dates and time`, `Retention and funnels`
  - python: `Strings and dicts`, `Lists and loops`, `Data cleaning`, `Algorithms`
  - stats: `Descriptive stats`, `Hypothesis tests`, `Power and sample size`, `A/B test pitfalls`, `Ship or not`
  - case: `Metric drop`, `Funnel analysis`, `A/B decision`
- Item ids: `<track>-<short-slug>`, stable forever, unique.
- Every track needs at least 3 items per level it claims, spread over its topics (see each track's brief).
- Every non-trivial piece of logic has a runnable test (`src/**/*.test.ts`, picked up by `vitest run`).

## Server API (all need X-Dev-Workspace)
- `POST /practice/attempts` body `{ itemId, track, topic, level, correct, seconds, hintsUsed }` -> `201 { id }`. Validate: track in the four, level 1-3, seconds 0-3600, hintsUsed 0-20, itemId/topic 1-120 chars.
- `GET /practice/summary` -> `PracticeSummary` (types.ts). Per item: attempts, firstTryCorrect (the earliest attempt), solved, seconds total, lastAt, solvedAt. `days`: per UTC day, attempts and seconds, last 84 days, only days with activity, oldest first.
- Storage: table `mirror_practice_attempts` (id uuid, workspace_id, item_id, track, topic, level int, correct bool, seconds int, hints_used int, created_at). Migration `supabase/migrations/0006_practice.sql`, idempotent, RLS enabled, plus an index on (workspace_id, created_at).

## Today (insights) rules
All stats are computed client-side by pure functions in `src/practice/stats.ts` from `PracticeSummary` + the track catalog + targets. The eight stats (from research), each with n shown where it is a rate:
1. Days to the next interview (nearest future target date) and which company.
2. Practised this week: distinct items attempted in the last 7 days, next to the previous 7.
3. Time practised this week with a per-day bar sparkline.
4. Coverage: topics touched / topics total, naming the untouched topics.
5. First-try results by topic: "first try right: 3 of 5", only the counts, never a percentage.
6. Weak spots: topics where items were failed first and are still unsolved; count + a Practise link that opens the first such item.
7. Due for review: items solved more than 3 days ago and not attempted since (3, 7, 14 day spacing); count + Review link.
8. Active days: a plain 28-day calendar grid; no streak counter, no penalty for gaps.
Plus: "Your targets want": for each target, map its skills (`area` sql/python/analytics/tools/behavioural) to tracks and show practised vs available items per track ("Northwind asks for SQL and A/B testing: you have solved 5 SQL problems, 0 stats items").
Plus: one "Next best rep" recommendation chosen by a transparent rule order (weak spot, due review, uncovered topic of a track a target needs, first item of the lowest-attempted track) with the reason in one plain sentence.
Empty states are designed (new user: honest "Nothing practised yet" with a clear first action), never zeros dressed as insight.

## Design and ponytail
Follow `.claude/skills/web-design-engineer/SKILL.md` as the quality bar, but the visual language is fixed (First Interview palette). Ponytail rules: smallest complete change, reuse existing code (sqlEngine in `src/pages/target/` is reusable via import: `loadSql` etc.), no speculative abstractions, no new dependencies unless named, `ponytail:` comments on deliberate shortcuts.
