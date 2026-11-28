# Round 2: debate

## Graham

SEAT: GRAHAM

I DISAGREE MOST WITH: Blakely. Her argument: "it listened to me" is the sentence a friend repeats, so ship the listening product and measure by whether testers say that phrase. My rebuttal: a phrase is what polite testers say. "Nice" and "it listened" cost them nothing. The test is what they did next. Did they open a second session unprompted within 10 days? Her gate (half say "listened") passes with zero retention. I also disagree with her ordering: she puts the Observer (week 4 to 5) before the rambling reactions (week 6+). That is backwards. The reaction is what a tester feels. The Observer is the part nobody sees.

I CONCEDE: Musk's point that the "live brain" is mostly state plus events, and that I was wrong to put "Interviewer holds the whole call in context" in its own week 3 to 4 stage. A per-turn call fed the full transcript is the same thing, so it folds into stage 2. This also answers crux 1: A is B plus events plus a gated Observer. I take that. Musk and Buffett are also right that a timed single call must be measured before testers arrive, because dead air in a first session is a lost tester I cannot get back.

ON THE CRUXES:
1. A differs from B-plus only by the Observer, so the council answer is B-plus now and A's Observer later. I would stop calling it A until the Observer earns its place.
2. Pause and ramble live on the server, in the gateway, because it already sees partial_transcript text (gateway.ts, onPartial). No browser VAD, no new audio path. Track last-partial-change time and word count per turn. Pause: no new words for 7 s after at least 5 words. Ramble: over 200 words or 90 s. Protocol change: one new server-to-client event, nudge, carrying a canned calm line. The server never auto-finalizes. Only the candidate sends finalize_turn. One nudge per turn, never on the first question's first 15 s, tunable by env.
3. Learn and build in parallel, and that is possible because they are different people-hours. Days 1 to 4 build the Director and timed call. Days 5 to 14 are testers. The Observer starts only when half of 20 sessions call questions generic.
4. One number: unprompted second session within 10 days (same account, no reminder sent). Per-stage proxies: repeat rate, nudge-then-continue rate (candidate kept talking after a nudge, so it was not a talk-over), p95 first word.

AMENDMENTS TO THE STAGED BUILD:
1. Days 1 to 4: repeat guard, persisted asked-history, nextQuestion(state) seam, one call with full transcript and 3 to 5 candidate narrowing, bank fallback (interviewBridge.ts, new director module). Gate: zero repeats in 10 sessions, 50 timed calls p95 under 1.5 s, 10 of 10 finish with the key unset.
2. Days 5 to 7: pause and ramble nudges in gateway.ts plus protocol.ts, scripted lines only. Gate: in my own 5 sessions, no talk-over, nudge-then-continue logged.
3. Week 2: invite 5 named testers, I sit in on 3. Gate: 3 of 5 finish, and I can name what each did next.
4. Weeks 3 to 4: fix what the sittings showed. Gate: 3 of 5 start a second session unprompted within 10 days.
5. Weeks 5 to 6: silent Observer, same provider, account-private, off the clock. Gate: half of 20 sessions call questions generic, and p95 does not move.
6. Later, only on named asks: second voice. D and C stay shelved.

STANCE: Conditional yes on B-plus now, Observer later.
OPTION SCORES: A 6/10 · B 6/10 · C 2/10 · D 2/10
PILLAR SCORE: 6/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from "Interviewer context is its own stage" to "folded into stage 2", because Musk is right that it is prompt design, not a build. Score on D down from 3 to 2 after Buffett's price math. Nothing else moved.

MY CONDITIONS FOR YES:
1. Five testers named before day 8, each asked whether they would be bummed if the call went away.
2. Stage 1 gate passes (p95 under 1.5 s over 50 timed calls) before any tester is invited.
3. No Observer or second voice code merges until the 20-session generic-question log exists.

## Musk

SEAT: MUSK
I DISAGREE MOST WITH: Graham. His argument: sit in on 5 sessions before building anything past the Director. My rebuttal: the sessions are worthless if the call still repeats questions and goes dead. The Director and the timed single call are two to three days of work and the entry ticket to a tester session. Build them first, then learn. Order matters, not either/or.

I CONCEDE: Blakely's risk, that a pause reaction fires too early and talks over a nervous candidate. I had a 6 s dead-air gate. That is a tester-visible failure, not a gate. It changes my thresholds: the pause nudge waits longer than feels clever, and starts as log-only (shadow mode) before it ever speaks.

ON THE CRUXES:
1. A vs B: with events in code, the only real difference is the Observer, plus a persistent transcript in the prompt. So A is B-plus, and the Observer is a gated later step. I score A on that basis, not as a new architecture.
2. Detection lives on the server, in gateway.ts, not the browser. The server already receives the PCM stream and emits partial_transcript (line 131), so it can track lastPartialAt and word count per turn. Zero client change, zero new model call. Thresholds, to tune in shadow mode first: nudge only after 8 s with no new partial and at least one prior partial (a candidate who has not started gets 12 s); one nudge per question, a scripted calm line; ramble flag at 90 s of one turn or 250 words, which triggers a "shall we move on, or one more point?" line, never a forced cut. "Repeat that" is a string match on the final transcript. Protocol: stays v1, additive only. Add server message types `nudge` and `ramble_hint` (payload: reason, turnId), and have the server speak the scripted line through the existing tts_start/tts_end path. Mute and interrupt stay winning. Old clients ignore unknown types.
3. First two weeks: build the Director, repeat guard and single call (days 1 to 7, because it is the limiting factor), invite testers in week 2, and sit in on 3 sessions. The Observer starts only when logs show the gate in stage 5.
4. One number: "follow-up rate", the share of questions after turn 1 whose text reuses a noun phrase from the previous answer, read from saved turns. Paired with a one-tap "did it listen? yes/no" after the call. Both are logged, no sitting in.

