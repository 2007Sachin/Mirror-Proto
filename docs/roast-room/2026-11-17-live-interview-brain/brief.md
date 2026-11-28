# Brief: a dynamic "brain" for MIRROR's live interview practice

Mode: quick council, four seats (Graham 3, Musk 3, Bezos 2, Buffett 2), Rounds 1 and 2, Round 3 only if the scores do not converge. Run on 17 November 2026 for Sachin Kumar, founder of MIRROR.

## THE BRIEF

**Decision:** Sachin says the live interview practice "is brainless, a set of rules running": the same question repeats, with a random sentence in front. He wants questions that are dynamic, not sequential every time, and asks whether to build a **multi-agent orchestration system** for live interview practice. What should MIRROR build?

**Options:**
- **A. Full multi-agent orchestration, live.** Several LLM agents (planner, interviewer, answer analyst, memory, safety/tone) coordinate on every turn of the interview.
- **B. One interviewer LLM with structured state.** A single model call per turn that is given the plan, the history of questions asked and what the answers showed, and picks the next question itself. No agent framework.
- **C. Hybrid: a deterministic orchestrator plus one fast LLM call per turn, with slow "analyst" work off the live path.** Code owns the plan, the asked-history and the repeat guard; one model call writes the question; analysis and memory updates run asynchronously between sessions or in the background; a tagged question bank is the safe fallback.
- **D. Keep it sequential and just fix the repeats.** A tagged question bank plus an asked-history, no new AI behaviour. (This also stands for "do nothing new": keep what we have, minimally fixed.)

**The product:** candidate-side interview practice for data and analytics roles. Voice (Sarvam speech, live) or text. House rules: never scored, no percentages, no streaks, calm copy, privacy first (audio never stored, answers private to the account, delete anytime). Pre-beta, auth just merged, an invite-only beta next. One founder building with Claude Code. No revenue. A handful of testers (assumed).

**How it works today (from the code):**
1. A fixed four-question script (`server/domain/questions.ts`): the same opener, then "what was yours to own", "what resistance", "what changed". The interview is four questions long.
2. The model (NVIDIA NIM, `nemotron`) gets one 8-second try per follow-up (`server/domain/followUp.ts`, `server/providers/nim.ts`), with the role, the first 1,500 characters of the résumé and the previous turns.
3. Any failure (no key, a slow reply, a schema miss) falls back to the next line of the fixed script, with `You said: “<first sentence of the last answer>”` stuck on the front. Nothing checks for repeats.
4. `askedQuestions` is kept per interview only. Nothing is remembered across sessions: no record of which skills were covered or how answers went.
5. Targets (job description + résumé match with covered/partial/gap skills) and Stories exist, but the interview does not use them to choose questions. A separate screening-call mode has its own list.

**Constraints:** a live voice conversation needs a question in about 1 to 2 seconds or it feels broken (today's limit is 8 seconds); the model is a free-tier hosted API with rate limits; calm tone and no scoring; solo founder time, about two weeks to beta invites (assumed); every added agent adds latency, cost, failure modes and things to test.

**Success looks like:** in a week of use, no tester sees the same question twice in a row or across sessions unless asked to repeat it; questions visibly follow the target role, the résumé gaps and the last answer; the first question arrives within about 2 seconds; the interview still works when the model is down.

**Which way the founder is leaning:** toward a multi-agent orchestration system ("a brain"), because the current system feels rule-driven. The council tests that lean, it does not echo it.
