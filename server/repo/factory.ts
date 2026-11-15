import type { Env } from '../config.js'
import { isSupabaseConfigured } from '../config.js'
import type { RepoFactory } from '../auth/types.js'
import { createMemoryRepository } from './memory.js'
import { createSupabaseRepository } from './supabase.js'

/**
 * PLACEHOLDER (agent B replaces this). Demo mode or no Supabase: one shared memory repository.
 * Otherwise the old service-key repository, built once, until the per-user client lands.
 */
export function createRepoFactory(env: Env): RepoFactory {
  if (env.demoMode || !isSupabaseConfigured(env) || !env.supabaseSecretKey) {
    const repo = createMemoryRepository()
    return () => repo
  }
  const repo = createSupabaseRepository(env.supabaseUrl!, env.supabaseSecretKey, { screenDbReady: env.screenDbReady })
  return () => repo
}
