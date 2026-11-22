# MIRROR design foundation

How MIRROR looks and behaves, written from the code as it is today. Visual reference for type and cards is fanout.sh. The mood is in `docs/DESIGN-PHILOSOPHY.md` ("Paper Instrument").

## How the pieces fit

Three layers, loaded in this order:

1. **Foundation tokens** (`src/styles/tokens.css`, imported by `src/index.css`). The scales: type, colour, spacing, radii, borders, shadows, layering, layout sizes, motion. Every declaration is inside `:root`; dark values are a second `:root` inside `prefers-color-scheme: dark`. A test (`src/styles/tokens.test.ts`) fails if a declaration ever sits outside a rule again, and checks contrast.
2. **Page and system sheets**: `src/landing.css` (`.mirror-landing`), `src/ui/system.css` (`.workspace-app`, the `--m-*` app scale), `src/pages/*.css`, `src/components/folderCard.css`.
3. **Theme layer**: `src/styles/paper.css`, `paper-session.css`, `paper-practice.css`. Loaded last. It re-points the page tokens at the `--p-*` paper palette.

New work uses layer 1 for scales and the shared pieces below for look. Do not redefine a scale in a page sheet.

The foundation's colours equal the live theme's (`--color-bg` is `--p-bg`, `--color-accent` is `--p-blue`), so a token and the screen agree.

---

## 1. Brand and visual foundations

### Identity and principles
MIRROR is a calm place to practise an interview. It is not a performance review.
- **Clarity.** One thing per screen is the main thing, and it has one filled button.
- **Simplicity.** Plain words, few boxes, one accent colour. No decorative blobs, gradient text or glass used as decoration.
- **Trust.** Nothing is scored, no percentages, no streaks on interview answers. Privacy sentences come only from `docs/PRIVACY-AUDIT.md`.
- **Efficiency.** A tap target is at least 44px. The next step is always visible.

Voice: short sentences, second person, no hype. Say what happened and what to do next. Never "great job", never a grade.

### Colour
Defined in `tokens.css`. Light and dark are separate values for the same names.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#f7f7f8` | `#111213` | Page |
| `--color-surface` | `#fff` | `#1a1b1d` | Cards, sheets |
| `--color-bg-subtle` | `#f4f4f5` | `#202123` | Chips, quiet fills |
| `--color-ink` | `#1d1d1d` | `#f2f4f7` | Text |
| `--color-muted` | `#6e6e6e` | `#8b94a0` | Secondary text |
| `--color-accent` (`--color-primary`) | `#1062fe` | `#6ea2ff` | The one action colour |
| `--color-accent-ink` | `#fff` | `#111315` | Text on accent |
| `--color-border` / `-strong` | `#e8e8ea` / `#c9c9cf` | `#2a2b2e` / `#4c4e54` | Hairlines |
| `--color-ring` | `#1062fe` | `#6ea2ff` | Focus ring |

- **Neutral scale** `--color-neutral-50` to `-900`: the same in both modes (`#f7f7f8` … `#1d1d1d`). Semantic colours pick from it.
- **Semantic:** `--color-success`, `--color-warning`, `--color-error`, `--color-info` (also `--color-semantic-*`), each with a `-soft` tint. Values are chosen to be readable as text on `--color-bg` (4.5:1, checked in `tokens.test.ts`).
- **Interactive states of primary:** `--color-primary` (default), `-hover` and `-active` (darker mixes), `-soft` (tint), `--color-focus-ring`, `--color-disabled-ink`.
- **Rules:** one accent. Greys carry the rest. Green and red never carry meaning alone: they come with a word or a mark. Category hues exist only for small tags and the folder cards.

### Typography
- **Families:** `--font-family-base` (Overused Grotesk, self-hosted from `/fonts`, then the system stack), `--font-family-code` (IBM Plex Mono, from `@fontsource`, then system mono), `--font-family-pixel` (Departure Mono, for small display labels). No font loads from a third party.
- **Weights:** `--font-weight-body` 400, `--font-weight-medium` and `-heading` 500, `--font-weight-semibold` 600. Bold (700 and up) and black are not tokens on purpose: headings are medium.
- **Foundation sizes:** xs 12, sm 14, base 16, lg 20, xl 24, 2xl 30, 3xl 36 (`--font-size-*`).
- **App sizes:** the workspace uses a four-step scale in `system.css`: `--m-text-meta` 12, `--m-text-body` 15, `--m-text-title` 17, `--m-text-page` 28. Pages styled in `src/pages/*.css` use these, and a test (`src/ui/system.test.ts`) rejects a raw font size there.
- **Line height:** `--line-height-tight` 1.2, `-heading` 1.1, `-base` 1.6, `-relaxed` 1.75.
- **Letter spacing:** `--letter-spacing-tight` -.03em for headings, `-upright` .02em, `-caps` .06em for mono labels.
- **Headings:** h1 to h3 medium, tight tracking. Small caps mono labels (`eyebrow`, pills) in the code or pixel family.

