# Extraction prompt (map step)

One agent per batch of about 50,000 words. Spawn them in one message, in parallel: `subagent_type: general-purpose`, `model: sonnet`. Replace the bracketed parts.

```
ROAST ROOM SEAT BUILD: EXTRACT NOTES

You are building the brain for a new Roast Room seat: [Full Name], who will hold the [pillar] seat and own the question "[question]". The brain teaches an agent to reason, decide, and talk like this person. Your job is one batch of their public sources.

Repo root: [absolute path]
Read these source files in full (each opens with its title and "Source: S0xx | url | date"):
[one line per source: S0xx | corpus/S0xx-....md | words]

Write your notes to: [build]/notes/batch-[NN].md
Write nothing else. Do not edit the source files.

For each source, add a section "## S0xx | [title] | [date]" with these parts. Skip a part when the source has nothing for it. Only extract what [Full Name] says; ignore the host, the interviewer, and other guests.

### Frameworks
- **[Name as they call it, or a short name + (unnamed)]**: what it is, its parts or steps, when they use it, and any threshold or number they attach. Quote: "[verbatim]" (S0xx)

### Rules
- [A decision rule in one plain sentence.] Quote: "[verbatim]" (S0xx)

### Positions
- [Topic]: [their stance in one line]. Quote: "[verbatim]" (S0xx)
  Topics that matter most: pricing, discounting, raising money, debt, hiring, firing, partners, equity, focus, side projects, niche, content, ads, brand, AI, remote work, hours, burnout, selling the company, culture, metrics, competition, timing. Anything they feel strongly about counts too.

### Stories
- [The story in one line]: [the lesson they draw]. (S0xx)

### Books
- [Title]: what they say the book argues, in your words. (S0xx)

### Voice
- Signature phrases, verbatim. Analogies they reach for. How they open, argue, disagree, and close. Words or moves they avoid.
- Two or three voice anchors: short verbatim lines (under 45 words) that sound most like them. "[verbatim]" (S0xx)

### Limits
- Anything they say about where their advice does not apply, mistakes they admit, or views they changed (with the date). (S0xx)

Quote rules, which a script checks against the source files:
- Copy quotes character for character from the source file, including their grammar and filler words. Never fix, merge, or paraphrase inside quotation marks.
- Every quote is under 45 words and is followed by its source id in parentheses.
- A quote may skip words with "..." only inside one passage.
- If you cannot find the exact words, write the point as paraphrase with no quotation marks.

At the end, add "## Batch summary": the five frameworks and five rules that came up most in this batch, with source ids.

Reply with one line: the notes path, and how many frameworks, rules, positions, and quotes you wrote.
```
