export interface SqlProblem {
  id: string
  topic: string
  level: 1 | 2 | 3
  title: string
  minutes: number
  prompt: string
  hint: string
  solution: string
  ordered: boolean
  explain?: string // the plain-language why shown after solving, incl. the common trap
  // Structured brief (all optional; the drill shows what exists). Filled by the question bank in ./bank.
  scenario?: string   // 1-3 sentences: who is asking and why, in business words
  output?: string     // the exact result shape: columns, order, rounding, e.g. "user_id, orders (most first)"
  pattern?: string    // the named interview pattern, e.g. "Top-N per group"
  asked?: 'Phone screen' | 'Onsite' | 'Take-home' // where this kind of question usually shows up
  followUp?: string   // the interviewer's natural next question
  edgeCases?: string[] // traps a careful candidate checks (ties, NULLs, empty groups)
  tables?: string[]   // tables the task uses
}

import { T } from './topics'
import { moreProblems } from './more'
import * as bankBeginner from './bank/beginner'
import * as bankPro from './bank/pro'
import * as bankAdvanced from './bank/advanced'
import * as x1 from './bank300/g1'
import * as x2 from './bank300/g2'
import * as x3 from './bank300/g3'
import * as x4 from './bank300/g4'

const base: SqlProblem[] = [
  { id: 'sql-no-country', topic: T.b3, level: 1, title: 'Users with no country', minutes: 3,
    prompt: 'Some users never gave a country. List the id and signup date of every user whose country is missing.',
    hint: 'NULL is not equal to anything, so use IS NULL, not = NULL.',
    solution: 'SELECT id, signup_date FROM users WHERE country IS NULL', ordered: false },
  { id: 'sql-big-orders', topic: T.b5, level: 1, title: 'Big completed orders', minutes: 4,
    prompt: 'List the order id, customer name and amount of every completed order above 100.',
    hint: 'Join orders to customers on customer_id, then filter on status and amount.',
    solution: "SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' AND o.amount > 100", ordered: false },
  { id: 'sql-orders-by-status', topic: T.b4, level: 1, title: 'Orders per status', minutes: 3,
    prompt: 'How many orders are there in each status? Show the status and the count.',
    hint: 'GROUP BY status and COUNT(*).',
    solution: 'SELECT status, COUNT(*) AS orders FROM orders GROUP BY status', ordered: false },
  { id: 'sql-orders-per-month', topic: T.b6, level: 1, title: 'Orders per month', minutes: 4,
    prompt: 'Count the orders placed in each calendar month. Show the month as YYYY-MM and the count, oldest month first.',
    hint: "strftime('%Y-%m', created_at) turns a date into its month.",
    solution: "SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS orders FROM orders GROUP BY 1 ORDER BY 1", ordered: true },
  { id: 'sql-above-average', topic: T.b4, level: 1, title: 'Orders above the average', minutes: 4,
    prompt: 'Find the completed orders whose amount is higher than the average completed order. Show the order id and amount.',
    hint: 'Put the average in a subquery inside the WHERE clause.',
    solution: "SELECT id, amount FROM orders WHERE status = 'completed' AND amount > (SELECT AVG(amount) FROM orders WHERE status = 'completed')", ordered: false },
  { id: 'sql-not-us', topic: T.p8, level: 2, title: 'Users outside the US', minutes: 5,
    prompt: 'List the ids of users who are not in the US. A user with no country recorded is also not known to be in the US, so include them.',
    hint: "country <> 'US' skips NULL rows. Add an OR for them.",
    solution: "SELECT id FROM users WHERE country IS NULL OR country <> 'US'", ordered: false },
  { id: 'sql-no-completed', topic: T.p7, level: 2, title: 'Customers with no completed order', minutes: 6,
    prompt: 'Which customers have no completed order? Someone with only refunded or pending orders counts too. Show their name.',
    hint: 'Put the status test in the ON clause of a LEFT JOIN, then keep rows where the order side is NULL.',
    solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed' WHERE o.id IS NULL", ordered: false },
  { id: 'sql-repeat-buyers', topic: T.p11, level: 2, title: 'Repeat big spenders', minutes: 6,
    prompt: 'Find customers with at least 3 completed orders and more than 300 in completed revenue. Show the customer id, the number of orders and the revenue.',
    hint: 'Filter groups with HAVING, not WHERE.',
    solution: "SELECT customer_id, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders WHERE status = 'completed' GROUP BY customer_id HAVING COUNT(*) >= 3 AND SUM(amount) > 300", ordered: false },
  { id: 'sql-above-country-avg', topic: T.p9, level: 2, title: 'Above their country average', minutes: 8,
    prompt: 'Total the completed revenue per customer. Then show the customers whose total is above the average total of customers in their own country. Show name, country and revenue.',
    hint: 'Build the per-customer totals in a CTE, then compare each row to a correlated average from the same CTE.',
    solution: "WITH t AS (SELECT c.id, c.name, c.country, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id) SELECT name, country, revenue FROM t WHERE revenue > (SELECT AVG(revenue) FROM t t2 WHERE t2.country = t.country)", ordered: false },
  { id: 'sql-latest-order', topic: T.p13, level: 2, title: 'Latest order per customer', minutes: 7,
    prompt: 'For each customer, find their most recent completed order. Show the customer id, the order id and the order date.',
    hint: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC), then keep number 1.',
    solution: "WITH r AS (SELECT customer_id, id, created_at, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn FROM orders WHERE status = 'completed') SELECT customer_id, id, created_at FROM r WHERE rn = 1", ordered: false },
  { id: 'sql-days-to-first-order', topic: T.p7, level: 2, title: 'Days to first order', minutes: 6,
    prompt: 'For each customer who has ordered, how many whole days passed between signup and their first order of any status? Show the name and the number of days.',
    hint: 'julianday(a) - julianday(b) gives days between two dates. Take MIN(created_at) per customer.',
    solution: 'SELECT c.name, CAST(julianday(MIN(o.created_at)) - julianday(c.signup_date) AS INTEGER) AS days FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id', ordered: false },
  { id: 'sql-never-viewed', topic: T.p8, level: 2, title: 'Signed up, never looked', minutes: 5,
    prompt: 'Find users who signed up but never had a view_item event. Show their id.',
    hint: 'NOT EXISTS against events with event = view_item.',
    solution: "SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.id AND e.event = 'view_item')", ordered: false },
  { id: 'sql-second-highest', topic: T.a19, level: 3, title: 'Second-highest order per country', minutes: 10,
    prompt: 'In each country, what is the second-highest completed order amount? If two orders share the top amount, that amount is still the highest and the next different amount is second. Show the country and the amount.',
    hint: 'DENSE_RANK handles ties the way the question asks. Rank within each country, keep rank 2.',
    solution: "WITH r AS (SELECT c.country, o.amount, DENSE_RANK() OVER (PARTITION BY c.country ORDER BY o.amount DESC) AS rnk FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed') SELECT DISTINCT country, amount FROM r WHERE rnk = 2", ordered: false },
  { id: 'sql-running-reset', topic: T.a19, level: 3, title: 'Running total that resets monthly', minutes: 10,
    prompt: 'Show every completed order with a running total of completed revenue that starts again at zero each month. Show order id, month (YYYY-MM), amount and running total. Order by month, then date, then order id.',
    hint: 'SUM(amount) OVER (PARTITION BY month ORDER BY created_at, id). The partition is what resets it.',
    solution: "SELECT id, strftime('%Y-%m', created_at) AS month, amount, SUM(amount) OVER (PARTITION BY strftime('%Y-%m', created_at) ORDER BY created_at, id) AS running FROM orders WHERE status = 'completed' ORDER BY month, created_at, id", ordered: true },
  { id: 'sql-order-gaps', topic: T.a14, level: 3, title: 'Long gaps between orders', minutes: 10,
    prompt: 'Find places where a customer went more than 60 days between two consecutive completed orders. Show the customer id, the date of the later order and the gap in whole days.',
    hint: 'LAG(created_at) per customer gives the previous order date. Subtract with julianday, then filter in an outer query.',
    solution: "WITH g AS (SELECT customer_id, created_at, julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at)) AS gap FROM orders WHERE status = 'completed') SELECT customer_id, created_at, CAST(gap AS INTEGER) AS gap_days FROM g WHERE gap > 60", ordered: false },
  { id: 'sql-d7-retention', topic: T.a16, level: 3, title: 'Week-one retention by signup day', minutes: 12,
    prompt: 'A user is retained if they have a visit event 1 to 7 days after their signup date. For each signup date, show how many users signed up and how many were retained. Order by signup date.',
    hint: 'Work from users, not events, so cohorts with nobody retained still appear. A correlated EXISTS returns 0 or 1 that you can SUM.',
    solution: "SELECT u.signup_date, COUNT(*) AS users, SUM(EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.id AND e.event = 'visit' AND julianday(date(e.ts)) - julianday(u.signup_date) BETWEEN 1 AND 7)) AS retained FROM users u GROUP BY u.signup_date ORDER BY u.signup_date", ordered: true },
  { id: 'sql-funnel-steps', topic: T.a17, level: 3, title: 'Funnel conversion by step', minutes: 12,
    prompt: 'The funnel is signup, view_item, add_to_cart, checkout, purchase (ignore visit events). For each step, count the distinct users who did it, and show the share of the previous step as a decimal rounded to 2 places. The first step has no previous step. Order from the top of the funnel down.',
    hint: 'COUNT(DISTINCT user_id) per event, then divide by LAG(users) OVER (ORDER BY users DESC). Use 1.0 * to avoid integer division.',
    solution: "WITH s AS (SELECT event, COUNT(DISTINCT user_id) AS users FROM events WHERE event <> 'visit' GROUP BY event) SELECT event, users, ROUND(1.0 * users / LAG(users) OVER (ORDER BY users DESC), 2) AS share_of_previous FROM s ORDER BY users DESC", ordered: true },
]

// The question bank (./bank/*) rewrites existing problems with a structured brief (enrich, keyed by id) and adds new ones (added).
const enrich: Record<string, Partial<SqlProblem>> = { ...bankBeginner.enrich, ...bankPro.enrich, ...bankAdvanced.enrich }
export const problems: SqlProblem[] = [...base, ...moreProblems, ...bankBeginner.added, ...bankPro.added, ...bankAdvanced.added, ...x1.added300, ...x2.added300, ...x3.added300, ...x4.added300].map(p => (enrich[p.id] ? { ...p, ...enrich[p.id] } : p))
