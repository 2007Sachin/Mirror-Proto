## Graham

SEAT: GRAHAM
I DISAGREE MOST WITH: Musk. His argument is that this is "one wiring change repeated" and that plain rows are fine. The Chair's code check says follow-ups don't know the skills, so it is a server change plus wiring. My rebuttal is below. I argue C at full strength first, because it is the strongest rival to the way Musk is trimming A. Merge Targets into Interview Prep and a saved job becomes a fifth role. Candidates already learned that room, and there is one surface to keep alive, not two. Nobody has shown usage of Targets, and "Do things that don't scale" (S096) says don't build a second product for a feature nobody has proven. C also deletes the stage rail we would otherwise polish. Its weakness is that the value, the job's skills and gaps, needs the same `targetId` route change as A. So C saves only the card styling, which I scored as packaging anyway. Musk's "delete the restyle" is that same saving, with the same missing server work. Stay with A, interview change first.
I CONCEDE: Bezos's fake two-way door. The code reverts, but the founder's weeks don't. Since the server change now exists, I'd cap the interview slice at one week. If behavioural isn't working by then, stop.
ON THE CRUXES:
1. No. Skills and gaps in follow-ups need `POST /interviews` to accept `targetId`. That is small and in bounds, so do it first. The round name can ride in the role string today.
2. Slice. Ship the interview change on one round, then the cards. Buffett's old-path fallback is fine and costs nothing.
3. I'd rather have numbers, but there are none. Do the one-week slice, since it also tells us whether anyone comes back. If nobody uses the behavioural round in two weeks, I back C.
STANCE: Conditional yes, A in slices, server change first.
OPTION SCORES: A 7/10 · B 2/10 · C 4/10 · D 4/10
PILLAR SCORE: 6/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from C 3 to C 4, because C turned out to cost the same server change as A and loses nothing the founder can measure yet. Only that one score moved.
MY CONDITIONS FOR YES:
1. `POST /interviews` accepts `targetId`, and 5 of 5 behavioural test runs open on the round and name a real gap skill.
2. The slice ships within 7 days.
3. At least 3 real candidates start a round-specific interview within 14 days of launch. Otherwise I back C.

## Bezos

SEAT: BEZOS
I DISAGREE MOST WITH: Buffett (arguing D). His case: the pass must beat leaving Targets alone, and slicing protects flows that work today. Rebuttal: D fails what won't change (S010). No candidate will ever want a more generic practice room, and the screen already promises a job-specific loop and delivers a generic one. Leaving that gap open is a cost that compounds. But his slicing instinct is right, because the SQL room and debriefs are working. Keep them.
I CONCEDE: Graham's point that the interview change is the product and folder cards are packaging. My plan was "prove, then build the cards." It should be "prove, then ship the interview change, then cards only where a round exists." Musk's trim is the same point. That moves my plan, not my option.
ON THE CRUXES:
1. The server finding does not change my plan; it sharpens the test. A small change to an existing route is a two-way door (S063). Run the 10-interview test in two arms: round name only, then round name plus targetId. Compare how often follow-ups stay on the round and the job's skills. Pay for the route change only if the second arm clearly wins.
2. Slice. One non-SQL round end to end, then the rest. Full rebuild is the fake two-way door I flagged: the code reverts, the founder's weeks do not.
3. Nobody has numbers, and that is the weak part of my case. I scored 8/10 on pillar from a customer argument, not usage data. I'd decide at about 70 percent (S064), but one query on Practise clicks is cheap, so run it before the build.
STANCE: Conditional yes, on a sliced A
OPTION SCORES: A 7/10 · B 2/10 · C 3/10 · D 3/10
PILLAR SCORE: 7/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from "build all round cards in one pass" to "ship one round first, cards only for rounds that exist", because Graham, Musk and Buffett each showed the packaging can wait and the interview change cannot. Pillar down 1 and confidence down 1 for missing usage data.
MY CONDITIONS FOR YES:
1. In 10 sessions per arm, at least 7 of 10 stay on the round and use a job skill (the arm that passes sets the route decision).
2. The Practise-click count for non-SQL rounds over the last 30 days is above zero, with real candidates behind it.
3. The first slice ships by 5 December, with the SQL room and debriefs untouched.

## Musk

