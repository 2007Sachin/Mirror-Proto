# Landing page

## The moat and the council's rulings
Source: `docs/roast-room/2026-11-17-landing-moat/verdict.md` (GO with conditions, option A trimmed, labelled sample in the hero).

- Moat: the one-job loop (paste the job, see the gaps, get asked, say it again). Not scored and private are the feeling beside it. The Director and SQL depth are features, shown not headlined.
- One headline carries both: "Practise for the job you actually want. Nobody is keeping score."
- Primary button "Try a sample question", secondary "Request access".
- No comparison table, no competitor named. No testimonials, counts, logos, pricing, outcome promises, score, percentage or streak. The live pause reactions are not claimed (shadow mode).

## Look and structure (v2)
The first version (paper and serif) was rejected: it did not look like the app. The page now reuses the shared design system in `src/landing.css` (`.mirror-landing` tokens, `ml-btn`, `ml-glass`, Inter, the soft blue/teal field, dark mode) and the app's `LiveOrb` as the hero's signature. `src/pages/landing/home.css` holds only page layout under `.mh`.
Order: glass nav, hero (H1, sub, two buttons, trust chips, real Briefing screenshot with the orb), `#how` (four steps with cropped screenshots), `#features` (six alternating blocks), `#sample`, `#private` (not scored plus the five claims), versus, stage, `#faq`, close band, footer. All words live in `src/pages/landing/content.ts`.

## Screenshots
`public/landing/*.webp` (1440x900) come from the demo app with synthetic data (Contoso Analytics, "Demo account"). To refresh: run the app against the demo API, open each screen, capture at 1440x900, save as webp under the same name. Known gap: `room.webp` currently shows the Briefing, not the interview room; recapture it.

## Fonts
The app-wide `index.html` loads Inter from Google Fonts. Unchanged by this page; flagged because it is a third-party request the page itself does not add.

## The sample, and why it is a sample
`#sample` plays fixed data from `SAMPLE`: pick one of three starting answers, press "Say it again", see the better sentence and the "What changed" lines. It is tagged "sample" and labelled "Sample, not your data. Nothing you tap here leaves this page." No network call is made (the tests stub `fetch` and fail if it is called). It never implies a live model, so it has no cost and no abuse surface.

## Conditions
1. No invented proof: nothing that is not true today.
2. Audited claims only: every privacy sentence is one of `CLAIMS`, matching `docs/PRIVACY-AUDIT.md`.
3. No public model endpoint without a per-visitor cap, a rate limit and a monthly spend ceiling of about 50 dollars.
4. Upgrade path to a real try-it: only once those exist and at least 3 of 10 testers finish a first question. Then swap the sample's fixed rewrite for one server call behind the cap.

## What to measure once counters exist
Sample finished, access requested. If fewer than 1 in 10 who finish the sample request access after 50 visitors, rewrite the headline before touching the layout.

## Left for you
- Counters: both buttons counted from day one (sample finished, access requested). The app has no analytics and this page adds no public endpoint or third-party script. Decide on a privacy-respecting counter and where it lives.
- "Request access" currently equals sign-in (open); closing the beta to invited emails is a later switch.
- A real try-it only after a per-visitor cap, rate limit and monthly spend ceiling exist.
- Five named testers recruited by hand matter more than the page.
