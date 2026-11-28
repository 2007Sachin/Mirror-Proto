# Round 1: opening positions

## Graham

SEAT: GRAHAM (Product and startups)
STANCE: Conditional yes (on a staged A: Interviewer plus Director first, Observer only after tester evidence)
OPTION SCORES: A 6/10 · B 6/10 · C 2/10 · D 3/10
PILLAR SCORE: 6/10   (Real demand and growth)
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build A in slices, starting with the one thing a tester can feel in a single call (the Interviewer reacting to pauses, rambling, "repeat that", and never repeating a question), and make every later agent earn its place from tester sessions.

WHY:
1. Demand first: I have no evidence yet that anyone wants a "live brain". The brief says a handful of testers, assumed. What I have is the founder's conviction, which is the weakest signal. "Who wants this so much that they'll use it even when it's a crappy version one made by a two-person startup they've never heard of?" (S098). So I score on what testers will notice. A candidate who rambles and gets a calm "take your time" or a follow-up on what they just said feels listened to. A silent Observer writing notes they never see does not change what they do next, so it is the last thing I would build.
2. The earlier council was right on the clock and wrong to stop there. Serial calls on the critical path die at 1 to 2 seconds. But event handling (pause, rambling, repeat) is mostly code in the Director, not model calls. That is cheap and it is exactly the presence testers lack today. I assume 4 questions per session, so 4 chances to feel heard. Make each count.
3. Do things that don't scale. "The unscalable things you have to do to get started are not merely a necessary evil, but change the company permanently for the better." (S096) Sit in on 5 sessions yourself, by hand, before building C or D. A panel is a hiring-ahead move for a product with no users. "Launching teaches you what you should have been building." (S142) Two weeks to invites is the right clock. D adds a vendor and a privacy statement for a demand nobody has shown.

THE COMPLETE BUILD, IN STAGES:
1. Week 1: Director in code (clock, asked-history across sessions, repeat guard, pause and "repeat that" handling) plus the one-call Interviewer from the earlier verdict. Gate: zero repeats in 10 sessions, p95 under 2 seconds, 10 of 10 finish with the key unset.
2. Week 2: invite 5 testers, sit in on at least 3. Gate: at least 3 of 5 say it listened, and I can name what they did next (practised again, came back within a week).
3. Weeks 3 to 4: Interviewer holds the whole call in context and reacts to rambling and thin answers. Gate: testers return for a second session unprompted.
4. Weeks 5 to 6: silent Observer, off the critical path, only if logs show generic questions from thin answers (half of 20 sessions).
5. Later and optional: second voice (panelist). Only if testers ask for panel practice by name. D and full C stay shelved.

THE RISK I SEE: A founder-led build of a clever system for imagined users. Five testers who politely say "nice" and never return, while two weeks went into agents instead of conversations.

WHAT WOULD CHANGE MY MIND: If fewer than 2 of 5 testers finish a second session within 10 days even after the Director fix, the brain is not the bottleneck and I would drop all agent work for distribution. Toward C or D: 10 or more testers asking for a panel or a more natural voice.

QUESTION FOR THE FOUNDER: Who are the first 5 testers by name, and would each of them be bummed if the call went away?

## Musk

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

## Blakely

SEAT: BLAKELY (Consumer product and brand from zero)
STANCE: Conditional yes (on A, staged: one speaking Interviewer, a silent Observer, a code Director)
OPTION SCORES: A 7/10 · B 5/10 · C 3/10 · D 4/10
PILLAR SCORE: 6/10 (customer love and word of mouth)
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build A as the founder describes it, but ship it in slices where the first thing a tester feels is "it listened to me", and keep the second voice out until testers ask for it.

