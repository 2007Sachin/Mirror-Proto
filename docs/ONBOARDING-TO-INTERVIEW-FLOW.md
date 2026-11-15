# MIRROR: Onboarding to Interview Mode, as built today

> **Superseded (2026-11-10).** This describes the OLD four-step onboarding (Goal, Direction, Story, Review), which has been deleted.
> The new flow is "The First Interview": Landing → three conversational moments (evidence + story, one pressure question, the contract) → Workspace with a personalised first interview queued.
> Sections 4 onward (workspace, starting the interview, interview screen, text and voice paths, finishing) still describe the app accurately, apart from the points that referred to the old screens. The `.mmd` diagram is also for the old flow.


Source of truth: `src/App.tsx`, `src/lib/api.ts`, `src/voice/*`, `server/app.ts`, `server/domain/*`, `server/voice/*`.
Scope: everything from the landing page's "Start" button until the interview screen is open and running, plus what happens inside it up to the report. This describes **current behaviour**, including quirks. Section 9 lists the gaps that matter for a redesign.

---

## 1. Big picture

```
Landing  →  Onboarding (4 steps)  →  Workspace  →  [Start interview]  →  Interview  →  Report
              goal · direction · story · review          (creates a server session)
```

- The app is one React component with a `view` string. There is **no URL routing**. The browser URL never changes, back/forward leave the app, and a reload always returns to the landing page.
- There are **no accounts**. Every request carries `X-Dev-Workspace: dev`, so everyone shares one workspace.
- Only **role** and **industry** ever reach the server. Everything else collected in onboarding lives in React state and is lost on reload.

### Views (`type View`)

| Group | Views |
|---|---|
| Public | `home` (the landing page) |
| Onboarding | `goal` → `direction` → `story` → `review` |
| Workspace (sidebar) | `workspace` (Overview), `stories`, `interviews`, `roles`, `roleReview`, `reports` / `report`, `profile`, `settings` |
| Interview | `interview` |

---

## 2. Entering the app

| From | Action | Result |
|---|---|---|
| Landing (header or hero or closing button, labelled "Start with one moment") | click | `go('goal')`. Onboarding step 1, **not** a moment-entry screen |
| Anywhere in onboarding | click the MIRROR logo | back to Landing (state kept) |
| Workspace sidebar | click the logo | back to Landing |
| Settings, "Reset" | confirm dialog | clears goal, story, answers, role, session, reflection, `sessionStorage`; returns to Landing |

On every page load, if `sessionStorage['mirror.phase1.sessionId']` exists, the app silently calls `GET /interviews/:id` and restores `role`, `industry`, `answers`, `currentQuestion`, `reflection`. It does **not** change the view and does **not** offer to continue (see section 9).

---

## 3. Onboarding, screen by screen

A step indicator shows `01–04` with a bar at `step × 25%`. The logo returns to Landing.

### 3.1 Step 1: Goal (`view = 'goal'`)

- Title: "What brings you to MIRROR?" Four single-select cards:
  1. Prepare for an interview
  2. Communicate with clarity
  3. Understand my strengths
  4. Build quiet confidence
- Side panel: orb, "No perfect answer needed.", "No scores during setup".
- **Continue** is disabled until a card is chosen. On click it sets `directionReturn = 'review'` and goes to `direction`.
- **Skip for now** goes straight to `workspace`. Goal stays empty and no direction or story is collected. Defaults remain: role `Product Analyst`, industry `Technology / SaaS`, timing `2–4 weeks`.
- The chosen goal is used in exactly one place: a label on the review screen. It affects nothing else.

### 3.2 Step 2: Direction (`view = 'direction'`)

