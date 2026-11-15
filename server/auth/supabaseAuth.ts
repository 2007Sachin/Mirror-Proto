import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../config.js'
import type { AuthProvider } from './types.js'

export interface CookieToSet {
  name: string
  value: string
  options?: { maxAge?: number; expires?: Date; domain?: string }
}
export interface CookieAdapter {
  getAll(): { name: string; value: string }[]
  setAll(cookies: CookieToSet[]): void
}
/** Builds a Supabase client that reads and writes the session through the given cookies. Tests inject a fake. */
export type AuthClientFactory = (url: string, anonKey: string, cookies: CookieAdapter) => SupabaseClient

export const defaultClientFactory: AuthClientFactory = (url, key, cookies) =>
  createServerClient(url, key, { cookies }) as unknown as SupabaseClient

const isSecure = (env: Env) => process.env.NODE_ENV === 'production' || env.siteUrl.startsWith('https://')

/** A client bound to this request: reads the request cookies, and every cookie the library sets goes on the response
 *  with httpOnly / SameSite=Lax / Path=/ forced (the session is never readable from page script). */
export function clientForContext(c: Context, env: Env, factory: AuthClientFactory = defaultClientFactory): SupabaseClient {
  const secure = isSecure(env)
  return factory(env.supabaseUrl ?? '', env.supabaseAnonKey ?? '', {
    getAll: () => Object.entries(getCookie(c)).map(([name, value]) => ({ name, value })),
    setAll: cookies => {
      for (const { name, value, options } of cookies) {
        setCookie(c, name, value, {
          maxAge: options?.maxAge,
          expires: options?.expires,
          domain: options?.domain,
          httpOnly: true,
          sameSite: 'Lax',
          path: '/',
          secure,
        })
      }
    },
  })
}

/** Verifies with Supabase Auth (getUser), never the cookie alone, then reads the access token the repository needs. */
async function verified(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: s } = await supabase.auth.getSession()
  if (!s.session?.access_token) return null
  return { id: data.user.id, email: data.user.email ?? null, accessToken: s.session.access_token }
}

export function createSupabaseAuth(env: Env, opts: { clientFactory?: AuthClientFactory } = {}): AuthProvider {
  const factory = opts.clientFactory ?? defaultClientFactory
  return {
    fromContext: c => verified(clientForContext(c, env, factory)),
    // Read-only: a WebSocket upgrade cannot set cookies, so a refresh there is simply not persisted.
    fromUpgrade: req => {
      const jar = parseCookieHeader(req.headers.cookie ?? '').map(({ name, value }) => ({ name, value: value ?? '' }))
      return verified(factory(env.supabaseUrl ?? '', env.supabaseAnonKey ?? '', { getAll: () => jar, setAll: () => {} }))
    },
  }
}
