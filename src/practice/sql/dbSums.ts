import type { Database } from 'sql.js'
// Row count + checksum per original table, used by the db test to prove the company seed never touched them.
export const ORIGINAL_TABLES = ['customers', 'orders', 'users', 'events', 'products', 'order_items', 'employees', 'logins', 'activity', 'subscriptions', 'contacts']
export function baselineSums(db: Database): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {}
  for (const t of ORIGINAL_TABLES) {
    const rows = db.exec(`SELECT * FROM ${t} ORDER BY rowid`)[0].values
    let h = 5381
    for (const ch of JSON.stringify(rows)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0
    out[t] = [rows.length, h]
  }
  return out
}
