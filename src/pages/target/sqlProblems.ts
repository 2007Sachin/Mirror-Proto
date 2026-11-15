export const schemaTables = [
  { name: 'customers', columns: ['id', 'name', 'country', 'signup_date'] },
  { name: 'orders', columns: ['id', 'customer_id', 'amount', "status ('completed', 'refunded', 'pending')", 'created_at'] },
]

// Fixed, deterministic seed. Customers 11 and 12 have never ordered.
const customers: [number, string, string, string][] = [
  [1, 'Ava', 'US', '2024-11-03'], [2, 'Ben', 'US', '2024-12-10'], [3, 'Chloe', 'US', '2025-01-15'],
  [4, 'Dev', 'India', '2024-10-21'], [5, 'Esha', 'India', '2024-12-02'], [6, 'Farid', 'India', '2025-01-09'],
  [7, 'Greta', 'Germany', '2024-11-19'], [8, 'Hans', 'Germany', '2025-02-01'],
  [9, 'Isla', 'UK', '2024-12-28'], [10, 'Jack', 'UK', '2025-01-30'],
  [11, 'Kai', 'Germany', '2025-03-05'], [12, 'Lena', 'UK', '2025-03-12'],
]
const C = 'completed', R = 'refunded', P = 'pending'
const orders: [number, number, number, string, string][] = [
  [1, 1, 120.5, C, '2025-01-05'], [2, 1, 80, C, '2025-02-11'], [3, 1, 45.25, R, '2025-02-20'], [4, 1, 210, C, '2025-04-02'],
  [5, 2, 60, C, '2025-01-18'], [6, 2, 99.99, C, '2025-03-07'], [7, 2, 30, P, '2025-06-01'],
  [8, 3, 150, C, '2025-02-14'], [9, 3, 75.5, C, '2025-05-09'], [10, 3, 20, R, '2025-05-21'],
  [11, 4, 300, C, '2025-01-12'], [12, 4, 130, C, '2025-03-15'], [13, 4, 55, C, '2025-06-10'],
  [14, 5, 90, C, '2025-02-03'], [15, 5, 40.75, R, '2025-03-22'], [16, 5, 220, C, '2025-04-18'],
  [17, 6, 35, C, '2025-02-27'], [18, 6, 70, P, '2025-05-30'],
  [19, 7, 180, C, '2025-01-25'], [20, 7, 95.5, C, '2025-04-11'], [21, 7, 60, C, '2025-06-14'],
  [22, 8, 140, C, '2025-03-03'], [23, 8, 25, R, '2025-04-29'],
  [24, 9, 110, C, '2025-02-08'], [25, 9, 85, C, '2025-04-25'], [26, 9, 50, C, '2025-06-20'],
  [27, 10, 65, C, '2025-03-19'], [28, 10, 175, C, '2025-05-16'], [29, 10, 15, P, '2025-06-25'],
  [30, 6, 125, C, '2025-06-05'],
]

const q = (s: string) => `'${s}'`
export const seedSql = `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, country TEXT, signup_date TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL, status TEXT, created_at TEXT);
${customers.map(([i, n, c, d]) => `INSERT INTO customers VALUES (${i}, ${q(n)}, ${q(c)}, ${q(d)});`).join('\n')}
${orders.map(([i, c, a, s, d]) => `INSERT INTO orders VALUES (${i}, ${c}, ${a}, ${q(s)}, ${q(d)});`).join('\n')}
`

export interface Problem { id: string; title: string; prompt: string; hint: string; solution: string; ordered: boolean }

export const problems: Problem[] = [
  {
    id: 'revenue-by-country', title: 'Revenue by country',
    prompt: 'For each country, find the total revenue from completed orders. Show the country and the total, and leave out countries with no completed orders.',
    hint: 'Join orders to customers, filter on status, then GROUP BY country.',
    solution: "SELECT c.country, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.country",
    ordered: false,
  },
  {
    id: 'no-orders', title: 'Customers with no orders',
    prompt: 'Which customers have never placed an order of any status? Show their name and country.',
    hint: 'A LEFT JOIN keeps every customer; the ones with no match have NULL on the orders side.',
    solution: 'SELECT c.name, c.country FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL',
    ordered: false,
  },
  {
    id: 'top-customer', title: 'Top customer per country',
    prompt: 'In each country, who is the customer with the highest completed revenue? Show the country, the customer name and their revenue.',
    hint: 'Total the revenue per customer first, then rank customers within each country with a window function.',
    solution: "WITH t AS (SELECT c.country, c.name, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id), r AS (SELECT *, RANK() OVER (PARTITION BY country ORDER BY revenue DESC) AS rnk FROM t) SELECT country, name, revenue FROM r WHERE rnk = 1",
    ordered: false,
  },
  {
    id: 'month-over-month', title: 'Month-over-month change',
    prompt: 'For each month, show the completed revenue and how much it changed compared with the month before. The first month has no change. Order by month.',
    hint: "Group by strftime('%Y-%m', created_at), then subtract LAG(revenue) OVER (ORDER BY month).",
    solution: "WITH m AS (SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS revenue FROM orders WHERE status = 'completed' GROUP BY 1) SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS change FROM m ORDER BY month",
    ordered: true,
  },
]
