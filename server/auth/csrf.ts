import { createMiddleware } from 'hono/factory'
import type { Env } from '../config.js'

const host = (u: string) => {
  try { return new URL(u).host } catch { return null }
}

/** Cookie auth needs a cross-site check: a browser POST/PUT/PATCH/DELETE whose Origin is neither this host nor SITE_URL is refused.
 *  No Origin header (curl, tests, server-to-server) passes: browsers always send it on those methods. */
export function originCheck(env: Env) {
  return createMiddleware(async (c, next) => {
    const m = c.req.method
    const origin = c.req.header('Origin')
    if (origin && m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
      const h = host(origin)
      const ok = h !== null && (h === host(c.req.url) || h === c.req.header('Host') || h === host(env.siteUrl))
      if (!ok) return c.json({ error: 'bad_origin' }, 403)
    }
    await next()
  })
}
