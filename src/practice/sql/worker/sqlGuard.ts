// ponytail: keyword blocklist + "no semicolon inside" guards a throwaway in-memory DB, it is not a SQL parser.
// A string literal containing a semicolon, or a column named like a keyword, is rejected; fine for these problems.
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|replace|pragma|attach|detach|vacuum|reindex)\b/i

/** Shared by the synchronous runQuery and the worker: one SELECT/WITH statement, comments and a trailing ; removed. */
export function checkSql(sql: string): { sql: string } | { error: string } {
  const clean = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;+\s*$/, '').trim()
  if (!clean) return { error: 'Write a query first.' }
  if (clean.includes(';')) return { error: 'Run one statement at a time.' }
  if (!/^(select|with)\b/i.test(clean) || FORBIDDEN.test(clean)) return { error: 'Only SELECT queries can run here.' }
  return { sql: clean }
}
