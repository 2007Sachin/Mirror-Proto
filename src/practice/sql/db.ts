import type { Database } from 'sql.js'
import { loadSql } from '../../pages/target/sqlEngine'
import { schemaTables, seedSql } from '../../pages/target/sqlProblems'

// Own practice database: the target round's customers/orders seed (untouched) plus users and events.
export const practiceTables = [
  ...schemaTables,
  { name: 'users', columns: ['id', 'signup_date', 'country (can be NULL)'] },
  { name: 'events', columns: ['id', 'user_id', "event ('signup', 'view_item', 'add_to_cart', 'checkout', 'purchase', 'visit')", "ts ('YYYY-MM-DD HH:MM:SS')"] },
  { name: 'products', columns: ['id', 'name', 'category', 'price'] },
  { name: 'order_items', columns: ['id', 'order_id', 'product_id', 'qty'] },
  { name: 'employees', columns: ['id', 'name', 'manager_id (NULL for the top boss)', 'dept', 'salary'] },
  { name: 'logins', columns: ['user_id', "login_date ('YYYY-MM-DD')"] },
  { name: 'activity', columns: ['id', 'user_id', "ts ('YYYY-MM-DD HH:MM:SS')"] },
  { name: 'subscriptions', columns: ['id', 'user_id', 'plan', 'start_date', 'end_date (NULL while active)'] },
  { name: 'contacts', columns: ['id', 'name', 'email'] },
]

const STEPS = ['signup', 'view_item', 'add_to_cart', 'checkout', 'purchase']
// How many funnel steps each of the 15 users reached. Distinct users per step: 15, 13, 10, 7, 4.
const REACHED = [5, 5, 4, 3, 2, 5, 3, 2, 4, 1, 3, 5, 2, 4, 1]
const COUNTRIES: (string | null)[] = ['US', 'India', 'UK', null, 'US', 'Germany', 'India', 'US', 'UK', 'Germany', null, 'US', 'India', 'UK', 'US']

const day = (base: string, plus: number) => new Date(Date.parse(`${base}T00:00:00Z`) + plus * 864e5).toISOString().slice(0, 10)

export function extraSeed(): string {
  const users: string[] = []
  const events: string[] = []
  let eid = 1
  REACHED.forEach((reached, k) => {
    const id = k + 1
    const signup = day('2025-01-01', id % 9)
    const c = COUNTRIES[k]
    users.push(`INSERT INTO users VALUES (${id}, '${signup}', ${c === null ? 'NULL' : `'${c}'`});`)
    for (let s = 0; s < reached; s++) {
      events.push(`INSERT INTO events VALUES (${eid++}, ${id}, '${STEPS[s]}', '${signup} ${String(9 + s).padStart(2, '0')}:00:00');`)
    }
    for (let d = 1; d <= 10; d++) {
      if ((id * 7 + d * 3) % 5 < 2) events.push(`INSERT INTO events VALUES (${eid++}, ${id}, 'visit', '${day(signup, d)} 12:00:00');`)
    }
  })
  return `CREATE TABLE users (id INTEGER PRIMARY KEY, signup_date TEXT, country TEXT);
CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER, event TEXT, ts TEXT);
${users.join('\n')}
${events.join('\n')}`
}

