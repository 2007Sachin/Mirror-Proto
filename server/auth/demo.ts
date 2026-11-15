import type { AuthProvider } from './types.js'

/** One fixed user for local demos. Only composed when DEMO_MODE=1. */
export function demoAuth(): AuthProvider {
  const user = { id: 'dev', email: null, accessToken: null }
  return { fromContext: async () => user, fromUpgrade: async () => user }
}
