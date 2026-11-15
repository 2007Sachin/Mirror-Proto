import type { Database } from 'sql.js'

/** Which database a query runs against. Seeded from the existing seed strings, in whichever thread runs it. */
export type Profile = 'practice' | 'target' | `case:${string}`

export async function openProfile(p: Profile): Promise<Database> {
  if (p === 'practice') return (await import('../db')).createPracticeDb()
  if (p === 'target') return (await import('../../../pages/target/sqlEngine')).createDatabase()
  return (await import('../../case/data')).createCaseDb(p.slice(5))
}
