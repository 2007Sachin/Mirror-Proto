# MIRROR: Product Requirements Document

**Product:** MIRROR, an interview-preparation product
**Document type:** Product PRD (the what and why, not the how)
**Audience:** product owner and non-technical stakeholders
**Status of the product:** working prototype, demo mode, one workspace. Section 14 says exactly what is real today and what is not.

---

## 1. Summary

MIRROR helps people get ready for job interviews by making them **practise out loud and on real problems, then telling them plainly what landed and what to work on next.**

It started as "paste a job description and your resume, get questions". That is easy to copy and not enough. The product direction is to become the **one place** a candidate prepares: it learns who you are, knows the role you are going for, guides you day by day, and covers the whole interview: spoken answers, technical skills (SQL first, then Python and statistics), case thinking, and timed mock rounds.

**The one-line promise:** *"Walk in knowing what you will say, and having already done the hard parts once."*

**What exists today:** a landing page, a first-interview onboarding, a daily home screen ("Today"), a spoken or typed interview room, targets for specific jobs, and a practice hub. SQL practice is built deeply, as a guided, game-style journey with animated lessons, about 440 write-a-query questions, 68 concept questions and timed mock tests.

---

## 2. The problem

Interview candidates, especially for data, analytics and product roles, hit the same walls:

1. **They practise alone and blind.** Nobody tells them whether their answer was clear, too long, or missed the point. Reading sample answers feels like preparing and is not.
2. **Prep tools are scattered.** Coding sites for SQL, flashcards for concepts, a friend for mock interviews, a notes doc for stories. There is no single plan and no sense of "am I ready?"
3. **Technical practice does not teach the idea.** Question banks check whether the query returned the right rows. They rarely show why it works or why a classic trap catches people (NULLs, join duplicates, ties).
4. **Nothing is specific to the target job.** Generic questions waste scarce time when an interview is a week away.
5. **Motivation drops.** Prep is lonely and open-ended. People quit after a few days because there is no visible progress and no guide.

**Who feels this most:** career changers, recent graduates, and mid-level people interviewing for roles where a live SQL or case round is common.

---

## 3. Vision and positioning

**Vision:** the ultimate stop for interview preparation. A candidate should never need a second tab to get ready.

**Positioning in one line:** *a calm, personal guide that listens to you practise, teaches the idea behind each question, and keeps you moving toward a specific interview date.*

**How MIRROR differs from what people use today**

| Alternative | What it does well | Where MIRROR is different |
|---|---|---|
| Coding-question sites (LeetCode, HackerRank style) | Large question banks, instant checking | MIRROR teaches the idea visually, guides the order, and ties practice to a target job and to spoken answers |
| SQL interview sites (DataLemur, StrataScratch style) | Realistic company-flavoured questions | MIRROR adds a guided route, animated explanations, timed mock rounds and coaching in one product |
| Mock-interview services and peers | Real human feedback | MIRROR is always available, private, and low-pressure for the first many reps |
| General AI chat | Flexible | MIRROR is structured: it remembers your story, your gaps and your date, and never just hands you answers |

*(Competitor descriptions are a general market view, not a verified feature comparison.)*

**Principles that shape every decision**

1. **Feels alive, like a guide.** The product speaks to you, remembers you, and always says what to do next.
2. **You do the thinking.** Predict first, say it in your own words, then see the answer. We teach; we do not hand out answers.
3. **Calm, plain language.** Short sentences. No jargon, no hype. The words "agentic", "evidence", "reflection" and "evaluation" never appear in the product.
4. **Honest progress.** Counts and coverage, never a fake "readiness score". We show what you have done and what remains.
5. **Never a dead end.** If an AI service is slow or down, the learner still gets a sensible next step.
6. **Privacy by default.** Spoken audio is not stored. Private notes stay private.
7. **One clear path.** Fewer choices, one recommended next step, everything else one tap away.

---

## 4. Users and their jobs

### Personas

**Asha, the career changer (primary).** Moving from operations into analytics. Knows Excel, new to SQL, nervous about live coding and about explaining numbers. Has 3 weeks. *Needs a clear route and visible progress.*

**Rohan, the near-grad.** Final-year student with project work but no interview experience. Struggles to tell his story. *Needs speaking practice and a first confidence win.*

**Meera, the mid-level analyst.** Already comfortable with queries. Targeting a stronger company with an onsite loop. *Needs hard patterns, timed mocks, and sharper answers, not basics.*

