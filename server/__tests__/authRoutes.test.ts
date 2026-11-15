import { describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'
import { createAuthProvider } from '../auth/compose.js'
import { createSupabaseAuth, type AuthClientFactory, type CookieAdapter } from '../auth/supabaseAuth.js'
import { safeNext } from '../routes/auth.js'
import { createMemoryRepository } from '../repo/memory.js'
import { j, makeEnv } from './helpers.js'

const env = makeEnv({ supabaseUrl: 'http://supabase.test', supabaseAnonKey: 'anon', authGoogle: true })

interface FakeOpts { user?: { id: string; email: string } | null; exchangeFails?: boolean; otpError?: { status: number } | null }

/** A fake Supabase client: no network. It records calls and writes the cookies the real library would. */
function fake(opts: FakeOpts = {}) {
  const calls: string[] = []
  const factory: AuthClientFactory = (_url, _key, cookies: CookieAdapter) => {
    const has = () => cookies.getAll().some(c => c.name === 'sb-test-auth-token' && c.value === 'good')
    return {
      auth: {
        getUser: async () => {
          calls.push('getUser')
          return has() && opts.user ? { data: { user: opts.user }, error: null } : { data: { user: null }, error: { message: 'no' } }
        },
        getSession: async () => {
          calls.push('getSession')
          return { data: { session: has() ? { access_token: 'jwt-1' } : null }, error: null }
        },
        signInWithOtp: async (a: { email: string }) => {
          calls.push(`otp:${a.email}`)
          cookies.setAll([{ name: 'sb-test-auth-token-code-verifier', value: 'v', options: { maxAge: 600 } }])
          return { data: {}, error: opts.otpError ?? null }
        },
        exchangeCodeForSession: async (code: string) => {
          calls.push(`exchange:${code}`)
          if (opts.exchangeFails) return { data: { session: null, user: null }, error: { message: 'bad' } }
          cookies.setAll([{ name: 'sb-test-auth-token', value: 'good', options: { maxAge: 34560000 } }])
          return { data: { session: { access_token: 'jwt-1' }, user: opts.user ?? { id: 'u1', email: 'a@b.co' } }, error: null }
        },
        signOut: async () => {
          calls.push('signOut')
          cookies.setAll([{ name: 'sb-test-auth-token', value: '', options: { maxAge: 0 } }])
          return { error: null }
        },
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.google.test/x' }, error: null }),
      },
    } as never
  }
  return { factory, calls }
}

function setup(opts: FakeOpts = {}, e = env) {
  const { factory, calls } = fake({ user: { id: 'u1', email: 'a@b.co' }, ...opts })
  const ensured: string[] = []
  const repo = { ...createMemoryRepository(), ensureWorkspace: async (id: string) => void ensured.push(id) }
  const auth = createSupabaseAuth(e, { clientFactory: factory })
  const app = buildApp({ env: e, auth, repoFor: () => repo, authClientFactory: factory })
  return { app, calls, ensured, auth }
}

const post = (app: ReturnType<typeof setup>['app'], path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
const SESSION = { cookie: 'sb-test-auth-token=good' }

describe('POST /auth/magic-link', () => {
  it('rejects a bad email shape and answers ok for a good one', async () => {
    const { app, calls } = setup()
    expect((await post(app, '/auth/magic-link', { email: 'nope' })).status).toBe(400)
    expect((await post(app, '/auth/magic-link', {})).status).toBe(400)
    const ok = await post(app, '/auth/magic-link', { email: '  Me@Example.COM ' })
    expect(ok.status).toBe(200)
    expect(await j(ok)).toEqual({ ok: true })
    expect(calls).toContain('otp:me@example.com')
  })

  it('writes the PKCE verifier cookie httpOnly, Lax, Path=/', async () => {
    const { app } = setup()
    const res = await post(app, '/api/auth/magic-link', { email: 'a@b.co' })
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toMatch(/sb-test-auth-token-code-verifier=v/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
  })

  it('rate limits per email after five sends', async () => {
    const { app } = setup()
    for (let i = 0; i < 5; i++) expect((await post(app, '/auth/magic-link', { email: 'x@y.co' }, { 'x-forwarded-for': `1.1.1.${i}` })).status).toBe(200)
    const res = await post(app, '/auth/magic-link', { email: 'x@y.co' }, { 'x-forwarded-for': '9.9.9.9' })
    expect(res.status).toBe(429)
    expect((await j<{ error: string }>(res)).error).toMatch(/wait/i)
  })

  it('rate limits per IP', async () => {
    const { app } = setup()
    for (let i = 0; i < 5; i++) await post(app, '/auth/magic-link', { email: `u${i}@y.co` }, { 'x-forwarded-for': '2.2.2.2' })
    expect((await post(app, '/auth/magic-link', { email: 'new@y.co' }, { 'x-forwarded-for': '2.2.2.2' })).status).toBe(429)
  })
})

describe('GET /auth/callback', () => {
  it('exchanges the code, sets hardened cookies, provisions the workspace and redirects', async () => {
    const { app, ensured } = setup()
    const res = await app.request('/auth/callback?code=abc&next=/profile')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/profile')
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toMatch(/sb-test-auth-token=good/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=34560000/)
    expect(ensured).toEqual(['u1'])
  })

  it('marks the cookie Secure on an https site', async () => {
    const { app } = setup({}, makeEnv({ ...env, siteUrl: 'https://mirror.example' }))
    const res = await app.request('/auth/callback?code=abc')
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i)
  })

  it('redirects to /?auth=failed when the exchange fails or the code is missing', async () => {
    const { app, ensured } = setup({ exchangeFails: true })
    expect((await app.request('/auth/callback?code=abc')).headers.get('location')).toBe('/?auth=failed')
    expect((await app.request('/auth/callback')).headers.get('location')).toBe('/?auth=failed')
    expect(ensured).toEqual([])
  })

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', '/\\\\evil', 'javascript:alert(1)', '/ok\nx'])('never follows next=%j off site', async next => {
    const { app } = setup()
    const res = await app.request(`/auth/callback?code=abc&next=${encodeURIComponent(next)}`)
    expect(res.headers.get('location')).toBe('/')
  })

  it('safeNext keeps only same-site paths', () => {
    expect(safeNext('/a/b?c=1')).toBe('/a/b?c=1')
    expect(safeNext(undefined)).toBe('/')
    expect(safeNext('a')).toBe('/')
  })
})