| Field | Control | Default | Required | Sent to server |
|---|---|---|---|---|
| Target role | select: Product Analyst, Product Manager, Software Engineer, Data Analyst, UX Designer, Consultant | Product Analyst | yes (cannot be blank) | **yes** (`role`) |
| Industry or company type | select: Technology / SaaS, Financial services, Healthcare, Consumer / Retail, Other | Technology / SaaS | labelled optional, but always has a value | **yes** (`industry`) |
| When is your interview? | segmented: Within a week, 2–4 weeks, No date yet | 2–4 weeks | yes | no |
| Job description | textarea | empty | optional | **no** (uncontrolled input, value is never read) |

- Preview card shows the role and industry plus three fixed tags (Ownership, Decisions, Impact).
- **Back** goes to `directionReturn`. First time through this is `'review'`, not `'goal'`. **Continue** goes to `story`.

### 3.3 Step 3: Story (`view = 'story'`)

- "Tell us about something you're proud of." Three prompts: What was happening? What did you do? What changed?
- One textarea (`story`) with a character counter.
- Three exits:
  1. **Review my profile**: needs `story.trim().length ≥ 20`. Otherwise a toast: "Write at least a sentence, or choose the guided interview instead." Valid goes to `review`.
  2. **Not ready? Start with a guided interview**: calls `startInterview()` immediately. Skips the review step and has no minimum length.
  3. **Back**: goes to `direction`.
- **Voice preview toggle** ("Prefer speaking? Preview voice mode") flips `voiceMode` and shows a toast. The toast text says speech transcription "is not connected", which is out of date because the voice server exists. `voiceMode` then persists and silently makes the later interview start in voice mode (see 5.2).
- The story text is stored only in React state. It is **not** sent to the server and the interview questions do not use it.

### 3.4 Step 4: Review (`view = 'review'`)

- "A place to begin. Not a verdict."
- Four cards: Goal (Edit goes to `goal`), Direction (Edit goes to `direction`), Story bank ("N story started", Edit goes to `story`), Readiness ("Not assessed yet").
- **Back** goes to `story`. **Enter my workspace** goes to `workspace`. No interview is started here.

---

## 4. Workspace and every way to start an interview

Workspace layout: sidebar (Overview, My stories, Interviews, Role history, Reflections, Settings, Profile) plus a header with a "DEMO" badge. Overview shows a welcome line, a hero card with the main button, three status cards (Direction, Story bank, Readiness) and a next-step card.

`completed` (drives wording across the app) is computed as:
`answers.length === 4 && assessedRole === role && sessionId` is set.
Changing the role afterwards makes `completed` false even though a report exists.

### All entry points to `startInterview()`

| # | Where | Control |
|---|---|---|
| 1 | Onboarding step 3 | "Not ready? Start with a guided interview" |
| 2 | Overview hero | "Start first reflection" or "Practise again" |
| 3 | Overview readiness card | "Begin practice" (when not completed) |
| 4 | Overview next-step card | "Practise again" (when completed) |
| 5 | Interviews page | "New reflection" and "Start conversation" |
| 6 | Reflections page, empty state | "Start first reflection" |
| 7 | Role review page | "Practise this role" (sets `role` to that role first, then starts) |
| 8 | Report page | any "practise again" style button |

Other workspace pages (My stories, Role history, Profile, Settings) are mostly **local demo screens**. Role history contains two hard-coded fake roles (Product Manager, Business Analyst) with invented session counts and readiness ranges. The profile is hard-coded as "Alex Morgan". "Prepare a new role" goes to `direction`, then forces the story and review steps again (`directionReturn` is still `'review'`).

---

## 5. Starting the interview

### 5.1 `startInterview(roleName)` step by step

1. Guard: ignored if `busy`.
2. `busy = true`, `flowState = 'starting'` (label "Starting your interview…").
3. Client reset: `questionIndex = 0`, `answers = []`, `assessedRole = roleName`, `answer = ''`, `orb = 'thinking'`, `reflection = null`, `sessionId = null`.
4. `POST /interviews { role, industry }` with header `X-Dev-Workspace: dev`.
   - Server validates (role 1–120 chars after trim, industry ≤ 120), creates the row with `status = 'in_progress'` and `askedQuestions = [OPENING_QUESTION]`, and returns the serialized interview (201).
   - Opening question is always the same constant: "Tell me about a project or moment at work that you're genuinely proud of."
