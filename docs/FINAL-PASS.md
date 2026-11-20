# Task 6 — Final pass

Walked the app at 1440px and 390px, light and dark: website → sign in →
onboarding → Briefing → practice → Targets → Stories → Settings → Sessions →
Privacy → Profile → sign out → sign in. Screenshots are under
`docs/screenshots/final-pass/`.

## Fixed

### `src/pages/landing/home.css` (website landing page)
The file had two full generations of CSS for the same `.mh .ml-*` selectors:
a compact, token-based set (from the Task 5 cleanup), immediately followed
by a much larger legacy/elaborate set with `backdrop-filter: blur()`,
glow box-shadows, an animated halo (`@keyframes ml-halo`), `font-weight: 800`
and `text-transform: uppercase` — the exact "AI slop" the brief bans. Because
the legacy block came later in the file, it won the cascade for every shared
selector, so the Task 5 cleanup commit had **zero rendering effect** and the
banned styling was still live.

This also caused a real, measurable bug: the legacy block's
`.ml-orb--hero { width: min(240px, 60vw) }` overflowed at the 390px mobile
breakpoint (`scrollWidth` 429–430px vs `innerWidth` 390px — horizontal
scroll on the hero). Also found inside the legacy block: triplicated
sections (Notes/Compare/Privacy/FAQ/Close/Footer/scroll-reveal) and four
overlapping `@media` breakpoints with redundant/conflicting rules, plus an
invalid `color-mix()` call (extra comma) in a losing declaration.

Fix: rewrote the file down to one generation per selector (412 → 233 lines),
kept the compact/token styling, deduplicated the breakpoints into one
`880px` and one `420px` block, and added a `prefers-reduced-motion` block
(the brief requires reduced motion to be respected; it previously wasn't for
this page). Verified: `scrollWidth === innerWidth` at both 390px and 1440px,
zero duplicate `.mh` selectors, zero remaining `backdrop-filter` /
`uppercase` / bold-800 weights.

### `src/ui/system.css` (workspace shell)
- `.m-btn--quiet` and `.m-grid-cards > li > button, .m-session` had
  hardcoded `background: #fff`, which broke dark mode (white cards on a
  dark page). Changed both to `var(--m-card)`.
- `.avatar-button` (the signed-in header's account icon) had **no CSS at
  all** — it rendered as an ~8×26px unstyled text button, well under the
  44px tap-target minimum the brief requires. Added a proper 44×44px
  circular button style with a visible-focus outline.
- `.account-menu__panel` (in `src/features/auth/auth.css`) was hardcoded to
  `background: #fff; color: #0b1226` with no dark-mode awareness. Added a
  `.workspace-app .account-menu__panel` override using the theme tokens, so
  the panel and its items/email text are readable in both themes.
  Verified both via computed-style checks in light and dark contexts.

### `src/landing.css`, `src/index.css`, `src/pages/interview.css`
Carried over from the earlier part of this pass: missing `--m-text-*` /
`--m-logo-*` / `--m-link-*` token definitions and light/dark value fixes on
`.mirror-landing`; `var(--token)` → `var(--token, fallback)` guards plus
de-sloping `.eyebrow`; and a CSS property-order typo
(`align-items`/`gap` swapped) in the interview room's layout.

## Filed, not fixed in this pass

**The Briefing ("Today") dashboard is a disconnected placeholder in the
default build — this is the most important finding of this pass, and it is
a pre-existing bug on `main` (commit `613d73f`), not something introduced
here.**

`App.tsx` renders either `Overview.tsx` (the fully wired dashboard — real
`onStart`/`onContinue`/`onLetGo`/etc. handlers) or `Today.tsx` (a newer
redesign), gated by `const TODAY_V1 = import.meta.env.VITE_TODAY_V1 === '1'`.
That env var is set nowhere in the repo, so every normal build renders
`Today.tsx`. `Today.tsx` is `function Today()` — it takes **no props at
all**, so every handler `App.tsx` passes it (`onStart`, `onContinue`,
`onLetGo`, `onScreen`, `onOpenStories`, `onReplay`, …) is silently dropped.
Its "Resume" and "Let Go" buttons call a local `run(action)` that only does
`console.log('Action:', action)`. It also shows static placeholder text
("Coming up: No coming up data", "Since last week: No since data") even
though real data is available from the API.

Verified via direct API calls that the underlying interview flow itself is
correct and has no hang risk: created an interview, answered all 4 turns,
completed it, and generated a reflection, all through the documented
fallback path (`nextFollowUp`/`generateAndSaveReflection` fall back to the
local question/notes catalogue when NVIDIA NIM isn't configured, confirmed
via `/integration-status` → `nim.configured: false`). The backend is fine.

The practical consequence for this pass: **there is no working click path
from the default-build dashboard into the live Interview room or a
populated Report page.** The Targets page can start an interview, but only
after a target exists, which triggers a background "scout" job — out of
scope to stand up safely in this pass. I did not attempt to rewire
`Today.tsx`; it's a feature-completeness gap for engineering, not a design
polish item, and touching `App.tsx`/`Today.tsx` risks the flow-coverage
tests added in `1c96ad5`.

**Recommendation:** treat this as a release blocker ahead of any further
design work — either flip the default to `Overview.tsx` until `Today.tsx`
is finished, or wire `Today.tsx`'s buttons to the handlers already being
passed into it.

Screenshots of `Today.tsx` as currently shipped are included
(`app-today-*.png`) since that is the real state of `main`.

### Other known leftovers (lower priority, unchanged from the prior pass)
- `.ml-qcard`, `.ml-q`, `.ml-mark`, `.ml-mark--*` in `home.css` are dead CSS
  (no `.tsx` references any of these classNames). Kept in compact/
  token-based style rather than deleted, to stay low-risk; safe to remove
  in a follow-up once confirmed unused by design.
- `src/practice/**` (the SQL/Python/Case/Stats drill subsystem) still has
  the extensive styling inconsistencies noted in the Task 5 pass; out of
  scope here.
- Sign-out → sign-in was verified functionally (Account menu → Sign out
  returns to the signed-out site matching `website-signin-*.png`) rather
  than re-captured, since `DEMO_MODE` makes the round trip visually
  identical to the already-captured signed-out screenshots.

## Screenshots

`docs/screenshots/final-pass/` — 44 PNGs, each page × {1440, 390} ×
{light, dark}: website landing, sign-in, onboarding, Briefing(Today),
Practice, Targets, Stories, Settings, Sessions, Privacy, Profile.
