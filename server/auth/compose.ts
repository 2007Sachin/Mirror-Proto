import { isSupabaseConfigured, type Env } from '../config.js'
import { demoAuth } from './demo.js'
import { createSupabaseAuth } from './supabaseAuth.js'
import type { AuthProvider } from './types.js'

/** Demo user only when DEMO_MODE=1; Supabase session auth when configured; otherwise nobody is signed in. */
export function createAuthProvider(env: Env): AuthProvider {
  if (env.demoMode) return demoAuth()
  if (isSupabaseConfigured(env)) return createSupabaseAuth(env)
  return { fromContext: async () => null, fromUpgrade: async () => null }
}
