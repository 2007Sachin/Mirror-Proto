import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import type { Api, RouteDeps } from './deps.js'

const deleteSchema = z.object({ confirm: z.literal('DELETE') })

/**
 * Account routes: data export and delete. Guarded: requireUser covers /me/*.
 * `clearCaches(workspace)` drops that user's in-memory server caches (coach notes, idempotency keys).
 */
export function registerMeRoutes(api: Api, _deps: RouteDeps, clearCaches: (workspace: string) => void = () => {}): void {
  api.get('/me/export', async c => {
    const data = await c.get('repo').exportAllData(c.get('workspace'))
    const day = new Date().toISOString().slice(0, 10)
    c.header('Content-Disposition', `attachment; filename="mirror-export-${day}.json"`)
    c.header('Cache-Control', 'no-store')
    return c.json({ ...data, exportedAt: new Date().toISOString() })
  })

  api.delete('/me/data', async c => {
    const parsed = deleteSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) throw new AppError(400, 'confirmation_required', { message: 'Send { "confirm": "DELETE" } to remove your data.' })
    const workspace = c.get('workspace')
    await c.get('repo').deleteAllData(workspace)
    clearCaches(workspace)
    return c.json({ deleted: true, message: 'Your practice data is deleted. Your sign-in account is still there.' })
  })
}
