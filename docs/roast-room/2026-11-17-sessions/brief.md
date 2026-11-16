# Brief: the Sessions page

16 November 2026 · Full council

## The decision

What should a candidate see after a practice interview, and how should many sessions sit on one page?

## The business

MIRROR. Candidate practises by voice or text. Audio is not stored. The server keeps the questions, the typed or transcribed answers, and a reflection. Prototype, solo founder. Never scored.

## Resources

One pass. Two-way door. Existing `InterviewSession`: role, kind (practice or screen), turns `{question, answer, transcriptSource}`, reflection `{evidence[{quote, observation, competency}], focus, suggestion, readinessLabel, readinessRange}` (`src/lib/api.ts:11-64`). Readiness fields exist in the type and must not be shown as a grade. Prefer composing the review in the client from turns plus the reflection. A migration only if the review cannot be honest without new stored fields.

## Success

Several sessions read as compact cards. Opening one shows a complete, consistent review: overview, each question with what worked and what to strengthen in STAR shape, delivery notes (spoken vs typed, length in words not a score), patterns across sessions in words, and one concrete next practice. No loose list. No percentages.

## Founder lean

The page "shows random things with no impact." He wants the structured review above. He is leaning to a rebuild.

## What the code does now

`src/pages/Sessions.tsx`.

- Title "Sessions", eyebrow "YOUR PRACTICE", subtitle "Every practice you have finished, newest first." Primary button "Practise again" (`:73-80`).
- Empty: chart icon, "No finished sessions yet.", "Start a practice" (`:90-96`).
- List is full-width rows, not a card grid (`:100-111`). Each row: role, date, `` `${n} answers` `` (`:11`, `:105`), and either `notes.keepWorkingOn` or "Notes not written yet."
- The first session (or the one just finished) is open by default (`:49`). Detail is stacked under the list, not a separate view (`:114-151`).
- When a reflection exists: "WHAT STOOD OUT" renders `reflection.evidence` as bare quotes (`:124-126`). The word "evidence" is the field name, not the heading, but the product owner banned the word and the copy scan already bans it (`src/copyScan.ts:8`) if it appears in rendered text. "KEEP WORKING ON" is `reflection.focus` (`:128-130`). Optional suggestion plus "Try it in a new practice" (`:132-136`). Then `SessionAnswers` dumps every turn.
- No per-question STAR split. No "what worked" versus "what to strengthen" per answer. No delivery note. No pattern across sessions. `readinessLabel` / `readinessRange` are on the type and must stay off the screen (old report CSS in `index.css:130-131` still has a giant range value and an `.evidence-grid`).
- "Write my notes" if reflection is missing (`:142-149`).
- CSS is 10 lines (`src/pages/sessions.css`). Type is 12–14px. It uses workspace tokens, not the Today/Targets landing tokens. Max content width 1250px from `.workspace-content` (`index.css:119`).
- Counts: `plural(s.answered, 'answer')` is "{n} answers", which the copy scan's fixed-count rule may catch only as "N questions", not "N answers" (`copyScan.ts:9`).

## Options

- **A. Relabel.** Keep the row list and the inline detail. Rename the quote block. Hide readiness. Still one open detail under the list.
- **B. Cards and a review.** Compact cards (role, date, kind, one-line focus). Click opens one session as a structured review with the sections in the success line. List and review are not both fully open. Patterns are a short named note, not a chart. Next practice is one button.
- **C. Transcript only.** Cards open the answers and nothing else.
- **D. Leave it.**

## Weights

| Seat | Weight | Why |
|---|---|---|
| Sara | 3 | The review is the product the candidate feels |
| Graham | 3 | If the review does not change the next rep, it is decoration |
| Bezos | 2 | Work backwards from "what do I say differently tomorrow?" |
| Buffett | 2 | Readiness numbers are a grade waiting to leak |
| Wickman | 2 | The same sections, every session, or it will rot into a loose list again |
| Elon | 1 | Delete the quote dump if the observation already says the point |

## Assumptions

- A typical session is a handful of answers, not an hour-long transcript (assumed from a question cap around four in `App.tsx:63`).
- STAR can be read from the answer text with a simple completeness check (situation / task / action / result keywords or empty parts). Do not invent a score from that check.
