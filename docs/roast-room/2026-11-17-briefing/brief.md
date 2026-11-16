# Brief: the home page (now called Today)

16 November 2026 · Full council · Chair does not argue

## The decision

What should MIRROR's home page be, and what should the sidebar call it?

## The business

MIRROR is a candidate-side interview-practice web app. One person prepares for a specific job: spoken or typed practice, a story bank, and a target (a role they want). Pre-revenue prototype, solo founder (Sachin, product manager). No ads, no scores sold. Privacy-first: audio is never stored. (Stage and revenue assumed: prototype, $0.)

## Resources

One implementation pass in this PR. Two-way door: copy and layout can change again. Practice page is out of scope. Must keep working without a new database migration if possible.

## Success

A candidate, in five seconds, can say the one thing they will do next. The page looks finished, calm, and professional. No grades.

## Founder lean (test it, do not echo it)

He dislikes the name "Today". Candidates he mentioned: Overview, Briefing, Home. The roast picks. He wants more professional, thoughtful vocabulary. Banned in the UI: "evidence", "Start speaking", streak, score, percentages, "x of y" counts. Calm, Apple-inspired, compact, use the width, less empty space, one type scale.

## What the code does now (ground every claim)

The page was rebuilt in PR #20 and is the default (`VITE_TODAY_V1` keeps the old Overview). `buildToday()` in `src/features/today/buildToday.ts` is the only owner of "what next".

- Hero priority (`buildToday.ts:67-114`): resume an open interview, interview-day warm-up, screening call when the interview is 1–3 days away, a coach question, replays due, a practice exercise, or the first interview.
- The spoken-question button is still **"Start speaking"** (`buildToday.ts:46`). Other labels: "Pick it up", "Let it go", "Start warming up", "Start the call", "Start today's replays", "Start this one", "Begin".
- Header eyebrow is **"Today · {date}"** (`src/features/today/sections.tsx:38`). Greeting is "Good morning" style or "Welcome. Start with one question." (`buildToday.ts:180`).
- At most four sections (`buildToday.ts:173-178`): hero, Coming up (nearest target, named skill chips, not counts), Since last week, and a row of Replays + Stories. A Set up card for new users.
- One filled primary button, in the hero (`sections.tsx:54-66`). Alternates are text links ("Or instead").
- Replay hero title is a count: `` `${n} replays due` `` (`buildToday.ts:97`). Copy scan bans `of \d+` and percentages (`src/copyScan.ts:7-10`) but not the word "streak" or "Start speaking" or "score".
- Layout: max-width 1040px, centered, 18px gaps, Inter font (`src/pages/today.css:2-3, 8`). The rest of the app uses a different scale in `src/index.css` (page titles 38px, body often 11–13px). Today sits inside the workspace shell, which still labels the nav item **Today** (`src/App.tsx:476`) and hides the breadcrumb only on this view (`App.tsx:487`).
- "Coming up" can list covered / partial / gap skill names. Since last week names what got stronger and what to revisit.

## Options

- **A. Polish.** Keep the four-section model and the name Today. Swap "Start speaking", tighten type, use more of the width.
- **B. Briefing.** Rename the nav (the roast chooses the word). Keep one next step. Collapse the rest into a short role strip (company, role, when, the gaps by name, one story to add) and one line on what changed. Cut the replay count from the hero title.
- **C. Home, same model.** Rename to Home only. Keep today's sections and priority.
- **D. Leave it.** Ship PR #20 as it is.

## Weights

| Seat | Weight | Why |
|---|---|---|
| Graham | 3 | This is the page that has to be the thing the candidate wants |
| Sara | 3 | Naming, wording, and whether the product feels worth telling a friend |
| Bezos | 2 | Working backwards from the interview morning |
| Buffett | 2 | A grade in disguise would wreck trust |
| Elon | 2 | Delete steps that do not cause a rep |
| Wickman | 1 | The page already has one owner; do not split it again |

## Assumptions

- No usage numbers yet (assumed). Judge from the candidate job: walk in, know the next rep, leave.
- Reversible this week (assumed).
- Founder will not A/B test names with users before this PR (assumed). The council still picks one name.
