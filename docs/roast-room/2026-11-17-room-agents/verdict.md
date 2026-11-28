# Roast Room verdict: agents that live in MIRROR's interview call

17 November 2026 · Quick council, two rounds (Round 3 skipped: spread 1 to 2, no ruin risk) · Seats: Graham (3), Musk (3), Blakely (2), Buffett (2)
Session files: `docs/roast-room/2026-11-17-room-agents/` (14 quotes checked against the brains, 0 unverified)

## Verdict: GO WITH CONDITIONS on a staged "Room": B-plus now, the Observer later, no panel and no new vendor

The council did not back all four agents at once. It backed the Room in stages, and it noticed that the first stages are B plus events: once pause, ramble and "repeat that" handling is code, the only part of A that is not B is the silent Observer. So build the listening first, and let the Observer earn its place from evidence.

Option scores (Round 2, weights Graham 3, Musk 3, Blakely 2, Buffett 2): **A 6.5** (staged) · **B 6.2** · D 2.7 · C 2.0. Band 6.0 to 7.4 gives GO WITH CONDITIONS. Council confidence 7 of 10 (three seats at 3 of 5, Musk and Buffett at 4). Every option is a two-way door; no seat is at ruin risk.

## What carried the room

1. **"Agents" is the dumb requirement; "reacts to what I say" is the real one** (Musk). Presence is events (a pause, a ramble, "repeat that") plus shared state, and both are plain code. A per-turn call fed the full transcript is the same as a persistent interviewer.
2. **A panel scares a nervous candidate** (Blakely) **and eats five times the quota** (Buffett). C is out until testers ask for a harder panelist.
3. **A speech-to-speech swap (D) adds a vendor, about $1.20 per interview on an assumed $0.10 per minute, and breaks "audio is never stored by a third party"** (Buffett). One-session bake-off at most, never a swap.
4. **The Observer is the most expensive and least visible piece** (Graham, Buffett). The candidate never sees its notes, so it starts only when logs show generic questions and its notes change the next question.
5. **A talk-over is the failure that makes nervous testers leave and say so** (Blakely). Pause reactions start in shadow mode, wait longer than feels clever, fire once per question, and never cut an answer.

## Where the seats still differ (the Chair's rulings)

- **Where pause detection lives.** Graham and Musk: the server, from partial-transcript timing (zero client change). Blakely and Buffett: the browser's voice activity. **Ruling: the server first, in shadow mode** (the gateway already sees `partial_transcript`; additive protocol only). The browser event is the fallback if partials prove unreliable in silence.
- **Thresholds.** Ruling: no nudge before 10 seconds with no new words after a question (15 seconds on the very first question, 6 seconds of silence mid-answer never counts), one nudge per question, and a second line at 25 seconds. Ramble line only at 90 seconds or 250 words, as an offer, never a forced cut. All tunable by environment variable.
- **Build or learn first.** Ruling: both, in order. Days 1 to 7 build the floor (repeat guard, persisted history, one timed call); five named testers are lined up before day 8; the nudges run in shadow mode while testers use it.

## Conditions (checkable)

1. 50 timed calls on the real model: p95 first word under 1.5 seconds (2 at most), failures under 5 percent, before any tester is invited.
2. Zero repeats across 10 sessions, and with the key unset 10 of 10 interviews still finish well.
3. Shadow-mode nudges fire falsely on under 1 in 10 turns before they ever speak; talked-over count stays under 1 per 5 sessions once live.
4. Calls per completed interview are logged, ceiling 12 including the Observer; the Observer switches itself off for the session on the first rate-limit error. A throttle drill with 10 simultaneous sessions must still end with a spoken question for every candidate.
5. The Observer, a second voice and any new vendor start only after 20 tester sessions in which at least half call the questions generic, and the Observer's notes visibly change the next question. No Observer or second-voice code merges before that log exists.

## "Listened to me" in numbers

- **Follow-up rate:** the share of questions after the first that reuse a term from the candidate's previous answer (read from saved turns).
- **One tap after the call:** "Did it follow what you said?" yes or no.
- **Talked-over count:** a nudge followed by the candidate speaking within 3 seconds.
- **The real test (Graham):** an unprompted second session within 10 days. A friendly "nice" costs the tester nothing.
- **Cost number (Buffett):** model calls per completed interview.

## Pillar scorecard

| Seat | Dimension | Score |
|---|---|---|
| Graham | Real demand and growth | 6 |
| Musk | First principles and execution speed | 7 |
| Blakely | Customer love and word of mouth | 6 |
| Buffett | Downside and capital efficiency | 7 |

No pillar is at 4 or below. Graham's and Blakely's 6 each carry one named fix: five named testers before day 8, and gate on the talk-over count, not the word "listened".

Simulated advisors built from each person's public work. They are not the people and do not speak for them.
