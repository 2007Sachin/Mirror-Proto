## Graham

SEAT: GRAHAM (product and startups)
STANCE: Conditional yes (on A, shipped as the interview change first and the restyle second)
OPTION SCORES: A 7/10 · B 2/10 · C 3/10 · D 4/10
PILLAR SCORE: 6/10
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL: Do A, but treat it as an interview change, not a redesign. A round card that starts an interview that stays on that round, that job's skills and that job's gaps is the product. Folder cards are packaging.

WHY:
1. The thing a candidate wants is a practice session that sounds like their actual job. Today every "Practise" button except SQL opens the same generic interview, so the screen promises a job-specific loop and delivers a generic one. Fixing that is making something people want. "Startups are as impersonal as physics. You have to make something people want, and you prosper only to the extent you do." (S092) B is the playing-house version (S080, S092): it changes how the product looks and not what it does. I score B at 2.
2. This is cheap and reversible: one build pass, no migration, no endpoint, no dependency. So launch it and let users steer. "Launching teaches you what you should have been building." (S142) The work to do by hand first is to pick one non-SQL round, such as behavioural, wire the round name and two or three gap skills into the interviewer, and see whether the first question lands. If it does, repeat it for the other rounds.
3. The numbers are small. The brief says one to three active targets, and I assume 4 to 5 rounds each, so 4 to 15 cards. Quality per card matters more than the card grid. The right metric is the share of candidates who finish a round-specific interview and come back for a second round on the same target. The brief has no usage numbers at all, and my 6/10 on demand reflects that.

THE RISK I SEE: The interviewer ignores the round and skill context. The brief assumes it can take both with no server change, but that is unverified. If it can't, A becomes a restyle with nicer labels, which is B. You would then have spent the one build pass on what I scored 2.
WHAT WOULD CHANGE MY MIND: If the interviewer cannot keep to a round and a job's skills, I drop to B/D and fix the interviewer first. If real candidates show no repeat use of the existing Targets, I'd back C, since a smaller surface is cheaper to keep.
WHAT I'D DO THIS WEEK: Hand-wire one non-SQL round (behavioural) with the round name plus two or three gap skills, run five real mock interviews on it, and read the transcripts before building any other card.
QUESTION FOR THE FOUNDER: How many real candidates have used Targets in the last four weeks, and what did the ones who came back do there?

## Bezos

SEAT: BEZOS (strategy and decisions)
STANCE: Yes
OPTION SCORES: A 7/10 · B 3/10 · C 3/10 · D 2/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Option A, with a variant: prove the one assumption first (the interviewer takes a round name plus a few job skills as context), then build the round-specific cards in the single pass.

WHY:
1. Sort the door first (Type 1 and Type 2 decisions, S063). One build pass, no migration, no endpoint, no dependency. Nothing is stranded if it fails. "Type 2 decisions can and should be made quickly by high judgment individuals or small groups." (S063) One owner, move.
2. Build on what won't change (S010). A candidate will always want to practise the exact loop of the exact job they are about to face. Nobody will say "I wish the practice were more generic." B fails this test: it restyles a button that still opens the same generic interview. It is a cosmetic fix to a product promise. C throws away the one thing that is specific to Targets, the job description, by turning it into a fifth "custom role".
3. Controllable inputs, not optics (S052). The input I control is "does the round card stay on that round and that job's gaps." That is the success line in the brief. Folder styling is optics. Round grounding is the product. Assuming 1 to 3 active targets and about 4 rounds each, that is at most 12 cards, a small enough set to hand-check.

THE RISK I SEE: A fake two-way door. The code is reversible, but a solo founder's weeks are not. If the interviewer cannot hold a round context without a server change, "one pass" becomes a multi-week detour, and A quietly collapses into B plus a polished rebuild nobody asked for.
WHAT WOULD CHANGE MY MIND: If a quick test shows the interviewer drifts off the round or ignores the supplied skills in more than about 3 of 10 sessions, I move to B and fix grounding first. If real users average more than 3 active targets, I would also reconsider the card layout.
WHAT I'D DO THIS WEEK: Run 10 live interviews with a round name and 3 skills from one real job, passed as plain context, and read every transcript for round discipline. Build only if it holds.
QUESTION FOR THE FOUNDER: How many candidates have opened a target and hit "Practise" in the last 30 days? That tells me whether the problem is the generic interview or whether people never reach Targets at all.

## Musk

SEAT: MUSK (first principles)
STANCE: Conditional yes (A, trimmed)
OPTION SCORES: A 7/10 · B 3/10 · C 2/10 · D 2/10
PILLAR SCORE: 8/10
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Build A, but delete the restyle work. Ship round-specific interviews first, and use folder cards only where they carry a round.

