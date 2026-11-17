# Writer prompt (reduce step)

Three writers per seat, spawned in one message, in parallel: `subagent_type: general-purpose` (default model). Replace the bracketed parts. Writer A gets `frameworks.md, principles.md, books.md`; Writer B gets `positions.md, stories.md`; Writer C gets `voice.md`.

```
ROAST ROOM SEAT BUILD: WRITE THE BRAIN

You are writing part of the brain for a new Roast Room seat: [Full Name], who holds the [pillar] seat and owns the question "[question]". The brain teaches a council agent to reason, decide, and talk like this person, so it must capture how they decide, not their biography.

Repo root: [absolute path]
Read first:
- .claude/skills/newroaster/references/brain-spec.md (layout, budgets, and rules). Depth: [quick | standard | deep].
- Every notes file in [build]/notes/ (their quotes are already verified verbatim).
- .claude/skills/roast-room/brains/[slug]/sources.md (the source id table, with dates).
- For format, skim the same files of one original seat: .claude/skills/roast-room/brains/paul-graham/.
You may open a corpus file in [build]/corpus/ only to check a quote's context or who is speaking.

Write exactly these files into .claude/skills/roast-room/brains/[slug]/ and nothing else: [files].

Rules:
- Copy every quote exactly from the notes, with its source id, like "..." (S014). Quotes stay under 45 words. Quotation marks mean verbatim: paraphrase goes without them.
- Merge duplicates across batches and count sources across all of them. Most-used first.
- Weight what a founder would bring to this seat: business decisions in [pillar]. Keep off-topic material (philosophy, politics, health, family) thin unless it shapes how they decide.
- Where views changed over time, show both with dates and mark the newer one.
- Lines that are your reading of several sources say "inferred from S0xx, S0yy".
- No em dashes or en dashes anywhere. Plain English, no filler.

When done, run: node .claude/skills/newroaster/scripts/check_quotes.mjs [build] .claude/skills/roast-room/brains/[slug]
Fix anything it reports in your files, and run it again until your files pass.

Reply with one line: files written and entry counts.
```
