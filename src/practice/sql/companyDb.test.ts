import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { companyTables, createPracticeDb, practiceTables, SNAPSHOT_DATE } from './db'
import { baselineSums, ORIGINAL_TABLES } from './dbSums'

const wasm = decodeURIComponent(new URL('../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database
const one = (sql: string) => db.exec(sql)[0].values[0][0] as number

// Captured before the company tables were added: [row count, checksum of rows].
const BEFORE: Record<string, [number, number]> = {
  customers: [12, 3800154575], orders: [30, 3197397594], users: [15, 4163034306], events: [109, 197805976], products: [9, 1576713305],
  order_items: [17, 362017918], employees: [11, 1222575115], logins: [17, 4065032373], activity: [13, 297535311], subscriptions: [10, 1525095216], contacts: [7, 2134620166],
}

describe('company practice tables', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('leaves every original table unchanged', () => { expect(baselineSums(db)).toEqual(BEFORE); expect(Object.keys(BEFORE)).toEqual(ORIGINAL_TABLES) })
  it('has at least 5 rows in every new table, and lists them for the schema panel', () => {
    for (const t of companyTables) {
      expect(one(`SELECT COUNT(*) FROM ${t.name}`), t.name).toBeGreaterThanOrEqual(5)
      expect(practiceTables.map(x => x.name), t.name).toContain(t.name)
    }
    expect(one("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")).toBe(ORIGINAL_TABLES.length + companyTables.length)
  })
  it('foreign keys resolve', () => {
    const orphans = (child: string, col: string, parent: string) =>
      one(`SELECT COUNT(*) FROM ${child} c WHERE c.${col} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${parent} p WHERE p.${parent === 'employees' || parent === 'customers' || parent === 'products' || parent === 'orders' || parent === 'departments' || parent === 'projects' || parent === 'sales_reps' || parent === 'suppliers' || parent === 'support_agents' ? 'id' : 'id'} = c.${col})`)
    const fks: [string, string, string][] = [
      ['emp_profile', 'emp_id', 'employees'], ['emp_profile', 'dept_id', 'departments'], ['salary_history', 'emp_id', 'employees'], ['promotions', 'emp_id', 'employees'],
      ['bonuses', 'emp_id', 'employees'], ['leave_requests', 'emp_id', 'employees'], ['dependents', 'emp_id', 'employees'], ['projects', 'dept_id', 'departments'],
      ['project_assignments', 'emp_id', 'employees'], ['project_assignments', 'project_id', 'projects'], ['timesheets', 'emp_id', 'employees'], ['shifts', 'emp_id', 'employees'],
      ['emp_dept_history', 'emp_id', 'employees'], ['emp_dept_history', 'dept_id', 'departments'], ['job_openings', 'dept_id', 'departments'],
      ['payments', 'order_id', 'orders'], ['shipments', 'order_id', 'orders'], ['returns', 'order_id', 'orders'], ['returns', 'product_id', 'products'],
      ['reviews', 'product_id', 'products'], ['reviews', 'customer_id', 'customers'], ['deals', 'rep_id', 'sales_reps'], ['deals', 'customer_id', 'customers'],
      ['discounts', 'order_id', 'orders'], ['product_prices', 'product_id', 'products'], ['sales', 'product_id', 'products'], ['sales', 'customer_id', 'customers'],
      ['customer_info', 'customer_id', 'customers'], ['deliveries', 'supplier_id', 'suppliers'], ['deliveries', 'product_id', 'products'],
      ['support_tickets', 'customer_id', 'customers'], ['support_tickets', 'agent_id', 'support_agents'],
    ]
    for (const [c, col, p] of fks) expect(orphans(c, col, p), `${c}.${col}`).toBe(0)
  })
  it('gives every employee a profile and keeps the patterns the questions rely on', () => {
    expect(one('SELECT COUNT(*) FROM employees e LEFT JOIN emp_profile p ON p.emp_id = e.id WHERE p.emp_id IS NULL')).toBe(0)
    expect(one('SELECT COUNT(*) FROM emp_profile WHERE dept_id IS NULL')).toBeGreaterThan(0)
    expect(one('SELECT COUNT(*) FROM employees e JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = e.manager_id WHERE pm.hire_date > pe.hire_date')).toBeGreaterThan(0)
    expect(one('SELECT COUNT(*) FROM (SELECT birth_date FROM emp_profile GROUP BY birth_date HAVING COUNT(*) > 1)')).toBeGreaterThan(0)
    expect(one('SELECT COUNT(*) FROM (SELECT amount FROM bonuses GROUP BY amount HAVING COUNT(*) > 1)')).toBeGreaterThan(0)
    expect(one('SELECT COUNT(*) FROM employees e JOIN salary_history s ON s.emp_id = e.id AND s.effective_date = (SELECT MAX(effective_date) FROM salary_history WHERE emp_id = e.id) WHERE s.salary <> e.salary')).toBe(0)
    expect(one('SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM sales s WHERE s.product_id = p.id)')).toBeGreaterThan(0)
    expect(one(`SELECT COUNT(*) FROM sales WHERE sale_date > '${SNAPSHOT_DATE}'`)).toBe(0)
    expect(one("SELECT COUNT(*) FROM (SELECT customer_id FROM sales GROUP BY customer_id HAVING COUNT(DISTINCT strftime('%m', sale_date)) = 12)")).toBeGreaterThan(0)
  })
})
