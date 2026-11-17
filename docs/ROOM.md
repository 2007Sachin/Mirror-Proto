# The Room

The live interview call, staged. Source of the rulings: `docs/roast-room/2026-11-17-room-agents/verdict.md` (GO WITH CONDITIONS). Plan: Stages 0 to 4 built, 5 and 6 specified only.

## Architecture

- **Director** (`server/domain/director/`, plain code). Owns the plan, the asked-history (this interview plus the user's earlier interviews, read from saved rows, no new table) and the repeat guard (normalised text plus token-set similarity). It builds 3 to 5 candidate questions (target gaps, story themes, then the tagged bank) and always returns a question. Shared types: `types.ts` (`RoomState`, `Candidate`, `InterviewerInput`, `DirectorOutput`, `RoomTurnLog`).
- **Interviewer call** (`ReflectionProvider.generateNextQuestion`, `server/providers/nim.ts`). One model call per turn, given the full transcript, the asked-history, the candidates and the signals of the last answer. It only chooses among the candidates or probes the last answer: `{ action: probe | advance | gap, target_skill?, question }`. Deadline `INTERVIEWER_DEADLINE_MS`; a miss, a schema miss or a repeat (one retry) falls back to an unasked bank question, with no `You said:` prefix.
- **Events** (`server/voice/`). A per-turn silence timer on the voice session: a nudge after a long silence, a second line later, a ramble offer, and "repeat that" (string match on the final transcript). Spoken through the existing `tts_start`/`tts_end` path. Interrupt and mute always win; the server never finalises a turn itself.
- **Observer: specified, not built.** `RoomState.notes` is always `[]`. See the gate below.
- **Logs.** One `room_turn` line per turn (`source`, `latencyMs`, `action`, `blockedRepeat`, `calls`), `nudge_shadow` lines in shadow mode, and one `room_feedback` line per after-call tap. Nothing stored; durable columns would need a migration.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `VOICE_NUDGE` | `shadow` | `shadow` logs what would have fired, `on` speaks, `off` does nothing |
| `VOICE_NUDGE_SILENCE_MS` | 10000 (15000 on the first question) | No new words for this long before the first nudge |
| `VOICE_NUDGE_SECOND_MS` | 25000 | Second line ("repeat the question, or a moment?") |
| `VOICE_RAMBLE_MS` | 90000 | Ramble offer after this long in one answer, never a forced cut |
| `VOICE_RAMBLE_WORDS` | 250 | Or after this many words |
| `INTERVIEWER_DEADLINE_MS` | 1500 (2000 at most) | Time the Interviewer call has before the bank answers |
| `INTERVIEW_CALL_BUDGET` | 12 | Ceiling of model calls per interview |

One nudge per question. Six seconds of silence mid-answer never counts.

## Gates and conditions (from the verdict)

1. 50 timed calls on the real model: p95 first word under 1.5 s (2 s at most), failures under 5 percent, before any tester is invited. Tool: `npm run room:timing`.
2. Zero repeats across 10 sessions; with the key unset, 10 of 10 interviews finish. Tools: `npm run room:drill`, `npm run room:metrics` (repeat rate).
3. Shadow nudges false-fire on under 1 in 10 turns before `VOICE_NUDGE=on`; talked-over count under 1 per 5 sessions once live.
4. Calls per completed interview logged, ceiling 12; the throttle drill (10 simultaneous interviews, model failing or answering 429) ends with a question every turn.
5. Observer, second voice and any new vendor start only after 20 tester sessions in which at least half call the questions generic and the notes visibly change the next question. Observer spec: one cheap call per answer, 3 s timeout, no retries, ceiling 4 per interview, off for the session on the first 429, same provider, p95 unchanged. A second voice needs a written token ceiling; speech-to-speech is a one-session bake-off only. No Observer or second-voice code merges before that log exists.

## Reading the metrics

`npm run room:metrics -- --user <id> --log <file>` prints a plain table for the founder. Never shown to learners.

- **Follow-up rate**: share of questions after the first that reuse a content term from the previous answer. A rough proxy; a low number on short answers is normal.
- **Repeat rate**: share of questions already asked in an earlier interview or earlier in the same one. Target 0.
- **Bank vs model**: from `room_turn` lines. A high bank share means the model is slow, failing or rate limited.
- **Model calls per interview**: from `room_turn` lines. Ceiling 12.
- **Shadow nudges followed by speech within 3 s**: the talked-over proxy. The script reads `nudge_shadow` lines with a `spokeAfterMs` number; match that field to the gateway line if it differs.
- **After-call tap**: yes and not really counts from `room_feedback` lines.
- The real test (Graham): an unprompted second session within 10 days.

For Supabase, set `METRICS_ACCESS_TOKEN` to a signed-in user token; without it the report reads the empty in-process memory repository.

## Left for you

- Name the 5 testers (before day 8) and sit in on 3 sessions.
- Say when to run `npm run room:timing` (it spends model quota; it refuses to run without a key).
- Decide if you want durable per-turn columns and the after-call tap stored; that needs a migration, not created here.
- Switch `VOICE_NUDGE` from `shadow` to `on` only after the false-fire gate holds.
- Observer, second voice and any new vendor: only after the tester gate above.
