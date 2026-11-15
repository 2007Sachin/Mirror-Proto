import type { Hono } from 'hono'
import type { Env } from '../config.js'
import type { ReflectionProvider } from '../providers/types.js'
import type { Repository } from '../repo/types.js'

/** What every feature route module receives. The workspace middleware and body caps are already mounted in app.ts. */
export interface RouteDeps {
  repo: Repository
  provider: ReflectionProvider | null
  env: Env
}

export type Api = Hono
