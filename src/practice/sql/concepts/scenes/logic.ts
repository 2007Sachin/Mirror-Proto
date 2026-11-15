// Pure logic for the four concept scenes (index, normalisation, ACID, delete/truncate/drop). Callers: the scene components next to this file.

// ---------- Index ----------
export const CITIES = ['Pune', 'Delhi', 'Mumbai', 'Chennai']
export const CUSTOMERS = Array.from({ length: 24 }, (_, k) => ({ id: k + 1, name: ['Asha', 'Ben', 'Chitra', 'Dev', 'Esha', 'Farid'][k % 6], city: CITIES[(k * 3) % 4] }))
export const LEAF_SIZE = 4 // 24 rows -> 6 leaf pages; 2 branches over 3 leaves each; 1 root

/** Rows a full scan reads before it can stop at `id` (it must read every row up to and including the match). */
export const fullScanReads = (id: number) => { const at = CUSTOMERS.findIndex(c => c.id === id); return at < 0 ? CUSTOMERS.length : at + 1 }
export const leafOf = (id: number) => Math.floor((id - 1) / LEAF_SIZE)
export const branchOf = (id: number) => (leafOf(id) < 3 ? 0 : 1)
/** B-tree pages visited for a lookup: root, branch, leaf (the leaf already holds the row when clustered). */
export const treePath = (id: number) => [{ level: 'root', n: 0 }, { level: 'branch', n: branchOf(id) }, { level: 'leaf', n: leafOf(id) }]
export const pagesTouched = (id: number, clustered: boolean) => treePath(id).length + (clustered ? 0 : 1) // non-clustered: + key lookup into the table
export const indexUsable = (column: 'id' | 'city') => column === 'id'

/** Counters at each of the 6 steps (0 ready, 1-3 walking, 4 jump to row, 5 write cost). */
export function indexCounts(column: 'id' | 'city', clustered: boolean, step: number, id = 17) {
  const total = column === 'id' ? fullScanReads(id) : CUSTOMERS.length // ponytail: city has no index, so the scan reads every row
  const scan = [0, Math.round(total / 3), Math.round((total * 2) / 3), total, total, total][step]
  const full = pagesTouched(id, clustered)
  const hops = indexUsable(column) ? [0, 1, 2, 3, full, full][step] : 0
  return { scan, hops, total, full }
}

// ---------- Normalisation ----------
export interface NTable { name: string; cols: string[]; rows: string[][]; hl?: number[]; fk?: string }
export const RAW_ORDERS = [
  { order: '101', cust: 'C1', name: 'Asha', city: 'Pune', items: [['P1', 'Pen'], ['P2', 'Book']] },
  { order: '102', cust: 'C1', name: 'Asha', city: 'Pune', items: [['P1', 'Pen']] },
  { order: '103', cust: 'C2', name: 'Ben', city: 'Delhi', items: [['P2', 'Book']] },
  { order: '104', cust: 'C1', name: 'Asha', city: 'Pune', items: [['P3', 'Ink']] },
]
export const rawTable = (): NTable => ({ name: 'orders_sheet', cols: ['order', 'customer', 'city', 'items'], rows: RAW_ORDERS.map(o => [o.order, `${o.cust} ${o.name}`, o.city, o.items.map(i => i[1]).join(', ')]), hl: [3] })
/** 1NF: one atomic value per cell, one row per order line. */
export const to1NF = (): NTable => ({
  name: 'order_lines', cols: ['order', 'product_id', 'product', 'customer', 'city'],
  rows: RAW_ORDERS.flatMap(o => o.items.map(i => [o.order, i[0], i[1], o.cust, o.city])),
})
/** 2NF: product depends on product_id only (part of the key); customer and city depend on order only. */
export function to2NF(): NTable[] {
  const products = [...new Map(RAW_ORDERS.flatMap(o => o.items).map(i => [i[0], i])).values()]
  return [
    { name: 'order_items', cols: ['order', 'product_id'], rows: RAW_ORDERS.flatMap(o => o.items.map(i => [o.order, i[0]])), fk: 'product_id' },
    { name: 'products', cols: ['product_id', 'product'], rows: products.map(p => [p[0], p[1]]) },
    { name: 'orders', cols: ['order', 'customer', 'city'], rows: RAW_ORDERS.map(o => [o.order, o.cust, o.city]), hl: [2] },
  ]
}
/** 3NF: city depends on customer, not on the order. */
export function to3NF(): NTable[] {
  const [items, products] = to2NF()
  const custs = [...new Map(RAW_ORDERS.map(o => [o.cust, [o.cust, o.name, o.city]])).values()]
  return [items, products, { name: 'orders', cols: ['order', 'customer_id'], rows: RAW_ORDERS.map(o => [o.order, o.cust]), fk: 'customer_id' }, { name: 'customers', cols: ['customer_id', 'name', 'city'], rows: custs }]
}
/** Rows that must change when one customer moves city. */
export const rowsTouchedByCityChange = (cust: string, design: 'flat' | 'normalised') =>
  design === 'normalised' ? to3NF().find(t => t.name === 'customers')!.rows.filter(r => r[0] === cust).length : to1NF().rows.filter(r => r[3] === cust).length

