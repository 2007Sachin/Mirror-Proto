# Brief: the Stories page

16 November 2026 · Full council

## The decision

How should the story bank help a candidate walk into an interview with the right story for the role?

## The business

MIRROR. Stories are the candidate's own words, shaped as situation, task, action, result, tagged with themes (leadership, conflict, failure, ownership, ambiguity, influence, deadline pressure, data-driven decision, customer focus, learning, collaboration, mistake and recovery). `src/stories/themes.ts`. Prototype, never scored.

## Resources

One pass. Two-way door. Stories already store STAR fields, themes, an optional quote and source question (`Stories.tsx` editing model). Targets already have skills. Joining "which target needs which story" can be done in the client by theme and skill words. No migration unless a seat proves the join is dishonest without one.

## Success

Structured and useful: which themes are present and which are missing (named, not counted), whether each story has a situation, a task, an action, and a result (in words, not a percent), and which saved target still needs a story. Compact. Same type system as the other pages.

## Founder lean

Same standard as Sessions. He dislikes a loose bank. He wants theme coverage, STAR completeness, and which target needs which story. No "x of y".

## What the code does now

`src/pages/Stories.tsx`, CSS `src/pages/stories.css` (max-width 860px, generic borders, a green button `#2f6f5e` that no other page uses, `:8`).

- Header: "Story bank", "Real moments from your answers, ready to reuse." (`:84`).
- "Suggest a story": paste a question, button "Suggest" (`:87-96`). Results are title plus a reason. No link into edit.
- "Themes you have covered": every theme and a count, "No story yet" / "1 story" / "N stories" (`:12`, `:99-101`). That is a count column. Twelve themes, so the section is a long list.
- "From a past answer": pick a session, then an answer, "Save as a story" (`:103-111`). Draft uses `draftStory`.
- Editor: title, theme checkboxes, four text areas, Save / Cancel (`:113-124`).
- "Your stories": filter by theme, then every story printed in full (all four STAR parts, quote, question, Edit, Delete) (`:126-145`). Nothing says a part is missing. Nothing says which target would use it.
- Empty: "No stories yet. Save one from a past answer and it will show up here."
- Page does not load targets at all. `api.listTargets` is not imported.

## Options

- **A. Polish.** Drop the count column (name the missing themes only). Mark an empty STAR part in words. Keep the long list. Do not load targets.
- **B. Bank with a map.** Top: themes you can tell, themes you cannot, and for each saved target the story it can use or the theme it still needs. Stories are compact cards (title, themes, which STAR parts are still open). Click a card to edit. Suggest and "from a past answer" stay, quieter. No counts, no percents.
- **C. Editor only.** A list of titles and the form. Delete the theme section and the suggester.
- **D. Leave it.**

## Weights

| Seat | Weight | Why |
|---|---|---|
| Sara | 3 | A story is the thing the candidate is proud to say |
| Graham | 3 | The bank is useful only if it changes what they practise |
| Bezos | 2 | Work backwards from the question the interviewer will ask |
| Wickman | 2 | Same STAR shape every time, or the page drifts |
| Elon | 2 | Twelve counted rows is the thing to delete |
| Buffett | 1 | Counts here are the same reputation leak as grades |

## Assumptions

- A prepared candidate holds a handful of stories, not fifty (assumed).
- Theme-to-target matching by shared words is good enough for this pass (assumed). Say so if you think it will mislead.
