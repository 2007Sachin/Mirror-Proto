import type { Database } from 'sql.js'
import type { QueryResult } from '../../../pages/target/sqlEngine'

/**
 * Runs one checked statement row by row, so a query that never ends still hands back its first rows.
 * Keeps `limit` rows, counts up to `scan` rows, then stops and sets `truncated`. The SQL is never wrapped in a LIMIT.
 */
export function runWithLimit(db: Database, sql: string, limit: number, scan = 10000): QueryResult {
  try {
    const st = db.prepare(sql)
    try {
      const columns = st.getColumnNames()
      const rows: unknown[][] = []
      let total = 0, truncated = false
      while (st.step()) {
        if (total === scan) { truncated = true; break }
        if (total < limit) rows.push(st.get())
        total++
      }
      return { columns: total ? columns : [], rows, total, ...(truncated ? { truncated } : {}) }
    } finally { st.free() }
  } catch (e) {
    return { error: e instanceof Error ? e.message.replace(/^Error:\s*/, '') : 'The query could not run.' }
  }
}
