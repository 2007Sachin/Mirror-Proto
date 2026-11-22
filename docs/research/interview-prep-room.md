# Interview Prep Room — Screen Design

This describes what is shipped on `main`: `src/pages/InterviewPrep.tsx`, `src/pages/interviewPrep.css`, `src/prep/roles.ts`, `src/prep/weakSpots.ts`, `src/prep/plan.ts`.

## Purpose
Pick a role (Product Manager, Data Analytics, Financial Analyst, Digital Marketing) or bring your own job, then rehearse any round of that role's interview loop as a live mock interview. An interviewer asks, listens and follows up. **Practice is spoken, not a checklist, and nothing is graded.** Role content comes from `docs/research/<role>-interview-prep.md`, bundled as text and parsed once, so the room works offline and in demo mode.

## Role picker
- Page title **Interview Prep**, heading "Pick the role you are preparing for".
- One card per role (title, a "N rounds" pill, the first three round names). Picking one opens the role view; the last-opened role is remembered and reopened next time. **Change role** returns to the picker.
- Below the cards, **Prepare for a specific job** (**Bring your own job**): paste a job description, MIRROR lines it up with your résumé and suggests rounds. Saved jobs appear as further cards and open the job's own page. This needs the job handlers from the app shell; without them only the ready-made roles show.

## Role view
1. **Header**: role name, "N rounds" lead-in, a readiness line, and **Change role**.
2. **Readiness line**: `Rounds practiced X of Y · Revisit items Z`. X is the number of rounds you have been asked at least one question in, Z the number of questions flagged "Needs more work". There is no score and no grade.
3. **Interview-date plan card**: an optional date input, kept on this device. With a date it shows `Today: Round N – name` (or "Revisit your weak spots"), `N days to go` and the next three days. One round per day from today, the last day revisits weak spots; the plan covers at most 28 days and at least 1. States: no date (prompt to add one), unreadable date, date already passed (asks for a new one), interview today (one revisit day).
4. **Round cards**, one per round in loop order, each with a "Round N" pill, a one-sentence summary of what the round tests, and:
   - `N questions, a fresh one each time`, and `N asked so far` or `Not started yet`.
   - `Revisit these: N` when questions in that round are flagged.
   - **Start interview** (spoken) and **Type instead** (typed). Both open the live interview with the first question of that round you have not been asked yet; after all are used it starts over.
   - A collapsed **See the questions** list. Each question has a **Needs more work** toggle on its own row beneath the question text (`aria-pressed`, 44px minimum tap target) that flags it for revisiting.

At 390px the cards stack in one column; controls are at least 44px high and keyboard reachable.

## Data model
```
Role { slug, title, overview, rounds: Round[] }
Round { name, tests, questions: string[] }
```
Everything below stays in this browser only. Nothing is sent anywhere, and all `mirror.*` keys are cleared on sign-out.

| Key | Holds |
| --- | --- |
| `mirror.prep.v1.<slug>` | Questions already asked for a role (`{ done: ["round-question", …] }`) |
| `mirror.prep.v1.last` | Last-opened role |
| `mirror.prep.v1.weakspots` | "Needs more work" flags (role, round, question index) |
| `mirror.prep.v1.plan.<roleId>` | Interview date for a role (`YYYY-MM-DD`) |

## Not built, deliberately: practice is spoken, not a checklist
- Round tabs (rounds are cards).
- "Mark practiced" toggles.
- The free-text scratchpad.
- "x/10 practiced" badges and a per-role "14/50" total.

## Content source
- `docs/research/pm-interview-prep.md`
- `docs/research/data-analytics-interview-prep.md`
- `docs/research/financial-analyst-interview-prep.md`
- `docs/research/digital-marketing-interview-prep.md`

Adding a role: add a file with the same headings (`## Overview`, then `### Round N: <name>` with a `**Tests:**` line and numbered questions) and one line in `ROLE_FILES` in `src/prep/roles.ts`.
