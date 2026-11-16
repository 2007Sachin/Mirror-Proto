import type { Hono } from 'hono'
import type { Env } from '../config.js'
import type { ReflectionProvider } from '../providers/types.js'

/** What every feature route module receives. requireUser (which sets `repo` and `workspace` on the context) and body caps are already mounted in app.ts. */
export interface RouteDeps {
  provider: ReflectionProvider | null
  env: Env
}

export type Api = Hono
