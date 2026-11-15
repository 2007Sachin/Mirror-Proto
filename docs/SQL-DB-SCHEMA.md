# MIRROR SQL practice database (for the 300-question bank)

Engine: sql.js (SQLite). Source of truth: `src/practice/sql/db.ts` (`createPracticeDb`, tables listed in `practiceTables`). Write SQLite SQL: `strftime`, `date(x, '+1 day')`, `julianday`, `||`, no `INTERVAL`, `ILIKE`, `DATE_TRUNC` or MEDIAN; avoid FULL JOIN.

## Snapshot date rule

The data is a fixed snapshot taken on **2025-12-31** (`SNAPSHOT_DATE` in db.ts). Compare against that literal, never `date('now')` or `CURRENT_DATE`:

```sql
WHERE effective_date >= date('2025-12-31', '-6 months')      -- last 6 months
WHERE closed_on >= '2025-10-01'                              -- "this quarter" = Q4 2025
WHERE strftime('%Y', paid_on) = '2025'                       -- "this year"
CAST((julianday('2025-12-31') - julianday(hire_date)) / 365.25 AS INT)   -- tenure / age
```

Almost all dates are in 2025. Hire, birth, promotion-history and department-history dates go back further. Dates are `'YYYY-MM-DD'` text; timestamps `'YYYY-MM-DD HH:MM:SS'`.

## Original tables (never change)

| Table | Columns | Rows |
|---|---|---:|
| customers | id, name, country, signup_date | 12 |
| orders | id, customer_id, amount, status ('completed','refunded','pending'), created_at | 30 |
| users | id, signup_date, country (NULLs) | 15 |
| events | id, user_id, event, ts | 109 |
| products | id, name, category ('Stationery','Home','Electronics','Accessories'), price | 9 |
| order_items | id, order_id, product_id, qty (orders 1-10 only) | 17 |
| employees | id, name, manager_id (NULL = boss), dept (text), salary | 11 |
| logins | user_id, login_date (streaks for users 1-4) | 17 |
| activity | id, user_id, ts (sessions) | 13 |
| subscriptions | id, user_id, plan, start_date, end_date (NULL = active) | 10 |
| contacts | id, name, email (duplicates, case/space noise) | 7 |

`employees` has no salary ties (250, 180, 170, 140, 135, 110, 105, 100, 95, 90, 80). Use `salary_history`, `bonuses`, `deals`, `sales` and `reviews` for ties.

## Company tables (added)

| Table | Columns and meaning | Rows |
|---|---|---:|
| departments | id, name, created_date, budget. HR (4) and Support (5) have no employees. | 5 |
| emp_profile | emp_id PK = employees.id, hire_date, job_title, birth_date, gender, dept_id = departments.id (NULL for Wen, id 11). One row per employee. Managers hired after reports: Noah (2) manages Pat (4); Raj (6) manages Vik (10). Tom (8) and Uma (9) share birth_date 1992-07-14. Sara (7) is a 'Sales Manager' with no reports. | 11 |
| salary_history | id, emp_id, salary, effective_date (Jan 1 of 2022-2025, from hire). 2025 row = employees.salary. Salary rises every year: 2, 4, 5. Flat: 6; Sara (7) 105 -> 105 in 2025. Drops in 2025: Vik (10). | 38 |
| promotions | id, emp_id, promoted_on, from_title, to_title. Sara promoted 2025-01-01 with no raise. Never promoted: 1, 2, 3, 9, 10, 11. | 6 |
| bonuses | id, emp_id, amount, paid_on. Ties at 8000 and 5000. No bonus: 8, 9, 11. Outlier 20000 (Maya). | 11 |
| leave_requests | id, emp_id, start_date, end_date, type ('annual','sick','unpaid'). Overlap: 1 and 2 (Mar), 4/6/10 (late Dec). No leave: 1, 9, 11. | 10 |
| dependents | id, emp_id, name, relation. Duplicate name 'Mia'. None for 5, 8-11. | 10 |
| projects | id, name, dept_id, budget, start_date, end_date (NULL = running), status ('active','completed','planned','cancelled'). Project 5 has no assignments. | 6 |
| project_assignments | id, emp_id, project_id, start_date, end_date (NULL = ongoing), hours, role ('lead','member'). Noah (2) leads 4 projects (1, 2, 4, 6). Overlaps: Raj on 3 and 4; Noah on 2, 4. No project: 1, 11. | 16 |
| timesheets | id, emp_id, work_date (Dec 2025), hours, late (0/1). Calendar-consecutive runs: Pat 10 days, Raj 7 days at 8h (56h in a week). Gaps for others. | 63 |
| shifts | id, emp_id, start_time, end_time. Overlaps: Raj, Vik; touching (not overlapping): Sara. | 9 |
| emp_dept_history | id, emp_id, dept_id, from_date, to_date (NULL = current). Pat worked in 4 departments. | 10 |
| job_openings | id, dept_id, title, status ('open','filled','closed'). Exec has none. | 7 |
| payments | id, order_id, method ('card','upi','paypal','cash'), amount, paid_on. One per non-pending order; order 4 is paid in two parts (ids 101, 102). Pending orders (7, 18, 29) are unpaid. | 28 |
| shipments | id, order_id, method ('standard','express','pickup'), region ('Americas','EMEA','APAC'), shipped_on, delivered_on (NULL = in transit). Completed orders only. | 23 |
| returns | id, order_id, product_id, returned_on. Product-order pairs exist in order_items. Most products never returned. | 6 |
| reviews | id, product_id, customer_id, rating 1-5, reviewed_on. Products 3 and 7 tie at 5.0 average; product 9 unreviewed. | 16 |
| sales_reps | id, name, region. Fay (6) has no deals. | 6 |
| deals | id, rep_id, customer_id, amount, closed_on, status ('won','lost','open'). Asha (1) rises four months in a row (Jul-Oct); deal 14 (90000) is an outlier; two deals at 3000. | 24 |
| discounts | order_id, code, percent. Customers 5 and 8 never used a discount. | 9 |
| product_prices | id, product_id, price, effective_date. Latest = products.price. Increases in the last 6 months: products 1, 2, 5, 8. | 18 |
| categories | id, name (= products.category). 'Toys' has no products. | 5 |
| sales | id, product_id, customer_id, sale_date, qty, amount (qty x price). Monthly units: product 5 rises every month, 4 never falls, 1 rises three months running (Jan-Mar), 7 sells only Nov-Dec, 9 never sells. Customer 1 buys in every month and all four categories; customer 2 in every quarter. | 96 |
| holidays | id, name, start_date, end_date (seasons). | 5 |
| customer_info | customer_id PK = customers.id, segment ('consumer','business','vip'), region, email (customers 3 and 9 share one). | 12 |
| suppliers | id, name, region. Echo Freight (5) delivers nothing. | 5 |
| deliveries | id, supplier_id, product_id, region ('North','South','East','West'), delivered_on. Suppliers 1 and 3 delivered to all four regions. | 12 |
| support_agents | id, name. Lou (4) and Max (5) have no tickets. | 5 |
| support_tickets | id, customer_id, agent_id, opened_on, closed_on (NULL = open). | 16 |
| weather_readings | id, reading_date, temperature (three readings a day, Dec 1-14). | 42 |
| bookings | id, room, guest, start_date, end_date. Room 101 overlaps (1,2); 3 touches 2; room 103 nested (6,7). | 8 |