### Jobs to be done

- "Tell me where I stand and what to do **today**."
- "Let me **practise speaking** my answers and tell me honestly how they came across."
- "Teach me the **technical idea**, not just the answer, so I can handle a variation."
- "Make it feel like **the real round**: timed, no hints, then show me what I missed."
- "Aim everything at **this job** and **this date**."

---

## 5. The experience, end to end

1. **Land.** An animated landing page explains the promise in one screen. The orb, MIRROR's visual identity, is everywhere.
2. **The First Interview (onboarding).** There is no long form. In about five minutes the learner has three short moments: tell a story from work, answer one pressure question, and receive a first coach summary. They can speak or type, and a resume is optional. Out comes a first tailored practice question.
3. **Today.** The daily home screen. It shows the next best rep, the spoken-interview card with a coach's note, practice insights, the countdown to the next interview, and any session in progress ("Pick it up / Let it go").
4. **Practise.** Three kinds of practice, all reachable from Today:
   - **Spoken interview:** a voice-first room that feels like a call.
   - **Skills practice:** SQL (deep), Python, statistics and A/B testing, and a case simulator.
   - **Mock tests:** timed rounds with no hints.
5. **Learn from it.** After a spoken interview the learner gets notes: what landed, what to keep working on, a concrete suggestion. After a drill they see why the answer works and the common trap.
6. **Return.** Progress, XP and a gentle daily goal bring them back to Today, which always says what to do next.

---

## 6. Feature requirements

Status legend: **Built** (working in the prototype), **Partial** (works, with gaps stated), **Planned** (not built).

### 6.1 Landing page: **Built**

*Why:* the first impression must say "this is alive and different" in seconds.

- Animated, interactive page with the orb, a clear promise and one main action.
- Same light, calm visual style as the product.
- **Done when:** a first-time visitor can say in one sentence what MIRROR does and can start with one click.

### 6.2 The First Interview (onboarding): **Built**

*Why:* the old four-step form felt like paperwork. Starting with a real interview moment proves the value at once.

- Three moments: a story, a pressure question, a first coach summary.
- Text or voice at every step; resume is optional.
- Ends with a personalised first question and lands the learner on Today.
- **Done when:** a new user reaches their first practice question in under five minutes, with no form fields beyond the optional resume.

### 6.3 Today (home): **Built**

*Why:* people quit prep when they do not know what to do next. Today answers that every visit.

- **Next best rep:** one recommended practice item with a plain reason ("You have not tried SQL yet. This one is a gentle start").
- **Spoken interview card:** a coach's note and a one-tap start (speak or type).
- **Practice insights:** coverage of topics touched, first-try counts shown as "x of y", a calendar of days practised, a seven-day bar. No percentages, no readiness score, no streak counter that resets.
- **Target countdown:** days to the nearest interview, and what the target's job description asks for.
- **Resume where you left off:** an unfinished session appears with "Pick it up" and "Let it go".
- **Done when:** a returning learner can start the right next thing in one tap.

### 6.4 The interview room (spoken and typed): **Built**

*Why:* speaking is the hardest part to practise alone, and the part candidates get least feedback on.

- **Call-style layout:** a large orb in the centre, the question shown below it as MIRROR speaks, a live transcript as the learner speaks, and a chat-history panel on the right.
- **Speak or type:** a simple switch; if the microphone is blocked, a calm helper offers typing.
- **Coaching alongside:** a "what happened / what you did / what changed" checklist that ticks as the answer covers each, a pace readout, an answer timer. These are guidance, never a score.
- **Controls like a call:** mute, captions, repeat the question, send answer, **Continue later** (pause, resume from Today) and **End session** (asks first).
- **Drafts are saved** as you type; closing the page does not lose your answer.
- **Never auto-scored:** the learner is never told "6 out of 10".
- **Done when:** a learner can complete a 4-question spoken interview by voice or by typing, leave and come back, and end it without confusion.

### 6.5 Notes and coaching after an interview: **Built**

