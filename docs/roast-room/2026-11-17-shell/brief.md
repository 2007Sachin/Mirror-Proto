# Brief: the shared shell

16 November 2026 · Full council

## The decision

How should the sidebar, header, profile footer, and Settings entry look and read, and what type and spacing system should every page share?

## The business

MIRROR workspace. Practice page interior is out of scope (leave it). Interview room stays. Landing page can keep its own marketing type. The signed-in app should feel like one calm product.

## Resources

One pass. Two-way door. Do not restyle Practice's drills. Settings and Privacy behaviour stay (export, delete, voice, calm motion). Profile today is local React state, not saved (`App.tsx:97-101`, the form at `:508`). Do not pretend it syncs.

## Success

One type scale and one spacing system on Today/Briefing, Targets, Sessions, Stories, Settings, and the shell. Full width used with a consistent page frame. Compact, not cramped. Professional labels. Sidebar shows the signed-in account. No "Today" if the Briefing council retires that word (this council may recommend the same shortlist: Briefing, Home, Overview).

## Founder lean

"Too much empty space, inconsistent fonts, looks half-written." He wants the full page width used sensibly, compact, minimal scrolling, not cluttered. One type scale. Vocabulary more professional. Settings link and profile footer are in scope.

## What the code does now

Shell is inline in `src/App.tsx:475-513` plus `.sidebar`, `.workspace-header`, `.workspace-content` in `src/index.css:113-119`.

- Nav (`App.tsx:475-481`): Today, Practice, Targets, Sessions, Stories. Settings is separate in the footer (`:483`). Order is not the candidate's path (practice sits above the job they are preparing for).
- Profile footer (`:483-485`): signed-in email, or "Demo workspace" / "View candidate profile". Click opens Profile.
- Header (`:487`): 82px tall. Breadcrumb "MIRROR / TARGETS" (9px, letter-spacing .13em) repeats the page name. Hidden on Today only. Demo badge "DEMO" at 8px (`index.css:118`).
- Profile page (`App.tsx:508`): eyebrow "YOUR CANDIDATE PROFILE", fields for display name, location, experience, a short introduction. Snapshot includes "Sessions done" as 0 or 1 (`completed ? 1 : 0`), which is a count, and the line "They never generate a readiness score" (the word **score**). The copy says the details "are not saved to your account." Default location "Bengaluru, India" and a canned bio are hard-coded (`App.tsx:98-100`).
- Type: `:root` sets system UI (`index.css:6`). Today forces Inter (`today.css:2`). Stories uses a one-off green (`stories.css:8`). Workspace body copy is often 11–13px (`index.css:119-124`). Page h1 is 38px. Eyebrows are 11px with .14em tracking. Settings sections use 11px descriptions (`index.css:134`).
- Width: sidebar 236px fixed. Content max 1250px (workspace), 1040px (Today), 860px (Targets, Stories). Large min-heights (empty state 360px, status cards 215px) make short pages look hollow (`index.css:121, 124`).
- Two themes were stacked in one file: a dark theme, then a "Frosted light product theme" override (`index.css:157`). Today and Targets use `.mirror-landing` tokens from `landing.css` instead. Three visual languages.
- `src/App.css` is unused Vite boilerplate (logo spin) and is not the shell.
- Settings (`src/pages/Settings.tsx`) is a normal settings form: voice, language, calm motion, export, delete. It inherits the tiny workspace type. It is reached only from the sidebar, which is correct. The header still breadcrumbs "MIRROR / SETTINGS".

## Options

- **A. Tokens only.** One scale (for example 13 / 15 / 22 / 32), one 8px spacing step, one content width, applied to the four pages and the shell. Keep nav labels, breadcrumb, and profile form.
- **B. Shell and system.** One page frame component. Sidebar: Briefing (or the name the other council picks), Practice, Targets, Sessions, Stories, then Settings. Footer is the account (email or "Demo"), and it opens a short account panel, not a fake profile form with a canned bio. Drop the repeating breadcrumb. Header stays short (menu, account). Content uses the width up to a comfortable measure, in a two-column layout where a page has a main column and a side column. Compact vertical rhythm. Practice interior untouched.
- **C. Chrome off.** Remove the header entirely. Sidebar only.
- **D. Leave the shell.**

## Weights

| Seat | Weight | Why |
|---|---|---|
| Wickman | 3 | One system or the pages will diverge again next week |
| Sara | 2 | The chrome is the brand the candidate feels every minute |
| Graham | 2 | Chrome that does not help the next rep is playing house |
| Bezos | 2 | Reversible, but inconsistency is the tax |
| Elon | 2 | Delete the breadcrumb, the canned bio, and the third type system |
| Buffett | 1 | "Readiness score" in the profile copy is the reputation leak |

## Assumptions

- Desktop 1280 and mobile 390 are the viewports that matter (stated by the founder).
- Apple-inspired here means quiet type, hairline borders, lots of the background showing through, one accent, no gradient text (assumed from the existing light theme and the product rules).
