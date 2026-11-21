# Brief: rebuild Targets like Interview Prep

21 November 2026 · Quick council

## The decision

Should the Targets feature be rebuilt in the style of the Interview Prep room (folder cards, each interview round a card that starts a live mock interview), and how far should the rebuild go?

## The business

MIRROR: candidate-side interview practice for data and analytics roles. Prototype, solo founder, privacy-first, interview answers are never scored (no grades, percentages, streaks or "x of y"). A "target" is one real job: company, role, pasted job description, optional interview date.

## What exists now

- Interview Prep (just shipped): pick one of four roles, then one folder card per round. Each card starts a live spoken or typed interview, opening with a question from that round. Content is static guides, generic to the role.
- Targets list: plain rows. Open one and you get a stage rail (Understand, Prepare, Interview day, Afterwards).
- Understand: skills read from the job description, lined up with the résumé (covered, partial, gap) with probe questions.
- Prepare: a rounds list built from the job (SQL, Python, tools, behavioural). Only the SQL round has its own room. Every other "Practise" button opens the same generic interview for the role. There is also "Rehearse a screening call" built from this job.
- Afterwards: debriefs, written for the SQL round only.

## Resources

One build pass, no new migration, no new public endpoint, no new dependency. Two-way door.

## Success

A candidate opens a target and sees the interview loop for that exact job as cards. Each round card starts a live interview that stays on that round and that job's skills and gaps. Nothing is scored.

## Options

- A: Rebuild fully. Targets become folder cards. A target opens to one folder card per round of its loop, each starting a round-specific live interview grounded in the job's skills and gaps. Understand and Afterwards stay as quiet panels.
- B: Restyle only. Folder cards for the list and the rounds. "Practise" still opens the same generic interview.
- C: Merge Targets into Interview Prep. A saved job becomes a custom role beside the four.
- D: Leave Targets as it is.

## Founder lean

Rebuild it like Interview Prep, with the live interviewer for each round.

## Assumptions

- The interviewer service can take a round name and a few of the job's skills as context without a server change (assumed).
- Candidates have one to three active targets at a time (assumed).
