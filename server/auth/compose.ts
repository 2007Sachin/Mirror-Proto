import type { Env } from '../config.js'
import { demoAuth } from './demo.js'
import type { AuthProvider } from './types.js'

/** PLACEHOLDER (agent A replaces this): demo user in DEMO_MODE, otherwise nobody is signed in. */
export function createAuthProvider(env: Env): AuthProvider {
  if (env.demoMode) return demoAuth()
  return { fromContext: async () => null, fromUpgrade: async () => null }
}