### Spacing
4px base. `--space-N` where N is the step: 0, 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 7 (28), 8 (32), 10 (40), 12 (48), 16 (64), 20 (80). Named steps: `--spacing-xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32, `xxl` 64.
- Component padding: steps 3 to 6. Section spacing: 8 to 16. Page gutter: `--layout-gutter` 24px (16px on phones).
- Never invent a value between steps.

### Borders, radius, dividers, elevation
- **Border width:** `--border-width-0/1/2/3` (0, 1, 2, 3px). Hairlines are 1px `--color-border`. Focus uses 2px.
- **Radius:** `--radius-0/1/2/3/4/5/full` (0, 4, 8, 12, 16, 20, 999). Named: `none`, `sm` (4), `md` (8), `lg` (12). Inputs 8, cards 12 to 18, pills full.
- **Dividers:** 1px solid `--color-border`. Dashed only to show something in progress (the orb's "thinking" ring). No dotted rules.
- **Elevation:** `--shadow-1` to `-5` (named `sm` = 1, `md` = 3, `lg` = 4). Cards sit on a hairline and at most shadow 1 to 3. Keep shadow 5 for the largest overlays.
- **Layering:** see section 2.

### Iconography and illustration
- **Icons:** `lucide-react`. Sizes in use: 14 and 16 inline and in buttons, 18 in navigation, 22 in the room's call controls. Stroke is the library default. Icons support a word; they do not replace it.
- **Illustration:** none from stock. Product pictures are real screenshots (landing). The folder pictures on cards are drawn in CSS from the card's tint (`src/components/folderCard.css`). The orb is a WebGL shader (`FluidOrb`), calm at rest and livelier as the voice level rises.
- **Custom icons:** only the logo mark. Everything else comes from the library.

---

## 2. Layout and responsive foundations

### Breakpoints
Target set: **mobile** up to 640px (design at 390), **tablet** 641 to 1024, **desktop** 1025 and up (design at 1440).
The code still holds older page-specific widths that should converge on those: 420, 560, 640, 760 (landing phone layout), 780 (sidebar goes off-canvas), 800, 860, 880, 959.98 and 960 (room switches between side panel and bottom sheet), 1050 (tablet sidebar). A media query cannot read a custom property, so the values are written out.

### Grid
No 12-column system. Pages are a centred column with CSS grid where needed.
- Page column max width: `--layout-page-max` 1120px (landing 1100px).
- Card lists: `repeat(auto-fill, minmax(260px–280px, 1fr))`, gap 10 to 18px.
- Two-up and three-up splits collapse to one column at 780–800px.

### Workspace layout
- **Left navigation:** fixed, 216px (`--layout-sidebar`). 200px between 781 and 1050px (`--layout-sidebar-tablet`).
- **Main content:** `margin-left` equals the sidebar, content centred up to 1120px, padding 20px 16px on phones.
- **Right companion:** the interview room's side panel (Chat, Tips, Replay), 300px (`--layout-room-panel`) beside the stage from 960px, a bottom sheet (70% of the screen) below that.
- **Density:** one density. There are no compact or spacious modes.

### Sidebar behaviour
Expanded labels at all desktop widths. At 780px and below it slides off-canvas (260px, `--layout-sidebar-mobile`) behind a menu button and closes on selection. There is no icon-only collapsed mode.

### Page structure
- One `h1` per page, in a `page-title` block with a small label above, the title, one line of help, and any page action on the right.
- Section headings are h2 then h3, no skipped levels. Every section is named by its heading (`aria-labelledby`).
- Left-aligned text. Centre only a single focus (onboarding, the paused screen).
- Sticky: the landing nav and the room's call bar. The sidebar is fixed.

### Layering (z-index)
`--z-index-base` 0, `-raised` 5, `-sticky` 20, `-bar` 30 (the room's call bar), `-nav` 40 (sidebar), `-modal` 50 (the room's bottom sheet, the SQL drawer), `-tooltip` 60 (the top layer: today the SQL map's sheet; keep it for popovers). A dialog or sheet traps focus and closes on Esc.

---

## 3. Interaction and accessibility

### States
| State | Look |
|---|---|
| Default | Hairline, surface fill |
| Hover | Border or text to accent, cards lift 2px |
| Active | Lift removed |
| Focus | 2px solid ring, 2 to 4px offset, never removed |
| Selected | Accent border or `aria-pressed` / `aria-current` |
| Disabled | Muted ink, 50% opacity, `not-allowed` |

### State meanings
- **Loading:** quiet placeholder bars (`src/ui/PageSkeleton.tsx`, `role="status"`, `aria-busy`). Do not show placeholder copy that could change.
- **Empty:** one sentence on what this is and one button to begin.
- **Success:** a word, and a mark if it helps. No confetti.
- **Warning:** the warning colour with a word. Used rarely.
- **Error:** the error colour, a plain sentence, and a way to retry. Announced with `role="alert"`.

### Keyboard
- Logical tab order. Focus ring always visible.
- Skip link: the landing page has one. The app shell does not yet (see open gaps).
- Modals and sheets trap focus, return it on close, and close on Esc.
- Shortcuts live in the interview room only, and are listed under "?" there: M mute, K pause, C captions, T speak or type, P panel, R repeat, Esc.

### Accessibility foundations
- **Contrast:** 4.5:1 for text, 3:1 for UI and focus. `tokens.test.ts` checks the foundation text pairs in light and dark.
- **Targets:** at least 44px (`--tap-target`) with room between.
- **Zoom:** the goal is no horizontal scroll at 200%. Not yet tested.
- **Not by colour alone:** status always has a word.
- **ARIA:** only where HTML has no element. Regions are labelled by their heading. Live updates use `role="status"` (polite) or `role="alert"`.

### Motion
- **Durations:** `--transition-fast` 150ms, `-normal` 250ms, `-slow` 350ms. **Easing:** `--ease-default` (spring-like), `--ease-fast`, `--ease-slow`.
- **What moves:** transform and opacity only. Cards lift 2px on hover. Panels fade or slide in 250ms. Nothing bounces.
- **The orb:** swirl speed and size follow the voice level; ripples and bars show who is talking.
- **Reduced motion:** `prefers-reduced-motion: reduce` sets the durations to 0 and runs animations once. Ripples, bars and the breathing circle stop.

### Forms
- Validate when the form is sent, not while typing. One inline message under the form, `role="alert"`, in plain words.
- No asterisks. If a field is optional it says "(optional)". Counters show length, never a pass mark.
- Sending a form disables its button and says what is happening ("Saving…").
- Drafts of long answers are kept as you type.

---

## 4. Learning-specific foundations

### Reading typography
Reading text is at most about 600px wide (60 to 66 characters), `--line-height-base`, paragraphs spaced one step (`--space-3`) apart. Lesson headings are h2 then h3, medium weight.

### Code and editors
Code uses `--font-family-code`. The SQL, Python and case editors are plain text areas with the code font, not a highlighting editor, so there is no syntax palette. Results are shown in tables in the same font. Line numbers and current-line highlight are not built.

### Progress and completion
- Show progress as plain counts and steps: question dots in the room, "N solved" and levels in Practice.
- No percentages, no streaks, no badges, no "x of y" for interview answers. The copy scan enforces this.

### Assessment feedback
- **Exercises with one right answer** (SQL, Python, stats): marked correct or not, with a word and a mark. No partial credit.
- **Interview answers:** never scored. Notes say what worked, what to strengthen and what to say again, quoting the learner's own words.
- Tone: plain and specific. No praise words.

### Practice workspace
Tool areas are fixed columns that stack on phones. Panes are not drag-resizable (`components/ui/resizable.tsx` exists but nothing uses it). The room is a full-screen stage with one side panel.

### AI companion in the room
- **Messages:** MIRROR on the left, you on the right, with a time. The live line shows a caret while you speak.
- **Tips:** a short checklist (what happened, what you did, what changed) and pace. Guidance, not a grade.
- **Suggestions:** the next question appears as a button ("Practise this question").
- **Evidence:** quotes from the learner's own answer. There are no citations to outside sources and no confidence bars, because the interviewer does not claim to know.
- **Actions:** one filled button (Send answer), quiet buttons for the rest.

---

## Shared pieces
- **Buttons:** `.m-btn` (workspace) and `.ml-btn` (landing and room). One filled button per screen; others `--quiet`.
- **Folder card:** `src/components/FolderCard.tsx`. Tinted card, folder picture, mono pill, heading, "+" lines, footer. Used for roles, jobs, rounds, tracks, sessions, stories.
- **Cards:** `.m-card`, 12 to 18px radius, hairline border.
- **Page skeleton:** `src/ui/PageSkeleton.tsx`.
- **Orb:** `LiveOrb` over `FluidOrb`. Used for the room and onboarding.

## Intentionally not adopted
Items in the original foundation checklist that conflict with the product's rules:
- **Percentage display, streaks, completion badges, confetti.** MIRROR never grades or gamifies interview practice.
- **Confidence bars and partial credit** on answers. Nothing is scored.
- **Bold and black weights.** Headings are medium.
- **A normalize or reset package.** `src/index.css` already resets what is needed, and no dependency was added.
- **A separate `design/foundation/tokens.css`.** The foundation lives in `src/styles/tokens.css` so there is one copy.

## Open gaps
- The app shell has no skip link.
- Breakpoints are still the ten page-specific values listed above.
- There is no icon-only collapsed sidebar, no density modes and no resizable panes.
- Editors have no syntax highlighting, line numbers or current-line marker.
- Foundation tokens are used by only a handful of rules. Most pages still read the page tokens (`--m-*`, `--p-*`), so a change here does not restyle them yet.

## Checking a change
1. `npm test`: `tokens.test.ts` (every token defined, nothing outside a rule, contrast) and `system.test.ts` (no raw font sizes on redesigned pages).
2. `npm run build`.
3. Look at the landing page, Briefing, Interview Prep, Practice, Sessions and Stories at 1440 and 390px, in light and dark, with reduced motion on.