// ---------- ACID ----------
export type AcidProp = 'atomicity' | 'consistency' | 'isolation' | 'durability'
export interface AcidStep { a: number; b: number; sql: string; caption: string; flag?: 'crash' | 'refused' | 'log' | 'off' | 'restart' | 'ok' }
export const START = { a: 300, b: 50 }
export function acidSteps(p: Exclude<AcidProp, 'isolation'>): AcidStep[] {
  const { a, b } = START
  if (p === 'atomicity') return [
    { a, b, sql: 'BEGIN;', caption: 'A has 300 and B has 50. We start a transfer of 100.' },
    { a: a - 100, b, sql: 'UPDATE accounts SET bal = bal - 100 WHERE id = A;', caption: 'The debit from A is done, but B has not been credited yet.' },
    { a: a - 100, b, sql: '-- server crashes here', flag: 'crash', caption: 'The server crashes half way. 100 has left A and gone nowhere.' },
    { a, b, sql: 'ROLLBACK;', flag: 'ok', caption: 'ROLLBACK undoes the debit. A is back to 300: all or nothing.' },
  ]
  if (p === 'consistency') return [
    { a, b, sql: 'CHECK (bal >= 0)', caption: 'The table has a rule: a balance can never go below zero.' },
    { a: a - 500, b: b + 500, sql: 'UPDATE ... SET bal = bal - 500 WHERE id = A;', caption: 'We try to move 500 out of an account that holds 300.' },
    { a: a - 500, b, sql: 'ERROR: CHECK constraint violated', flag: 'refused', caption: 'The new balance would be -200, so the CHECK rejects it.' },
    { a, b, sql: 'ROLLBACK;', flag: 'ok', caption: 'The transaction is refused and the data stays valid.' },
  ]
  return [
    { a, b, sql: 'BEGIN; UPDATE ...', caption: 'A 300, B 50. The transfer changes data in memory first.' },
    { a: a - 100, b: b + 100, sql: 'COMMIT;', flag: 'log', caption: 'COMMIT writes the change to the log file on disk before it reports success.' },
    { a: a - 100, b: b + 100, sql: '-- power off', flag: 'off', caption: 'Power goes off. Everything held in memory is lost.' },
    { a: a - 100, b: b + 100, sql: '-- restart', flag: 'restart', caption: 'The database restarts and reads its log.' },
    { a: a - 100, b: b + 100, sql: 'SELECT * FROM accounts;', flag: 'ok', caption: 'A 200, B 150. The committed transfer is still there.' },
  ]
}
export type Level = 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable'
export type Anomaly = 'dirty' | 'nonrep' | 'phantom'
export const LEVELS: [Level, string][] = [['read-uncommitted', 'Read uncommitted'], ['read-committed', 'Read committed'], ['repeatable-read', 'Repeatable read'], ['serializable', 'Serializable']]
export const ANOMALIES: [Anomaly, string][] = [['dirty', 'Dirty read'], ['nonrep', 'Non-repeatable read'], ['phantom', 'Phantom']]
const RANK: Record<Level, number> = { 'read-uncommitted': 0, 'read-committed': 1, 'repeatable-read': 2, serializable: 3 }
/** Lowest level that prevents the anomaly (SQL-standard table; real engines vary, e.g. Postgres repeatable read also blocks phantoms). */
export const MIN_LEVEL: Record<Anomaly, Level> = { dirty: 'read-committed', nonrep: 'repeatable-read', phantom: 'serializable' }
export const prevented = (an: Anomaly, lv: Level) => RANK[lv] >= RANK[MIN_LEVEL[an]]
export interface IsoStep { s1: string; s2: string; caption: string; bad?: boolean }
export function isoSteps(an: Anomaly, lv: Level): IsoStep[] {
  const bad = !prevented(an, lv)
  if (an === 'dirty') return [
    { s1: 'BEGIN', s2: 'BEGIN', caption: 'Two sessions open. Account A holds 300.' },
    { s1: 'UPDATE A = 200 (not committed)', s2: '', caption: 'Session 1 changes A but has not committed.' },
    { s1: '', s2: bad ? 'SELECT A -> 200' : 'SELECT A -> 300', bad, caption: bad ? 'Session 2 reads 200: a value that was never committed.' : 'Session 2 still sees the old value, 300, until Session 1 commits.' },
    { s1: 'ROLLBACK (A = 300)', s2: bad ? 'holds a value that never existed' : 'saw only real data', bad, caption: bad ? 'Session 1 rolls back, so Session 2 acted on a dirty read.' : 'Session 1 rolls back and nothing wrong was seen.' },
  ]
  if (an === 'nonrep') return [
    { s1: 'BEGIN', s2: 'BEGIN', caption: 'Two sessions open. Account A holds 300.' },
    { s1: '', s2: 'SELECT A -> 300', caption: 'Session 2 reads A and gets 300.' },
    { s1: 'UPDATE A = 200; COMMIT', s2: '', caption: 'Session 1 changes A and commits.' },
    { s1: '', s2: bad ? 'SELECT A -> 200' : 'SELECT A -> 300', bad, caption: bad ? 'Same query, new answer inside one transaction: a non-repeatable read.' : 'Session 2 reads the same 300 again for the whole transaction.' },
  ]
  return [
    { s1: 'BEGIN', s2: 'BEGIN', caption: 'Two sessions open. Two accounts have a balance above 100.' },
    { s1: '', s2: 'COUNT(bal > 100) -> 2', caption: 'Session 2 counts matching rows and gets 2.' },
    { s1: 'INSERT account C (500); COMMIT', s2: '', caption: 'Session 1 adds a new matching row and commits.' },
    { s1: '', s2: bad ? 'COUNT(bal > 100) -> 3' : 'COUNT(bal > 100) -> 2', bad, caption: bad ? 'A new row appeared in the same range: a phantom.' : 'The count stays 2, so no phantom row appears.' },
  ]
}

