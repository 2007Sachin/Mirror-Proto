# Auth foundation (Phase 0)

Every guarded API route runs as a signed-in user. No user, no data: `401 { "error": "unauthenticated" }`.
There is no `X-Dev-Workspace` header and no hard-coded workspace any more.

## The seam (`server/auth/`)

- `types.ts`: `AuthUser { id, email, accessToken }`, `AuthProvider { fromContext(c), fromUpgrade(req) }`, `RepoFactory = (user) => Repository`.
- `requireUser(auth, repoFor)`: Hono middleware. Resolves the user, then sets context vars `user`, `workspace` (= `user.id`), `repo` (= `repoFor(user)`) and calls `repo.ensureWorkspace(user.id)`.
- Routes read `c.get('repo')` and `c.get('workspace')`. Background work after the response captures both first (see `runScout`).
- `buildApp({ env, auth, repoFor, ... })` and `attachVoiceGateway(server, { env, auth, repoFor, log })`. `server/index.ts` composes them from `compose.ts` and `repo/factory.ts`.
- Public: `GET /health`, `/capabilities`, `/integration-status`, and (agent A) `/auth/*` and `/api/auth/*`.
- Guarded: `/interviews`, `/onboarding/*`, `/profile`, `/coach-note`, `/targets`, `/practice/*`, `/replay/*`, `/stories`, `/resume/*`, `/data`, `/me/*`.
- Voice: `auth.fromUpgrade(req)` at the WebSocket upgrade (401 and socket closed without a user). `hello.payload.token` is ignored. The repo is built once per connection.

## Who owns what

- A (session auth): `server/auth/supabaseAuth.ts`, `server/auth/compose.ts` (replace the placeholder), `server/routes/auth.ts`, client sign-in and sending the session.
- B (data layer): `server/repo/supabase.ts` (per-user client from anon key + user token, RLS), `server/repo/factory.ts` (replace the placeholder), adapters, `exportAllData`/`deleteAllData`, the `/capabilities` `newData` rule.
- C (account): `server/routes/me.ts` (export, delete), authorization tests, privacy page and UI.
- Placeholders today: `compose.ts` gives the demo user with `DEMO_MODE=1`, otherwise nobody. `factory.ts` gives one shared memory repo (demo or no Supabase), else the old service-key Supabase repo.

## Tests

`helpers.ts`: `WS = { 'X-Test-User': 'dev' }` and `as(user)`. `testAuth()` takes the user id from the `X-Test-User` header (`x-test-user` on a WebSocket upgrade). It is never selected by env. `makeApp` shares one memory repo; users are separated by workspace = user id.

## Env (names only, see `.env.example`)

`SUPABASE_URL`, `SUPABASE_ANON_KEY` (both needed for Supabase mode), `SUPABASE_SERVICE_ROLE_KEY` (tests/admin only, the app never uses it), `SITE_URL` (default `http://localhost:3000`), `AUTH_GOOGLE=1`, `DEMO_MODE=1` (one shared `dev` user, local demos only).

The web client still sends `X-Dev-Workspace` until agent A removes it; the server now ignores it.