describe('GET /auth/session and POST /auth/signout', () => {
  it('answers the user, 401 with providers, and demo', async () => {
    const { app } = setup()
    const ok = await app.request('/auth/session', { headers: SESSION })
    expect(ok.status).toBe(200)
    expect(await j(ok)).toEqual({ user: { id: 'u1', email: 'a@b.co' }, providers: { google: true } })
    const out = await app.request('/api/auth/session')
    expect(out.status).toBe(401)
    expect(await j(out)).toEqual({ error: 'unauthenticated', providers: { google: true } })
    const demo = buildApp({ env: makeEnv({ demoMode: true }), auth: createAuthProvider(makeEnv({ demoMode: true })), repoFor: () => createMemoryRepository() })
    expect(await j(await demo.request('/auth/session'))).toEqual({ demo: true })
  })

  it('sign-out expires every sb- cookie', async () => {
    const { app, calls } = setup()
    const res = await post(app, '/auth/signout', {}, { cookie: 'sb-test-auth-token=good; sb-other-1=x; keep=1' })
    expect(res.status).toBe(200)
    expect(calls).toContain('signOut')
    const cookies = res.headers.get('set-cookie') ?? ''
    expect(cookies).toMatch(/sb-test-auth-token=;/)
    expect(cookies).toMatch(/sb-other-1=;/)
    expect(cookies).toMatch(/Max-Age=0/)
    expect(cookies).not.toMatch(/keep=/)
  })
})

describe('GET /auth/google', () => {
  it('redirects to the provider when enabled and is 404 when the flag is off', async () => {
    const on = await setup().app.request('/auth/google')
    expect(on.status).toBe(302)
    expect(on.headers.get('location')).toBe('https://accounts.google.test/x')
    expect((await setup({}, makeEnv({ ...env, authGoogle: false })).app.request('/auth/google')).status).toBe(404)
  })
})

describe('origin check', () => {
  it('refuses a mismatched Origin on writes, allows none or a matching one', async () => {
    const { app } = setup()
    expect((await post(app, '/auth/magic-link', { email: 'a@b.co' }, { Origin: 'https://evil.example' })).status).toBe(403)
    expect(await j(await post(app, '/auth/signout', {}, { Origin: 'https://evil.example' }))).toEqual({ error: 'bad_origin' })
    expect((await post(app, '/auth/signout', {}, { Origin: 'http://localhost:3000' })).status).toBe(200)
    expect((await post(app, '/auth/signout', {})).status).toBe(200)
    const guarded = await post(app, '/interviews', { role: 'x' }, { Origin: 'https://evil.example', ...SESSION })
    expect(guarded.status).toBe(403)
  })
})

describe('guarded routes with the real requireUser', () => {
  it('401 without a verified session, 200 with one', async () => {
    const { app } = setup()
    expect((await app.request('/profile')).status).toBe(401)
    expect((await app.request('/api/interviews')).status).toBe(401)
    expect((await app.request('/profile', { headers: { cookie: 'sb-test-auth-token=forged' } })).status).toBe(401)
    expect((await app.request('/interviews', { headers: SESSION })).status).toBe(200)
  })
})

describe('createSupabaseAuth', () => {
  it('fromContext verifies with getUser before reading the token, and returns the token', async () => {
    const { auth, calls } = setup()
    const { Hono } = await import('hono')
    const h = new Hono()
    h.get('/x', async c => c.json(await auth.fromContext(c)))
    const res = await h.request('/x', { headers: SESSION })
    expect(await j(res)).toEqual({ id: 'u1', email: 'a@b.co', accessToken: 'jwt-1' })
    expect(calls).toEqual(['getUser', 'getSession'])
    expect(await j(await h.request('/x', { headers: { cookie: 'sb-test-auth-token=forged' } }))).toBeNull()
  })

  it('fromUpgrade is read-only and verifies via getUser', async () => {
    const { auth, calls } = setup()
    const req = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as never
    expect(await auth.fromUpgrade(req('sb-test-auth-token=good'))).toEqual({ id: 'u1', email: 'a@b.co', accessToken: 'jwt-1' })
    expect(await auth.fromUpgrade(req('sb-test-auth-token=forged'))).toBeNull()
    expect(await auth.fromUpgrade(req())).toBeNull()
    expect(calls.filter(c => c === 'getUser')).toHaveLength(3)
  })

  it('compose picks demo, supabase or nobody', async () => {
    expect(await createAuthProvider(makeEnv({ demoMode: true })).fromUpgrade({ headers: {} } as never)).toMatchObject({ id: 'dev' })
    expect(await createAuthProvider(makeEnv()).fromUpgrade({ headers: {} } as never)).toBeNull()
  })
})
