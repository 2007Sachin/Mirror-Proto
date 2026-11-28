# Round 1: opening positions

## Graham

SEAT: GRAHAM (Product and startups)
STANCE: Yes (on C, shipped in stages)
OPTION SCORES: A 1/10 · B 6/10 · C 8/10 · D 5/10
PILLAR SCORE: 7/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build C, but ship it in slices: this week the repeat guard and asked-history in code, then one fast LLM call per turn, and put it in testers' hands before anything else gets built.

WHY:
1. Make something people want (S092). Nobody has told you the practice is bad. You think it is "brainless". That is a founder's opinion, and I'd rank it below tester behavior. A handful of testers is the only evidence that matters, and the repeated question is the one defect you can already see. Fix that and watch what they do. A is solving a problem no user has named yet.
2. Is it the bottleneck? (S010). "The number one thing not to do is other things." (S166) Five agents is other things. Each one adds latency, failure modes and tests, and you have two weeks and one pair of hands. Your own success test is repeats, relevance and a 2 second first question. Code plus one call hits all three. Planner, analyst and safety agents add nothing to that list.
3. Launch fast, let users steer (S142). "Launching teaches you what you should have been building." Beta invites are about 14 days out. Assume 5 to 10 testers, 3 sessions each. That is about 20 sessions and roughly 80 questions, which is enough to learn what feels dumb. Learn it before you pick an architecture. Also, a design that keeps working when the model is down fits free-tier rate limits, and that is C's fallback.
4. Do things that don't scale (S096). For the first testers, hand-tag the question bank and read their transcripts yourself. That is your analyst agent, and it costs nothing.

THE RISK I SEE: You spend the two weeks on the clever orchestration, the beta slips or ships with the same repeat bug, and testers conclude it is still brainless. A big build with zero tester feedback is how startups die by their own hand.

WHAT WOULD CHANGE MY MIND: If, after the repeat guard and a single LLM call have run for 20 or more tester sessions, at least half the testers still say the questions feel generic, and I can see the cause is cross-turn reasoning that one call cannot do, I'd back a second model call for analysis. A 2 second latency miss on the single call would also change it.

WHAT I'D DO THIS WEEK: Add the asked-history and repeat guard, so no question repeats within or across sessions. Make the single-call question writer take the target role, the résumé gaps and the last answer. Then send it to 3 testers and sit in on one session.

QUESTION FOR THE FOUNDER: Which tester, by name, said the practice felt brainless, and what did they do right after: quit, or ask for another go?

## Musk

SEAT: MUSK (First principles and execution speed)
STANCE: Strong yes (on a variant of C)
OPTION SCORES: A 1/10 · B 5/10 · C 9/10 · D 4/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: C, cut down to its smallest form. Code owns the plan, the asked-history and the repeat guard. One model call writes each question. Analyst and memory agents wait until the first two ship.

WHY:
1. The real constraint is not a missing brain. It is a 1 to 2 second budget on a free-tier model that today gets 8 seconds and one try. Each extra agent in a live turn adds roughly 1 to 3 seconds and one more thing that can fail. Four agents in series would run 4 to 8 seconds per turn, 2 to 4 times over budget, and it would be dead whenever the API rate-limits. A is the algorithm run backwards: it automates before anything is deleted (The algorithm, S014). "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014)
2. The repeats are a plumbing bug, not an intelligence gap. The fallback script has no history check, and `askedQuestions` dies at the end of each interview. Persisting an asked-set and a skills-covered list across sessions is perhaps 100 lines. It deletes the one symptom he named, at nearly zero latency.
3. Ship version one at the smallest size that works, then budget for versions two and three. "In general, with any given technology, you first try to make it work, and then you make it efficient." (S001) The tagged bank doubles as the fallback, so the interview survives when the model is down.

THE RISK I SEE: He builds the orchestration because it feels like a brain, and it eats the two weeks. Beta invites go out with a slow, flaky interview that is still rule-driven. I'd put that at 40% if he starts with A.

WHAT WOULD CHANGE MY MIND: A measured p95 under 1.5 seconds for a single call that is given the history. Together with that, a tester session where a dynamic question beat the fixed script and the cause was agent coordination, not the prompt. Neither exists today.

WHAT I'D DO THIS WEEK: Add a persisted asked-history and a repeat guard in code. Make the one model call take the target, the résumé gaps and the last answer, with a 2 second timeout, and fall back to an unasked bank question with no "You said:" prefix. Then run 10 sessions and count repeats and latency.

QUESTION FOR THE FOUNDER: When a tester says it is brainless, which exact turn felt dumb: the repeated question, the "You said:" stub, or a question that ignored their last answer? Each one has a different fix, and only one of them needs an agent.

## Bezos

SEAT: BEZOS (Strategy and decisions)
STANCE: Strong yes (on C)
OPTION SCORES: A 2/10 · B 5/10 · C 9/10 · D 4/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build C, the deterministic orchestrator with one fast LLM call per turn, and make the question bank its fallback so the interview works when the model is down.

WHY:
1. Sort the door first (Type 1 and Type 2 decisions, S063). Every option here is a two-way door. It is code in a pre-beta app with a handful of testers, and no data migration locks you in. "Type 2 decisions can and should be made quickly by high judgment individuals or small groups." (S063) So one owner, decide this week, about 70 percent of the information (S064). I'd also kill the idea that A is the "bigger" door. It isn't. It is a bigger bill: the one fake two-way door is two weeks of one founder's time, and that is the only cash MIRROR has.
2. Work backwards from the candidate (S056, S057). What won't change (S029, S010): a candidate in a live voice call will never wish the next question arrived slower or repeated. Your own bar is a question in 1 to 2 seconds, never the same one twice, and visible use of the target role, résumé gaps and last answer. A needs 4 to 5 sequential agent calls per turn. Even at an assumed 1 second each, that is 4 to 5 seconds of dead air. That fails the customer test outright.
3. Controllable inputs (S018). Repeat rate, time to first question, and fallback hit rate are the inputs. C gives code ownership of the repeat guard and asked-history, so those inputs are guaranteed rather than hoped for. Analyst and memory work run off the live path, which is where "brainless" actually gets fixed: cross-session memory.

