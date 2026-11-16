## Graham

SEAT: Graham (Product and startups)
STANCE: Yes
OPTION SCORES: A 4/10 · B 7/10 · C 2/10 · D 4/10
PILLAR SCORE: 7/10 (Real demand and growth: the option you recommend, on your pillar alone)
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL: Ship B, and end every review on one next practice.
WHY:
1. They sat the practice to change one sentence. Sessions.tsx:124-126 renders the reflection as bare quotes, and Sessions.tsx:141 dumps every turn under the open list. The page can run long and still leave them with nothing to say differently tomorrow.
2. The piece that can cause another session is already small. Sessions.tsx:132-136 shows the suggestion and "Try it in a new practice." B makes that the single button, and puts two lines on each question: what worked, and what to strengthen. A session is a handful of answers (App.tsx:63 caps it at 4). That review is something they would miss.
3. "Launching teaches you what you should have been building." (S142) A renames the quote block and leaves the list and the detail both open. C returns the transcript and stops, so the next rep never starts. D already contains that button, and it still makes them read a pile.
THE RISK I SEE: When the reflection is missing, Sessions.tsx:142-149 is only "Write my notes," and B is an empty template. A keyword check for STAR will also scold a strong answer that never uses the word "situation."
WHAT WOULD CHANGE MY MIND: Watch one candidate. If they only reread their own answers, ship C.
WHAT I'D DO THIS WEEK: Cards with role, date, kind, and one line of focus. Open one review and hide the others. Per question, two sentences in their words. Say whether it was spoken or typed, and the length in words. Keep readiness off the screen. One button starts the next practice.
QUESTION FOR THE FOUNDER: After your last mock, which sentence did you actually change the next day?

## Sara

SEAT: Sara (Consumer product and brand from zero)
STANCE: Strong yes
OPTION SCORES: A 4/10 · B 8/10 · C 2/10 · D 1/10
PILLAR SCORE: 8/10 (Product love and self-funded growth: B)
CONFIDENCE: 4/5
RUIN RISK: possible
DOOR: two-way

THE CALL: Open one session as a review they could read to a friend: what worked, what to change, and one next practice.

WHY:
1. "I'm a product person who cares so deeply about how you feel." (S022). Sessions.tsx:126 prints bare quotes, then dumps every turn, with the list still open. A friend cannot repeat a drawer. The empty state at Sessions.tsx:92 leads with a chart icon, which promises a ranking this app said it would not make.
2. The text I want is specific. I heard what I actually said. The result was missing. Here is the one thing I will say tomorrow. Option B is that fitting room: compact cards, one session open, delivery in words, a named pattern, one button. A transcript is not 10x better than notes they already keep (S022).
3. Option A renames the quote block and leaves the pile. Option C stays private and does not get forwarded. Option D does not change the next rep. A softer heading will not save it (S007).

THE RISK I SEE: What to strengthen, on every question, feels like a teacher. One thing that worked, in their words, and one thing to try. Readiness numbers stay off the screen. One leak and the promise is the joke people repeat.

WHAT WOULD CHANGE MY MIND: Candidates already tell a friend the one change from this page as it stands. Then the fitting room is extra.

WHAT I'D DO THIS WEEK: Cards with role, date, kind, and one line. Opening one hides the pile: a short overview, each question with what worked and what to try, a delivery note in words, one named pattern, and one button named for the next rep. No chart.

QUESTION FOR THE FOUNDER: After your last practice, what sentence could you have texted, and is it on this page?

## Bezos

SEAT: Bezos (Strategy and decisions)
STANCE: Yes
OPTION SCORES: A 4/10 · B 8/10 · C 3/10 · D 2/10
PILLAR SCORE: 8/10 (Strategic fit and reversibility)
CONFIDENCE: 3/5
RUIN RISK: none
DOOR: two-way

THE CALL:
I'd ship B. Two-way door. Compose the review in the client from turns and reflection. Migrate only if the review cannot be honest without new fields (brief.md:15). A can work as a label fix. I still pick B. The candidate has to leave knowing what to say differently.

WHY:
1. Work backwards from the next morning, then from interview morning. The question is what to say differently. "Customer obsession is not just listening to customers. Customer obsession is also inventing on their behalf because it's not their job to invent for themselves." (S014) The transcript listens. The review invents on their behalf.
2. The open session has no split into what worked and what to strengthen, no delivery note, and no pattern across sessions (brief.md:34, Sessions.tsx:114-151). The first session sits open under the full list (brief.md:32). B uses cards and one review.
3. Readiness fields are on the type and must stay off the screen (brief.md:15, brief.md:34). A hides the number and leaves the loose review. C shows answers only. D leaves the quote dump.

THE RISK I SEE:
A STAR check can become a quiet score. Words only. If the reflection cannot fill what worked and what to strengthen without claims the candidate did not earn, stop. Do not store a grade.

WHAT WOULD CHANGE MY MIND:
Proof the reflection cannot support a per-question review without those claims. I would then ship cards, turns, and one next practice, and skip the STAR split until it is honest.

WHAT I'D DO THIS WEEK:
Cards: role, date, kind, one-line focus. One review: overview, each question in STAR words, spoken or typed plus length in words, one pattern sentence, one next-practice button. Hide readiness. No percentages.

QUESTION FOR THE FOUNDER:
After a practice, what one sentence should the candidate repeat the next morning?

## Buffett

