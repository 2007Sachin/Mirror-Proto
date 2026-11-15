// Runs learner SQL off the main thread. The page ends this worker if a query runs too long.
import type { Database } from 'sql.js'
import { loadSql } from '../../../pages/target/sqlEngine'
import { checkSql } from './sqlGuard'
import { runWithLimit } from './exec'
import { openProfile, type Profile } from './profiles'

const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null }
const dbs = new Map<Profile, Promise<Database>>()

ctx.onmessage = async (e: MessageEvent) => {
  const m = e.data
  if (m.type !== 'run') return
  try {
    const checked = checkSql(m.sql)
    if ('error' in checked) return ctx.postMessage({ type: 'result', id: m.id, error: checked.error })
    let p = dbs.get(m.profile)
    if (!p) { p = openProfile(m.profile); dbs.set(m.profile, p); p.catch(() => dbs.delete(m.profile)) }
    const db = await p.catch(() => null)
    if (!db) return ctx.postMessage({ type: 'result', id: m.id, error: 'The practice database did not load.' })
    ctx.postMessage({ type: 'result', id: m.id, ...runWithLimit(db, checked.sql, m.limit) })
  } catch (err) {
    ctx.postMessage({ type: 'result', id: m.id, error: err instanceof Error ? err.message : 'The query could not run.' })
  }
}

loadSql().then(() => ctx.postMessage({ type: 'ready' }), err => ctx.postMessage({ type: 'failed', message: String(err) }))
