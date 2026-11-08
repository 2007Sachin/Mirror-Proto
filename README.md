# MIRROR — Interview Studio

A lighter, Apple-inspired interactive product prototype for reflective interview practice. Built with React 19, TypeScript, Vite, and orb-ui.

## Open in Antigravity

1. Extract `MIRROR-Product-Prototype.zip`.
2. Open the extracted `MIRROR-Product-Prototype` folder as the project root.
3. Run the commands below in the project terminal.

```bash
npm install
npm run dev           # Vite dev server (port 3000)
npm run dev:server    # Phase 1 API server (port 8787, memory mode by default)
```

Create a production build with:

```bash
npm run build
```

Backend tests and type checks:

```bash
npm test                      # server API suite (vitest)
npm run typecheck:server      # server-only tsc
npm run smoke                 # in-process API smoke (memory/mocked)
```

See `.env.example` for Supabase/NVIDIA NIM configuration. The primary text-interview flow calls the Phase 1 API.

## Project structure

```text
MIRROR-Product-Prototype/
├── public/                  # Static public assets
├── src/
│   ├── components/ui/       # Reusable interface primitives
│   ├── hooks/               # Shared React hooks
│   ├── lib/                 # Utility functions
│   ├── App.tsx              # Product screens, state, and interactions
│   ├── index.css            # Complete visual system and responsive styles
│   └── main.tsx             # Application entry point
├── index.html               # HTML entry point
├── package.json             # Dependencies and project commands
├── package-lock.json        # Reproducible dependency lockfile
├── vite.config.ts           # Vite configuration
└── tsconfig*.json           # TypeScript configuration
```

## Included product flows

- Landing page and progressive onboarding
- Workspace overview and story bank
- Guided four-question interview prototype
- Evidence-linked reflection report
- Role history and role-specific preparation reviews
- Editable candidate profile
- Prototype settings
- Responsive desktop and mobile navigation

## Prototype scope

Phase 1 text interviews persist through the Hono API (`npm run dev:server`). Without NVIDIA/Supabase credentials the API runs in memory mode with catalog follow-ups; reflection generation returns a retryable provider error. Voice remains a Phase 2 preview. No authentication.