5. On success: store `sessionId` (also in `sessionStorage`), `currentQuestion = session.currentQuestion`, `questionIndex = 0`, `flowState = 'idle'`, `orb = 'speaking'`, `go('interview')`.
6. If `voiceMode` is on (set earlier on the story step or via the mic button), also call `voice.start(session.id)`. If that returns false: toast "Voice is unavailable — type your answer instead."
7. On failure: `flowState` is set by `classifyApiError`, toast "Could not start the interview. The practice server did not accept the request." The user **stays on the page they clicked from**, there is no retry UI, and the orb state stays `'thinking'`.
8. `finally`: `busy = false`.

### 5.2 Entering the interview screen

On `view = 'interview'` an effect calls `GET /interviews/:id` and re-syncs `answers`, `questionIndex`, `currentQuestion`; if the server says `pendingFollowUp`, sets `flowState = 'waiting_nim'`.

What the user sees:

- Header: "EXPERIENCE DEEP-DIVE", "Question {n} of 4", **End session**; progress bar.
- Orb with a state label: Ready for you / Listening (or "Listening preview" when voice is off) / Reflecting on your answer / MIRROR is asking.
- The current question as a large heading, and the hint "Take your time. Specific, honest detail is more useful than a polished answer."
- Composer: textarea (disabled while busy or waiting for the next question), **Speak** button, character count, **Send answer** (becomes **Complete reflection** on the last question).
- Footer note about audio and saving.
- If `voiceMode` was left on from onboarding, the **microphone permission prompt appears the moment the interview opens**.

---

## 6. Inside the interview: text path

`submitAnswer()`:

1. Ignored if `busy`.
2. No `sessionId`: `flowState = 'retryable_failure'`, toast "Start an interview before sending an answer."
3. `answer.trim().length < 20`: toast "Add a little more detail so MIRROR has something real to reflect on." (client rule; the server only rejects empty answers).
4. `busy = true`, `flowState = 'saving'`, `orb = 'thinking'`.
5. `POST /interviews/:id/turns { questionIndex, answer, transcriptSource: 'text' }`.

### Server turn rules (`addTurn`, in order)

| Check | Error | HTTP |
|---|---|---|
| interview missing | `interview_not_found` | 404 |
| status completed | `interview_already_completed` | 409 |
| status abandoned | `interview_abandoned` | 409 |
| empty after trim | `empty_answer` | 400 |
| already 4 turns | `interview_already_completed` | 409 |
| `questionIndex` < turns so far | `duplicate_question_index` | 409 |
| `questionIndex` ≠ turns so far | `out_of_order_question_index` | 409 |
| no question asked yet at that index | `followup_not_ready` | 409 |
| body invalid (index outside 0–3, answer > 10,000 chars) | zod validation | 400 |

`Idempotency-Key` header is supported by the server (cached response), but the client never sends one.

### After the answer is saved

- **Not the last question** (index 0–2): the server generates the next question and stores it.
  - With NVIDIA NIM configured: model-written follow-up based on role, industry and earlier turns.
  - Without it: fixed catalog: (1) "What was specifically yours to own, and what decision did you make?" (2) "What resistance or unexpected difficulty did you encounter?" (3) "What changed because of your work, and what would you do differently now?"
  - Response: `{ turn, nextQuestion, nextQuestionIndex, status: 'in_progress', saved: true }`.
  - Client: appends the answer, clears the textarea, shows the new question, `orb = 'speaking'`, `flowState = 'idle'`.
- **Last question** (index 3): the server marks the interview `completed` immediately, returns `nextQuestionIndex: null`. The client then runs `complete` and `reflect` (section 8).

### Failure branches