// Extra tables for the pro/advanced drills. Purely additive: nothing above is changed.
// ponytail: tiny hand-typed rows, so every expected result stays checkable by eye; generate bigger data only if a drill needs volume.
export const moreSeed = `
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);
INSERT INTO products VALUES (1,'Notebook','Stationery',12.5),(2,'Pen Set','Stationery',8),(3,'Desk Lamp','Home',45),(4,'Chair','Home',130),(5,'Headphones','Electronics',90),(6,'Keyboard','Electronics',60),(7,'Mug','Home',9.5),(8,'Backpack','Accessories',55),(9,'Webcam','Electronics',70);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, qty INTEGER);
INSERT INTO order_items VALUES (1,1,4,1),(2,1,1,2),(3,2,5,1),(4,3,7,1),(5,3,2,2),(6,4,4,1),(7,4,3,1),(8,4,7,2),(9,5,1,3),(10,6,6,1),(11,6,8,1),(12,7,2,1),(13,8,3,2),(14,8,6,1),(15,9,8,1),(16,9,7,1),(17,10,2,1);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER, dept TEXT, salary INTEGER);
INSERT INTO employees VALUES (1,'Maya',NULL,'Exec',250),(2,'Noah',1,'Eng',180),(3,'Olivia',1,'Sales',170),(4,'Pat',2,'Eng',140),(5,'Quinn',2,'Eng',135),(6,'Raj',3,'Sales',110),(7,'Sara',3,'Sales',105),(8,'Tom',4,'Eng',100),(9,'Uma',4,'Eng',95),(10,'Vik',6,'Sales',80),(11,'Wen',5,'Eng',90);
CREATE TABLE logins (user_id INTEGER, login_date TEXT);
INSERT INTO logins VALUES (1,'2025-01-02'),(1,'2025-01-03'),(1,'2025-01-04'),(1,'2025-01-07'),(1,'2025-01-08'),(1,'2025-01-12'),(2,'2025-01-02'),(2,'2025-01-05'),(2,'2025-01-06'),(2,'2025-01-07'),(2,'2025-01-08'),(2,'2025-01-09'),(3,'2025-01-10'),(4,'2025-01-03'),(4,'2025-01-04'),(4,'2025-01-05'),(4,'2025-01-06');
CREATE TABLE activity (id INTEGER PRIMARY KEY, user_id INTEGER, ts TEXT);
INSERT INTO activity VALUES (1,1,'2025-02-01 09:00:00'),(2,1,'2025-02-01 09:10:00'),(3,1,'2025-02-01 09:25:00'),(4,1,'2025-02-01 10:10:00'),(5,1,'2025-02-01 10:20:00'),(6,1,'2025-02-01 14:00:00'),(7,2,'2025-02-01 08:00:00'),(8,2,'2025-02-01 08:20:00'),(9,2,'2025-02-01 08:50:00'),(10,2,'2025-02-01 09:15:00'),(11,2,'2025-02-01 13:00:00'),(12,3,'2025-02-01 11:00:00'),(13,3,'2025-02-02 11:05:00');
CREATE TABLE subscriptions (id INTEGER PRIMARY KEY, user_id INTEGER, plan TEXT, start_date TEXT, end_date TEXT);
INSERT INTO subscriptions VALUES (1,1,'basic','2025-01-02',NULL),(2,2,'pro','2025-01-03','2025-03-10'),(3,3,'basic','2025-01-04','2025-02-05'),(4,4,'pro','2025-01-05',NULL),(5,5,'basic','2025-01-06','2025-01-30'),(6,6,'basic','2025-02-01',NULL),(7,7,'pro','2025-02-03','2025-04-01'),(8,8,'basic','2025-02-10',NULL),(9,9,'pro','2025-03-01',NULL),(10,10,'basic','2025-03-05','2025-03-20');
CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
INSERT INTO contacts VALUES (1,'Ana Diaz','ana@x.com'),(2,'ana diaz','Ana@x.com'),(3,'Bo Lee','bo@x.com'),(4,'Cy Wu','cy@x.com'),(5,'Bo Lee','BO@x.com '),(6,'Cy Wu','cy@x.com'),(7,'Di Roy','di@x.com');
`

// ---------------------------------------------------------------------------------------------
// Company tables (HR + sales). Purely additive: every table above keeps its columns and rows.
// SNAPSHOT DATE: the data is a fixed snapshot taken on 2025-12-31. "Last 6 months", "this quarter",
// "this year" and age/tenure questions compare against that literal date, never date('now'):
//   WHERE effective_date >= date('2025-12-31', '-6 months')
// All dates sit inside 2025, except hire/birth/history dates which go back further.
// ponytail: hand-typed rows, tiny on purpose; the few generated tables (sales, timesheets, tickets,
// weather, deliveries) use fixed formulas so results stay deterministic.
// ---------------------------------------------------------------------------------------------
export const SNAPSHOT_DATE = '2025-12-31'

type Cell = string | number | null
const rows = (r: Cell[][]) => r.map(x => `(${x.map(c => (c === null ? 'NULL' : typeof c === 'string' ? `'${c}'` : c)).join(',')})`).join(',')
const ins = (table: string, r: Cell[][]) => `INSERT INTO ${table} VALUES ${rows(r)};`

