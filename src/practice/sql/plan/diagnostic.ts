// Hand-authored predict-the-output check. Nothing here is run; every answer is worked out by hand and is unambiguous.
import type { SqlLevelId } from '../curriculum'

export type Conf = 'guess' | 'fairly' | 'certain'
export interface Tbl { name: string; cols: string[]; rows: (string | number | null)[][] }
export interface DiagItem { id: string; group: string; tables: Tbl[]; sql: string; ask: string; options: string[]; answer: number; why: string }
export interface Group { label: string; level: SqlLevelId; modules: string[] }

export const GROUPS: Record<string, Group> = {
  nulls: { label: 'comparing with NULL', level: 'beginner', modules: ['b3-nulls'] },
  'where-having': { label: 'when WHERE and HAVING run', level: 'beginner', modules: ['b4-group-by'] },
  aggregates: { label: 'counting around NULLs', level: 'beginner', modules: ['b3-nulls', 'b4-group-by'] },
  fanout: { label: 'joins that repeat rows', level: 'pro', modules: ['p7-joins-fanout'] },
  'anti-join': { label: 'finding rows with no match', level: 'pro', modules: ['p7-joins-fanout'] },
  'rank-ties': { label: 'ranks with ties', level: 'pro', modules: ['p10-windows'] },
  'not-in': { label: 'NOT IN with a NULL in the list', level: 'pro', modules: ['p8-subqueries'] },
  islands: { label: 'runs of consecutive values', level: 'advanced', modules: ['a14-gaps-islands'] },
}

export const DIAG: DiagItem[] = [
  {
    id: 'd1', group: 'nulls',
    tables: [{ name: 'people', cols: ['name', 'city'], rows: [['Asha', 'Pune'], ['Ben', null], ['Chen', 'Delhi']] }],
    sql: "SELECT name FROM people\nWHERE city <> 'Pune'", ask: 'Which names come back?',
    options: ['Ben and Chen', 'Chen only', 'Asha, Ben and Chen', 'No rows'], answer: 1,
    why: "Ben has no city, so the test is unknown for him, not true. WHERE keeps only rows where the test is true.",
  },
  {
    id: 'd2', group: 'where-having',
    tables: [{ name: 'orders', cols: ['region', 'amt'], rows: [['N', 40], ['N', 90], ['S', 15], ['S', 60], ['E', 70]] }],
    sql: 'SELECT region, COUNT(*) FROM orders\nWHERE amt > 50\nGROUP BY region\nHAVING COUNT(*) > 1', ask: 'What comes back?',
    options: ['N 2 and S 2', 'N 1, S 1 and E 1', 'N 2 only', 'No rows'], answer: 3,
    why: 'WHERE runs first and leaves N 90, S 60 and E 70. Each region now has one row, so HAVING COUNT(*) > 1 removes all of them.',
  },
  {
    id: 'd3', group: 'aggregates',
    tables: [{ name: 'scores', cols: ['name', 'score'], rows: [['Asha', 10], ['Ben', null], ['Chen', 20]] }],
    sql: 'SELECT COUNT(score), COUNT(*)\nFROM scores', ask: 'What are the two numbers?',
    options: ['3 and 3', '2 and 2', '2 and 3', '3 and 2'], answer: 2,
    why: 'COUNT(score) skips the NULL, so it is 2. COUNT(*) counts every row, so it is 3.',
  },
  {
    id: 'd4', group: 'fanout',
    tables: [
      { name: 'customers', cols: ['id', 'name', 'credit'], rows: [[1, 'Asha', 100], [2, 'Ben', 50]] },
      { name: 'orders', cols: ['id', 'cust'], rows: [[101, 1], [102, 1], [103, 2]] },
    ],
    sql: 'SELECT SUM(c.credit)\nFROM customers c\nJOIN orders o ON o.cust = c.id', ask: 'What is the sum?',
    options: ['150', '200', '250', '300'], answer: 2,
    why: 'Asha has two orders, so her row appears twice: 100 + 100 + 50 = 250. The customers really hold 150.',
  },
  {
    id: 'd5', group: 'anti-join',
    tables: [
      { name: 'customers', cols: ['id', 'name'], rows: [[1, 'Asha'], [2, 'Ben'], [3, 'Chen']] },
      { name: 'orders', cols: ['id', 'cust'], rows: [[101, 1], [102, 1]] },
    ],
    sql: 'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.cust = c.id\nWHERE o.id IS NULL', ask: 'Which names come back?',
    options: ['Asha', 'Ben and Chen', 'All three', 'No rows'], answer: 1,
    why: 'LEFT JOIN keeps every customer and fills NULL where no order matched. Only Ben and Chen have no order.',
  },
  {
    id: 'd6', group: 'rank-ties',
    tables: [{ name: 'scores', cols: ['name', 'score'], rows: [['Asha', 90], ['Ben', 80], ['Chen', 80], ['Dia', 70]] }],
    sql: 'SELECT name,\n  RANK() OVER (ORDER BY score DESC) AS r\nFROM scores', ask: 'What rank does Dia get?',
    options: ['2', '3', '4', 'No rank'], answer: 2,
    why: 'Ben and Chen tie for 2nd. RANK leaves a gap after a tie, so the next rank is 4. DENSE_RANK would say 3.',
  },
  {
    id: 'd7', group: 'not-in',
    tables: [
      { name: 'teams', cols: ['id'], rows: [[1], [2], [3]] },
      { name: 'blocked', cols: ['team_id'], rows: [[1], [null]] },
    ],
    sql: 'SELECT id FROM teams\nWHERE id NOT IN (SELECT team_id FROM blocked)', ask: 'Which ids come back?',
    options: ['2 and 3', '1', 'All three', 'No rows'], answer: 3,
    why: 'With a NULL in the list, "2 is not in the list" is unknown, not true, so every row is dropped. NOT EXISTS avoids this.',
  },
  {
    id: 'd8', group: 'islands',
    tables: [{ name: 'logins', cols: ['day'], rows: [[1], [2], [3], [5], [6], [9]] }],
    sql: 'SELECT day - ROW_NUMBER() OVER (ORDER BY day) AS k\nFROM logins', ask: 'How many different values does k take?',
    options: ['1', '2', '3', '6'], answer: 2,
    why: 'k is 0, 0, 0, 1, 1, 3. Rows in one run of consecutive days share a k, so three values means three runs.',
  },
]