| Situation | Server response | Client behaviour |
|---|---|---|
| Follow-up provider fails after answer saved | 503 `followup_provider_unavailable`, body includes `saved: true` | Answer is added locally, toast "Your answer was saved. The next question is still generating.", `flowState = 'provider_unavailable'`, a **Retry next question** button appears (`POST /next-question`). The textarea is **not** disabled in this state, so a second submit at the stale index returns 409 `duplicate_question_index` |
| Any other error on save | various | `flowState` set by `classifyApiError`, toast "Your answer was not accepted. Nothing extra was stored." |
| Response has no `nextQuestion` but is not complete | n/a | `flowState = 'waiting_nim'`, textarea disabled, Retry button |

`classifyApiError`: code contains "unavailable" or 503 gives `provider_unavailable`; 400 with `invalid_*` or `empty_answer` gives `validation_failure`; 5xx, 409 or 502 gives `retryable_failure`; anything else gives `retryable_failure`.

Flow banner labels: Starting your interview… / Saving your answer… / Waiting for the next question… / Generating your reflection… / provider unavailable / retry later / reflection could not be validated.

### Leaving mid-interview

**End session** → `voice.stop()`, `voiceMode = false`, `POST /abandon` (errors ignored), `go('workspace')`. Server: 409 if already completed, otherwise `status = 'abandoned'`. Answers already saved remain in the database. The client keeps `answers` locally, but `completed` stays false.

---

## 7. Inside the interview: voice path

Entered by (a) leaving `voiceMode` on from onboarding, or (b) pressing **Speak** in the interview (`voiceMode = true`, `voice.start(sessionId)`; if there is no session: toast "Start the interview, then speak.").

### Client states (`useVoiceSession`)
`inactive → requesting_permission → connecting → listening ⇄ processing_speech → thinking → speaking → listening … → completed`, with `reconnecting` and `error` reachable from most states. The server owns the canonical state machine; the client mirrors it and adds `requesting_permission`.

### Sequence

1. **Mic permission.** Denied or unavailable: state `error`, `start()` returns false, toast "Voice is unavailable — type your answer instead.", the typing flow stays alive.
2. **Connect.** WebSocket, first message `hello { interviewId, token: 'dev', resumeSessionId? }`. Server checks: token present (`workspace_header_required`), valid hello (`invalid_hello`), per-IP rate limit of one hello per 5 s (`rate_limited`), interview exists (`interview_not_found`, not recoverable). Unreachable gateway: "Voice service unreachable — continuing with typing."
3. **`session_ready`** carries question index, count, current question.
4. **MIRROR speaks** the question (`question`, `tts_start`, audio, `tts_end`); orb = speaking. Mic is **half-duplex**: audio is not sent while the server speaks. The user can press **Stop speaking** (`interrupt`).
5. **`playback_complete`** → state `listening`. The user speaks; `partial_transcript` events appear as a live caption ("Listening: …").
6. **Finalize:** the user taps **Send spoken answer** (`finalize_turn`), or the server finalizes on end of speech. State `processing_speech`; STT final must arrive within 8 s (`stt_finalize_timeout`); empty result gives `empty_transcript`.
7. **`final_transcript`** → server submits it as a turn through the same `addTurn` rules (transcript source `voice`, no HTTP loopback). Then `turn_accepted` and either the next `question` or `completed`. Rejected turns get `turn_rejected`.
8. **Completed:** client runs `complete` then `reflect` and navigates to the report (section 8).
9. **Controls:** Mute/Unmute, Stop speaking, **Type instead** (`continueByTyping`, leaves voice but keeps the interview), **Reconnect** (shown when the error is recoverable).

