# Brief: agents that live in MIRROR's interview call

Mode: quick council, four seats (Graham 3, Musk 3, Blakely 2, Buffett 2), Rounds 1 and 2, Round 3 only if the scores do not converge. Run on 17 November 2026 for Sachin Kumar, founder of MIRROR. This is a second session on the same product area. An earlier council (docs/roast-room/2026-11-17-live-interview-brain) backed "a deterministic orchestrator plus one fast model call per turn, with a question bank as fallback", and rejected serial multi-agent calls on every turn (A 2.7/10) because of latency, quota and privacy surface. The founder pushed back: **"I want the interview room to be with a live brain, not just a set of questions. How about agents that live in the interview call?"** This session tests that reframing and asks for the **complete build**, not just step one.

## THE BRIEF

**Decision:** how should MIRROR build the live brain of the interview room, as a complete system?

**Options:**
- **A. The Room: persistent agents that live in the call, event-driven.** One long-lived Interviewer agent (holds the whole call in context; speaks; reacts to events such as the end of an answer, a long pause, a rambling answer, "can you repeat that"). A silent Observer agent listens to the live transcript and writes notes (thin answer, no result yet, contradiction, skill covered) to a shared room state; it never speaks and never sits on the critical path. A Director that is plain code, not a model, owns the clock, the coverage plan, the asked-history and repeat guard, and who may speak. A second speaking voice (a panelist or hiring manager) is a later, optional addition.
- **B. Keep the earlier verdict:** a per-turn orchestrator plus one fast model call, a tagged bank as fallback, with an optional background analyst gated on tester evidence. No persistent agents.
- **C. A full panel from day one:** several speaking agents (interviewer, hiring manager, technical panelist) plus observers, all live in the call.
- **D. An end-to-end realtime voice model as the live brain:** swap the speech-to-text, model and text-to-speech pipeline for one hosted speech-to-speech model that holds the conversation itself (the Director and room state stay as code around it).

**The product:** candidate-side interview practice for data and analytics roles. Voice (live) or text. House rules: never scored, no percentages, no streaks, calm tone, privacy first (audio never stored by MIRROR; answers private to the account; delete anytime). Pre-beta, auth just merged, an invite-only beta next. One founder building with Claude Code. No revenue. A handful of testers (assumed).

**How the live call works today (from the code):**
1. A voice gateway over WebSocket (`server/voice/`, about 1,100 lines): the browser streams PCM audio; the server runs speech-to-text (Sarvam realtime, manual endpointing: the client sends `finalize_turn` to end an answer); the server sends `partial_transcript` and other events, plus `interrupt` and `mute` controls from the client. Text-to-speech is Sarvam. The session is authenticated by the cookie at the WebSocket upgrade.
2. Each answer is saved (`interviewBridge.ts`), then one model call (NVIDIA NIM, a Nemotron model, 8 second deadline) writes the next question. A failure falls back to a fixed four-line script. The interview is four questions long.
3. Nothing is remembered across questions beyond the last turns, and nothing across sessions. Targets (job description, résumé match: covered, partial, gap skills), Stories and a screening-call mode exist but do not steer the live question.
4. The interviewer has no presence between questions: it does not react to pauses, rambling, or half-answers, and the voice protocol is strictly turn-based.

**Constraints:** a spoken question must start within about 1 to 2 seconds of the end of an answer; the model is a free-tier hosted API with rate limits and a single fast call at a time is realistic; calm tone and no scoring; privacy promise (more agents hearing answers widens who sees them); one founder, about two weeks to beta invites for something that works and more time for the full build (assumed); the voice stack is Sarvam (Indian-English speech), and a different speech-to-speech provider would be a new vendor, new key and new privacy statement.

**Success looks like:** a tester says the interviewer "listened to me": questions follow what they just said and what the target role needs, nothing repeats, the interviewer handles pauses and interruptions gracefully, the first word of each reply comes within about 2 seconds, and the call still finishes well when a model is down.

**Which way the founder is leaning:** toward agents that live in the call (A or C), not a question list. The council tests the lean and shapes the complete build.