- Plain notes: what landed (with the learner's own words quoted), what to keep working on, one concrete suggestion for next time.
- Fed back into Today ("Your last interview: ...") and into the next question choice.
- **Done when:** the learner knows exactly one thing to change before the next attempt.

### 6.6 Targets and Scout ("the Loop"): **Built**

*Why:* the best prep is aimed. A learner with an interview date should practise what that job asks for.

- The learner adds a target (company, role, interview date, job description).
- **Scout** reads the job description and separates core requirements from nice-to-haves.
- A planner recommends the next step, naming the learner's weak area from recent practice.
- Today shows a countdown and what the target wants versus what the learner has practised.
- **Done when:** adding a job description produces a skills list and a recommended next rep within a minute.

### 6.7 Practice hub: **Built (SQL deep; others lighter)**

Four tracks: **SQL**, **Python** (runs in the browser), **Statistics and A/B testing**, and a **Case simulator**. Every attempt is recorded and feeds Today's insights. Python and statistics are lighter than SQL today (see 14).

### 6.8 SQL practice (the flagship track): **Built, with polish needed**

*Why:* SQL is the single most commonly tested technical skill in analyst and data interviews, and the one candidates most often practise badly.

**A. The Journey (default view).** One guided, game-style route instead of menus. Four worlds:
1. **Foundations:** tables, filtering, NULLs, grouping, joins, simple functions.
2. **Core patterns:** more joins, subqueries, CTEs, conditional counting, set operations.
3. **Interview staples:** window functions, top-N, median, overlaps, hierarchies.
4. **Senior patterns:** gaps and islands, sessions, retention, funnels, recursion, "all and every", trends.

Each world is a winding path of nodes: a lesson per topic, concept checkpoints, and a mock-test "boss" at the end. A short "Find your level" check opens the route. Nothing is locked; one node is highlighted as the recommended next step.

**B. Animated lessons.** Interactive "see it run" scenes: query execution order, NULL logic, joins (including how a join silently duplicates rows), GROUP BY, window functions, how an index speeds a search, normalisation, ACID transactions, and DELETE versus TRUNCATE versus DROP.

**C. A better question screen.** Each question is a full brief: the business scenario, the exact ask, the columns to return, what to watch for, the data tables. Learners can:
- **Predict first** (how many rows, how sure) before running;
- use a **hint ladder** (nudge, hint, show solution);
- **Watch their own query run** step by step on real rows, with rows fading out and joining visibly;
- see **what went differently** when wrong (missing and extra rows);
- jot a private "say why you wrote it this way" note and compare with the model reasoning.

**D. The question bank.** About **440 write-a-query questions** across Beginner, Pro and Advanced, all on one realistic company-and-shop database. This includes a rebuild of a 300-question public-style interview set in our own words. Each question names the interview pattern (for example "top-N per group"), where it usually appears (phone screen, onsite, take-home) and the interviewer's likely follow-up.

**E. Concept questions.** 68 explain-it questions (keys, constraints, normal forms, indexes, ACID, joins and NULL, commands and data types). Multiple choice with a short model spoken answer, the common trap, and the likely follow-up.

**F. Mock tests.** Timed rounds with no hints: Phone screen (30 min), Analyst onsite (45), Senior loop (60), Concepts round (15), or build your own. Questions are chosen to span topics and favour ones not yet solved. At the end: what was solved, what was not, time per question, the model solution, the follow-up, and which topics to revisit. No score.

**G. Gamification and the guide.** The MIRROR orb coaches at the top ("Next up is ... because ..."). XP for solved questions, levels from Rookie to Principal, a badge for finishing each world, 1 to 3 stars per lesson and a small daily goal ("Solve 3 problems today"). Rewards show points earned, never percentages, and there is no streak that punishes a missed day.

**Done when:** a beginner can follow the Journey from zero to a first mock test without choosing between menus, and an experienced learner can jump straight to Free practice or a Mock test.

### 6.9 Python, statistics and case practice: **Partial**

- **Python:** a small set of problems that run in the browser.
- **Statistics and A/B testing:** scenario questions with explanations.
- **Case simulator:** a business case on a small database where the learner investigates with queries.
- All of these feed Today's coverage. None yet has the guided Journey, animated lessons or question depth that SQL has.

### 6.10 Voice: **Built, needs real-world testing**

- Spoken questions and live listening, in a half-duplex style (MIRROR speaks, then listens). Without a configured voice service the product falls back to a safe mock.
- Audio is not stored.
- **Done when:** a learner on an ordinary laptop microphone can finish a spoken interview and the transcript is accurate enough to coach from. *(Real-microphone testing is still outstanding.)*

---

## 7. Content strategy

- **Source of questions:** public interview-prep material, books, question banks and guides informed the patterns. Every question in the product is **written in our own words** on our own data. We do not copy third-party text, and we never claim a question "was asked at" a named company.
- **Quality rules for every question:** an unambiguous brief (what one output row means, tie and NULL handling, ordering), a solution that is tested against the database, a named pattern, a hint that does not give the answer away, and a plain "why it works and the trap" note.
- **Honest data limits:** the practice database is a fixed snapshot (31 Dec 2025), so "last 6 months" has a stable answer. Where the sample data could not support a question's original idea, the question was reshaped and says so.
- **Concept answers are checked for correctness**, including engine differences (for example, whether TRUNCATE can be rolled back depends on the database).
- **Tone:** calm, plain, short.

---

## 8. Success metrics

*All targets below are proposed starting points for the owner to confirm, not measured results. The prototype has no real user data yet.*

**North star:** *Learners who complete at least three practice sessions in their first week.* It captures real habit, not sign-ups.

| Area | Metric | Proposed target |
|---|---|---|
| Activation | New users who finish the First Interview and start a first practice item in the same sitting | 60% |
| Activation | Time from landing to first practice question | under 5 minutes |
| Engagement | Learners practising on 3 or more days in their first 14 days | 40% |
| Engagement | Median practice items attempted per active week | 8 or more |
| Learning | Learners who solve a question first try in a topic after earlier failing it | rising week on week |
| Learning | Mock tests finished (not abandoned) | 70% of those started |
| Quality | Spoken sessions finished by the learner | 60% of those started |
| Quality | "This answer taught me why" micro-rating on drills | 4 out of 5 or higher |
| Trust | Reports of wrong or unclear questions | under 1 per 200 attempts |

**Guardrails (things we will not trade away):** no invented readiness score, no manipulative streak pressure, spoken audio never stored, no question shown without a tested solution.

---

## 9. Scope

### In the product now (MVP)
Landing page; First Interview onboarding; Today; the interview room (voice and text); notes after interviews; targets and Scout; the practice hub; SQL as a full guided Journey with animated lessons, about 440 questions, 68 concept questions and mock tests; XP, levels, badges and the guide.

### Next (proposed)
1. **Split the oversized SQL lessons.** A few lessons hold dozens of questions (one has 61, another 24). Break them into pattern-sized steps.
2. **Bring the Journey to Python and Statistics** so the experience is consistent.
3. **Behavioural interview library:** structured stories, "tell me about a time" packs, and answer shaping.
4. **Real accounts and saving across devices.**
5. **Adaptive practice:** replay what you got wrong after a gap, spaced over days.
6. **Share and review:** let a learner export a mock-test summary for a mentor.

### Later (ideas, not commitments)
Company-style packs with clearly-labelled sources; mentor or peer mock sessions; a mobile-friendly app; an employer or college version for cohorts.

### Not goals
- Guaranteeing a job outcome or giving a "you are x% ready" number.
- Replacing human mentors.
- Scraping or reproducing proprietary question text.

---

## 10. Gamification and coaching design (detail)

- **Why game elements at all:** prep is lonely and slow. Visible progress and a guide keep people returning.
- **What we use:** a route map, XP, levels, badges per world, stars per lesson, a daily goal.
- **What we avoid:** percentages, leaderboards, streak counters that reset, locking content behind levels, shaming language.
- **The guide:** speaks in plain words, always names the one next step and why, notices recent stumbles gently ("Window functions looked tricky last time, a quick replay will help"), and celebrates a finished world without fuss.
- **Levels:** Rookie, Query Cadet, Analyst, Senior Analyst, Data Detective, Interview Ready, Staff, Principal. Titles are playful but professional.
- **One recommended step at all times**; everything else is one tap away.

---

## 11. Principles for words and tone

- Short sentences, everyday words, no hype.
- Never the words "agentic", "evidence", "reflection" or "evaluation".
- Never a fixed question count in the copy ("a few questions", not "4 of 4").
- Say what happened, then what to do. Example: "Not yet. Your query returned 2 rows; the model returned 15."
- Mistakes are information, not failure.

---

## 12. Risks and how we handle them

| Risk | Why it matters | Mitigation |
|---|---|---|
| Voice quality varies by microphone, accent and noise | The spoken room is the signature feature | Always offer typing; show a clear helper if the microphone is blocked; test on real devices before launch |
| AI-generated coaching can be wrong or slow | Bad advice damages trust | Calm fallbacks that never dead-end; coach on the learner's own words; keep claims modest |
| Questions that are wrong or ambiguous | Teaches the wrong thing | Every solution is tested against the data; a "report a problem" path is planned; rewrite-in-own-words policy |
| Overwhelm: too many choices | Already seen in testing; caused the move to one Journey | Single recommended step; three top-level tabs only |
| Practice data does not look like a learner's real job | Weakens transfer | Realistic company and shop schemas; targets tie practice to the real job |
| Copyright and attribution | Using public question sets | Own wording only; no company claims |
| Only SQL is deep today | Uneven product feels incomplete | Bring Python and Statistics to the same level next |
| Prototype has no real accounts | Cannot test retention honestly | Accounts and persistence are the next foundation |

---

## 13. Open questions for the owner

1. **Who is the first customer?** Self-paying individuals, colleges and bootcamps, or employers? The answer changes pricing, onboarding and the roadmap.
2. **Business model:** free with limits, subscription, or per-cohort? (Nothing is built for payments.)
3. **Which role family first?** Data analyst, data scientist, product analyst, or all of them? This decides the next skills track after SQL.
4. **Depth versus breadth:** deepen SQL further, or bring Python and Statistics to the same standard first?
5. **Human involvement:** is a mentor or peer layer part of the vision, or is MIRROR deliberately self-serve?
6. **Gamification appetite:** are XP and levels enough, or do you want social features like friends and cohort boards? (Currently excluded to protect calm.)
7. **Markets and languages:** English only for now? Spoken practice in other languages is possible but untested.

---

## 14. Current build status (honest snapshot)

**Works and was checked in a real browser:** the SQL Journey screen (three tabs, coach strip, route map, node sheet), the guided question screen and the "watch your query run" explainer, the concept quiz question flow, the mock-test Phone screen start, the Relational-division lessons and questions, the interview room's Continue later and End session behaviour, and starting a spoken interview with a test microphone.

**Built but not yet looked at closely:** Free practice and Mock tests after the latest rewrite; worlds 2 to 4 of the Journey; the animated concept scenes; the mock-test results page; most screens at phone width; Python, statistics and case practice at the latest polish.

**Known gaps:**
- Some SQL lessons are far too large (one holds 61 questions, about 280 minutes).
- Roughly 60 or more of the rebuilt 300 questions were reshaped to fit the sample data, and about ten return a single row.
- Real-microphone voice testing has not been done.
- The product runs in a demo workspace; there are no real user accounts.
- Python and Statistics have no guided journey yet.
- Some copy and spacing are still being tuned.

**Quality checks in place:** an automated test suite (several hundred checks) covers the question bank (every solution runs and returns rows), the journey rules (XP, levels, stars, guide messages), and the database snapshot. These protect correctness, not the visual feel, which still needs human review.

---

## 15. Suggested roadmap

| Phase | Focus | Outcome |
|---|---|---|
| **Now: Polish** | Split big SQL lessons; check Free practice, Mock results and phone layout; fix visual rough edges | A SQL experience we are proud to show |
| **Next: Prove value** | Real accounts, a short beta with 20 to 50 candidates, measure the north star | First real data on activation and habit |
| **Then: Broaden** | Journey for Python and Statistics; behavioural story library | One product that covers the whole interview |
| **After: Personalise** | Spaced replay of weak spots; target-aware plans; shareable mock summaries | Prep that adapts to each learner's date and gaps |
| **Later: Grow** | Cohorts for colleges, mentor layer, mobile | New customer segments |

---

## Appendix A: Glossary

- **Orb:** MIRROR's animated visual identity and guide avatar.
- **Today:** the daily home screen.
- **First Interview:** the short, voice-or-text onboarding.
- **Target:** a specific job (company, role, date, description) the learner is preparing for.
- **Scout:** the feature that reads a job description and separates core from nice-to-have skills.
- **Journey:** the guided, game-style route through SQL practice.
- **World:** one stretch of the Journey (Foundations, Core patterns, Interview staples, Senior patterns).
- **Boss:** the timed mock test at the end of a world.
- **Concept question:** an interview question answered by explaining, not by writing a query.
- **Watch it run:** the step-by-step animation of a query on real rows.
- **Pattern:** a named kind of interview question, for example "top-N per group" or "gaps and islands".

## Appendix B: Where the working notes live

Supporting documents in this repository: the onboarding flow notes, the Loop and Practice contracts, the SQL curriculum roadmap, the 300-question topic map and the practice database guide.
