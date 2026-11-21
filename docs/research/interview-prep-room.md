# Interview Prep Room — Screen Design

## Purpose
A new room where a user picks a target role (Product Manager, Data Analytics, Financial Analyst, Digital Marketing — more roles can be added later) and works through that role's interview loop one round at a time: what the round tests, and 10 practice questions to rehearse against. Content for each role comes straight from `docs/research/<role>-interview-prep.md`; this doc describes how that content should be surfaced in the product, not the content itself.

## Entry point
- A new entry alongside the existing `Practice`/`Stories`/`Targets` rooms in the sidebar/nav, labelled **Interview Prep**.
- Landing inside the room shows a **role picker**: one card per role (title + one-line overview sentence pulled from that role's `## Overview` section). Selecting a role opens that role's prep view. The last-opened role is remembered (same pattern as `Practice`'s `track`/`item` state) so returning users land back where they left off.

## Screen layout (per role)
Once a role is selected, the room is a single page with:

1. **Header** — role name, a "change role" link back to the picker, and a compact progress indicator (e.g. "2 of 5 rounds reviewed").
2. **Round tabs** — one tab per interview round, in the order listed in the source doc (e.g. for Product Manager: *Product Sense & Case Study → Analytical/Metrics & SQL → Execution & Prioritization → Behavioral/Leadership → Founder/Culture-Fit*). Reuse the existing Radix-based `Tabs`/`TabsList` primitive from `src/components/ui/tabs.tsx` rather than introducing a second tab component. Tabs scroll horizontally on narrow (390px) viewports instead of wrapping, consistent with how other rooms handle overflow at that width.
3. **Within the active round tab**, three stacked sections (not nested sub-tabs, to avoid a tabs-inside-tabs pattern):
   - **Skills tested** — the round's `**Tests:**` sentence(s) from the source doc, shown as a short lead-in card at the top of the tab panel so the user knows what they're about to practice before seeing questions.
   - **Questions** — the round's 10 practice questions as a numbered list. Each question is a `card card--bordered` row (matching the existing card convention used elsewhere, e.g. `Today`'s cards) with the question text and a small "Mark practiced" toggle.
   - **Practice** — a lightweight self-rehearsal control per question: a "Practice this" button that expands an inline free-text scratchpad (think-aloud notes, not graded), plus optional "I'd use the Replay room for this" hint linking out to the existing live `Interview`/`Replay` flow for anyone who wants a timed, spoken rehearsal instead of reading.

## Data model
Content is static Markdown-derived data (no backend needed for v1): parse each `docs/research/<role>-interview-prep.md` into
```
Role { slug, title, overview, rounds: Round[] }
Round { name, tests, questions: string[10] }
```
at build time (or via a small generated JSON, similar to how `practice/tracks.ts` enumerates `tracks` today) rather than fetching Markdown at runtime, so the room works offline/in demo mode like the rest of the app.

User progress (which questions are marked practiced, scratchpad text) is local-only state, following the same pattern as `Practice`'s `PracticeSummary`/`ItemStat` and `Interview`'s per-question draft keys (`localStorage`, keyed by role + round + question index) — no server round-trip required for v1.

## Progress tracking
- Per round: "x/10 practiced" shown on the round's tab label (small badge), so a user can see at a glance which rounds they've worked through.
- Per role: the header progress indicator aggregates across all rounds (e.g. "14/50 questions practiced").
- Progress is cosmetic/self-reported only (no correctness grading) — this is a rehearsal aid, not an assessment.

## Accessibility & responsive notes
- Round tabs must be reachable via keyboard (arrow-key tab navigation, as the Radix `Tabs` primitive already provides) and announce the selected round to screen readers.
- At 390px, the three sections stack full-width; the "Skills tested" card stays visible above the scrollable question list so context isn't lost while scrolling.
- Follow the project's existing dark-mode token convention (`--m-text-*`, not raw hex/px values) for any new CSS, per the lint rule already enforced in `src/ui/system.test.ts`.

## Content source
All copy (overview, round names, tests-description, questions) is sourced verbatim from:
- `docs/research/pm-interview-prep.md`
- `docs/research/data-analytics-interview-prep.md`
- `docs/research/financial-analyst-interview-prep.md`
- `docs/research/digital-marketing-interview-prep.md`

Adding a new role to the room means adding a new `docs/research/<role>-interview-prep.md` file in the same structure (`## Overview`, `### Round N: <name>` with a `**Tests:**` line and exactly 10 numbered `**Practice Questions:**`) and wiring it into the role picker — no other content changes needed.

## Open questions for design/eng follow-up
- Should "Mark practiced" state sync to the user's profile once a backend exists, or stay local-only indefinitely?
- Should the room suggest a recommended round order per role, or let users jump straight to any round (current assumption: free navigation, rounds shown in loop order as a suggestion only)?
- Should questions be shuffled/randomized per practice session to avoid rote memorization, or kept in a fixed order for predictability? (Current assumption: fixed order, matching the source doc, for v1.)