SEAT: Buffett (Money and capital)
STANCE: Conditional yes
OPTION SCORES: A 6/10 · B 8/10 · C 5/10 · D 4/10
PILLAR SCORE: 8/10 (Downside and capital efficiency)
CONFIDENCE: 4/5
RUIN RISK: possible
DOOR: two-way

THE CALL:
Ship B only if readiness never reaches the screen. The review can be words. A number inside it wipes the words out. I hold the seat. I am not Warren Buffett. This is a prototype, so I am judging a leak in the drawer, not a payout.

WHY:
1. brief.md:34. readinessLabel and readinessRange sit on the reflection, and old CSS still styles a giant range. I found the fields at src/lib/api.ts:33-34. I found no screen that renders them today. They are a grade waiting on a class name.
2. A hides what is already hidden. C avoids a grade by dropping a reflection you already stored. D leaves the drawer shut. B is the week someone reaches for "solid" or a range because the field is sitting there.
3. "You only learn who has been swimming naked when the tide goes out." (S077) The tide is the new review. Build it in words, or do not build it.

THE RISK I SEE:
The number is not on this screen today, so this case is thinner than Targets. A STAR check still becomes a percent the week the page looks bare without a meter. The brief says not to invent a score from that check.

WHAT WOULD CHANGE MY MIND:
If B cannot be drawn without readinessLabel, readinessRange, a percent, or a chart, I switch to C. A plain transcript beats a handsome report card.

WHAT I'D DO THIS WEEK:
Compose the review from the turns and the written reflection. Do not pass readiness into the view. Do not mount the old range style on this page.

QUESTION FOR THE FOUNDER:
If the range showed for one afternoon, what would you tell the candidate who practiced because you promised not to score them?

## Elon

SEAT: Elon (First principles and execution speed)
STANCE: Conditional yes
OPTION SCORES: A 7/10 · B 4/10 · C 2/10 · D 2/10
PILLAR SCORE: 7/10 (Real constraints and execution speed)
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL:
Conditional yes on A. Delete the quote dump. Keep focus, the suggestion, and the one button. A STAR card review is a rebuild this page has not earned.

WHY:
1. The metric is one next practice. It already exists: `reflection.suggestion` and "Try it in a new practice" at `src/pages/Sessions.tsx:132`. Focus is the line above it at `src/pages/Sessions.tsx:130`.
2. "WHAT STOOD OUT" prints bare quotes and drops the observation at `src/pages/Sessions.tsx:126`. The observation sits on the object at `src/lib/api.ts:26` and never reaches the screen. Basically the quote list should not exist. "possibly the most common error of a smart engineer is to optimize a thing that should not exist." (S014) B adds an overview, a STAR split, delivery notes, and a pattern note around a suggestion you already store. A handful of answers becomes on the order of ten blocks.
3. Rows already show role, date, and the focus line at `src/pages/Sessions.tsx:104`. Cards do not change the next rep. Readiness stays off the screen. C deletes the suggestion along with the quotes, and you would add that line back the same day (S014).

THE RISK I SEE:
A, as written, only renames the quote block. A new heading on the same dump misses the cut. Leave `readinessLabel` in the type and off the page.

WHAT WOULD CHANGE MY MIND:
Someone who can read focus and suggestion and still cannot name the next practice. Then one observation line per answer, in words. Still no percent and no range.

WHAT I'D DO THIS WEEK:
Remove the blockquote list. Leave focus, suggestion, and the button. Keep the row list, one session open. Skip the STAR machine until this thinner review fails a real user.

QUESTION FOR THE FOUNDER:
If the suggestion is already the next rep, which new section changes what they say tomorrow?

## Wickman

SEAT: Wickman (Operations and scaling)
STANCE: Strong yes
OPTION SCORES: A 3/10 · B 9/10 · C 2/10 · D 1/10
PILLAR SCORE: 8/10 (Operational readiness)
CONFIDENCE: 4/5
RUIN RISK: none
DOOR: two-way

THE CALL:
Option B. Every finished session opens the same sections, in this order: overview, each question with what worked and what to strengthen in STAR words, delivery in words (spoken or typed, length in words), one pattern note, one next-practice button. Cards on the list. One review open. Readiness stays off the screen. That button hands off to the same owner as Today. You are one person.

WHY:
1. The review has no agenda. `Sessions.tsx:122-141` shows quotes, a focus line, an optional suggestion, then dumps every turn. If notes are missing, `Sessions.tsx:142-149` swaps in "Write my notes". Same session type, different page. "you entrepreneur and your team need to meet every week for 90 minutes same day same time same agenda start on time end on time" (S043)
2. List and review are both fully open. `Sessions.tsx:49` opens the first row by default and the detail sits under the list. One card open. One review.
3. A second report system is still in the CSS. `index.css:131` still styles a giant readiness range. Keep those fields off the screen.

THE RISK I SEE:
A STAR check that becomes a quiet score. Name a missing part in words ("no result yet"). If the keyword check is thin, say the part is unmarked. The last section is one button and one practice.

WHAT WOULD CHANGE MY MIND:
If turns plus the reflection cannot fill those sections without a new stored field. Then the migration is the To-Do, and I wait for it. Transcript-only puts you back as the person who explains every session. That is a no.

WHAT I'D DO THIS WEEK:
Write the section list once, as the only review component, and render every session through it. Empty sections stay, with a plain line, so the shape never changes.

QUESTION FOR THE FOUNDER:
Who owns the next-practice button when the reflection and Today disagree?

## Chair notes

See cruxes.json. Cards are verbatim from Round 1.
