SEAT: BUFFETT

I DISAGREE MOST WITH: Graham. His argument: sit in on 5 testers before building anything past the Director. My rebuttal: testers need something to react to, and the first stage costs almost nothing (no vendor, no new calls). Building days 1 to 7 and watching testers on days 8 to 14 loses nothing. I will not wait on testers for the repeat guard, because a repeated question is a defect, not a hypothesis.

I CONCEDE: Graham's point that a silent Observer changes nothing a tester can see. It is the most expensive piece in quota and the least visible. So the Observer gate gets a second test. Notes must change a next question in logs, not only get written.

ON THE CRUXES:
1. A is B-plus. Events in code and a full-transcript prompt are B. The only real difference is the Observer, so A is a gated stage 3, not a different system. I score B above A for that reason. (My translation of "eschew activity", S090.)
2. Voice activity detection lives in the browser, as a timer on the audio level, with a new client event on the socket. The server stays turn-based. Safe thresholds: a pause line only after 8 seconds of silence following speech, once per answer. No ramble cut before 120 seconds. Cost is zero tokens.
3. Days 1 to 3: repeat guard, persisted asked-history, `nextQuestion(state)`, bank fallback. Days 4 to 7: the one-call Interviewer, 50 timed calls. Days 8 to 14: 5 testers, and I sit in on 3, with pause and repeat events as canned lines. Budget per interview is 4 Interviewer calls, retries capped at 1 each (8 calls maximum). The Observer's hard ceiling is 4 calls per interview, 3 second timeout, no retries. It switches itself off for the session after the first 429. The Observer starts only after day 14 and the gate in stage 4.
4. Listened-to-me number: the share of questions after the first that name a term from the candidate's previous answer, read from logs. Pair it with whether the tester returns within 7 days. Cost number: model calls per completed interview.

AMENDMENTS TO THE STAGED BUILD:
1. Days 1 to 3: repeat guard, persisted history, seam, fallback. Gate: zero repeats in 10 sessions, 10 of 10 finish with the key unset.
2. Days 4 to 7: one-call Interviewer with the full transcript in the prompt. Gate: 50 timed calls, p95 under 1.5 s, failures under 5 percent, at most 4 calls per interview in the quota log.
3. Days 8 to 14: browser pause detection and canned events, then 5 testers. Gate: no talk-over, and 3 of 5 say it listened.
4. Weeks 3 to 4: Observer, one background call per answer. Gate: 20 sessions where half the questions read as generic, p95 unchanged, under 1 wasted call per turn, and notes visibly change questions.
5. Throttle drill before any invite: simulate 10 testers in one evening. Gate: every candidate still hears a bank question.
6. Optional later: a second voice, with a written token ceiling per interview. Speech-to-speech only as a one-session bake-off, never a swap.

STANCE: Conditional yes on staged A, which is B-plus until the Observer earns its place.
OPTION SCORES: A 6/10 · B 7/10 · C 2/10 · D 3/10
PILLAR SCORE: 7/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, from "Observer gate is tester-says-generic" to "also requires notes that change a next question", because Graham showed an unseen note creates no value on its own.

MY CONDITIONS FOR YES:
1. Calls per completed interview are logged, with a ceiling of 12 including the Observer. The Observer drops out on the first 429.
2. The throttle drill passes: 10 simultaneous sessions, all finishing with a spoken question.
3. No new vendor and no audio retention in any stage before the Observer gate.
