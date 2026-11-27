# Marketing site (src/site)

Shared layer for the MIRROR marketing pages. Plain React + one scoped stylesheet: no web fonts, no CDN, no new packages.

## Layout
- `site.css` all styles. Scoped under `.ms`; every class is `ms-` prefixed, every token `--ms-*`. Breakpoints 991 / 767 / 479. Never edit app CSS for the site.
- `SiteLayout.tsx` shell (Nav, `<main>`, Cta, Footer). `Nav.tsx`, `Footer.tsx`, `Cta.tsx`.
- `ui.tsx` building blocks and hooks. `MeshGradient.tsx` WebGL background.
- `router.tsx` `SITE_ROUTES`, `matchSite(pathname)`, `SiteLink`, `navigateSite`, `SITE_HOME_LIVE`. `SiteContext.tsx` `useSite()`.
- `pages/<Name>.tsx` one lazy page per route (stubs until a page agent fills them). `copy/` all visible words.
- `App.tsx` renders a matching route before its own view logic (login/signup open the app's sign-in gate).

## Add or finish a page
1. Edit `pages/<Name>.tsx` (default export, receives `{ params }`: `SitePageProps` from `types.ts`). Wrap in `<SiteLayout title="Pricing">`.
2. Put every string in `copy/<page>.ts` (for example `copy/pricing.ts`), exported as plain objects. `copy/lint.test.ts` scans them all.
3. Build with `Section` (+ `Container`, `Eyebrow`, `Card`, `Reveal` ...). Use the `ms-*` classes from site.css (`ms-phero`, `ms-h1`, `ms-grid3`, `ms-frow`, `ms-faq` ...).
4. Mark every sample item `// TODO(placeholder): real quote / price / photo needed`. Never claim a feature MIRROR lacks.
5. Buttons that start the product call `useSite().onTry()`. Internal links use `SiteLink` or `Button href="/..."`.
6. Home: when `pages/Home.tsx` is real, set `SITE_HOME_LIVE = true` in `router.tsx` and update the Landing test in `App.routing.test.tsx`.

Copy rules: no scores, percentages, streaks or "x of y"; privacy sentences only from `CLAIMS` in `src/pages/landing/content.ts`; avoid the banned words in `copy/lint.test.ts`.

## SiteLayout props
`title?: string` (document.title "<title> — MIRROR"), `cta?: boolean = true`, `footer?: boolean = true`, `navTheme?: 'dark'` (dark hero), `split?: boolean` (get-started split layout, dark nav bar).

## ui.tsx
- `Container {size?: 'wide'|'md'|'narrow'|'xs'}` · `Section {id?, tone?: 'light'|'dark', top84?, noTop?, bare?, size?}` · `Eyebrow {light?}`
- `Button {variant?: 'primary'|'secondary'|'light', size?: 'md'|'sm', href?, ...button props}` · `Card {variant?: 'bento'|'feature'|'stat', tone?, as?}`
- `Reveal {as?, delay?}` · `CountUp {to, suffix?, durationMs?}` · `Marquee {items, variant?: 'logos'|'chips'|'icons', direction?, label?}`
- `Tabs {items: TabItem[], label, dwellMs?, autoplay?, ctaHref?, ctaDefault?, gradient?}` (icon tabs with progress ring; `TabItem {id,label,icon?,cta?,panel,durationMs?}`)
- `AutoTabs {items: AutoTabItem[], label, dwellMs?}` (dark-band tabs; `{id,title,desc?,panel}`)
- `Faq {items: {q, a}[]}` · `Toc {target: '#selector', label?, progress?}` (built from the h2s in target; give it `className="ms-prose"` content)
- `FilterList {items: FilterItem[], filters, emptyText, listClassName?, ...}` (`FilterItem {id,tags,text,node}`)
- `BillingToggle {value, onChange}` + `PriceSwap {value, monthly, yearly}` · hooks `useScrollSpy(ids, line?)`, `useInView(opts)`, `useReducedMotion()`
- `MeshGradient {colors: [a,b,c], ground?}`: first child of a `position: relative` box; raise siblings with `position: relative; z-index: 1`.

All behaviour honours `prefers-reduced-motion` (no autoplay, static marquees, still gradient) and works from the keyboard.
Note: `Tabs`, `AutoTabs`, `Faq`, `Toc` need a stable `id` per item; panels render inert when closed.
