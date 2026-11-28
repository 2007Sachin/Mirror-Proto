# Round 2: debate

## Graham

SEAT: GRAHAM

THE STRONGEST CASE FOR A:
- Founder's version: a planner and an analyst run beside the interviewer, not in front of it. While the candidate is still talking, the analyst reads the transcript so far. In the same window the planner precomputes the next two candidate questions, one for "probe" and one for "move on".
- When the candidate stops, the live turn only picks a ready question and rephrases it. Latency stays about one call, because the heavy work hides inside the 20 to 60 seconds of a spoken answer.
- The planner holds state (skills covered, thin spots, target gaps), so branching comes from reasoning and does not depend on one prompt guessing.
- Done this way, A is the only design where "brainless" actually gets fixed, because the next question comes from analysis of the last answer. It is not a script with a nicer prefix.
- It also fills the 2 to 3 seconds of dead air that a single call can't hide.

I DISAGREE MOST WITH: Bezos. His argument: "Controllable inputs" favor C because code guarantees the repeat guard and asked-history. My rebuttal: that is correct, but it is a claim about the floor, not about whether users want more. Nobody has seen a tester reject a single-call question. "Make something people want." (S092) You are both pricing a design for a complaint that has no tester behind it yet.

I CONCEDE: Musk's point that the repeats are a plumbing bug (a missing history check), not an intelligence gap. That kills my own "speculative analyst" urgency. It changes this: the asked-history and repeat guard ship first, whatever else happens, and any "brainless" verdict is held until it is in.

ON THE CRUXES:
1. The wall is real only for serial calls. Speculation works in voice, since speech takes seconds. The new costs are real, though: a speculative call on a free-tier quota is mostly wasted (about two questions precomputed per answer), plus cancel-and-recompute when the answer veers. That is a quota and complexity problem, not latency, and for a handful of testers it is still not the bottleneck (S010).
2. Branching needs a decision (probe, move on, go to a gap). Probably one call can make it if it is given a coverage list. Whether it makes it well is untested. I'd guess a thin answer is the case that breaks it.
3. Cheapest step that keeps the A door open: one function in code, `nextQuestion(state) -> question`, with state as plain data (covered skills, asked ids, last answer summary). Today the body is code plus one call. Later a planner can fill the same state in the background. No framework. Do it while writing the repeat guard.

Design variant I back: C. Live: code picks the plan slot, one call (2 s timeout) writes the question, the bank is the fallback. Background: after each answer, one cheap call updates covered skills and a "thin answer" flag into state, so the next turn can read it. This is the analyst, 100 lines, and only if the first testers call the questions shallow.

STANCE: Yes, on C, with the state interface designed now. A deferred, not dead.
OPTION SCORES: A 3/10 · B 6/10 · C 8/10 · D 5/10
PILLAR SCORE: 7/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, from A 1/10 to A 3/10, because the parallel and speculative version removes the latency objection. It only fails on quota and on lack of any tester evidence.

MY CONDITIONS FOR YES:
1. The repeat guard and persisted asked-history ship before invites, with 0 repeats in 20 test sessions.
2. A single call is measured at p95 under 2 seconds across 50 real calls on nemotron.
3. If after 20 tester sessions at least half call the questions generic, with thin answers being the cause, build the background analyst on the same state interface.

## Musk

SEAT: MUSK
I DISAGREE MOST WITH: Bezos, in his role as the A advocate. His argument: speculative agents running while the candidate speaks make the latency wall disappear, so A is just C with more brains. My rebuttal: that deletes the wall and buys back something worse. The step still exists, and it only moves off the clock. "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014) A speculative planner answers a question nobody has shown the interview needs. The numbers (my assumptions, none measured): voice answers run 30 to 90 seconds, so there is time for one or two background calls per turn. That is 2 to 3 calls per turn at a free tier of maybe 30 to 40 requests per minute. A 6 turn session at 3 calls is 18 calls, so about 2 concurrent testers saturate the quota. A wasted speculative call is cheap in dollars (near zero) and expensive in quota. The cost is also a correctness risk: the candidate's last 5 seconds can change what the right question is.