Name translation from the PDF: employee_id -> emp_id; department_id -> emp_profile.dept_id; hire_date/birth_date/job_title live in emp_profile; leaves -> leave_requests; salaries/salary_before -> salary_history; sales_deals -> deals (sales_rep_id -> rep_id, deal_close_date -> closed_on); product_reviews -> reviews; user_logins -> logins; work_log/attendance/work_logs -> timesheets (hours_worked -> hours); product sales per month -> sales (or order_items + orders). "Compare two tables" questions can use salary_history vs employees or contacts.

## Mapping: PDF topic x level -> module topic

Use `moduleTopic(pdfTopic, level)` and `idFor(n)` from `src/practice/sql/bank300/mapping.ts`; the problem's `topic` must be the returned string and `level` the returned number (1 Beginner, 2 Pro, 3 Advanced). The PDF data has 16 topic names.

| PDF topic | Beginner | Pro | Advanced |
|---|---|---|---|
| Filtering, sorting and basics | SELECT, WHERE, ORDER BY, LIMIT | Subqueries and EXISTS | Advanced window patterns |
| Aggregation and GROUP BY | Aggregates and GROUP BY | Median, percentiles and statistics | Advanced window patterns |
| Joins and enriching rows | INNER and LEFT JOIN | All joins and fan-out | Advanced window patterns |
| Dates and time windows | CASE, text and date functions | CTEs | Retention and cohorts |
| Anti-joins, EXISTS and missing data | NULL and missing data | All joins and fan-out | Relational division: all and every |
| Subqueries and comparing to an average | Aggregates and GROUP BY | Subqueries and EXISTS | Advanced window patterns |
| Duplicates and set operations | Aggregates and GROUP BY | Set operations | Advanced window patterns |
| Conditional aggregation, pivots and percentages | CASE, text and date functions | Conditional aggregation and pivots | Funnels and conversion |
| Ranking, top-N and nth highest | SELECT, WHERE, ORDER BY, LIMIT | Dedup and top-N per group | Advanced window patterns |
| Self-joins, hierarchies and overlaps | INNER and LEFT JOIN | Overlapping ranges and hierarchies | Recursive CTEs |
| Window functions: running totals and LAG/LEAD | Aggregates and GROUP BY | Window functions | Advanced window patterns |
| Gaps, islands and consecutive runs | Aggregates and GROUP BY | Window functions | Gaps and islands |
| Recursive CTEs and trees | INNER and LEFT JOIN | CTEs | Recursive CTEs |
| Median, percentiles and statistics | Aggregates and GROUP BY | Median, percentiles and statistics | Advanced window patterns |
| Relational division: "all" and "every" | NULL and missing data | Subqueries and EXISTS | Relational division: all and every |
| Trends and retention over time | Aggregates and GROUP BY | Window functions | Trends and always-increasing series |

New modules (no questions until bank300 lands): Pro "Overlapping ranges and hierarchies", Pro "Median, percentiles and statistics", Advanced "Relational division: all and every", Advanced "Trends and always-increasing series".
