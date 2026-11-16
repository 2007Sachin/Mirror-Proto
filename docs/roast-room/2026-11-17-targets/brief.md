# Brief: the Targets page

16 November 2026 · Full council

## The decision

How should a candidate move through one job they are preparing for?

## The business

Same product as the Briefing brief: MIRROR, candidate-side interview practice, prototype, solo founder, privacy-first, never scored. A "target" is one job: company, role, job description, optional interview date.

## Resources

One pass. Two-way door. Prefer no new migration. Existing data: target (skills, rounds, events, debriefs, next step), résumé match (covered / partial / gap, probe questions), stories with themes. `PATCH /targets/:id` already updates the date.

## Success

The page reads as a path, not a pile: add the job, understand it, prepare, interview day, debrief. A candidate can see which requirement their résumé does not yet back, which story to tell, and what to practise next. No percentages, no "x of y", no grades.

## Founder lean

The page feels random. Ground it in jobs-to-be-done, STAR, competency mapping (JD requirements to résumé), and spaced repetition. Present it in a structured format. He is leaning toward a staged rebuild, not a polish.

## What the code does now

`src/pages/Targets.tsx`.

- List (`:55-110`): company, role, "Interview {when}", status chip "Ready" or "Scouting…". Empty state: "A target is a job you want." Button "Add a target".
- Add form (`:113-158`): company, role, optional date, paste JD. Button "Create target". Character count `{n} / {max}` (`:151`) is a fixed count the copy scan may flag.
- Detail is called Mission (`:161-339`). While scouting, the hero is an agent feed: "What we did" / "Working on it", lines tagged Scout (`:237-251`).
- When ready, sections stack with no stage: Planner's plan (`:256-262`), "What they'll look for" grouped SQL / Python / Tools / Analytics / Behavioural with Core / Nice to have and a JD quote (`:264-283`), résumé match (`MatchSection`, `src/features/match/MatchSection.tsx:47-64`: Covered / Mentioned, but no result / Not on your résumé, plus "Practise this question"), "Rounds to practise" with **Start** or a chip "Next" (`:287-306`), "Practise a screening call", then "How it went" debriefs.
- Debrief meta: `solved {d.solved} of {d.total} problems` (`Targets.tsx:314`). That is an "x of y" the product rule forbids. Copy scan already bans `of \d+` (`src/copyScan.ts:9`) but this string is built at render time and may not be in the copy tests.
- Countdown chip: "Interview is today" / "1 day to go" / "N days to go" (`:31-35`).
- Width: max 860px (`targets.css:3`). Stories page is also 860px. Today is 1040px. Workspace content is 1250px. Three frames.
- No visible stage for "interview day" versus "prepare". Spaced repetition lives on Today/Practice, not here. Stories are not linked from the target. STAR is not on this page.
- Delete is a text link at the bottom (`:326-337`).

## Options

- **A. Polish.** Keep the stack. Remove the "x of y" debrief line. Rename "Start" and "Scouting". Same order.
- **B. Five stages.** One target opens as a path: 1 Add (done once saved), 2 Understand (requirements mapped to the résumé, gaps named, no counts), 3 Prepare (the next practice, the story theme this role still needs, screening when skills exist), 4 Interview day (date, a short warm-up, nothing else competing), 5 Debrief (what worked, what to strengthen, the next rep, no solved-of-total). The scout feed is a one-line status, not the page.
- **C. Checklist.** One flat list of tasks, no stages, no match section.
- **D. Leave it.**

## Weights

| Seat | Weight | Why |
|---|---|---|
| Bezos | 3 | The path is the strategy: work backwards from interview day |
| Graham | 3 | Does a candidate actually want this structure, or is it a framework costume? |
| Wickman | 2 | One page, one sequence, no second owner of "what next" |
| Sara | 2 | Wording has to sound like a person, not a consulting deck |
| Buffett | 2 | "Solved 2 of 5" is a grade. Reputation. |
| Elon | 1 | Delete the feed if it does not change the next rep |

## Assumptions

- Candidates prepare for one to three roles, not a CRM of fifty (assumed).
- Match and story data already exist; the page can join them in the client (assumed, verify in code before the verdict treats it as fact).