I CONCEDE: Graham and Bezos's strongest point is that "dynamic" means branching, and a bank plus one call may not branch well. That changes my plan. The one call must return a decision (probe, advance, or go to a gap) plus the question, with the decision logged. If testers still call it flat after 20 sessions, a planner is justified.

ON THE CRUXES:
1. The wall is real only for serial. Parallel in the background is feasible at 1 to 2 testers, but the quota is the new limiter, and it fails exactly when you need it most.
2. Branching is one call with a structured output: {action, target_skill, question}. Code picks the candidate set, because the model only chooses among 3 to 5 options. A separate planner with its own state is premature until this fails.
3. Ship D plus the interface now. Define `nextQuestion(state): Promise<Q>` and a state object with an asked set, covered skills and last-answer signals. The A door stays open for roughly 30 lines, and nobody has to build an analyst before there is evidence.
Variant: live runs code, which narrows the options, plus one call with a 1.5 second timeout, falling back to the bank. Background runs one precompute during the candidate's answer, and the result is discarded if the answer contradicts it. Run that only after the live call has been timed.

STANCE: Strong yes (C, with the interface seam)
OPTION SCORES: A 2/10 · B 5/10 · C 9/10 · D 4/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, from "analyst agents wait" to "log a branch decision from day one", because branching is the founder's actual ask, and logging it is nearly free.

MY CONDITIONS FOR YES:
1. A measured p95 under 1.5 seconds for one call on 50 real turns, before any speculative call is built.
2. Zero repeats across 10 sessions, with the fallback rate logged.
3. After 20 tester sessions, if at least half still call the questions flat and the logs show the decision was wrong, add the planner.

## Bezos

SEAT: BEZOS

THE STRONGEST CASE FOR A:
- Run the planner and analyst in parallel with the candidate's speech. While they talk, the analyst reads the streaming transcript and the planner scores the open target skills against the résumé gaps.
- At the end of each answer a ready verdict exists: probe, move on, or go to an uncovered skill. The live turn only picks a prebuilt question and speaks it, so there are no serial calls on the hot path.
- Speculation hides latency. While the candidate answers question N, the system precomputes the next two questions: one for a thin answer, one for a strong one. The live turn selects the branch.
- It separates judgment from wording, so each prompt stays small and testable. Memory writes happen off-path.
- This is the only design where "brain" is true of the architecture, not just of the prompt.

Where A wins: voice. Candidate speech takes 30 to 90 seconds, which is a free window for a 5 to 10 second analysis. Where it loses: text mode, which has no such window; and the free-tier rate limit, since speculation multiplies calls (2 to 3 per turn plus a discarded branch).

I DISAGREE MOST WITH: Graham. His argument: one call plus a repeat guard is enough until testers say otherwise. Rebuttal: I agree on the build order, but "until testers say" is a regret I can price. Learning is cheap only if the door stays open (Type 1 and Type 2 decisions, S063). I'd push him on that: D alone is a fake two-way door if the interface is hard-coded to one call.

I CONCEDE: Musk's point that the repeats are a plumbing bug (about 100 lines, nearly zero latency), and that A's speculative design multiplies calls against a rate-limited free tier. That changes my A score upward, to 3. It does not change the order. The parallel A is a real design, but it is week-six work, not week-two work.

ON THE CRUXES:
1. The wall is real only for serial A. For voice it is mostly not real for a parallel design, because speech is a free window. It is real in text mode and under rate limits. Unmeasured, so I'm assuming roughly 1 second per call.
2. Branching is a decision, and a decision has state: asked, covered, thin, uncovered. Keep that state in code, as a plain object. Whether a model fills the choice (probe, move on, new skill) is one call today. Split out a planner only when a tester shows one call chooses badly.
3. Ship D first, and define the seam now. A `nextQuestion(state)` function returns a question. Today it is code plus one call. Later a background analyst writes to `state` and the same function reads it. The cost is about half a day. That keeps the A door open.

Design variant (C with a seam): Live, code reads state and either calls the model once with a 1.5 second timeout or falls back to the bank. In the background, after each answer, an optional analyst writes "thin, strong, covered skills" into state for the next turn. It is empty at first.