AMENDMENTS TO THE STAGED BUILD:
1. Days 1 to 3: repeat guard, persisted asked-history, nextQuestion(state) seam in interviewBridge.ts and the domain Director. Gate: 0 repeats in 10 sessions, 10 of 10 finish with the key unset.
2. Days 4 to 7: one structured Interviewer call with the full transcript in the prompt, bank fallback. Gate: 50 timed calls, p95 under 1.5 s, failures under 5 percent.
3. Week 2: invite 5 testers, sit in on 3. Pause and ramble detection in gateway.ts in shadow mode (log only). Gate: it would have fired on real pauses, and falsely on under 1 in 10 turns.
4. Week 3: turn the nudge on, scripted lines, no model. Gate: zero talk-over reports, no dead air above 8 s.
5. Weeks 4 to 6: silent Observer, only if half of 20 sessions rate questions generic or the follow-up rate is under 50 percent. Gate: p95 unchanged, under 1 extra call per answer.
6. Later, optional: second voice only on tester request. C and D stay deleted.

STANCE: Conditional yes on A as staged B-plus.
OPTION SCORES: A 7/10 · B 6/10 · C 2/10 · D 3/10
PILLAR SCORE: 7/10
CONFIDENCE: 4/5
RUIN RISK: none
MOVED: yes, from a 6 s dead-air gate and live pause nudge to a shadow-mode, 8 s nudge, because Blakely's talk-over risk is the one that makes nervous testers leave and say so.

MY CONDITIONS FOR YES:
1. 50 timed calls show p95 under 1.5 s and under 5 percent failures before any tester is invited.
2. Pause and ramble detection ships in shadow mode first, with false-fire under 1 in 10 turns before it speaks.
3. The Observer is not started until the logged generic-question gate (half of 20 sessions) is met.

## Blakely

SEAT: BLAKELY
I DISAGREE MOST WITH: Buffett. His argument: pauses and rambling are code with canned calm lines, so they cost zero tokens. My rebuttal: tokens are not the price, the candidate's nerves are. I once got told "no" so many times I stopped hearing it, and a canned "take your time" said twice in one call is the same thing. Canned is fine if it is rare, varied, and never fires early. Gate it on talk-over count, not on quota.

I CONCEDE: Graham's point that a silent Observer writes notes the candidate never sees, so it cannot be what earns "it listened". It moves out of my unconditional weeks 4 to 5 and behind tester evidence.

ON THE CRUXES:
1. A versus B-plus: honestly, B plus events plus whole-transcript context is A minus the Observer. Ship that and call it A. The Observer is the only part left to earn.
2. Pause and ramble, candidate side. The browser detects voice activity (it already holds the mic stream) and sends a simple speaking/silent event; the server decides. Rules: no nudge before 10 seconds of silence after a question ends, and never mid-answer under 6 seconds of silence (people think mid-sentence). Nudge: "Take your time, I'm here." Once per question, never twice running. Second, at 25 seconds: "Want me to repeat the question, or give you a moment?" Never interrupt while they are speaking, within 2 seconds of their last word, or during a long answer: let a rambler finish and follow up softly after. If they speak over the interviewer, stop the voice at once.
3. Two weeks: days 1 to 5 build Director plus the one-call Interviewer; invite 5 testers by day 8 and sit in on 3. Observer starts only when logs show generic questions.
4. "Listened to me": one tap after the call, "Did it follow what you said?" yes/no, plus a log check, the share of follow-ups that reuse a phrase from the previous answer. Pair with a talked-over count (nudge followed by candidate speech within 3 seconds). Candidate-side only, never a score of the candidate.

AMENDMENTS TO THE STAGED BUILD:
1. Days 1 to 5: Director, repeat guard, persisted asked-history, fallback script. Gate: 0 repeats in 10 sessions, 10/10 finish with the key unset.
2. Days 5 to 8: one-call Interviewer with full transcript. Gate: p95 first word under 2 s in 50 timed calls.
3. Week 2: 5 to 10 testers, I sit in on 3. Gate: at least half answer yes on "followed what you said".
4. Week 3: browser VAD plus the nudge rules above. Gate: talked-over count under 1 per 5 sessions.
5. Week 4+: Observer only if half of 20 sessions call questions generic. Gate: p95 unchanged.
6. Later, only on asks: second voice. D only if Sarvam hurts.

STANCE: Conditional yes on staged A, listening first, Observer last.
OPTION SCORES: A 7/10 · B 6/10 · C 2/10 · D 3/10
PILLAR SCORE: 6/10
CONFIDENCE: 3/5
RUIN RISK: none
MOVED: yes, from Observer in weeks 4 to 5 to Observer gated on tester evidence, because Graham is right that the candidate never sees it. B moved up a point since B-plus is nearly A.

MY CONDITIONS FOR YES:
1. No nudge fires before 10 seconds of silence, and talked-over count stays under 1 per 5 sessions.
2. At least half of 5 to 10 testers say yes to "did it follow what you said".
3. p95 first word under 2 seconds across 50 timed calls, with the key unset still finishing.

## Buffett

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