### Voice limits and error codes
Per answer: 3 minutes (`turn_too_long`, "Spoken answers are limited to 3 minutes…"). Session: 30 minutes. Silence: 30 s idle, 60 s while speaking. Reconnect window: 60 s (`session_not_resumable` afterwards). Other codes: `stt_error`, `tts_error`, `stale_seq`, `stale_turn`, `invalid_frame`, `message_too_large`, `unknown_type`, `followup_not_ready`, `interview_already_completed`, `internal_error`, `silence_timeout`.
With no Sarvam keys the gateway runs in **mock** mode (health endpoint reports `voice.provider`).

---

## 8. Finishing: complete → reflect → report

1. `POST /complete`: needs 4 turns (`interview_incomplete` 409 otherwise, `interview_abandoned` 409); idempotent for completed sessions.
2. `POST /reflect`: re-checks 4 turns; **requires an LLM provider** (otherwise 503 `reflection_provider_unavailable`). Output is checked:
   - each evidence item's `turnId` must exist and its `quote` must appear verbatim in that answer; otherwise 400 `invalid_evidence_turn_id` or `invalid_evidence_quote` (client shows "could not be validated");
   - if there is no evidence, the numeric readiness range is dropped; a reversed range is swapped.
   - Result: `{ readinessLabel: emerging | solid | strong, readinessRange {low, high} | null, evidence [{turnId, quote, observation, competency}], focus, model }`.
3. Client success: `reflection` set, `go('report')`.
4. Client failure: `flowState` set, but it still does `go('report')`. The report shows "Your answers are saved." with a **Retry reflection** button (`retryReflection`, which repeats complete then reflect).

---

## 9. Gaps and findings that matter for a redesign

**Promise vs reality**
1. The landing page says "Start with one moment" and "only a moment is needed", but the app first asks for a goal, then a direction, then a story: three screens before any practice. Users who skip to the guided interview lose the story step entirely.
2. The moment the user writes in step 3 is **never used**. The opening question is a fixed constant and follow-ups only see role, industry and earlier answers. Goal, timing, job description and profile fields are collected but not sent anywhere, so they cannot personalise anything.
3. Landing copy says "no scores", but the product shows a readiness label and numeric range, "Readiness: Not assessed", and uses the words "reflection" and "evidence" throughout. The client also hard-codes "Question N of 4" and the server enforces exactly four questions, which the landing brief says not to mention.

**Navigation and state**
4. No routing: reload, back button and shared links do not work. Reloading mid-interview lands on the Landing page; the interview stays `in_progress` on the server, but no screen offers to continue it. Starting again always creates a **new** session.
5. Back from the Direction step goes to Review, not Goal, on the first pass.
6. `completed` depends on `assessedRole === role`: changing the role hides an existing report.
7. Only one session is tracked on the client. Past sessions, role history, story bank counts and the profile are partly hard-coded demo data ("Alex Morgan", fake PM and BA history).

**Interview entry and errors**
8. Failed start gives only a toast, no retry, orb stuck on `thinking`, user stays on the previous page.
9. `voiceMode` set on the story step (and its out-of-date "not connected" toast) silently makes the interview request the microphone on entry.
10. After a "saved but next question failed" error the composer stays enabled, so a resubmit gives a confusing 409. Client minimum (20 characters) and server minimum (non-empty) differ.
11. Reflection failure sends the user to the report page anyway, in a half-finished state.
12. The server last question marks the interview `completed` before the reflection exists. If reflection fails permanently the session is complete with no report.

**Platform**
13. No authentication: one shared `dev` workspace. Voice uses `token: 'dev'`.
14. The reflection step has no fallback without an LLM key, so the core payoff of the product depends on one provider.

---

## 10. Quick reference: state the client keeps

`view`, `goal`, `role`, `industry`, `timing`, `story`, `extraStories`, `answers[]`, `answer`, `questionIndex`, `currentQuestion`, `sessionId`, `reflection`, `assessedRole`, `flowState`, `busy`, `orbState`, `voiceMode`, `serverLive`, `directionReturn`, plus demo-only profile and settings fields. Only `sessionId` is persisted (in `sessionStorage`, per tab).
