# Roast Room: rebuild Targets like Interview Prep

21 November 2026 · Seats: Graham, Bezos, Musk, Buffett · Rounds: 2 · Mode: quick

## Verdict: GO WITH CONDITIONS

**The call:** Option A, in slices. Make the round interviews job-specific first, then put them on folder cards. Do not restyle first. Leave the SQL room, the debriefs and the screening rehearsal as they are.

Option scores: A 6.8 · B 2.4 · C 2.9 · D 3.8 · Confidence 6/10 · Spread 1 · Round 3 skipped (spread 3 or less, no ruin risk), so no vote was taken
No override applied. No seat flagged a ruin risk, and the door is two-way.

## Scorecard

| Seat | Weight | Final stance | A | B | C | D | Pillar score | Moved? | Their line |
|---|---|---|---|---|---|---|---|---|---|
| Graham (product) | 3 | Conditional yes, A in slices | 7 | 2 | 4 | 4 | 6 | C 3 to 4 | Ship the interview change first, then the cards |
| Bezos (strategy) | 2 | Conditional yes, sliced A | 7 | 2 | 3 | 3 | 7 | Plan: prove, then ship one round | Run the test in two arms before paying for the route change |
| Musk (first principles) | 2 | Conditional yes, A as a slice | 7 | 2 | 2 | 3 | 8 | Dropped "no server change" | The route change is step one |
| Buffett (money) | 2 | Conditional yes on slice 1 only | 6 | 4 | 2 | 5 | 7 | Dropped "keep old paths everywhere" | No usage number means D is the default |

Math: A (3x7 + 2x7 + 2x7 + 2x6) / 9 = 6.8 · B (3x2 + 2x2 + 2x2 + 2x4) / 9 = 2.4 · C (3x4 + 2x3 + 2x2 + 2x2) / 9 = 2.9 · D (3x4 + 2x3 + 2x3 + 2x5) / 9 = 3.8

## Why the council landed here

- The product is the interview, not the cards. Today every "Practise" button except SQL opens the same generic interview, so the page promises a job-specific loop and delivers a generic one (Graham, make something people want; Musk, do not optimise a thing that should not exist).
- Restyling alone (B) is the worst option because it leaves the promise unkept (all four seats scored it lowest or near lowest).
- Merging into Interview Prep (C) costs the same server change as A and throws away what only Targets has: this job's skills and gaps (Buffett, moat; Bezos, what will not change).
- Leaving it alone (D) is the bar to beat. It scored 3.8 because the gap in the promise compounds, but no one has usage numbers (Buffett, retained dollar test).

## Where they fought

**Can the interviewer stay on a round and the job's skills without a server change?** All four seats assumed yes and called it unverified. The Chair checked the code: a practice interview carries only a role string. The round name can ride in it, but the job's skills reach only screening calls. Following up on skills needs the existing `POST /interviews` to accept `targetId` for practice. That is a small change to an existing route, with no migration, endpoint or dependency. Musk moved from 70 percent to 80 percent that it was needed. Nobody backed down from A over it.

**Slice or full rebuild?** Buffett wanted slices. Musk wanted no restyle beyond cards that carry a round. Bezos feared a full pass was a fake two-way door, because the code reverts and the founder's weeks do not. Graham's point settled it: the interview change is the product and the cards are packaging. All four ended on slices.

**Is anyone using Targets?** Unresolved. No numbers exist. Buffett backs D if the 30-day count of non-SQL Practise clicks is zero. Graham backs C if fewer than 3 candidates start a round interview within 14 days of launch.

## Minority report

Buffett, on slice 1 only: "With no usage number, D clears that bar as well as A does." He scored A 6, D 5, and would back D if nobody has used a non-SQL Practise button in 30 days. The least-tested assumption is that candidates reach Targets and come back at all.

## Conditions

1. `POST /interviews` accepts `targetId` for practice interviews, with no migration, new endpoint or new dependency, and the existing practice-interview tests still pass.
2. On one non-SQL round (behavioural), 5 of 5 test runs open on the round and name a real skill from the job, and follow-ups still refer to it. Bezos asks for 7 of 10 in each of two arms (round name only, and round name plus job).
3. The SQL room, debriefs and screening rehearsal are untouched. The generic Practise button is replaced everywhere else.
4. The first slice ships within 7 days (Bezos: by 5 December). Cards come only for rounds that have a working interview.
5. The founder pulls the 30-day count of non-SQL Practise clicks. If it is zero, back D.

## What to do next

1. This week: let the practice route accept `targetId`, wire the behavioural round (round name plus the job's gap skills), and run 5 interviews (owner: founder with the builder).
2. Within 7 days: ship the behavioural slice. If it holds, wire the other rounds the same way, then put the folder cards on the Prepare stage and the target list.
3. Within 14 days: count candidates who start a round-specific interview. Fewer than 3 means revisit C.

**Cheapest test:** feed one real job, one round name and three of its skills into a practice interview, five times, and read what the interviewer asks.
**Kill criteria:** the route change needs a migration, or the interviewer ignores the skills in more than 3 of 10 runs. Then fall back to B as a stopgap, or D if the usage count is zero.
**Revisit:** after the behavioural slice, with the 30-day Practise count and the first 14 days of round interviews.

---
Simulated advisors built from each person's public work. They are not the people and do not speak for them.
