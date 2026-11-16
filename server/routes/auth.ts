import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import type { Env } from '../config.js'
import { originCheck } from '../auth/csrf.js'
import { clientForContext, defaultClientFactory, type AuthClientFactory } from '../auth/supabaseAuth.js'
import type { AuthProvider, RepoFactory } from '../auth/types.js'

export interface AuthRouteDeps {
  env: Env
  auth: AuthProvider
  repoFor: RepoFactory
  clientFactory?: AuthClientFactory
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) })

const WINDOW_MS = 10 * 60 * 1000
const MAX_SENDS = 5

/** Only a path on this site: one leading slash, no `//`, no backslash, no control characters. */
export function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || [...next].some(ch => ch.charCodeAt(0) < 32)) return '/'
  return next
}

/**
 * Sign-in, callback and sign-out. Mounted OUTSIDE the guarded groups, at /auth/* and /api/auth/*, because these are
 * how a caller becomes authenticated. Every state-changing request goes through the origin check.
 */
export function registerAuthRoutes(app: Hono, { env, auth, repoFor, clientFactory = defaultClientFactory }: AuthRouteDeps): void {
  const a = new Hono()
  a.use('*', originCheck(env))
  const providers = { google: env.authGoogle }
  const client = (c: Context) => clientForContext(c, env, clientFactory)
  const configured = Boolean(env.supabaseUrl && env.supabaseAnonKey)

  // ponytail: in-memory limiter, per process. Move to a shared store if the server runs on several instances.
  const hits = new Map<string, number[]>()
  const limited = (key: string) => {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS)
    if (recent.length >= MAX_SENDS) { hits.set(key, recent); return true }
    hits.set(key, [...recent, now])
    return false
  }
  const ipOf = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'

  a.post('/magic-link', async c => {
    const parsed = emailSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'invalid_email' }, 400)
    const { email } = parsed.data
    if (limited(`ip:${ipOf(c)}`) || limited(`email:${email}`)) {
      return c.json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429)
    }
    if (!configured) return c.json({ error: 'Sign-in is not set up yet.' }, 503)
    const { error } = await client(c).auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback`, shouldCreateUser: true },
    })
    if (error?.status === 429) return c.json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429)
    if (error) return c.json({ error: 'We could not send the link. Please try again.' }, 502)
    return c.json({ ok: true })
  })

  a.get('/callback', async c => {
    const code = c.req.query('code')
    if (!code || !configured) return c.redirect('/?auth=failed', 302)
    const { data, error } = await client(c).auth.exchangeCodeForSession(code)
    if (error || !data.session) return c.redirect('/?auth=failed', 302)
    const { user, session } = data
    // First sign-in: the workspace row. requireUser also ensures it, so a failure here is retried on the next request.
    await repoFor({ id: user.id, email: user.email ?? null, accessToken: session.access_token })
      .ensureWorkspace(user.id)
      .catch(() => undefined)
    return c.redirect(safeNext(c.req.query('next')), 302)
  })

  a.post('/signout', async c => {
    if (configured) await client(c).auth.signOut({ scope: 'local' }).catch(() => undefined)
    for (const name of Object.keys(getCookie(c))) {
      if (name.startsWith('sb-')) setCookie(c, name, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'Lax' })
    }
    return c.json({ ok: true })
  })

  a.get('/session', async c => {
    if (env.demoMode) return c.json({ demo: true })
    const user = await auth.fromContext(c)
    if (!user) return c.json({ error: 'unauthenticated', providers }, 401)
    return c.json({ user: { id: user.id, email: user.email }, providers })
  })

  a.get('/google', async c => {
    if (!env.authGoogle || !configured) return c.json({ error: 'not_found' }, 404)
    const { data, error } = await client(c).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${env.siteUrl}/auth/callback`, skipBrowserRedirect: true },
    })
    if (error || !data?.url) return c.redirect('/?auth=failed', 302)
    return c.redirect(data.url, 302)
  })

  app.route('/auth', a)
  app.route('/api/auth', a)
}
