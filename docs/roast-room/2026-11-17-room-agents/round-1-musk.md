SEAT: MUSK (First principles and execution speed)
STANCE: Conditional yes (on A, built as A-lite in stages)
OPTION SCORES: A 7/10 · B 6/10 · C 2/10 · D 3/10
PILLAR SCORE: 7/10   (first principles and execution speed)
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build A, but only its cheap half first: a Director in plain code and room state, one Interviewer call on the critical path, and an Observer that is a background write, never a speaker. Delete C and D.

WHY:
1. Goal in physical units: first spoken word within 2 s of finalize_turn, so the critical path gets one model call. Assuming an 8 s deadline today and a 1.5 s p95 target, a second call in series blows the budget. "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014) A second speaking agent (C) is that thing. Four seats for a four-question call is a staffing plan for a rocket.
2. The founder's real complaint, "listened to me", is state, not headcount. The "agents that live in the call" idea is mostly events (pause, ramble, "repeat that") plus a shared room state. Both are code. Rule 1 and 2 of the algorithm (S014): the requirement "agents" is dumb, the requirement "reacts to events" is real. Delete the first, keep the second. The Observer fits only because it is off the clock: an answer gives 30 to 90 free seconds, so one cheap call there costs no latency, only quota (assume 1 extra call per answer, 4 per interview).
3. D swaps three working Sarvam stages for a new vendor, key and privacy statement, to fix a problem the pipeline does not have. Prototypes are easy, production is hard (S019 framework): D demos beautifully and ships a new privacy promise. Not before a tester says the pipeline's latency is the complaint.

THE COMPLETE BUILD, IN STAGES:
1. Days 1 to 3: repeat guard, persisted asked-history, nextQuestion(state) seam, Director owns clock and coverage. Gate: zero repeats in 10 sessions, 10 of 10 finish with the key unset.
2. Week 2: Interviewer as one call with structured output, narrowed to 3 to 5 candidates, bank fallback. Gate: 50 timed calls, p95 under 1.5 s, failures under 5 percent. Then invite testers.
3. Week 3 to 4: Director events only (long pause nudge, ramble cut, repeat on request), all scripted lines, no model. Gate: tester sessions show no talk-over and no dead air above 6 s.
4. Week 4 to 6: silent Observer writing to room state, gated on at least half of 20 sessions calling questions generic. Gate: it must raise "followed what I said" without adding p95.
5. Later, optional: second voice, only if Observer notes are used and testers ask for panel pressure.

THE RISK I SEE: Building the Observer and second voice for a feeling nobody has measured, with zero tester sessions, on a free-tier quota where one extra call per answer plus retries hits the rate limit mid-call.

WHAT WOULD CHANGE MY MIND: Timed logs showing p95 over 2 s on the single call (then A collapses to B and I cut the Observer), or 20 sessions where fewer than 5 testers call questions generic (then stop at stage 3).

QUESTION FOR THE FOUNDER: Which one number tells you a tester felt listened to, and can you read it from the logs without sitting in the call?