D is a real fix to the repeats, but it keeps the "brainless" feel and does not meet the success bar. B is C without the safety net. A is the optics bet. I'd concede the founder's instinct that it needs a brain. A brain is state plus judgment, not five agents.

THE RISK I SEE: The founder builds the "brain" shape first, burns the two weeks, and ships invites with a slower, flakier interview than today's.

WHAT WOULD CHANGE MY MIND: A measured p95 below 1.5 seconds for a multi-agent turn on the free-tier NIM, or testers who finish C and still call it rule-driven in week one. I'm assuming roughly 1 second per call and a handful of testers, since the brief has neither.

WHAT I'D DO THIS WEEK: Ship the repeat guard, asked-history and tagged question bank (D, which is also C's floor) in the first days. Then add the single LLM call with a 1.5 second timeout, falling back to the bank.

QUESTION FOR THE FOUNDER: If the model were down on invite day, would a tester still get a good interview, and have you timed one live turn on the real API?

## Buffett

SEAT: BUFFETT (Money and capital)
STANCE: Yes (on C)
OPTION SCORES: A 2/10 · B 5/10 · C 8/10 · D 5/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build C, with code owning the plan, the asked-history and the repeat guard, one fast model call writing each question, and the question bank as the fallback. Kill A.

WHY:
1. Ruin and failure modes (Financial staying power, S095; Margin of safety, S065). This is my translation of an investing rule into a product decision. A has five agents on every turn. Say each is 99% reliable. Five in a row gives about 95%, so roughly one turn in twenty breaks, in a live voice call. "A string of wonderful numbers times zero will always equal zero." (S095) Voice has no tolerance for a stall. C survives a dead model because the bank is already there. B survives it only if you build the same bank anyway.
2. Cash math (Great, good, and gruesome, S080; Dollar-retained test, S010). I'm assuming a 6 to 8 turn interview and a handful of testers. A costs 5 calls per turn at about 1.5 seconds each, run in sequence. That is 6 to 10 seconds a turn, against a 2-second target and a free tier with rate limits. C is one call per turn, with analysis running in the background. A eats your two weeks and your quota and returns nothing the tester can see. That is the gruesome kind of growth.
3. Institutional imperative (S062). "Instead, rationality frequently wilts when the institutional imperative comes into play." You feel the system is brainless, so you reach for a brain. The tester's complaint is repeats and ignored answers. A repeat guard plus a good prompt fixes that, and you don't need an agent framework for it.
4. Trust promise. Every added agent is another place answers flow, another thing to log, and another way for a score to leak out. C keeps the surface small.

THE RISK I SEE: One model call on the live path still blows past 2 seconds on a free-tier API. The tester then hears the fallback line, and it feels like today's script again.

WHAT WOULD CHANGE MY MIND: Measured p95 latency for a single call under 1.5 seconds, plus a paid tier costing under about $0.01 per interview. Then B beats C, because the code I'd skip is the orchestrator. For A to win, I would need beta testers saying single-call questions are still shallow after the repeat guard ships.

WHAT I'D DO THIS WEEK: Time 50 real follow-up calls against nemotron and record p50, p95 and failure rate. Then ship the repeat guard on the bank, the same day.

QUESTION FOR THE FOUNDER: If the model is down for an entire beta session, can a tester still finish a good interview, yes or no?

## Chair

Round 1 option scores (weights Graham 3, Musk 3, Bezos 2, Buffett 2; sum 10):
- A: (3×1 + 3×1 + 2×2 + 2×2) / 10 = 1.4
- B: (3×6 + 3×5 + 2×5 + 2×5) / 10 = 5.3
- C: (3×8 + 3×9 + 2×9 + 2×8) / 10 = 8.5
- D: (3×5 + 3×4 + 2×4 + 2×5) / 10 = 4.5

**Unanimity check (scoring.md, override 3).** All four seats top C within 1 point (8 to 9). The Chair treats this as a warning, not a win. Every seat priced A as four or five agent calls in series on the live path. Nobody argued the version of A the founder is actually reaching for: agents that run in parallel, off the live path, or ahead of the turn (while the candidate is still speaking), so the live turn only composes a ready result. Nobody argued that "dynamic, not sequential" needs a decision (probe deeper, switch topic, go to a target gap) that one prompt per turn may not make well.

**Cruxes**
1. **Is the latency wall real for a parallel or speculative multi-agent design, or only for a serial one?** Bezos, Musk and Buffett all measured A as serial calls on the hot path (4 to 10 seconds). Nobody priced a planner and analyst that run while the candidate is still speaking, or that precompute the next two questions during the previous answer. Seats on the "latency kills A" side: Bezos, Musk, Buffett. Seats asked to argue the other side at full strength: Graham and Bezos.
2. **What does "dynamic, not sequential" actually need?** The founder wants the interview to branch: probe a thin answer, move on from a strong one, pick up an uncovered target skill. Graham and Musk say one call plus a repeat guard is enough until testers show otherwise. Is the branching decision something one call writes well, or does it need a separate planner step with its own state?
3. **Build order and reversibility.** Ship D as the floor and learn from testers first (Graham, Musk, Bezos this week), or design C's orchestrator interface now so analysts and planners can be added later without a rewrite? What is the cheapest step that keeps the A door open?
