import type { AuthProvider, AuthUser } from './types.js'

const asUser = (id: string | undefined | null): AuthUser | null => {
  const trimmed = id?.trim()
  return trimmed ? { id: trimmed, email: null, accessToken: null } : null
}

/** Tests only, never selected by env: the user is whatever the X-Test-User header says. */
export function testAuth(): AuthProvider {
  return {
    fromContext: async c => asUser(c.req.header('X-Test-User')),
    fromUpgrade: async req => asUser(req.headers['x-test-user'] as string | undefined),
  }
}
