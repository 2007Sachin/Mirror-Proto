# Roast Room verdict: a dynamic brain for MIRROR's live interview practice

17 November 2026 · Quick council, two rounds (Round 3 skipped: spread 1, no ruin risk) · Seats: Graham (3), Musk (3), Bezos (2), Buffett (2)
Session files: `docs/roast-room/2026-11-17-live-interview-brain/`

## Verdict: GO on option C, built in stages, with the door to A kept open

Build a **deterministic orchestrator plus one fast model call per turn**, with the question bank as the fallback. Do not build a live multi-agent system yet. Put a `nextQuestion(state)` seam in now, so analyst and planner agents can be added later without a rewrite. A is a later purchase, not a never.

Option scores (Round 2, weights Graham 3, Musk 3, Bezos 2, Buffett 2): **C 8.5** · B 5.3 · D 4.5 · A 2.7. Council confidence 8/10, spread on C 1. Every option is a two-way door, and no seat is at ruin risk.

## Arguments that carried the room

1. **The latency wall decides, and it is real only for serial agents.** Four or five agent calls in series on the live path are 4 to 10 seconds per turn against a 1 to 2 second budget on a free-tier model (Bezos, Musk, Buffett). Parallel or speculative agents fix the clock in voice, because a spoken answer gives 30 to 90 free seconds, but they cost quota and widen the privacy surface (Buffett, Musk).
2. **The repeats are a plumbing bug, not a missing brain.** There is no history check and `askedQuestions` dies with each interview (Musk). About 100 lines remove the one symptom the founder named, before any agent exists.
3. **"Dynamic" means branching, and branching is a decision with state.** One call with structured output (`{action, target_skill, question}`) can make it if code narrows the choices to 3 to 5 candidates (Musk, Bezos). A separate planner is justified only if testers show that one call chooses badly (Graham).
4. **Learn from testers first.** About 20 tester sessions will show what actually feels dumb (Graham). A big build with no tester feedback is the main way this goes wrong.

## The strongest objection

D alone is a fake two-way door if the interface is hard-coded to one call (Bezos). Answer adopted: the `nextQuestion(state)` seam, about half a day of work, built together with the repeat guard.

## The solutions, in order

**Solution 1 (this week to week 2): C with a seam.**
- A plain `state` object per session: asked question ids and normalised text, covered skills, last-answer signals (length, thin or strong), target gaps, story themes.
- Code picks 3 to 5 candidate questions from the target's gap skills, a tagged bank, and the asked-set (never one already asked, across sessions, using the user's earlier interviews' `askedQuestions`, so no new table).
- One model call with a 1.5 to 2 second timeout chooses and words the next question, returning `{action: probe | advance | gap, target_skill, question}`. The decision is logged.
- On any failure it falls back to an unasked bank question. The `You said:` prefix goes.
- Log source (model or bank), latency and the branch decision for every turn.

**Solution 2 (gated): background analyst.** After each answer, one cheap call updates covered skills and a thin-answer flag in `state` for the next turn. Built only if, after 20 tester sessions, at least half call the questions generic and the logs show thin answers as the cause (Graham, Bezos, Musk).

**Solution 3 (gated, voice only): speculative precompute.** One extra call per turn while the candidate is still speaking, discarded if the answer contradicts it. Only after the live call has been timed, wasted calls stay under 1 per turn, and the quota allows it (Buffett, Musk).

## Conditions (from the seats, checkable)

1. 50 timed calls on the real model give p95 under 1.5 seconds and a failure rate under 5 percent, before any analyst or speculative call (Musk, Bezos, Buffett; Graham accepts under 2 seconds).
2. Zero repeats across 10 to 20 test sessions, and with the key unset 10 of 10 interviews still finish well (Graham, Musk, Bezos, Buffett).
3. Repeat guard and persisted asked-history ship within 3 days, before invites (Bezos, Graham).
4. Move to Solution 2 or 3 only on evidence: 20 or more tester sessions where at least half say the questions feel generic (all four seats).

## Pillar scorecard

| Seat | Dimension | Score |
|---|---|---|
| Graham | Real demand and growth | 7 |
| Musk | First principles and execution speed | 8 |
| Bezos | Strategic fit and reversibility | 8 |
| Buffett | Downside and capital efficiency | 8 |

No pillar is at 4 or below. Graham's 7 carries one named fix: put it in front of 3 testers and sit in on one session before building more.

## Minority view

Graham and Bezos argued the founder's version of A at full strength (planner and analyst in parallel with the candidate's speech, next questions precomputed). They raised A from 1 and 2 to 3 and called it "week-six work, not week-two work". Nobody scored it above 3.

Simulated advisors built from each person's public work. They are not the people and do not speak for them.
