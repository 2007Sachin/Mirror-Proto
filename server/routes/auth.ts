import type { Hono } from 'hono'
import type { RouteDeps } from './deps.js'

/**
 * Sign-in, callback and sign-out routes (agent A). Mounted OUTSIDE the guarded groups, at /auth/* and /api/auth/*,
 * because these are how a caller becomes authenticated.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerAuthRoutes(_app: Hono, _deps: RouteDeps): void {}