const PRICE = [0, 12.5, 8, 45, 130, 90, 60, 9.5, 55] // products.price by id
// units sold per month (Jan..Dec) per product id 1..8; product 9 is never sold
const UNITS = [
  [5, 6, 8, 9, 9, 7, 6, 8, 10, 12, 14, 20], [4, 4, 4, 5, 6, 7, 9, 12, 3, 3, 2, 2], [0, 0, 3, 4, 5, 0, 0, 2, 3, 3, 4, 6],
  [2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [6, 5, 4, 3, 4, 5, 6, 7, 6, 5, 4, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 18], [1, 1, 2, 2, 2, 0, 0, 15, 8, 2, 1, 1],
]
const sales: Cell[][] = []
const sale = (p: number, c: number, m: number, d: number, q: number) =>
  sales.push([sales.length + 1, p, c, `2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, q, q * PRICE[p]])
UNITS.forEach((u, i) => u.forEach((q, k) => { if (q) sale(i + 1, ((i + 1) * 3 + (k + 1) * 2) % 10 + 1, k + 1, 3 + ((i + 1) * 7 + (k + 1) * 5) % 24, q) }))
for (let m = 1; m <= 12; m++) sale(((m - 1) % 8) + 1, 1, m, 28, 1) // customer 1 buys every month, all four categories
for (const m of [1, 4, 7, 10]) sale(((m - 1) / 3 | 0) + 1, 2, m, 27, 1) // customer 2 buys in every quarter

// consecutive calendar-day runs of work in December: [emp, start day, length, fixed hours or 0 for varied]
const timesheets: Cell[][] = []
for (const [e, s, n, h] of [[2, 1, 5, 0], [2, 8, 5, 0], [2, 15, 5, 0], [3, 1, 6, 0], [4, 1, 10, 0], [4, 15, 3, 0], [5, 3, 2, 0], [5, 8, 3, 0], [6, 1, 7, 8], [7, 10, 1, 0], [7, 12, 2, 0], [8, 1, 3, 0], [8, 5, 1, 0], [9, 2, 4, 0], [10, 1, 2, 0], [10, 4, 2, 0], [10, 8, 2, 0]])
  for (let d = 0; d < n; d++) timesheets.push([timesheets.length + 1, e, `2025-12-${String(s + d).padStart(2, '0')}`, h || 6 + ((e * 3 + d) % 5), (e + d) % 4 === 0 ? 1 : 0])

const SUPPLY: [number, string][] = [[1, 'NSEW'], [2, 'NSE'], [3, 'NSEW'], [4, 'W']]
const REGION: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }
const deliveries: Cell[][] = []
for (const [s, rs] of SUPPLY) for (const r of rs) deliveries.push([deliveries.length + 1, s, (deliveries.length % 8) + 1, REGION[r], day('2025-01-10', deliveries.length * 9)])

const tickets: Cell[][] = []
for (let i = 1; i <= 16; i++) {
  const opened = day('2025-09-01', i * 5)
  tickets.push([i, ((i * 5) % 12) + 1, (i % 3) + 1, opened, i % 6 === 0 ? null : day(opened, 1 + ((i * 3) % 9))])
}
const weather: Cell[][] = []
for (let d = 1; d <= 14; d++) for (let k = 0; k < 3; k++) weather.push([weather.length + 1, day('2025-12-01', d - 1), 2 + ((d * 5 + k * 7) % 11)])

// salary by year 2022..2025 per employee (0 = not yet hired); the 2025 value equals employees.salary
const SALARY_BY_YEAR: [number, number[]][] = [
  [1, [220, 235, 250, 250]], [2, [150, 160, 170, 180]], [3, [150, 165, 170, 170]], [4, [110, 120, 130, 140]], [5, [120, 125, 130, 135]], [6, [100, 110, 110, 110]],
  [7, [90, 95, 105, 105]], [8, [0, 85, 95, 100]], [9, [0, 0, 90, 95]], [10, [70, 75, 85, 80]], [11, [0, 0, 0, 90]],
]
const salaryHistory: Cell[][] = []
for (const [e, ys] of SALARY_BY_YEAR) ys.forEach((s, k) => { if (s) salaryHistory.push([salaryHistory.length + 1, e, s, `${2022 + k}-01-01`]) })

export const companySeed = `
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT, created_date TEXT, budget INTEGER);
${ins('departments', [[1, 'Exec', '2015-01-01', 900], [2, 'Eng', '2015-03-01', 1200], [3, 'Sales', '2016-02-01', 800], [4, 'HR', '2017-05-01', 200], [5, 'Support', '2019-09-01', 300]])}
CREATE TABLE emp_profile (emp_id INTEGER PRIMARY KEY REFERENCES employees(id), hire_date TEXT, job_title TEXT, birth_date TEXT, gender TEXT, dept_id INTEGER REFERENCES departments(id));
${ins('emp_profile', [
  [1, '2018-03-01', 'CEO', '1975-04-12', 'F', 1], [2, '2020-06-15', 'Engineering Manager', '1982-09-03', 'M', 2], [3, '2019-02-10', 'Sales Director', '1980-01-25', 'F', 3],
  [4, '2018-09-01', 'Senior Engineer', '1988-11-30', 'M', 2], [5, '2021-01-11', 'Senior Engineer', '1990-05-17', 'F', 2], [6, '2021-07-05', 'Sales Manager', '1985-03-09', 'M', 3],
  [7, '2022-03-14', 'Sales Manager', '1991-08-21', 'F', 3], [8, '2022-08-22', 'Engineer', '1992-07-14', 'M', 2], [9, '2023-01-09', 'Engineer', '1992-07-14', 'F', 2],
  [10, '2020-11-02', 'Sales Rep', '1995-12-05', 'M', 3], [11, '2024-02-19', 'Engineer', '1998-02-28', 'F', null]])}
CREATE TABLE salary_history (id INTEGER PRIMARY KEY, emp_id INTEGER, salary INTEGER, effective_date TEXT);
${ins('salary_history', salaryHistory)}
CREATE TABLE promotions (id INTEGER PRIMARY KEY, emp_id INTEGER, promoted_on TEXT, from_title TEXT, to_title TEXT);
${ins('promotions', [[1, 4, '2021-02-01', 'Junior Engineer', 'Engineer'], [2, 4, '2023-04-01', 'Engineer', 'Senior Engineer'], [3, 5, '2024-03-01', 'Engineer', 'Senior Engineer'], [4, 6, '2023-01-01', 'Sales Rep', 'Sales Manager'], [5, 8, '2024-07-01', 'Junior Engineer', 'Engineer'], [6, 7, '2025-01-01', 'Sales Rep', 'Sales Manager']])}
CREATE TABLE bonuses (id INTEGER PRIMARY KEY, emp_id INTEGER, amount INTEGER, paid_on TEXT);
${ins('bonuses', [[1, 2, 8000, '2025-03-31'], [2, 3, 8000, '2025-03-31'], [3, 4, 5000, '2025-03-31'], [4, 4, 2000, '2025-09-30'], [5, 5, 5000, '2025-03-31'], [6, 6, 4000, '2025-06-30'], [7, 6, 4500, '2025-12-15'], [8, 7, 3000, '2025-12-15'], [9, 10, 1500, '2025-12-15'], [10, 1, 20000, '2025-12-15'], [11, 3, 2500, '2025-09-30']])}
CREATE TABLE leave_requests (id INTEGER PRIMARY KEY, emp_id INTEGER, start_date TEXT, end_date TEXT, type TEXT);
${ins('leave_requests', [[1, 2, '2025-03-10', '2025-03-14', 'annual'], [2, 3, '2025-03-12', '2025-03-20', 'annual'], [3, 4, '2025-07-01', '2025-07-05', 'sick'], [4, 4, '2025-12-22', '2025-12-31', 'annual'], [5, 5, '2025-08-04', '2025-08-08', 'annual'], [6, 6, '2025-12-22', '2025-12-26', 'annual'], [7, 7, '2025-05-05', '2025-05-05', 'sick'], [8, 8, '2025-09-01', '2025-09-12', 'unpaid'], [9, 10, '2025-11-10', '2025-11-11', 'sick'], [10, 3, '2025-12-24', '2025-12-31', 'annual']])}
CREATE TABLE dependents (id INTEGER PRIMARY KEY, emp_id INTEGER, name TEXT, relation TEXT);
${ins('dependents', [[1, 1, 'Anil', 'spouse'], [2, 1, 'Mira', 'child'], [3, 2, 'Zoe', 'child'], [4, 3, 'Ravi', 'spouse'], [5, 3, 'Leo', 'child'], [6, 3, 'Mia', 'child'], [7, 4, 'Jay', 'child'], [8, 6, 'Kiran', 'spouse'], [9, 6, 'Mia', 'child'], [10, 7, 'Ben', 'child']])}
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER, budget INTEGER, start_date TEXT, end_date TEXT, status TEXT);
${ins('projects', [[1, 'Atlas Platform', 2, 500, '2025-01-06', '2025-09-30', 'completed'], [2, 'Beacon Mobile', 2, 300, '2025-03-03', null, 'active'], [3, 'Compass CRM', 3, 200, '2025-02-10', '2025-11-28', 'completed'], [4, 'Delta Pricing', 3, 150, '2025-06-02', null, 'active'], [5, 'Ember Hiring', 4, 80, '2025-12-29', null, 'planned'], [6, 'Falcon Support', 5, 120, '2025-04-14', '2025-08-15', 'cancelled']])}
CREATE TABLE project_assignments (id INTEGER PRIMARY KEY, emp_id INTEGER, project_id INTEGER, start_date TEXT, end_date TEXT, hours INTEGER, role TEXT);
${ins('project_assignments', [
  [1, 2, 1, '2025-01-06', '2025-09-30', 300, 'lead'], [2, 4, 1, '2025-01-06', '2025-09-30', 420, 'member'], [3, 5, 1, '2025-01-06', '2025-06-30', 250, 'member'], [4, 8, 1, '2025-02-03', '2025-09-30', 380, 'member'],
  [5, 2, 2, '2025-03-03', null, 260, 'lead'], [6, 4, 2, '2025-04-01', null, 300, 'member'], [7, 9, 2, '2025-03-03', null, 180, 'member'], [8, 3, 3, '2025-02-10', '2025-11-28', 210, 'lead'],
  [9, 6, 3, '2025-02-10', '2025-11-28', 320, 'member'], [10, 7, 3, '2025-03-01', '2025-11-28', 150, 'member'], [11, 6, 4, '2025-06-02', null, 140, 'member'], [12, 2, 4, '2025-06-02', null, 60, 'lead'],
  [13, 10, 4, '2025-07-01', null, 110, 'member'], [14, 2, 6, '2025-04-14', '2025-08-15', 70, 'lead'], [15, 4, 6, '2025-04-14', '2025-08-15', 80, 'member'], [16, 7, 6, '2025-05-01', '2025-08-15', 90, 'member']])}
CREATE TABLE timesheets (id INTEGER PRIMARY KEY, emp_id INTEGER, work_date TEXT, hours INTEGER, late INTEGER);
${ins('timesheets', timesheets)}
CREATE TABLE shifts (id INTEGER PRIMARY KEY, emp_id INTEGER, start_time TEXT, end_time TEXT);
${ins('shifts', [[1, 6, '2025-12-01 08:00:00', '2025-12-01 16:00:00'], [2, 6, '2025-12-01 15:00:00', '2025-12-01 23:00:00'], [3, 7, '2025-12-02 09:00:00', '2025-12-02 17:00:00'], [4, 7, '2025-12-02 17:00:00', '2025-12-02 21:00:00'], [5, 10, '2025-12-03 06:00:00', '2025-12-03 14:00:00'], [6, 10, '2025-12-03 13:00:00', '2025-12-03 20:00:00'], [7, 8, '2025-12-04 10:00:00', '2025-12-04 18:00:00'], [8, 9, '2025-12-04 10:00:00', '2025-12-04 18:00:00'], [9, 6, '2025-12-02 08:00:00', '2025-12-02 12:00:00']])}
CREATE TABLE emp_dept_history (id INTEGER PRIMARY KEY, emp_id INTEGER, dept_id INTEGER, from_date TEXT, to_date TEXT);
${ins('emp_dept_history', [[1, 4, 4, '2018-09-01', '2019-06-30'], [2, 4, 5, '2019-07-01', '2020-06-30'], [3, 4, 3, '2020-07-01', '2021-12-31'], [4, 4, 2, '2022-01-01', null], [5, 2, 3, '2020-06-15', '2021-12-31'], [6, 2, 2, '2022-01-01', null], [7, 5, 2, '2021-01-11', null], [8, 6, 3, '2021-07-05', null], [9, 8, 5, '2022-08-22', '2023-06-30'], [10, 8, 2, '2023-07-01', null]])}
CREATE TABLE job_openings (id INTEGER PRIMARY KEY, dept_id INTEGER, title TEXT, status TEXT);
${ins('job_openings', [[1, 2, 'Backend Engineer', 'open'], [2, 2, 'Data Engineer', 'filled'], [3, 3, 'Account Executive', 'open'], [4, 3, 'Sales Analyst', 'closed'], [5, 4, 'HR Partner', 'open'], [6, 5, 'Support Lead', 'open'], [7, 2, 'QA Engineer', 'closed']])}
CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER, method TEXT, amount REAL, paid_on TEXT);
INSERT INTO payments SELECT id, id, CASE id % 4 WHEN 0 THEN 'card' WHEN 1 THEN 'upi' WHEN 2 THEN 'paypal' ELSE 'cash' END, amount, date(created_at, '+1 day') FROM orders WHERE status <> 'pending' AND id <> 4;
INSERT INTO payments VALUES (101, 4, 'card', 100, '2025-04-02'), (102, 4, 'upi', 110, '2025-04-09');
CREATE TABLE shipments (id INTEGER PRIMARY KEY, order_id INTEGER, method TEXT, region TEXT, shipped_on TEXT, delivered_on TEXT);
INSERT INTO shipments SELECT o.id, o.id, CASE o.id % 3 WHEN 0 THEN 'express' WHEN 1 THEN 'standard' ELSE 'pickup' END, CASE c.country WHEN 'US' THEN 'Americas' WHEN 'India' THEN 'APAC' ELSE 'EMEA' END, date(o.created_at, '+1 day'), CASE WHEN o.id % 7 = 0 THEN NULL ELSE date(o.created_at, '+' || (2 + o.id % 6) || ' days') END FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed';
CREATE TABLE returns (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, returned_on TEXT);
${ins('returns', [[1, 1, 4, '2025-01-20'], [2, 3, 7, '2025-03-01'], [3, 4, 3, '2025-04-20'], [4, 6, 6, '2025-03-20'], [5, 8, 3, '2025-03-02'], [6, 4, 7, '2025-04-15']])}
CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER, customer_id INTEGER, rating INTEGER, reviewed_on TEXT);
${ins('reviews', [[1, 1, 1, 5, '2025-02-01'], [2, 1, 3, 4, '2025-03-02'], [3, 2, 2, 3, '2025-02-20'], [4, 3, 4, 5, '2025-04-01'], [5, 3, 5, 5, '2025-04-20'], [6, 4, 1, 2, '2025-02-15'], [7, 4, 2, 4, '2025-05-10'], [8, 5, 7, 5, '2025-05-12'], [9, 5, 9, 3, '2025-06-01'], [10, 6, 6, 4, '2025-04-02'], [11, 6, 10, 4, '2025-06-18'], [12, 7, 3, 5, '2025-07-01'], [13, 8, 6, 2, '2025-07-20'], [14, 8, 1, 2, '2025-08-02'], [15, 2, 10, 3, '2025-09-02'], [16, 7, 2, 5, '2025-10-02']])}
CREATE TABLE sales_reps (id INTEGER PRIMARY KEY, name TEXT, region TEXT);
${ins('sales_reps', [[1, 'Asha', 'Americas'], [2, 'Bruno', 'EMEA'], [3, 'Chen', 'APAC'], [4, 'Dara', 'Americas'], [5, 'Eli', 'EMEA'], [6, 'Fay', 'APAC']])}
CREATE TABLE deals (id INTEGER PRIMARY KEY, rep_id INTEGER, customer_id INTEGER, amount INTEGER, closed_on TEXT, status TEXT);
${ins('deals', [
  [1, 1, 1, 1000, '2025-07-10', 'won'], [2, 1, 2, 1500, '2025-08-12', 'won'], [3, 1, 3, 2200, '2025-09-15', 'won'], [4, 1, 1, 2600, '2025-10-08', 'won'], [5, 1, 4, 2400, '2025-11-20', 'won'],
  [6, 2, 5, 800, '2025-07-05', 'won'], [7, 2, 6, 800, '2025-08-18', 'won'], [8, 2, 7, 900, '2025-10-02', 'lost'], [9, 2, 8, 1200, '2025-10-21', 'won'], [10, 2, 9, 700, '2025-12-03', 'won'],
  [11, 3, 10, 3000, '2025-10-05', 'won'], [12, 3, 4, 3000, '2025-10-30', 'won'], [13, 3, 5, 1800, '2025-11-14', 'won'], [14, 3, 6, 90000, '2025-12-10', 'won'], [15, 3, 1, 500, '2025-12-18', 'open'],
  [16, 4, 2, 400, '2025-10-11', 'won'], [17, 4, 3, 650, '2025-11-09', 'won'], [18, 4, 7, 650, '2025-11-25', 'lost'], [19, 4, 8, 300, '2025-12-02', 'won'], [20, 4, 9, 1500, '2025-12-29', 'open'],
  [21, 5, 10, 1100, '2025-01-20', 'won'], [22, 5, 1, 1300, '2025-04-14', 'won'], [23, 5, 2, 900, '2025-07-22', 'won'], [24, 5, 3, 2000, '2025-10-09', 'won']])}