WHY:
1. The goal in physical units is one number: rounds that open a live interview staying on that round and that job's skills and gaps. Today that is about 1 round of roughly 5 (SQL only). Every other Practise button opens the generic interview. Option B changes the look and leaves that number at 1 of 5. "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014) A prettier generic Practise button is that error.
2. Delete before building (The algorithm, S014). Candidates have 1 to 3 targets (assumed), so the list needs no restyle and plain rows are fine. Understand and Afterwards stay as they are, as the brief already says. Option C deletes a distinction that carries the value, because a job's skills and gaps are what make the interview specific. It also adds a custom-role system to build.
3. The limiting factor is whether the interviewer takes a round name plus about 3 skills without a server change. That is an assumption in the brief, so verify it first (Tackle the limiting factor, frameworks 2). If it holds, the work is one wiring change repeated across rounds, which is cheap. I'd put 70% on it holding. If it fails, A grows past one build pass and I'd drop to a one-round slice.

THE RISK I SEE: The assumption is wrong. The service ignores the context, or a "round-specific" interview comes out generic with a card on top. That is B again, just with more code.
WHAT WOULD CHANGE MY MIND: Finding that the interviewer needs a server change (the brief rules this out), or that 3 skills of context don't visibly change the opening question across 5 test runs. Either one moves me to B, as a stopgap.
WHAT I'D DO THIS WEEK: Wire one non-SQL round, behavioural, to pass the round name and 3 skills from a real job. Run it 5 times and check that each opening question names the round and a real skill. Failure here hurts no customer. If it passes, copy the wiring to the other rounds.
QUESTION FOR THE FOUNDER: Which number in this plan do you think is wrong? And how many of your candidates' targets would have a real round list after the job parse, versus the generic four?

## Buffett

SEAT: BUFFETT (money and capital)
STANCE: Conditional yes (on a variant of A)
OPTION SCORES: A 6/10 · B 5/10 · C 2/10 · D 4/10
PILLAR SCORE: 7/10
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL: Do A, but ship it in slices: round cards on the Prepare stage first, leave the working SQL room and the screening rehearsal untouched, and keep the old Practise path alive until the new one passes.

WHY:
1. Cash math. The brief gives one build pass, no migration, no new endpoint, no new dependency. The cash out is one pass of the founder's time. I assume 1 to 3 targets per candidate, so the user count is small and the stakes are low. Ruin is off the table, so I concede that inactivity is not a religion here. My translation of the birds-in-the-bush test: "all investing is, is laying out cash now to get more cash back at a later date. Now, the question is how much do you get back, how sure are you of getting it, when do you get it?" (S011). The bird in the bush is a round that stays on this job's gaps. That is the product's real edge over generic Interview Prep.
2. B is a gruesome business. It spends the pass and ships the look without the substance. "Practise" would still open the same generic interview. That is paint on the barn (my translation of the moat test, S005).
3. C narrows the moat. Merging a saved job into the four static roles throws away what only Targets has, the job-specific skills and gaps. Moat test: "Every business that we look at we think of as an economic castle." (S005). Do not fill in that moat.
4. The dollar-retained test: "The test about whether to pay dividends is whether you can continue to create more than one dollar of value for every dollar you retain." (S010). The pass pays back only if it beats the second-best use of the same effort, so D is the bar. D is the benchmark, not a villain.

THE RISK I SEE: Breaking flows that work today: the SQL round room, the debriefs, the screening rehearsal. A full rewrite is the swimming-naked risk. Also, the feature rests on an unverified assumption, that the interviewer takes round and skill context with no server change.
WHAT WOULD CHANGE MY MIND: If one round card cannot hold to its round and skills in a test, say 5 of 5 sample runs staying on topic, I drop to B. If the interviewer needs a server change, A is not one pass and I back D.
WHAT I'D DO THIS WEEK: Spend an hour testing the one assumption. Feed one real job, a round name and three skills into the interviewer and read what comes back.
QUESTION FOR THE FOUNDER: How many real candidates open a target today, and do they ever use the non-SQL Practise buttons?

## Chair notes

**Cruxes.**
1. Can the interviewer stay on a round and the job's skills without a server change? All four seats rest their yes on this, and all four called it unverified. The Chair checked the code. A practice interview carries only a role string (`server/app.ts:307-311`; follow-ups read `interview.role`). The round name can ride in that string, as Interview Prep does today. The job's skills reach only screening calls, through `targetId` (`server/app.ts:283-292`), which builds a fixed question list. So a round-specific opener can be built in the browser from the job's skills and the existing probe questions, but follow-ups would not know the skills unless the practice route also accepts `targetId`. That is a small server change, not a new endpoint or migration (`targetId` is already in the schema and on the interview).
2. Slice or full rebuild? Buffett wants slices with the old paths kept. Musk wants no restyle work beyond cards that carry a round. Graham wants the interview change first, packaging second. Bezos wants the assumption proven before building.
3. Is anyone using Targets at all? Every seat asked the founder. Nobody has numbers. Graham would move to C and Bezos to reconsider if use is low.

**Unanimity check.** Every seat's top option is A, and the scores sit within 1 point (7, 7, 7, 6). Per the rules, the strongest unargued alternative is D, "leave Targets as it is": no seat argued it at full strength, and Buffett named it the bar A must clear. In Round 2 Buffett and Graham must argue D and C at full strength.

**Format.** All four cards followed the format. Quotes carry source ids and will be checked at the end.
