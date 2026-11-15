import type { Context } from 'hono'
import type { IncomingMessage } from 'node:http'
import type { Repository } from '../repo/types.js'

/** Who is calling. `accessToken` is the user's Supabase JWT (null for demo/test users). */
export interface AuthUser {
  id: string
  email: string | null
  accessToken: string | null
}

/** Resolves the caller. Null means unauthenticated. The Hono context lets an implementation refresh cookies. */
export interface AuthProvider {
  fromContext(c: Context): Promise<AuthUser | null>
  fromUpgrade(req: IncomingMessage): Promise<AuthUser | null>
}

/** Builds the repository for one user (Supabase: a client carrying the user's token, so RLS applies). */
export type RepoFactory = (user: AuthUser) => Repository
