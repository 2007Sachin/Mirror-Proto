SEAT: BUFFETT (Money and capital)
STANCE: Conditional yes (on a staged A: Director in code, one speaking agent, a silent Observer off the critical path)
OPTION SCORES: A 6/10 · B 7/10 · C 2/10 · D 3/10
PILLAR SCORE: 7/10 (Downside and capital efficiency)
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build the Director and room state in code first (B plus a seam), then add the silent Observer as a gated background call, and keep one speaking voice; no panel and no new vendor until testers ask.

WHY:
1. Price the failure modes. The brief gives a 1 to 2 second budget, a free-tier model, one fast call at a time. I assume 4 questions per interview. B costs 4 calls, A with an Observer about 8, C with three speakers and observers about 20 or more. Quota is the scarce capital here: C eats five times B's allowance per candidate and fails at the first rate limit. "A string of wonderful numbers times zero will always equal zero." (S095) One 429 during a live answer is the zero. (Financial staying power, S095; my translation.)
2. D is the gruesome kind of growth. (Great, good, gruesome, S080; my translation.) I assume a hosted speech-to-speech model runs about $0.10 per minute, so a 12 minute interview is about $1.20, against near zero on the current stack with a free tier. With no revenue that is a cost per interview I cannot recover. Add a new key, a new privacy statement, and audio leaving the "never stored" promise to a third party. That breaks the trust promise, and a broken promise is the one loss I will not forgive. (Newspaper test, S028.)
3. A's Observer widens who hears answers only if it is a second vendor. Same provider, same account-private room state, and it passes the front page. Because it is off the critical path, a failure costs nothing: the Director falls back to the bank. Capped downside, so I allow it. Inactivity is a strategy, but here the capped risk is worth taking. Pauses and rambling are handled by code, which costs no tokens at all.

THE COMPLETE BUILD, IN STAGES:
1. Week 1 to 2: repeat guard, persisted asked-history, Director in code (clock, coverage, who speaks), `nextQuestion(state)` seam, bank fallback. Gate: 50 timed calls p95 under 1.5s, failure under 5%, 10 of 10 finish with the key unset.
2. Pause, ramble and "repeat that" events, handled in code with canned calm lines. Gate: zero repeats across 15 sessions.
3. Silent Observer, one cheap call after each answer, writing to room state. Gate: 20 tester sessions, half call questions generic, wasted or failed calls under 1 per turn.
4. Optional second voice, only if testers ask for it. Gate: token cost per interview measured and under a ceiling I set now.
5. Speech-to-speech: a bake-off on one session type only, never a swap.

THE RISK I SEE: Falling for the "live brain" story and shipping serial calls that blow the 2 second budget, so every tester hears dead air.

WHAT WOULD CHANGE MY MIND: A measured p95 under 1.2s on two parallel calls, with failures under 2% across 50 calls, would lift A to 8. A written D price under $0.30 per interview with no audio retention would lift D to 6.

QUESTION FOR THE FOUNDER: If the free tier throttles at ten testers in one evening, what does a candidate hear, and have you tried it?
