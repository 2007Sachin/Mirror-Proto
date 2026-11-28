# Brief: a new landing page for MIRROR built around its moat

Mode: quick council, four seats (Hormozi 3, Blakely 3, Graham 2, Buffett 2), Rounds 1 and 2, Round 3 only if the scores do not converge. Run on 17 November 2026 for Sachin Kumar, founder of MIRROR.

## THE BRIEF

**Decision:** Sachin saw hiringant.ai (an AI job-search platform) and wants "a similar kind of landing page, with our moat", but not its colour palette or look: "be creative". What should MIRROR's landing page say, show and sequence, and what is the moat it should be built around?

**What HiringAnt's page does (for the kind of structure, not to copy):** a conversational hero ("Stop searching for jobs. Let jobs find you.") with two calls to action and an animated résumé-upload mockup showing match scores; a latest-jobs block; a three-step "AI Job Search" explainer; a "by the numbers" stats strip; a Job Agents block with an alert mockup; free tools (résumé builder, AI mock interviews that **score answers on four skills**); a Free versus Pro comparison table; eight testimonials; a job-board search; app and employer banners; a plain-text "what is" block; a huge link footer. Tone: confident, upbeat, free-tier led, a playful mascot. Its centre of gravity is job search and employer screening; the mock interview is one free tool among many.

**What MIRROR is:** candidate-side interview practice for data and analytics roles, pre-beta, invite-only beta next, one founder, no revenue, a handful of testers (assumed). What exists today: a live voice or text interview with a Director that never repeats a question and reads the candidate's target; Targets (paste a job description, Scout reads it, then a résumé match shows which skills the résumé backs, partly backs, or does not show yet, with a probe question for each gap); a Today page with one next step; Stories (a reusable bank, with the theme gaps shown); spaced replay; an SQL practice Journey in the browser; a screening-call simulator; Sessions where the learner says an answer again and sees what improved. House rules: **never scored, no percentages, no streaks**, calm tone, **audio is never stored by MIRROR, answers are private to the account, nothing is shared with employers, delete everything any time** (with an export). Honest limits: the live nudges (pause and ramble reactions) run in shadow mode for now; the interview is text or voice; Sarvam speech; the first beta is invite-only; auth is email magic link.

**The current landing page** (`src/pages/Landing.tsx`, calm Apple-like glass, one blue accent): "You know what you did. Saying it is the hard part." Sections: the problem, "like a video call with someone who listens", "start small, it builds from there", "the notes only use what you said", "practice, not a performance review", "private by design", FAQ, a close.

**Candidate moats to test (the council decides which are real):**
1. **Not scored, on purpose.** Practice without being judged; trust and psychological safety for nervous candidates. Competitors score you.
2. **Private by design.** Audio never stored, nothing shared with employers, delete and export in one place.
3. **The loop around one specific job.** Target (the job description) to résumé gaps to the questions you are asked to the replays and stories you build, so practice is shaped by the job you are chasing, not a generic question list.
4. **A live interviewer that listens and does not repeat** (the Room; honest about its stage).
5. **Data-role depth:** in-browser SQL practice, a journey, and answers about your own numbers.

**Options:**
- **A. Moat-first story page.** A HiringAnt-style rhythm (hero with a product mockup and two calls to action, a three-step flow, feature blocks, a comparison, proof, FAQ, close) but built around "what only MIRROR does": the not-scored, private, one-job loop. A distinct visual identity.
- **B. Feature-parity page.** Match HiringAnt's breadth in copy and sections (jobs, résumé builder, agents, stats, testimonials).
- **C. Keep today's calm page and polish it.**
- **D. Demo-first page.** The hero is a real, tiny try-it (a live practice question with no signup) with the moat story below it.

**Constraints:** pre-beta with no real testimonials, no real user numbers and no revenue, so the page cannot invent proof; every claim must be literally true of the product (the privacy audit is in docs/PRIVACY-AUDIT.md); house rules (no scores, percentages, streaks); one founder, a few days to build; invite-only beta, so the call to action is "request access" or "start with one question", not a free-tier funnel; calm but distinctive design, not a copy of any competitor's palette, mascot or layout.

**Success looks like:** a visitor who is a nervous data-role candidate understands in 10 seconds what MIRROR does and why it is different (it will not score you, it is private, it prepares you for the job you are after), and the first button leads to starting.

**Which way the founder is leaning:** a page of the same kind as HiringAnt's, built around MIRROR's moat, in a creative look of its own.
