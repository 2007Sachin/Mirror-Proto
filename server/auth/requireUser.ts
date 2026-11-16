import { createMiddleware } from 'hono/factory'
import type { AuthProvider, AuthUser, RepoFactory } from './types.js'
import type { Repository } from '../repo/types.js'

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    /** The user's id; every repository call is scoped by it. */
    workspace: string
    repo: Repository
  }
}

/** 401 unless the session resolves; then exposes `user`, `workspace` (= user.id) and the per-request `repo`. */
export function requireUser(auth: AuthProvider, repoFor: RepoFactory) {
  return createMiddleware(async (c, next) => {
    const user = await auth.fromContext(c)
    if (!user) return c.json({ error: 'unauthenticated' }, 401)
    const repo = repoFor(user)
    c.set('user', user)
    c.set('workspace', user.id)
    c.set('repo', repo)
    await repo.ensureWorkspace(user.id)
    await next()
  })
}