CREATE TABLE discounts (order_id INTEGER, code TEXT, percent INTEGER);
${ins('discounts', [[1, 'WELCOME10', 10], [2, 'SAVE5', 5], [5, 'WELCOME10', 10], [8, 'SAVE5', 5], [11, 'VIP20', 20], [19, 'WELCOME10', 10], [24, 'SAVE5', 5], [27, 'WELCOME10', 10], [30, 'VIP20', 20]])}
CREATE TABLE product_prices (id INTEGER PRIMARY KEY, product_id INTEGER, price REAL, effective_date TEXT);
${ins('product_prices', [[1, 1, 10, '2025-01-01'], [2, 1, 11, '2025-04-01'], [3, 1, 12.5, '2025-09-01'], [4, 2, 8, '2025-01-01'], [5, 2, 7.5, '2025-03-01'], [6, 2, 8, '2025-08-01'], [7, 3, 40, '2025-01-01'], [8, 3, 45, '2025-06-01'], [9, 4, 150, '2025-01-01'], [10, 4, 140, '2025-03-01'], [11, 4, 130, '2025-10-01'], [12, 5, 85, '2025-01-01'], [13, 5, 90, '2025-11-15'], [14, 6, 60, '2025-01-01'], [15, 7, 9.5, '2025-01-01'], [16, 8, 50, '2025-01-01'], [17, 8, 55, '2025-07-15'], [18, 9, 70, '2025-01-01']])}
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);
${ins('categories', [[1, 'Stationery'], [2, 'Home'], [3, 'Electronics'], [4, 'Accessories'], [5, 'Toys']])}
CREATE TABLE sales (id INTEGER PRIMARY KEY, product_id INTEGER, customer_id INTEGER, sale_date TEXT, qty INTEGER, amount REAL);
${ins('sales', sales)}
CREATE TABLE holidays (id INTEGER PRIMARY KEY, name TEXT, start_date TEXT, end_date TEXT);
${ins('holidays', [[1, 'New Year', '2025-01-01', '2025-01-02'], [2, 'Spring Sale', '2025-03-20', '2025-03-31'], [3, 'Back to School', '2025-08-01', '2025-08-31'], [4, 'Festival Week', '2025-10-18', '2025-10-24'], [5, 'Holiday Season', '2025-11-01', '2025-12-31']])}
CREATE TABLE customer_info (customer_id INTEGER PRIMARY KEY, segment TEXT, region TEXT, email TEXT);
${ins('customer_info', [[1, 'vip', 'Americas', 'ava@x.com'], [2, 'consumer', 'Americas', 'ben@x.com'], [3, 'consumer', 'Americas', 'shared@home.com'], [4, 'business', 'APAC', 'dev@x.com'], [5, 'consumer', 'APAC', 'esha@x.com'], [6, 'business', 'APAC', 'farid@x.com'], [7, 'vip', 'EMEA', 'greta@x.com'], [8, 'consumer', 'EMEA', 'hans@x.com'], [9, 'consumer', 'EMEA', 'shared@home.com'], [10, 'business', 'EMEA', 'jack@x.com'], [11, 'consumer', 'EMEA', 'kai@x.com'], [12, 'consumer', 'EMEA', 'lena@x.com']])}
CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT, region TEXT);
${ins('suppliers', [[1, 'Acme Supply', 'North'], [2, 'Bolt Goods', 'South'], [3, 'Cargo Co', 'East'], [4, 'Dune Trade', 'West'], [5, 'Echo Freight', 'North']])}
CREATE TABLE deliveries (id INTEGER PRIMARY KEY, supplier_id INTEGER, product_id INTEGER, region TEXT, delivered_on TEXT);
${ins('deliveries', deliveries)}
CREATE TABLE support_agents (id INTEGER PRIMARY KEY, name TEXT);
${ins('support_agents', [[1, 'Ines'], [2, 'Jon'], [3, 'Kat'], [4, 'Lou'], [5, 'Max']])}
CREATE TABLE support_tickets (id INTEGER PRIMARY KEY, customer_id INTEGER, agent_id INTEGER, opened_on TEXT, closed_on TEXT);
${ins('support_tickets', tickets)}
CREATE TABLE weather_readings (id INTEGER PRIMARY KEY, reading_date TEXT, temperature INTEGER);
${ins('weather_readings', weather)}
CREATE TABLE bookings (id INTEGER PRIMARY KEY, room TEXT, guest TEXT, start_date TEXT, end_date TEXT);
${ins('bookings', [[1, '101', 'Ana', '2025-06-01', '2025-06-05'], [2, '101', 'Ben', '2025-06-04', '2025-06-08'], [3, '101', 'Cy', '2025-06-08', '2025-06-10'], [4, '102', 'Di', '2025-06-01', '2025-06-03'], [5, '102', 'Eve', '2025-06-10', '2025-06-12'], [6, '103', 'Fay', '2025-07-01', '2025-07-10'], [7, '103', 'Gus', '2025-07-05', '2025-07-06'], [8, '104', 'Hal', '2025-08-01', '2025-08-02']])}
`

export const companyTables = [
  { name: 'departments', columns: ['id', 'name', 'created_date', 'budget'] },
  { name: 'emp_profile', columns: ['emp_id (= employees.id)', 'hire_date', 'job_title', 'birth_date', 'gender', 'dept_id (NULL for one employee)'] },
  { name: 'salary_history', columns: ['id', 'emp_id', 'salary', 'effective_date'] },
  { name: 'promotions', columns: ['id', 'emp_id', 'promoted_on', 'from_title', 'to_title'] },
  { name: 'bonuses', columns: ['id', 'emp_id', 'amount', 'paid_on'] },
  { name: 'leave_requests', columns: ['id', 'emp_id', 'start_date', 'end_date', "type ('annual', 'sick', 'unpaid')"] },
  { name: 'dependents', columns: ['id', 'emp_id', 'name', "relation ('spouse', 'child')"] },
  { name: 'projects', columns: ['id', 'name', 'dept_id', 'budget', 'start_date', 'end_date (NULL while running)', "status ('active', 'completed', 'planned', 'cancelled')"] },
  { name: 'project_assignments', columns: ['id', 'emp_id', 'project_id', 'start_date', 'end_date', 'hours', "role ('lead', 'member')"] },
  { name: 'timesheets', columns: ['id', 'emp_id', 'work_date', 'hours', 'late (1 = late)'] },
  { name: 'shifts', columns: ['id', 'emp_id', "start_time ('YYYY-MM-DD HH:MM:SS')", 'end_time'] },
  { name: 'emp_dept_history', columns: ['id', 'emp_id', 'dept_id', 'from_date', 'to_date (NULL = current)'] },
  { name: 'job_openings', columns: ['id', 'dept_id', 'title', "status ('open', 'filled', 'closed')"] },
  { name: 'payments', columns: ['id', 'order_id', "method ('card', 'upi', 'paypal', 'cash')", 'amount', 'paid_on'] },
  { name: 'shipments', columns: ['id', 'order_id', "method ('standard', 'express', 'pickup')", "region ('Americas', 'EMEA', 'APAC')", 'shipped_on', 'delivered_on (NULL = in transit)'] },
  { name: 'returns', columns: ['id', 'order_id', 'product_id', 'returned_on'] },
  { name: 'reviews', columns: ['id', 'product_id', 'customer_id', 'rating (1-5)', 'reviewed_on'] },
  { name: 'sales_reps', columns: ['id', 'name', 'region'] },
  { name: 'deals', columns: ['id', 'rep_id', 'customer_id', 'amount', 'closed_on', "status ('won', 'lost', 'open')"] },
  { name: 'discounts', columns: ['order_id', 'code', 'percent'] },
  { name: 'product_prices', columns: ['id', 'product_id', 'price', 'effective_date'] },
  { name: 'categories', columns: ['id', 'name (= products.category)'] },
  { name: 'sales', columns: ['id', 'product_id', 'customer_id', 'sale_date', 'qty', 'amount'] },
  { name: 'holidays', columns: ['id', 'name', 'start_date', 'end_date'] },
  { name: 'customer_info', columns: ['customer_id (= customers.id)', 'segment', "region ('Americas', 'EMEA', 'APAC')", 'email'] },
  { name: 'suppliers', columns: ['id', 'name', 'region'] },
  { name: 'deliveries', columns: ['id', 'supplier_id', 'product_id', "region ('North', 'South', 'East', 'West')", 'delivered_on'] },
  { name: 'support_agents', columns: ['id', 'name'] },
  { name: 'support_tickets', columns: ['id', 'customer_id', 'agent_id', 'opened_on', 'closed_on (NULL while open)'] },
  { name: 'weather_readings', columns: ['id', 'reading_date', 'temperature'] },
  { name: 'bookings', columns: ['id', 'room', 'guest', 'start_date', 'end_date'] },
]

practiceTables.push(...companyTables)

export async function createPracticeDb(locate?: () => string): Promise<Database> {
  const SQL = await loadSql(locate)
  const db = new SQL.Database()
  db.run(seedSql)
  db.run(extraSeed())
  db.run(moreSeed)
  db.run(companySeed)
  return db
}