// ---------- DELETE / TRUNCATE / DROP ----------
export type Cmd = 'delete' | 'truncate' | 'drop'
export const SIX = [1, 2, 3, 4, 5, 6].map(id => ({ id, item: ['Pen', 'Book', 'Ink', 'Tape', 'Clip', 'Glue'][id - 1] }))
export interface Effect { rows: number; tableExists: boolean; indexesExist: boolean; identityReset: boolean }
export function commandEffect(cmd: Cmd, total = 6, whereMatches = 1): Effect {
  if (cmd === 'delete') return { rows: total - whereMatches, tableExists: true, indexesExist: true, identityReset: false }
  if (cmd === 'truncate') return { rows: 0, tableExists: true, indexesExist: true, identityReset: true }
  return { rows: 0, tableExists: false, indexesExist: false, identityReset: false }
}
export const COMPARE: { label: string; delete: string; truncate: string; drop: string }[] = [
  { label: 'Removes', delete: 'Chosen rows', truncate: 'All rows', drop: 'Rows, structure, indexes' },
  { label: 'WHERE', delete: 'Allowed', truncate: 'No', drop: 'No' },
  { label: 'Logging', delete: 'Per row', truncate: 'Minimal', drop: 'Minimal' },
  { label: 'ROLLBACK', delete: 'Yes, in a transaction', truncate: 'Depends on the database', drop: 'Do not count on it' },
  { label: 'Triggers', delete: 'Fire per row', truncate: 'Do not fire', drop: 'Do not fire' },
  { label: 'Identity', delete: 'Keeps counting', truncate: 'Resets', drop: 'Gone with the table' },
]