SEAT: MUSK
I DISAGREE MOST WITH: Bezos. His argument: prove the interviewer assumption first, then build all round cards in the single pass. My rebuttal: a full pass is the wrong unit. The limiting factor is one wiring change (round name plus 3 skills into follow-ups). Prove it on one round (behavioural), copy it, and delete everything that does not carry a round. "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014) A card grid for 1 to 3 targets is that thing. Bezos's pass bundles the physics with the paint.
I CONCEDE: Graham's point that follow-ups are the product, and the Chair's code check backs it. My "no server change" 70% was too high. A round name in the role string gets the opener right, but follow-ups will not know the skills unless POST /interviews accepts targetId. It was in the brief as an assumption, and it is false as stated. This changes my plan: the small route change comes first and I now put 80% on needing it. It does not move me off A, because the brief's real limits (no migration, endpoint or dependency) still hold.
ON THE CRUXES:
1. Accepting targetId on the existing route is one function-sized change, not a new system. I fold it into step one of the slice. I would only drop to B if it needs a migration.
2. Slice. Behavioural round plus the route change first, 5 runs. Then the remaining rounds. Cards only where a round has a working interview. Keep the SQL room and screening rehearsal untouched (Buffett is right here).
3. No usage numbers. Frankly, that makes a full rebuild a bet on nothing. Slice cost is low enough to do without numbers; a full restyle is not. If the founder can pull the 30-day count in 10 minutes, do it.
STANCE: Conditional yes, A as a slice
OPTION SCORES: A 7/10 · B 2/10 · C 2/10 · D 3/10
PILLAR SCORE: 8/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from "no server change, else a one-round slice" to "the small server change is step one", because the code shows follow-ups only read the role string.
MY CONDITIONS FOR YES:
1. POST /interviews accepts targetId for practice with no migration, endpoint or dependency.
2. 5 of 5 behavioural runs open on the round and name a real job skill, with follow-ups that still reference it.
3. Behavioural round shipped within 3 working days; if not, stop and treat it as D.

## Buffett

SEAT: BUFFETT
I DISAGREE MOST WITH: Musk. His argument: cards only where they carry a round, plain rows elsewhere, and a 70% guess that the interviewer takes context cleanly. My rebuttal: a 70% guess is not an arithmetic input, and the Chair's code check shows the true cost is bigger than he priced. Arguing D at full strength first: usage is unknown, and one to three targets per candidate is a tiny base. The SQL room, debriefs and screening rehearsal all work today. A solo founder's pass spent on a feature nobody may open is the capital I'd pay out. "The test about whether to pay dividends is whether you can continue to create more than one dollar of value for every dollar you retain." (S010) With no usage number, D clears that bar as well as A does.
I CONCEDE: Graham's point that cards are packaging and the interview change is the product. It changes my slicing. I wanted old Practise paths kept alongside the new ones, but two paths doubles the code to maintain. Keep the old path only for SQL and the screening rehearsal, and replace the generic Practise button.
ON THE CRUXES:
1. The small server change does not make me back D. It is one existing route accepting `targetId`, with no migration, endpoint or dependency. That is within the brief's real limits, so A is still one pass. It does widen the blast radius onto a route every practice interview uses, so it needs a test.
2. Slice. Ship the interview change on one non-SQL round first. Cards come second, and only where they carry a round.
3. No numbers means D is the default until the founder supplies one. Cheap slice 1 is justified because its cost is small and capped.
STANCE: Conditional yes on slice 1 only, not the full rebuild.
OPTION SCORES: A 6/10 · B 4/10 · C 2/10 · D 5/10
PILLAR SCORE: 7/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from "round cards first, old path kept" to "interview change first, old path kept only for SQL and screening", because Graham showed the cards are only packaging.
MY CONDITIONS FOR YES:
1. The founder gives a count of real candidates who opened a target and used a non-SQL Practise in the last 30 days. If that count is zero, I back D.
2. Five of five test interviews on one non-SQL round stay on the round and name a real skill from the job.
3. The existing practice-interview tests still pass after the `targetId` change. The SQL room, debriefs and screening rehearsal are untouched.

## Chair notes

**Who moved.** All four moved from "build the cards" to "ship the interview change first, in slices". Graham's argument carried it: the folder cards are packaging, the round-specific interview is the product. Bezos changed his plan, not his option. Musk gave up "no server change". Buffett dropped "keep the old path everywhere" and kept it only for SQL and the screening call.

**Cruxes resolved.**
1. Resolved by the Chair's code check. Practice interviews need to accept `targetId` on the existing `POST /interviews`. No seat saw that as a blocker. Buffett asked for a test on that route because every practice interview uses it.
2. Resolved. Slice, not a full rebuild: one non-SQL round end to end (behavioural), then the other rounds. Cards only where a round has a working interview.
3. Not resolved. Nobody has the count of candidates who use Targets today. Buffett backs D if the count is zero. Graham backs C if fewer than 3 candidates start a round interview in 14 days.

**Unanimity check.** Run. Buffett argued D and Graham argued C at full strength. Neither beat A. C costs the same server change as A, and D leaves the generic Practise promise unkept.

**Interim option scores (weights Graham 3, Bezos 2, Musk 2, Buffett 2):** A 6.8 · B 2.4 · C 2.9 · D 3.8. Spread on A is 1 and no seat is at ruin risk, so Round 3 is skipped by the quick-mode rule.