WHY:
1. Word of mouth needs one sentence a friend repeats. "It listened to me" is that sentence. A question list never earns it, so B alone caps the love. Per my rule that "marketing never makes up for a product that isn't superior" (S007), the listening is the product, and the 10x gap against a question bank is felt, not specced (Why am I different, and is it 10x better?, S020).
2. A panel scares a nervous candidate. Someone practising alone, scared of looking foolish, does not want three judges. C adds a second and third voice before one voice is proven. I would kill C for now. I would score it higher only if testers ask "can I have a harder panelist". A Director in plain code also keeps the call calm and repeat-free.
3. Watch the consumer, not the tech. "I never even paid any attention to my competition. I just paid attention to my consumer." (S022) D is a shiny swap, a new vendor and a new privacy statement, and nobody will tell a friend about the plumbing. Real users living with it matters more (Test on real bodies over real time, S017).

THE COMPLETE BUILD, IN STAGES:
1. Week 1-2: repeat guard, persisted asked-history, Director in code, graceful pause and "repeat that" handling, fallback script. Gate: 0 repeats in 10 sessions, 10/10 finish with the key unset.
2. Week 2-3: invite 5 to 10 testers; the Interviewer holds the whole call in context, so questions follow what they said. Gate: at least half of testers use a phrase like "it listened".
3. Week 4-5: silent Observer writes notes to room state (thin answer, contradiction). Never on the critical path. Gate: p95 first word under 2 seconds with it on.
4. Week 6+: interruption and rambling reactions. Gate: testers say it feels natural, not nagging.
5. Later, only on asks: second voice (hiring manager). D only if Sarvam hurts.

THE RISK I SEE: An interviewer that jumps in too often feels like being talked over. Nervous people leave and say so. A pause reaction must wait longer than feels clever.

WHAT WOULD CHANGE MY MIND: Fewer than 3 of 10 testers describe the call as better than the fixed script, or p95 first word above 2 seconds in 50 timed calls. Then B wins.

QUESTION FOR THE FOUNDER: Have you sat through a tester's session in person and watched their face when the interviewer first picks up on something they said?

## Buffett

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

## Chair

Round 1 option scores (weights Graham 3, Musk 3, Blakely 2, Buffett 2; sum 10):
- A: (3×6 + 3×7 + 2×7 + 2×6) / 10 = 6.5
- B: (3×6 + 3×6 + 2×5 + 2×7) / 10 = 6.0
- C: (3×2 + 3×2 + 2×3 + 2×2) / 10 = 2.2
- D: (3×3 + 3×3 + 2×4 + 2×3) / 10 = 3.2

C and D are out for now: every seat scored them 4 or lower (a panel scares a nervous candidate and eats five times the quota; a speech-to-speech swap adds a vendor, about $1.20 per interview if the assumed $0.10 per minute is right, and breaks "audio is never stored by a third party"). The council is not unanimous: A and B are within half a point, and every seat is a conditional yes on a staged A. Confidence is 3 of 5 from three seats.

**Cruxes**
1. **Is A really different from B once the events are code?** All four seats say pause, ramble and "repeat that" handling lives in the Director as plain code, and that "the Interviewer holds the whole call in context" is mostly prompt design (a per-turn call that is given the full transcript each time is the same thing). So what exactly separates A from "B plus events plus an Observer"? If it is only the Observer, A is a gated later step and the council's answer is B-plus. Seats most able to answer: Musk, Buffett, Graham.
2. **Who detects the pause and the ramble?** Today the protocol is strictly turn-based: the client sends `finalize_turn` and the server never decides when an answer is over. Reacting to a pause or a ramble needs voice activity detection somewhere, and a change to the v1 voice protocol. Where does it live (browser or server), what are safe thresholds so a nervous candidate is never talked over (Blakely's risk), and what is the cheapest design? Seats: Musk, Blakely.
3. **What comes first with two weeks to invites: build, or learn?** Graham wants 5 testers and sitting in on sessions before anything beyond the Director; Musk and Buffett want the Director, repeat guard and one-call Interviewer shipped and timed first. What is the actual order of the first two weeks, and which gate lets the Observer start? Seats: Graham, Musk, Buffett.
4. **What is "listened to me" in a number?** Musk's question: which one number says a tester felt listened to, readable from logs without sitting in the call. The complete build needs a metric for each stage gate. Seats: all.
