import { createMiddleware } from 'hono/factory'
import type { Repository } from '../repo/types.js'

declare module 'hono' {
  interface ContextVariableMap {
    workspace: string
  }
}

/**
 * Requires X-Dev-Workspace (Phase 1 has no auth; the header stands in for the
 * future workspace scope). Resolves/creates the workspace for the request.
 */
export function workspaceMiddleware(repo: Repository) {
  return createMiddleware(async (c, next) => {
    const slug = c.req.header('X-Dev-Workspace')
    if (!slug || slug.trim().length === 0) {
      return c.json({ error: 'workspace_header_required' }, 400)
    }
    await repo.ensureWorkspace(slug)
    c.set('workspace', slug)
    await next()
  })
}