STANCE: Yes on C, with the state object and `nextQuestion` seam built this week. A is a staged option, not a no.
OPTION SCORES: A 3/10 · B 5/10 · C 9/10 · D 4/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, A from 2 to 3, because Musk's and the Chair's parallel design removes the serial-latency objection for voice. The order did not move.

MY CONDITIONS FOR YES:
1. A 50-call timing run on the real NIM shows a p95 for a single call under 1.5 seconds before any analyst is added.
2. Repeat guard and asked-history ship within 3 days. Zero repeats across 10 sessions.
3. Add an async analyst only after 20 or more tester sessions show at least half call the questions generic. Test that it beats single-call questions in a side-by-side read.

## Buffett

SEAT: BUFFETT
I DISAGREE MOST WITH: Bezos in his advocate role for A. His case, in one line, is that a planner and analyst run in parallel, or ahead of the turn, so the wall only hits serial designs. Parallel fixes the clock but it does not fix the bill. Speculation means paying for calls you throw away. Say a 6 to 8 turn interview, 3 speculative calls per turn, and about half wasted. That is roughly 20 calls a session against a free tier with rate limits, and one session can starve the next. It also means every extra agent sees every answer, which widens the privacy surface (my translation of "reputation beats money", "We can afford to lose money but we can't afford to lose reputation." (S028)). The failure mode also changes. Serial A is slow, while parallel A is slow only when a race is lost, and that is harder to test.

I CONCEDE: Graham's point that the branching want is real and cheap to test. Musk's repeat plumbing also stands. I was wrong to price only the serial version. A single speculative call, started while the candidate is still talking, is a fair price. It changes my view of "A is dead" to "A is a later purchase".

ON THE CRUXES:
1. The wall is real only for serial. Parallel gets under 2 seconds, but you pay in wasted calls, rate-limit exhaustion and an extra place answers flow. Latency is fixable, while quota and privacy are not.
2. Branching (probe, move on, pick a gap) is one prompt with state, not a planner. The state is code: covered skills, asked-set, last answer's length and depth. Add a second call only if testers show that one call cannot decide.
3. D first, with a clean seam. The cheapest door-keeper is one function, nextQuestion(state) returning a question, with the state object stored per session. Do not build a plugin framework (translation of the Circle of competence, S022: do not build what you cannot yet judge).

Minimal live design: live, code picks the target gap and one call writes the question, 1.5 second timeout, bank fallback. Background, after the answer lands, at most one precompute call for the next question, discarded if the answer was thin, capped at one extra call per turn.

STANCE: Yes, on C, built D-first with a one-function seam.
OPTION SCORES: A 3/10 · B 5/10 · C 8/10 · D 5/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, from "kill A" to "A is a later purchase, not a never", because Graham's and Bezos's point that parallel removes the latency wall is correct. Quota and privacy now carry the objection.

MY CONDITIONS FOR YES:
1. 50 timed calls on the real API give p95 under 1.5 seconds and a failure rate under 5%, before any speculative call is added.
2. Fallback test passes: with the key unset, 10 of 10 interviews finish with no repeats.
3. Speculation is added only if, after 20 tester sessions, at least half say questions feel generic, and wasted calls stay under 1 per turn.

## Chair

Round 2 option scores (weights Graham 3, Musk 3, Bezos 2, Buffett 2; sum 10):
- A: (3×3 + 3×2 + 2×3 + 2×3) / 10 = 2.7
- B: (3×6 + 3×5 + 2×5 + 2×5) / 10 = 5.3
- C: (3×8 + 3×9 + 2×9 + 2×8) / 10 = 8.5
- D: (3×5 + 3×4 + 2×4 + 2×5) / 10 = 4.5

Spread on C: 9 minus 8 = 1. No seat is at RUIN RISK: likely. The Round 2 spread on the top option is 3 or less, so quick mode skips Round 3.

The unanimity warning produced a real movement: every seat raised A (Graham 1 to 3, Bezos 2 to 3, Buffett 2 to 3, Musk 1 to 2) after the parallel version was argued, and every seat converged on the same seam: a `nextQuestion(state)` function with a plain state object.
