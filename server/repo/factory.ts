import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.js'
import type { Env } from '../config.js'
import { isSupabaseConfigured } from '../config.js'
import type { AuthUser, RepoFactory } from '../auth/types.js'
import { AppError } from '../middleware/errors.js'
import { createMemoryRepository } from './memory.js'
import { createUserRepository } from './supabase.js'

/** Builds the Supabase client for one request: anon key plus the user's bearer token, so RLS applies. */
export type ClientFactory = (user: AuthUser & { accessToken: string }) => SupabaseClient<Database>

/**
 * Demo mode, or Supabase not configured: one shared memory repository.
 * Otherwise a fresh per-request repository on a client that carries the user's token (nothing is cached across requests).
 */
export function createRepoFactory(env: Env, opts: { clientFactory?: ClientFactory } = {}): RepoFactory {
  if (env.demoMode || !isSupabaseConfigured(env)) {
    const repo = createMemoryRepository()
    return () => repo
  }
  const url = env.supabaseUrl!
  const anonKey = env.supabaseAnonKey!
  const build: ClientFactory =
    opts.clientFactory ??
    (user =>
      createClient<Database>(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }))
  return user => {
    if (!user.accessToken) throw new AppError(401, 'unauthenticated')
    return createUserRepository(build({ ...user, accessToken: user.accessToken }), user.id, { screenDbReady: env.screenDbReady })
  }
}
