# Live check: do round interviews stay on the round?

21 November 2026 · Condition 2 of the verdict. Run against a throwaway in-memory API with a synthetic job (Northwind, Senior Data Analyst), using the real interviewer model. No real user data.

## Setup

The practice route now keeps the job's id (`POST /interviews` with `targetId`). The Director reads that job's open gaps. Two changes came out of the first run:

1. With no résumé match, no gap rows exist, so the job's skills never reached the interviewer. The Director now falls back to the job's own skills.
2. A round started from a Target is named `<role> · <round title>`. The Director keeps only that round's skills (Behavioural, Python, Tools).

## Results

| Round | Opener | First follow-up, 5 runs | Four-turn conversation |
|---|---|---|---|
| Behavioural | Built from the core skill "Stakeholder communication" | 5 of 5 on topic | Stayed on stakeholders, the metric and the summary for leaders |
| Tools | Built from "Tableau" | 4 of 5 name the dashboard or Tableau, 1 generic | Drifted by turn 2 to "presenting to sales" and "non-technical audiences" |

The first follow-up always digs into the candidate's last answer, so it stays on topic by construction. The Director's skill candidates only appear when it moves on to a new question.

## Decision

- Behavioural: live. It meets the verdict's condition.
- Python and Tools: stay "Later" on the cards. They do not meet it. To turn one on, add its kind to `LIVE` in `src/targets/roundOpener.ts`.
- Next step for those rounds: make the interviewer's prompt weight the named round, not only the candidate's last answer. That is a prompt change in `server/providers/nim.ts`, not a route change.

## Not tested

Voice mode, real candidates, more than one job, and the 30-day usage count the verdict asks for.
