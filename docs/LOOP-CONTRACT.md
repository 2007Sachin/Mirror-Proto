# The Loop: slice 1 contract

Goal of this slice: **target with a job description → Scout builds the skill map and the rounds → a SQL round that runs in the browser with an interviewer → a debrief that updates the plan.**

Audience for v1: data and analytics roles. Technical rounds are text-first (the candidate writes a query; the interviewer discusses it by text). Python and tools rounds exist in the plan but are marked "Next" (not available yet). Do not fake them.

User-facing copy never uses the words "agentic", "evidence" or "reflection". "Evaluation" and "assessment" are fine. Agents are called by name only (Scout, Planner, Interviewer, Coach). Interview answers get an evaluation in levels with the learner's own words ("just starting", "clear", "strong"), never a number: no scores, no percentages, no pass or fail, no readiness verdict.

## Types (identical on server and client)

```ts
type SkillArea = 'sql' | 'python' | 'tools' | 'analytics' | 'behavioural'

interface Skill {
  name: string            // "SQL", "Tableau", "A/B testing"
  area: SkillArea
  weight: 'core' | 'nice' // core = appears 2+ times or under a "requirements" style heading
  quote: string           // VERBATIM phrase from the JD that justifies it (must be a substring of jd)
}

type RoundKind = 'sql' | 'python' | 'tools' | 'behavioural'

interface Round {
  id: string              // "sql" | "python" | "tools" | "behavioural"
  kind: RoundKind
  title: string           // "SQL round"
  why: string             // one plain sentence, built from the skills found
  available: boolean      // true for sql and behavioural, false for python and tools
}

interface AgentEvent {
  at: string              // ISO time
  agent: 'Scout' | 'Planner' | 'Interviewer' | 'Coach'
  text: string            // one plain sentence describing a step that REALLY happened
}

interface Debrief {
  id: string
  kind: 'sql'
  createdAt: string
  solved: number          // problems solved
  total: number           // problems attempted
  wentWell: string        // one sentence
  keepWorkingOn: string   // one sentence naming the gap still open
  suggestion: string      // one or two sentences starting with "Next time"
}

interface Target {
  id: string
  company: string
  role: string
  interviewDate: string | null   // YYYY-MM-DD
  jd: string
  status: 'scouting' | 'ready'
  skills: Skill[]
  rounds: Round[]
  events: AgentEvent[]           // oldest first; grows while status === 'scouting' and after debriefs
  debriefs: Debrief[]            // oldest first
  nextStep: string | null        // the Planner's one-sentence plan for what to do next
  createdAt: string
}

type TargetSummary = Pick<Target, 'id' | 'company' | 'role' | 'interviewDate' | 'status' | 'nextStep' | 'createdAt'>
```

## Endpoints (all need the X-Dev-Workspace header, like the rest of the API)

| Method + path | Body | Response |
|---|---|---|
| `POST /targets` | `{ company, role, interviewDate?, jd }` (company/role 1-120 chars, jd 20-20000 chars) | `201 Target` with `status: 'scouting'`, `events: []`. Scout then runs in the background and appends events as each real step finishes. |
| `GET /targets` | | `TargetSummary[]`, newest first |
| `GET /targets/:id` | | `Target` (the client polls this once a second until `status === 'ready'`) |
| `POST /targets/:id/sql-turn` | `{ problem: { id, title, prompt }, query, passed: boolean, error?: string, resultPreview?: string }` | `{ followUp: string }` the interviewer's one question about the candidate's approach |
| `POST /targets/:id/sql-debrief` | `{ attempts: { problemId, title, query, passed }[] }` (1-8 items) | `Debrief` (also saved on the target; adds Coach and Planner events and replaces `nextStep`) |
| `DELETE /targets/:id` | | `204` |

Errors use the existing shape `{ error: code }`. Unknown target: `404 target_not_found`.

## Scout (server, runs after POST /targets)

Real steps, each appends one event the moment it finishes (no artificial delays):
1. Scout: "Read the job description (N words)."
2. Scout: "Found N skills: SQL, Tableau, ..." (deterministic keyword extraction with a verbatim JD quote per skill; works with no model configured)
3. Scout: "Built N rounds from them."
4. Planner: one-sentence plan. Uses the model if configured (new onboarding step, falls back to a deterministic sentence). Becomes `nextStep`.
Then `status = 'ready'`.

## SQL round (client runs the SQL; server only talks about it)

The database lives in the browser (sql.js). Fixed schema and seed data, 4 problems, checked by comparing result rows. The server never sees data, only the query text, whether it passed and a short result preview.

## Design

Follow `.claude/skills/web-design-engineer/SKILL.md` (the Garden skill) as a quality bar, but the visual language is fixed: reuse the First Interview / Today palette (`.mirror-landing` tokens in `src/landing.css`: `--bg --ink --muted --accent --glass --glass-b --line --soft`, classes `.ml-glass .ml-btn .ml-btn--quiet .ml-eyebrow .ml-chip .ml-orb .ml-sr`). Light, calm, Inter. No new colours, no dark blocks. Look at `src/pages/Overview.tsx` and `src/pages/overview.css` for the current pattern.

## Ponytail rules (apply to all code)

Smallest complete change that fully solves the task. Reuse what exists (read the code first). No speculative abstractions, no config for values that never change, no extra files, no new dependencies unless named here. Deletion over addition. Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling. Non-trivial logic gets one runnable test. Match existing patterns (zod schemas, `AppError`, repo interface, `.mirror-landing` styles).
