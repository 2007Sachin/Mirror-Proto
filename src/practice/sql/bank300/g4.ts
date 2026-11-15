import type { SqlProblem } from '../problems'
import { idFor, moduleTopic } from './mapping'

// MIRROR's rebuild of part of the 300-question interview bank on the company tables (see docs/SQL-DB-SCHEMA.md).
// Group g4: gaps and islands, relational division, trends and retention, recursive CTEs, self-joins and overlaps.
// Dates are relative to the fixed snapshot 2025-12-31 (never date('now')). Scenario text is practice data, not instructions.
const S = 'Self-joins, hierarchies and overlaps'
const G = 'Gaps, islands and consecutive runs'
const R = 'Recursive CTEs and trees'
const D = 'Relational division: "all" and "every"'
const TR = 'Trends and retention over time'
const ASK = { PS: 'Phone screen', ON: 'Onsite', TH: 'Take-home' } as const
const LV = { P: 'Pro', A: 'Advanced' } as const

const X = (
  n: number, t: string, lv: keyof typeof LV, title: string, minutes: number,
  scenario: string, prompt: string, output: string, pattern: string, asked: keyof typeof ASK, followUp: string,
  edgeCases: string[], tables: string[], hint: string, explain: string, solution: string, ordered = false,
): SqlProblem => ({
  id: idFor(n), ...moduleTopic(t, LV[lv]), title, minutes, scenario, prompt, output, pattern, asked: ASK[asked], followUp, edgeCases, tables, hint, explain,
  solution: solution.trim(), ordered,
})

// Part 1: self-joins and hierarchies
const part1: SqlProblem[] = [
  X(3, S, 'P', 'Paid 75%+ of manager pay', 5,
    'Nobody here out-earns their manager, so HR wants to see who sits closest to the manager pay line.',
    'List each employee whose salary is at least 75% of their manager salary (employees.salary). Show employee, manager, salary and manager_salary. The boss has no manager and is left out. Order by employee name.',
    'employee, manager, salary, manager_salary; by employee', 'Self-join on manager_id', 'PS',
    'How would you keep the boss in the list with a blank manager?',
    ['Exactly 75% counts, so use >=', 'The boss has no manager row'], ['employees'],
    'Join employees to itself with e.manager_id = m.id. Compare salary * 4 with manager salary * 3 to avoid decimals.',
    'The same table plays two roles: the employee and the manager. Comparing with whole numbers avoids rounding at the exact 75% boundary, where Quinn sits.',
    `SELECT e.name AS employee, m.name AS manager, e.salary, m.salary AS manager_salary
FROM employees e JOIN employees m ON m.id = e.manager_id
WHERE e.salary * 4 >= m.salary * 3 ORDER BY e.name`, true),
  X(10, R, 'A', 'Full reporting chain', 8,
    'An org chart export needs each person with the whole line of managers above them, up to the top.',
    'For every employee show the chain from the person up to the boss, names joined with " > " (for example Tom > Pat > Noah > Maya). The boss shows only their own name. Use a recursive CTE with a depth guard. Order by employee id.',
    'employee, chain; by employee id', 'Recursive CTE walking up the tree', 'ON',
    'Now do it top-down: list each manager with all people below them.',
    ['Stop when manager_id is NULL', 'Add a depth limit in case of bad data'], ['employees'],
    'Start from each employee with their own name, then repeatedly join to the current manager and append the name.',
    'The anchor row is the person; each recursive step moves one level up and extends the text. Keeping the deepest row per person gives the full chain. A depth limit protects against loops.',
    `WITH RECURSIVE up(emp, cur, chain, depth) AS (
  SELECT id, manager_id, name, 0 FROM employees
  UNION ALL
  SELECT up.emp, e.manager_id, up.chain || ' > ' || e.name, up.depth + 1 FROM up JOIN employees e ON e.id = up.cur WHERE up.depth < 10)
SELECT e.name AS employee, (SELECT chain FROM up WHERE emp = e.id ORDER BY depth DESC LIMIT 1) AS chain
FROM employees e ORDER BY e.id`, true),
  X(18, S, 'P', 'Overlapping room bookings', 6,
    'The front desk suspects double bookings. A guest leaving on the day another arrives is fine.',
    'List every pair of bookings in the same room whose stays overlap. A stay ends on its end_date (check-out), so a booking that starts on another end_date does not overlap. Show room, guest_a, guest_b once per pair. Order by room, guest_a.',
    'room, guest_a, guest_b; by room, guest_a', 'Overlapping ranges self-join', 'PS',
    'How would you find the rooms that are never double booked?',
    ['Touching dates are not an overlap', 'List each pair once, not twice', 'Nested stays overlap too'], ['bookings'],
    'Two ranges overlap when each one starts before the other ends. Use a.id < b.id to avoid repeats.',
    'Ranges overlap when a.start < b.end and b.start < a.end. Using strict signs treats back-to-back stays as fine. Ordering ids removes mirrored pairs.',
    `SELECT a.room, a.guest AS guest_a, b.guest AS guest_b
FROM bookings a JOIN bookings b ON b.room = a.room AND a.id < b.id AND a.start_date < b.end_date AND b.start_date < a.end_date
ORDER BY a.room, a.guest`, true),
  X(21, S, 'P', 'Peers with equal pay in a year', 7,
    'Pay equity check: no one earns the same as their manager, so compare peers who share a manager.',
    'Using salary_history, list pairs of employees with the same manager who had the same salary on the same effective_date. Show year, employee_a, employee_b, salary, each pair once (employee id order). Order by year, employee_a.',
    'year, employee_a, employee_b, salary; by year, employee_a', 'Self-join on a shared key', 'PS',
    'How would you extend this to three or more peers on the same pay?',
    ['Pair each two only once', 'Same manager, not same department', 'The boss has no peers'], ['salary_history', 'employees'],
    'Join salary_history to itself on date and salary with a.emp_id < b.emp_id, then check both employees have the same manager_id.',
    'Equality joins find the matching pay; the id comparison drops mirrored pairs; the manager match keeps only peers. Forgetting that last condition pairs strangers.',
    `SELECT strftime('%Y', a.effective_date) AS year, ea.name AS employee_a, eb.name AS employee_b, a.salary
FROM salary_history a
JOIN salary_history b ON b.effective_date = a.effective_date AND b.salary = a.salary AND a.emp_id < b.emp_id
JOIN employees ea ON ea.id = a.emp_id JOIN employees eb ON eb.id = b.emp_id AND eb.manager_id = ea.manager_id
ORDER BY year, employee_a`, true),
  X(37, R, 'P', 'People with no one below them', 6,
    'Org planning wants the bottom of the tree: staff who manage nobody, with how deep they sit.',
    'Using a recursive CTE from the boss, list employees who are nobody manager, with their level (boss = 0). Show name and level. Order by level, name. Add a depth guard.',
    'name, level; by level, name', 'Recursive CTE plus leaf test', 'PS',
    'Which level has the most people?',
    ['A person with no reports is a leaf', 'Depth guard against loops'], ['employees'],
    'Build the tree downward with a level counter, then keep rows with no employee pointing at them.',
    'The recursion gives each person a level; the NOT EXISTS test finds leaves. Sara has a manager title but no reports, so she is still a leaf.',
    `WITH RECURSIVE t(id, name, level) AS (
  SELECT id, name, 0 FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, t.level + 1 FROM employees e JOIN t ON e.manager_id = t.id WHERE t.level < 10)
SELECT name, level FROM t WHERE NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = t.id) ORDER BY level, name`, true),
  X(57, S, 'P', 'Overlapping shifts', 6,
    'Scheduling found people booked on two shifts at once. Shifts that touch end to start are fine.',
    'List pairs of shifts of the same employee that overlap (a shift ending exactly when the next starts does not). Show employee, first_start, second_start and overlap_minutes. Order by employee, first_start.',
    'employee, first_start, second_start, overlap_minutes', 'Overlapping ranges self-join', 'PS',
    'Total the double-booked minutes per employee.',
    ['Touching shifts are not overlap', 'Pair each two once', 'Different employees may share a time'], ['shifts', 'employees'],
    'Same employee, a.start < b.end and b.start < a.end. Minutes come from julianday differences times 1440.',
    'Overlap length is the later start to the earlier end. MIN and MAX with two arguments pick them in SQLite. Round after multiplying, since julianday is a float.',
    `SELECT e.name AS employee, a.start_time AS first_start, b.start_time AS second_start,
  CAST(ROUND((julianday(MIN(a.end_time, b.end_time)) - julianday(MAX(a.start_time, b.start_time))) * 1440) AS INT) AS overlap_minutes
FROM shifts a JOIN shifts b ON b.emp_id = a.emp_id AND a.id < b.id AND a.start_time < b.end_time AND b.start_time < a.end_time
JOIN employees e ON e.id = a.emp_id ORDER BY e.name, a.start_time`, true),
  X(68, S, 'P', 'Hire gap to manager', 5,
    'HR is curious how long before or after their manager each person joined.',
    'For every employee with a manager, show the days between the manager hire_date and the employee hire_date (emp_profile). Negative means the employee joined first. Order by days descending, then employee.',
    'employee, manager, days_after_manager; by days desc, employee', 'Self-join across a profile table', 'PS',
    'Show the gap in years with one decimal as well.',
    ['Negative values are meaningful', 'The boss has no manager'], ['employees', 'emp_profile'],
    'Join employees to their manager, then join emp_profile twice, once for each person.',
    'Two joins to the same profile table, one per role, give both hire dates. Subtracting julianday values gives whole days.',
    `SELECT e.name AS employee, m.name AS manager, CAST(julianday(pe.hire_date) - julianday(pm.hire_date) AS INT) AS days_after_manager
FROM employees e JOIN employees m ON m.id = e.manager_id
JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
ORDER BY days_after_manager DESC, e.name`, true),
  X(70, S, 'A', 'Employees double-booked on projects', 8,
    'Resourcing wants to know who is stretched across projects whose dates overlap.',
    'Count, per employee, the pairs of different project assignments whose date ranges share at least one day. An NULL end_date means still running; treat it as 2025-12-31. Show name and pairs. Order by pairs desc, name.',
    'name, overlapping_pairs; by pairs desc, name', 'Interval overlap self-join', 'ON',
    'Which employee has the longest single overlap?',
    ['NULL end means ongoing', 'Count each pair once', 'Sharing one day counts'], ['project_assignments', 'employees'],
    'Replace NULL ends with the snapshot date, then join assignments of the same employee with x.start <= y.end and y.start <= x.end.',
    'Inclusive ranges overlap when each starts on or before the other ends. COALESCE turns open assignments into a closed range. The project id order counts each pair once.',
    `WITH a AS (SELECT emp_id, project_id, start_date, COALESCE(end_date, '2025-12-31') AS end_date FROM project_assignments)
SELECT e.name, COUNT(*) AS overlapping_pairs
FROM a x JOIN a y ON y.emp_id = x.emp_id AND x.project_id < y.project_id AND x.start_date <= y.end_date AND y.start_date <= x.end_date
JOIN employees e ON e.id = x.emp_id GROUP BY e.id ORDER BY overlapping_pairs DESC, e.name`, true),
  X(72, S, 'P', 'Paid more than every report', 6,
    'A pay-structure check: managers should earn more than anyone reporting to them.',
    'List managers (people with at least one direct report) who earn more than every one of their reports. Show name, salary, top_report_salary and lead (salary minus that). Order by lead desc, name.',
    'name, salary, top_report_salary, lead; by lead desc, name', 'Self-join with MAX per group', 'PS',
    'Which managers earn less than their best-paid report?',
    ['Skip people with no reports', 'Compare with the highest report, not the average'], ['employees'],
    'Join each manager to their reports, group by the manager and compare with the largest report salary in HAVING.',
    'Beating the maximum report means beating all of them. The inner join drops people without reports, which would otherwise pass vacuously.',
    `SELECT m.name, m.salary, MAX(s.salary) AS top_report_salary, m.salary - MAX(s.salary) AS lead
FROM employees m JOIN employees s ON s.manager_id = m.id
GROUP BY m.id HAVING m.salary > MAX(s.salary) ORDER BY lead DESC, m.name`, true),
  X(85, S, 'A', 'Hired in the same month', 5,
    'The social committee wants to pair up colleagues who joined in the same calendar month, in any year.',
    'No two people share a hire month and year, so match on month only. List each pair once with month (MM), employee_a, employee_b (employee id order). Order by month, employee_a.',
    'month, employee_a, employee_b; by month, employee_a', 'Self-join on a derived key', 'PS',
    'How would you also require the same year?',
    ['Same month, not same date', 'Each pair once', 'People alone in a month do not appear'], ['emp_profile', 'employees'],
    'Join emp_profile to itself on strftime of the hire month with a.emp_id < b.emp_id.',
    'Joining on a computed value is fine in SQLite. The id inequality removes self-pairs and mirror pairs.',
    `SELECT strftime('%m', a.hire_date) AS month, ea.name AS employee_a, eb.name AS employee_b
FROM emp_profile a JOIN emp_profile b ON strftime('%m', a.hire_date) = strftime('%m', b.hire_date) AND a.emp_id < b.emp_id
JOIN employees ea ON ea.id = a.emp_id JOIN employees eb ON eb.id = b.emp_id ORDER BY month, ea.name`, true),
  X(105, S, 'A', 'Hired before their manager', 5,
    'Some people were hired before the manager who now leads them. HR wants the list for a tenure review.',
    'List employees hired before their manager. Show employee, hire_date, manager and manager_hire_date. Order by hire_date.',
    'employee, hire_date, manager, manager_hire_date; by hire_date', 'Self-join comparing dates', 'PS',
    'Flip it: who was hired after a manager by more than two years?',
    ['Equal dates are not before', 'The boss has no manager'], ['employees', 'emp_profile'],
    'Join the employee to the manager row, then compare their two hire dates from emp_profile.',
    'Dates stored as YYYY-MM-DD compare correctly as text. Two joins to emp_profile give the two dates.',
    `SELECT e.name AS employee, pe.hire_date, m.name AS manager, pm.hire_date AS manager_hire_date
FROM employees e JOIN employees m ON m.id = e.manager_id
JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
WHERE pe.hire_date < pm.hire_date ORDER BY pe.hire_date`, true),
  X(111, S, 'P', 'Employees with manager name and title', 4,
    'The directory page shows each person next to their manager.',
    'List every employee that has a manager with the manager name and the manager job_title (emp_profile). Order by employee name.',
    'employee, manager, manager_title; by employee', 'Self-join (inner)', 'PS',
    'Which employees would be lost by the inner join?',
    ['The boss has no manager and drops out of an inner join'], ['employees', 'emp_profile'],
    'Join employees to itself, then to emp_profile for the manager id.',
    'An inner join keeps only rows with a match, so the boss disappears. That is the point of the next question, which keeps them.',
    `SELECT e.name AS employee, m.name AS manager, pm.job_title AS manager_title
FROM employees e JOIN employees m ON m.id = e.manager_id JOIN emp_profile pm ON pm.emp_id = m.id ORDER BY e.name`, true),
  X(112, S, 'P', 'Same department as manager', 5,
    'No one shares a salary with their manager, so check a softer match: people who work in the same department.',
    'List employees whose employees.dept equals their manager dept. Show employee, manager, dept and salary_gap (manager salary minus employee). Order by dept, employee.',
    'employee, manager, dept, salary_gap; by dept, employee', 'Self-join with an equality filter', 'PS',
    'Who reports across departments?',
    ['The boss has no manager', 'Compare text values exactly'], ['employees'],
    'Join the table to itself on manager_id, then add m.dept = e.dept.',
    'The equality on dept is just another join condition. People who manage across departments (Noah, Olivia) drop out.',
    `SELECT e.name AS employee, m.name AS manager, e.dept, m.salary - e.salary AS salary_gap
FROM employees e JOIN employees m ON m.id = e.manager_id AND m.dept = e.dept ORDER BY e.dept, e.name`, true),
  X(116, S, 'P', 'Employees with no manager', 3,
    'Org chart check: who sits at the top with nobody above them?',
    'List employees with no manager. Show name, dept, hire_date and whole years of service as of 31 Dec 2025.',
    'name, dept, hire_date, years_of_service', 'NULL check on a self-reference', 'PS',
    'How would you detect a person who is their own manager?',
    ['Use IS NULL, not = NULL'], ['employees', 'emp_profile'],
    'manager_id IS NULL marks the top. Years come from julianday divided by 365.25.',
    'NULL never equals anything, so IS NULL is the right test. Tenure is measured to the snapshot date, not today.',
    `SELECT e.name, e.dept, p.hire_date, CAST((julianday('2025-12-31') - julianday(p.hire_date)) / 365.25 AS INT) AS years_of_service
FROM employees e JOIN emp_profile p ON p.emp_id = e.id WHERE e.manager_id IS NULL`),
  X(135, S, 'P', 'Everyone with their manager', 4,
    'Build the full staff list: every person, with their manager if they have one.',
    'List all employees with their manager name, writing (none) where there is no manager. Order by employee id.',
    'employee, manager; by employee id', 'Self LEFT JOIN', 'PS',
    'Add each manager name only when the manager is in a different department.',
    ['Keep the boss', 'Use a LEFT JOIN, not inner'], ['employees'],
    'LEFT JOIN employees to itself so unmatched rows survive, then COALESCE the name.',
    'A LEFT JOIN keeps the boss with NULL manager columns; COALESCE turns them into readable text.',
    `SELECT e.name AS employee, COALESCE(m.name, '(none)') AS manager FROM employees e LEFT JOIN employees m ON m.id = e.manager_id ORDER BY e.id`, true),
  X(137, R, 'A', 'All people under Noah', 7,
    'Noah is planning a reorg and needs everyone below him, not only direct reports.',
    'Using a recursive CTE, list all descendants of the employee named Noah (reports, their reports, and so on) with their depth below Noah (direct report = 1). Order by depth, name. Add a depth guard.',
    'name, depth; by depth, name', 'Recursive CTE walking down the tree', 'ON',
    'Return the total salary of Noah organisation.',
    ['Do not include Noah', 'Depth guard', 'Find Noah by name, not hard-coded id'], ['employees'],
    'Start with Noah direct reports, then keep joining to people whose manager is already in the result.',
    'The anchor picks the first level; each recursion adds the next. The guard stops runaway loops.',
    `WITH RECURSIVE d(id, name, depth) AS (
  SELECT id, name, 1 FROM employees WHERE manager_id = (SELECT id FROM employees WHERE name = 'Noah')
  UNION ALL
  SELECT e.id, e.name, d.depth + 1 FROM employees e JOIN d ON e.manager_id = d.id WHERE d.depth < 10)
SELECT name, depth FROM d ORDER BY depth, name`, true),
  X(155, S, 'P', 'Hired within a year of manager', 5,
    'No one shares a hire date with their manager, so look for near matches: joined within a year of each other.',
    'List employees whose hire_date is within 365 days (either side) of their manager hire_date. Show employee, manager and days_apart (absolute). Order by employee.',
    'employee, manager, days_apart; by employee', 'Self-join with a date window', 'PS',
    'Change the window to 90 days and compare.',
    ['Use the absolute difference', 'The boss has no manager'], ['employees', 'emp_profile'],
    'Take ABS of the julianday difference between the two hire dates.',
    'A near-match join is a range condition on the difference. ABS covers employees who joined before or after.',
    `SELECT e.name AS employee, m.name AS manager, CAST(ABS(julianday(pe.hire_date) - julianday(pm.hire_date)) AS INT) AS days_apart
FROM employees e JOIN employees m ON m.id = e.manager_id JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
WHERE ABS(julianday(pe.hire_date) - julianday(pm.hire_date)) <= 365 ORDER BY e.name`, true),
  X(160, S, 'P', 'Salary gap to manager', 4,
    'Finance wants the pay gap between each person and their manager.',
    'For every employee with a manager show employee, manager, salary, manager_salary and gap (manager minus employee). Order by gap desc, employee.',
    'employee, manager, salary, manager_salary, gap; by gap desc, employee', 'Self-join with arithmetic', 'PS',
    'Express the gap as a percent of the manager salary.',
    ['Boss has no manager', 'Sort ties by name'], ['employees'],
    'Join employees to their manager and subtract the two salaries.',
    'Self-joins let two rows of one table appear side by side. Alias both sides clearly so the subtraction reads the right way.',
    `SELECT e.name AS employee, m.name AS manager, e.salary, m.salary AS manager_salary, m.salary - e.salary AS gap
FROM employees e JOIN employees m ON m.id = e.manager_id ORDER BY gap DESC, e.name`, true),
  X(194, S, 'A', 'Longest project overlaps', 8,
    'Delivery leads want the heaviest double bookings: pairs of assignments that overlap for a long time.',
    'For each employee list pairs of assignments that overlap by at least 90 days (inclusive days; NULL end means 2025-12-31). Show employee, project_a, project_b (project ids a<b), overlap_days. Order by overlap_days desc, employee, project_a.',
    'employee, project_a, project_b, overlap_days; by days desc', 'Interval overlap with length', 'ON',
    'Which employee has the most such pairs?',
    ['Inclusive day count adds 1', 'NULL end means ongoing', 'Each pair once'], ['project_assignments', 'employees'],
    'Overlap = earliest end minus latest start plus 1, using scalar MIN and MAX of two dates.',
    'Scalar MIN/MAX choose the shared window. Filtering on the length after the overlap test removes short touches.',
    `WITH a AS (SELECT emp_id, project_id, start_date, COALESCE(end_date, '2025-12-31') AS end_date FROM project_assignments)
SELECT e.name AS employee, x.project_id AS project_a, y.project_id AS project_b,
  CAST(julianday(MIN(x.end_date, y.end_date)) - julianday(MAX(x.start_date, y.start_date)) AS INT) + 1 AS overlap_days
FROM a x JOIN a y ON y.emp_id = x.emp_id AND x.project_id < y.project_id AND x.start_date <= y.end_date AND y.start_date <= x.end_date
JOIN employees e ON e.id = x.emp_id
WHERE julianday(MIN(x.end_date, y.end_date)) - julianday(MAX(x.start_date, y.start_date)) + 1 >= 90
ORDER BY overlap_days DESC, e.name, x.project_id`, true),
  X(205, S, 'P', 'Managers with no reports', 5,
    'A title can say manager while the org chart shows no team. Find those mismatches.',
    'List employees whose job_title (emp_profile) contains the word Manager but who have no direct reports. Show name and job_title.',
    'name, job_title', 'Anti-join on a self-reference', 'PS',
    'And employees with reports but no Manager in their title?',
    ['A title is not a reporting line', 'Use NOT EXISTS or LEFT JOIN IS NULL'], ['employees', 'emp_profile'],
    'Filter titles with LIKE, then keep rows that no employee row points at via manager_id.',
    'The anti-join asks for people nobody reports to. Combining it with the title filter finds the mismatch.',
    `SELECT e.name, p.job_title FROM employees e JOIN emp_profile p ON p.emp_id = e.id
WHERE p.job_title LIKE '%Manager%' AND NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id)`),
  X(210, S, 'P', 'Shared birthdays', 4,
    'The office calendar needs to know when two or more colleagues share a birth date.',
    'Show each birth_date (emp_profile) shared by two or more employees with the number of employees who share it. Order by birth_date.',
    'birth_date, employees; by birth_date', 'Group on a shared value', 'PS',
    'List the names for each shared date.',
    ['Match the full date, not only month and day', 'Single birthdays are not shown'], ['emp_profile'],
    'Group by birth_date and keep groups with more than one row.',
    'A shared value is a duplicate. HAVING COUNT(*) > 1 keeps only dates held by several people.',
    `SELECT birth_date, COUNT(*) AS employees FROM emp_profile GROUP BY birth_date HAVING COUNT(*) > 1 ORDER BY birth_date`, true),
  X(228, S, 'A', 'Hired 2+ years after manager', 5,
    'Leadership wants to know who joined long after the manager who now leads them.',
    'List employees hired more than 730 days after their manager. Show employee, manager and days_after. Order by days_after desc, employee.',
    'employee, manager, days_after; by days_after desc', 'Self-join comparing dates', 'PS',
    'Count them per manager.',
    ['Strictly more than 730 days', 'The boss is skipped'], ['employees', 'emp_profile'],
    'Subtract julianday values of the two hire dates and filter on the gap.',
    'The same two-profile join as before, now with a threshold on the day difference.',
    `SELECT e.name AS employee, m.name AS manager, CAST(julianday(pe.hire_date) - julianday(pm.hire_date) AS INT) AS days_after
FROM employees e JOIN employees m ON m.id = e.manager_id JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
WHERE julianday(pe.hire_date) - julianday(pm.hire_date) > 730 ORDER BY days_after DESC, e.name`, true),
  X(230, S, 'P', 'Most direct reports', 5,
    'Span of control review: which managers lead the biggest teams?',
    'Find the employees with the highest number of direct reports, including ties. Show name and reports. Order by name.',
    'name, reports; by name', 'Group on the self-reference, then max', 'PS',
    'Show the top two team sizes instead of only the max.',
    ['Ties all count', 'Boss rows with NULL manager_id are not a team'], ['employees'],
    'Count rows per manager_id, then keep counts equal to the maximum.',
    'Comparing to MAX keeps every tied manager, where LIMIT 1 would pick one arbitrarily.',
    `WITH c AS (SELECT manager_id, COUNT(*) AS reports FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id)
SELECT e.name, c.reports FROM c JOIN employees e ON e.id = c.manager_id WHERE c.reports = (SELECT MAX(reports) FROM c) ORDER BY e.name`, true),
  X(237, S, 'A', 'Products ordered together', 7,
    'Merchandising wants to see which two products tend to share an order.',
    'From order_items list the five most common product pairs that appear in the same order (each pair once, product ids a<b). Show product_a, product_b (names) and orders. Order by orders desc, product_a, product_b.',
    'product_a, product_b, orders; top 5', 'Self-join on order, pair counting', 'ON',
    'Add a minimum of two orders. What happens here?',
    ['Each pair once', 'Ties are common, so break them by name'], ['order_items', 'products'],
    'Join order_items to itself on order_id with a.product_id < b.product_id and count per pair.',
    'The id inequality turns an ordered pair into an unordered one. With little data most pairs tie at 1, so the tie-break matters.',
    `SELECT p1.name AS product_a, p2.name AS product_b, COUNT(*) AS orders
FROM order_items a JOIN order_items b ON b.order_id = a.order_id AND a.product_id < b.product_id
JOIN products p1 ON p1.id = a.product_id JOIN products p2 ON p2.id = b.product_id
GROUP BY a.product_id, b.product_id ORDER BY orders DESC, product_a, product_b LIMIT 5`, true),
  X(286, S, 'P', 'Managers who joined after a report', 6,
    'Some managers joined after people who now report to them. Which managers, and how many such reports?',
    'List managers who were hired after at least one of their direct reports. Show manager and reports_hired_earlier. Order by manager.',
    'manager, reports_hired_earlier; by manager', 'Self-join with group count', 'PS',
    'Show the longest head start a report had.',
    ['Count per manager, not per pair', 'Equal dates do not count'], ['employees', 'emp_profile'],
    'Join each report to the manager row, compare hire dates, then group by the manager.',
    'The comparison is the same as for a single employee; grouping turns it into a manager-level count.',
    `SELECT m.name AS manager, COUNT(*) AS reports_hired_earlier
FROM employees e JOIN employees m ON m.id = e.manager_id JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
WHERE pe.hire_date < pm.hire_date GROUP BY m.id ORDER BY m.name`, true),
  X(295, S, 'P', 'Same hire weekday as manager', 5,
    'A quirky onboarding check: who was hired on the same day of the week as their manager?',
    'List employees whose hire_date falls on the same weekday as their manager hire_date. Show employee, manager and weekday_no (0 = Sunday). Order by employee.',
    'employee, manager, weekday_no; by employee', 'Self-join on a derived value', 'PS',
    'Give the weekday as a name using CASE.',
    ['strftime %w: 0 is Sunday', 'The boss is skipped'], ['employees', 'emp_profile'],
    'Compare strftime of the two hire dates with the weekday format.',
    'Both sides are reduced to the same derived value before comparing. The result depends on the stored dates, not on today.',
    `SELECT e.name AS employee, m.name AS manager, CAST(strftime('%w', pe.hire_date) AS INT) AS weekday_no
FROM employees e JOIN employees m ON m.id = e.manager_id JOIN emp_profile pe ON pe.emp_id = e.id JOIN emp_profile pm ON pm.emp_id = m.id
WHERE strftime('%w', pe.hire_date) = strftime('%w', pm.hire_date) ORDER BY e.name`, true),
]

// Part 2: gaps and islands, relational division
const part2: SqlProblem[] = [
  X(9, G, 'A', 'Longest login streak', 8,
    'The product team measures habit: how many days in a row did each user come back?',
    'For each user in logins find the longest run of consecutive calendar days with a login. Show user_id, longest_days and the start date of that run (the earliest run if tied). Order by user_id.',
    'user_id, longest_days, start_date; by user_id', 'Gaps and islands (date minus row number)', 'ON',
    'Return every streak of three days or more, not only the longest.',
    ['Duplicate logins on one day', 'A single login is a streak of 1', 'Ties between two runs'], ['logins'],
    'Subtract each login row number (in days) from its date; rows in one run share the same result.',
    'Consecutive dates minus consecutive row numbers give a constant, which labels the island. A gap breaks the constant. Removing duplicate days first keeps the row numbers honest.',
    `WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
g AS (SELECT user_id, login_date, date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' days') AS grp FROM d),
s AS (SELECT user_id, MIN(login_date) AS start_date, COUNT(*) AS days FROM g GROUP BY user_id, grp),
r AS (SELECT user_id, start_date, days, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY days DESC, start_date) AS rn FROM s)
SELECT user_id, days AS longest_days, start_date FROM r WHERE rn = 1 ORDER BY user_id`, true),
  X(11, G, 'P', 'Missing payment ids', 6,
    'Audit found holes in the payment numbering. Pending orders were never paid, so some ids are missing.',
    'Among payments with id below 100, list each range of missing ids between two existing ids. Show gap_start and gap_end (inclusive). Order by gap_start.',
    'gap_start, gap_end; by gap_start', 'Gaps with LEAD', 'PS',
    'Total how many ids are missing.',
    ['Ids 101 and 102 are outside the sequence', 'A gap of one id has start = end'], ['payments'],
    'Look at each id next id with LEAD and keep rows where the difference is more than 1.',
    'A gap exists where the next id is not id + 1. The missing range runs from id + 1 to next - 1. Filtering ids below 100 keeps the later parts out of the picture.',
    `WITH p AS (SELECT id, LEAD(id) OVER (ORDER BY id) AS next_id FROM payments WHERE id < 100)
SELECT id + 1 AS gap_start, next_id - 1 AS gap_end FROM p WHERE next_id - id > 1 ORDER BY gap_start`, true),
  X(27, D, 'P', 'Bought from every category', 8,
    'Marketing wants loyal buyers: customers who bought from every product category in the shop.',
    'List customers who bought (sales) at least one product in every category that has products. Toys has no products, so it does not count. Show name, ordered by name. Use NOT EXISTS twice.',
    'name; by name', 'Relational division (double NOT EXISTS)', 'ON',
    'Solve it again with GROUP BY and HAVING COUNT(DISTINCT).',
    ['An empty category must not block everyone', 'Compare against categories with products'], ['customers', 'sales', 'products', 'categories'],
    'No category exists for which this customer has no sale. Restrict the categories to those with products.',
    'Double negation reads: there is no required category that the customer lacks. Including an empty category such as Toys would make the answer empty.',
    `SELECT c.name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM categories k
  WHERE EXISTS (SELECT 1 FROM products p WHERE p.category = k.name)
    AND NOT EXISTS (SELECT 1 FROM sales s JOIN products p ON p.id = s.product_id WHERE s.customer_id = c.id AND p.category = k.name))
ORDER BY c.name`, true),
  X(29, D, 'A', 'Top 3 reps every month', 9,
    'Sales leadership wants steady performers: reps who made the monthly top three in every month of the last quarter.',
    'Rank reps by total won deal amount per month (Oct to Dec 2025, as of 31 Dec 2025), restarting each month, ties share a rank. List reps ranked in the top 3 in every one of those months, with months_in_top3. Division by count.',
    'name, months_in_top3', 'Per-month RANK, then division by count', 'ON',
    'Which rep ranked first in the most months?',
    ['Only won deals', 'Rank restarts each month', 'Open and lost deals are ignored'], ['deals', 'sales_reps'],
    'RANK() OVER (PARTITION BY month ...), keep rank <= 3, then compare the count of months with the total months.',
    'PARTITION BY month resets the rank. Division means the rep appears in all months, so the count of qualifying months must equal the number of months.',
    `WITH m AS (SELECT rep_id, strftime('%Y-%m', closed_on) AS month, SUM(amount) AS won FROM deals
  WHERE status = 'won' AND closed_on BETWEEN '2025-10-01' AND '2025-12-31' GROUP BY rep_id, month),
r AS (SELECT rep_id, month, RANK() OVER (PARTITION BY month ORDER BY won DESC) AS rk FROM m)
SELECT s.name, COUNT(*) AS months_in_top3 FROM r JOIN sales_reps s ON s.id = r.rep_id WHERE r.rk <= 3
GROUP BY s.id HAVING COUNT(*) = (SELECT COUNT(DISTINCT month) FROM m)`),
  X(46, G, 'A', 'Missing work days', 7,
    'Payroll wants to see the breaks in each person timesheet record.',
    'For each employee list every gap between two consecutive timesheet dates of more than one day. Show employee, gap_from (first missing day), gap_to (last missing day) and missing_days. Order by employee, gap_from.',
    'employee, gap_from, gap_to, missing_days; by employee, gap_from', 'Gaps with LEAD on dates', 'ON',
    'Show only gaps that do not fall on a weekend.',
    ['Missing days exclude both known dates', 'The last date has no next row'], ['timesheets', 'employees'],
    'Pair each date with the next date per employee and keep pairs more than one day apart.',
    'LEAD gives the next recorded date. The gap runs from the day after the current date to the day before the next. The last row has NULL next and drops out.',
    `WITH t AS (SELECT emp_id, work_date, LEAD(work_date) OVER (PARTITION BY emp_id ORDER BY work_date) AS next_date FROM timesheets)
SELECT e.name AS employee, date(t.work_date, '+1 day') AS gap_from, date(t.next_date, '-1 day') AS gap_to,
  CAST(julianday(t.next_date) - julianday(t.work_date) AS INT) - 1 AS missing_days
FROM t JOIN employees e ON e.id = t.emp_id WHERE julianday(t.next_date) - julianday(t.work_date) > 1 ORDER BY e.name, gap_from`, true),
  X(49, G, 'A', 'Runs of long days', 8,
    'Wellbeing check: spot stretches of three or more days in a row with at least 8 hours worked.',
    'Using timesheets, find runs of 3 or more consecutive calendar days where an employee logged at least 8 hours each day. Show employee, run_start, run_end and days. Order by employee, run_start.',
    'employee, run_start, run_end, days; by employee, run_start', 'Gaps and islands after a filter', 'ON',
    'Which run had the highest total hours?',
    ['Filter first, then number rows', 'A day under 8 hours breaks the run', 'Calendar days, not working days'], ['timesheets', 'employees'],
    'Keep only long days, number them per employee, and subtract the row number from the date to label each run.',
    'Filtering first makes broken days vanish, so the row number only stays in step with the date inside a true run. The constant difference is the island label.',
    `WITH d AS (SELECT emp_id, work_date, ROW_NUMBER() OVER (PARTITION BY emp_id ORDER BY work_date) AS rn FROM timesheets WHERE hours >= 8),
g AS (SELECT emp_id, work_date, julianday(work_date) - rn AS grp FROM d)
SELECT e.name AS employee, MIN(work_date) AS run_start, MAX(work_date) AS run_end, COUNT(*) AS days
FROM g JOIN employees e ON e.id = g.emp_id GROUP BY g.emp_id, grp HAVING COUNT(*) >= 3 ORDER BY e.name, run_start`, true),
  X(52, D, 'A', 'Bought every Stationery item', 7,
    'A stationery promotion targets customers who already bought each Stationery product.',
    'List customers who bought every product in the Stationery category (using sales). Show name and the number of Stationery products bought. Use GROUP BY with HAVING COUNT(DISTINCT) equal to the category size. Order by name.',
    'name, products_bought; by name', 'Relational division (HAVING COUNT DISTINCT)', 'ON',
    'Repeat it for the Home category.',
    ['Count distinct products, not rows', 'Compare with the category total, not a typed number'], ['customers', 'sales', 'products'],
    'Join sales to products filtered to the category, group by customer and compare the distinct count with the count of products in the category.',
    'If a customer distinct count equals the category size, they bought all of it. Counting rows instead of distinct products would be fooled by repeat purchases.',
    `SELECT c.name, COUNT(DISTINCT s.product_id) AS products_bought
FROM sales s JOIN products p ON p.id = s.product_id AND p.category = 'Stationery' JOIN customers c ON c.id = s.customer_id
GROUP BY c.id HAVING COUNT(DISTINCT s.product_id) = (SELECT COUNT(*) FROM products WHERE category = 'Stationery') ORDER BY c.name`, true),
  X(71, D, 'A', 'Bought in all 12 months', 6,
    'A subscription team looks for customers who buy every single month of 2025.',
    'List customers with at least one sale in every calendar month of 2025 (as of 31 Dec 2025). Show name and months_active. Use GROUP BY with HAVING COUNT(DISTINCT month) = 12.',
    'name, months_active', 'Relational division over months (HAVING)', 'PS',
    'Allow one missing month. How does the query change?',
    ['Count distinct months, not sales', 'Limit to 2025'], ['sales', 'customers'],
    'Group by customer and count distinct strftime months.',
    'Division against a fixed set of twelve values: the count of distinct months must equal twelve. Counting rows would let a customer with many sales in few months slip through.',
    `SELECT c.name, COUNT(DISTINCT strftime('%m', s.sale_date)) AS months_active
FROM sales s JOIN customers c ON c.id = s.customer_id WHERE s.sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY c.id HAVING COUNT(DISTINCT strftime('%m', s.sale_date)) = 12`),
  X(75, G, 'P', 'Pay range per department', 5,
    'Compensation wants the spread between the best and lowest paid person in each department.',
    'For each department in employees.dept show the highest salary, lowest salary and the gap between them. A one-person department has gap 0. Use window functions. Order by gap desc, dept.',
    'dept, highest, lowest, gap; by gap desc, dept', 'Window MAX/MIN per partition', 'PS',
    'Name who earns the highest and lowest in each department.',
    ['One-person departments', 'DISTINCT after the window'], ['employees'],
    'MAX(salary) OVER (PARTITION BY dept) minus MIN over the same partition, then DISTINCT.',
    'Window functions repeat on every row, so DISTINCT collapses them to one row per department. Plain GROUP BY would also work.',
    `SELECT DISTINCT dept, MAX(salary) OVER (PARTITION BY dept) AS highest, MIN(salary) OVER (PARTITION BY dept) AS lowest,
  MAX(salary) OVER (PARTITION BY dept) - MIN(salary) OVER (PARTITION BY dept) AS gap
FROM employees ORDER BY gap DESC, dept`, true),
  X(76, G, 'P', 'Calendar for 2025', 5,
    'Reports need a date table: one row for every day of the year, even days with no data.',
    'Generate one row per date from 2025-01-01 to 2025-12-31 with a recursive CTE. Show date, month (YYYY-MM) and weekday_no (0 = Sunday). Order by date.',
    'date, month, weekday_no; by date', 'Recursive calendar CTE', 'PS',
    'Mark weekends with a flag column.',
    ['Stop at the last date', 'SQLite has no generate_series'], [],
    'Start with the first date and add one day each step until the last date.',
    'A recursive CTE is the SQLite replacement for generate_series. The WHERE in the recursive part is the stop condition.',
    `WITH RECURSIVE cal(d) AS (SELECT '2025-01-01' UNION ALL SELECT date(d, '+1 day') FROM cal WHERE d < '2025-12-31')
SELECT d AS date, strftime('%Y-%m', d) AS month, CAST(strftime('%w', d) AS INT) AS weekday_no FROM cal ORDER BY d`, true),
  X(100, D, 'P', 'On every active project', 7,
    'Resourcing wants staff who contributed to every project that is currently active.',
    'List employees who have an assignment on every project with status active. Use NOT EXISTS twice (no active project exists without an assignment for this person). Show name.',
    'name', 'Relational division (double NOT EXISTS)', 'ON',
    'Do it with GROUP BY and HAVING instead and compare.',
    ['Only active projects count', 'Employees with no assignments must fail'], ['employees', 'projects', 'project_assignments'],
    'For this employee, there is no active project without a matching assignment row.',
    'The inner NOT EXISTS finds a missing assignment; the outer one asks that none are missing. The active filter is on the project side only.',
    `SELECT e.name FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM project_assignments a WHERE a.emp_id = e.id AND a.project_id = p.id)) ORDER BY e.name`, true),
  X(102, G, 'A', 'Orders per day with zero days', 6,
    'A daily chart must show every day of January 2025, including days with no orders.',
    'Count orders (any status) for each day from 2025-01-01 to 2025-01-31 using a generated calendar and a LEFT JOIN. Days without orders show 0. Order by day.',
    'day, orders; by day', 'Calendar CTE + LEFT JOIN', 'PS',
    'Add a 7-day moving total.',
    ['Count a joined column, not *', 'Include empty days'], ['orders'],
    'Generate the dates with a recursive CTE, LEFT JOIN orders on the date and COUNT the order id.',
    'Grouping orders alone loses days with no rows. A calendar on the left makes every day appear, and COUNT(o.id) gives 0 where nothing matched.',
    `WITH RECURSIVE d(day) AS (SELECT '2025-01-01' UNION ALL SELECT date(day, '+1 day') FROM d WHERE day < '2025-01-31')
SELECT d.day, COUNT(o.id) AS orders FROM d LEFT JOIN orders o ON o.created_at = d.day GROUP BY d.day ORDER BY d.day`, true),
  X(104, G, 'A', 'Ids missing from the leave log', 6,
    'Employee ids run 1 to 11 with no holes, so look at the leave log: which ids never appear in it?',
    'Generate every id from the smallest to the largest employee id with a recursive CTE and list those that never appear as emp_id in leave_requests. Order by id.',
    'id; by id', 'Generated sequence + anti-join', 'PS',
    'Return the ids as ranges instead of single values.',
    ['Ends of the range count', 'Use NOT EXISTS, not NOT IN with NULLs'], ['employees', 'leave_requests'],
    'Build 1..max id, then keep numbers with no matching leave row.',
    'A generated list is what the log is compared against. NOT EXISTS is safe even if the log had NULLs.',
    `WITH RECURSIVE n(id) AS (SELECT MIN(id) FROM employees UNION ALL SELECT id + 1 FROM n WHERE id < (SELECT MAX(id) FROM employees))
SELECT n.id FROM n WHERE NOT EXISTS (SELECT 1 FROM leave_requests l WHERE l.emp_id = n.id) ORDER BY n.id`, true),
  X(108, G, 'A', 'Longest quiet spells', 8,
    'Customer success wants the customers who went longest between two completed orders.',
    'For each customer find their longest gap in days between two consecutive completed orders. Show the three customers with the largest gap: name, from_date, to_date, gap_days. Order by gap_days desc, name.',
    'name, from_date, to_date, gap_days; top 3', 'LAG gap per customer, then top-N', 'ON',
    'How would you include the gap since the last order up to 31 Dec 2025?',
    ['Only completed orders', 'Customers with one order have no gap', 'Break ties by name'], ['orders', 'customers'],
    'LAG over created_at per customer, subtract with julianday, then take the biggest per customer.',
    'LAG pairs every order with the previous one. Take the largest per customer first, then the top three overall.',
    `WITH g AS (SELECT customer_id, created_at, LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at) AS prev FROM orders WHERE status = 'completed'),
x AS (SELECT customer_id, prev AS from_date, created_at AS to_date, CAST(julianday(created_at) - julianday(prev) AS INT) AS gap_days,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY julianday(created_at) - julianday(prev) DESC, prev) AS rn FROM g WHERE prev IS NOT NULL)
SELECT c.name, x.from_date, x.to_date, x.gap_days FROM x JOIN customers c ON c.id = x.customer_id WHERE x.rn = 1 ORDER BY x.gap_days DESC, c.name LIMIT 3`, true),
  X(109, D, 'A', 'Ordered every Home product', 8,
    'A buyer wants customers who have ordered each product in the Home category through order_items.',
    'List customers with orders (any status) that include every product of the Home category, using NOT EXISTS twice. Show name.',
    'name', 'Relational division (double NOT EXISTS)', 'ON',
    'Add the condition that the orders were completed.',
    ['Check against all category products', 'Items live in order_items'], ['customers', 'orders', 'order_items', 'products'],
    'There is no Home product for which this customer has no order line.',
    'Same shape as every division with NOT EXISTS: required set on the outside, an existence check on the inside. The category filter is on the required set only.',
    `SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category = 'Home'
  AND NOT EXISTS (SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.customer_id = c.id AND i.product_id = p.id)) ORDER BY c.name`, true),
  X(126, G, 'A', 'People with repeated streaks', 8,
    'Managers want staff who log work in several separate runs of three or more days in a row.',
    'Using timesheets, count each employee runs of 3 or more consecutive calendar days. List employees with at least 2 such runs: name, runs, longest_run. Order by runs desc, name.',
    'name, runs, longest_run; by runs desc, name', 'Gaps and islands, then group the islands', 'ON',
    'Include the weekday of each run start.',
    ['Runs must be calendar-consecutive', 'Count runs, not days'], ['timesheets', 'employees'],
    'Label islands with date minus row number, count rows per island, then count islands per employee.',
    'Two-level grouping: first group days into islands, then group islands per person. A single long run counts as one run, not many.',
    `WITH d AS (SELECT emp_id, julianday(work_date) - ROW_NUMBER() OVER (PARTITION BY emp_id ORDER BY work_date) AS grp FROM timesheets),
r AS (SELECT emp_id, COUNT(*) AS days FROM d GROUP BY emp_id, grp HAVING COUNT(*) >= 3)
SELECT e.name, COUNT(*) AS runs, MAX(days) AS longest_run FROM r JOIN employees e ON e.id = r.emp_id
GROUP BY r.emp_id HAVING COUNT(*) >= 2 ORDER BY runs DESC, e.name`, true),
  X(152, G, 'A', 'Average days between orders', 6,
    'Customer success tracks ordering rhythm: how many days pass between orders on average?',
    'For each customer with two or more orders (any status) show name, gaps (number of gaps) and the average days between consecutive orders, rounded to 1 decimal. Order by average desc, name.',
    'name, gaps, avg_gap_days; by avg desc, name', 'LAG then AVG', 'PS',
    'Compare each customer average with the overall average gap.',
    ['One order means no gap', 'Average gaps, not order dates'], ['orders', 'customers'],
    'LAG gives the previous order date per customer; AVG ignores the NULL for the first order.',
    'The first order has no previous date, so the gap is NULL and AVG skips it. Averaging the gaps is not the same as average order date.',
    `WITH g AS (SELECT customer_id, julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at)) AS gap FROM orders)
SELECT c.name, COUNT(g.gap) AS gaps, ROUND(AVG(g.gap), 1) AS avg_gap_days FROM g JOIN customers c ON c.id = g.customer_id
WHERE g.gap IS NOT NULL GROUP BY c.id ORDER BY avg_gap_days DESC, c.name`, true),
  X(153, D, 'P', 'Never bought the Mug', 5,
    'A cross-sell list: customers who buy from us but have never bought the Mug.',
    'List customers who have at least one sale but no sale of the product named Mug. Show name, ordered by name.',
    'name; by name', 'Anti-join with NOT EXISTS', 'PS',
    'Which of them bought a product in the Home category?',
    ['Customers with no sales at all are excluded', 'Match the product by name'], ['customers', 'sales', 'products'],
    'The customer has sales, and no sale row joins to the product named Mug.',
    'NOT EXISTS answers never. Adding EXISTS for any sale keeps only active buyers, otherwise customers who never bought anything would be listed.',
    `SELECT c.name FROM customers c
WHERE EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM sales s JOIN products p ON p.id = s.product_id WHERE s.customer_id = c.id AND p.name = 'Mug') ORDER BY c.name`, true),
  X(163, D, 'A', 'Timesheet every day of the week', 8,
    'Attendance review: who logged time on every single day of the first work week of December 2025?',
    'List employees with a timesheet row on each date from 2025-12-01 to 2025-12-05. Generate the five dates with a recursive CTE and use NOT EXISTS twice. Show name. Order by name.',
    'name; by name', 'Division against a generated set', 'ON',
    'Make the week a parameter and show how many days each person missed.',
    ['Every date must match', 'Generate the dates instead of typing them'], ['employees', 'timesheets'],
    'No day in the five exists for which this employee has no timesheet row.',
    'The required set is a generated list of dates. The double negation reads: there is no date in the week the employee missed.',
    `WITH RECURSIVE d(day) AS (SELECT '2025-12-01' UNION ALL SELECT date(day, '+1 day') FROM d WHERE day < '2025-12-05')
SELECT e.name FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM d WHERE NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.emp_id = e.id AND t.work_date = d.day)) ORDER BY e.name`, true),
  X(186, D, 'P', 'Product every buyer ordered', 7,
    'Which product was ordered by every customer who has order items on file?',
    'List products that appear in the order_items of every customer who has at least one order item. Show the product name. Use NOT EXISTS twice.',
    'name', 'Relational division (double NOT EXISTS)', 'ON',
    'Switch roles: which customers ordered every product bought by customer 1?',
    ['Customers with no items must not block everyone', 'Any order status counts'], ['products', 'customers', 'orders', 'order_items'],
    'Required set: customers who have order items. For this product there is no such customer without a line for it.',
    'Here the products play the candidate role and customers the required set. Limiting to customers with items stops the empty ones from making the answer empty.',
    `SELECT p.name FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM customers c
  WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.customer_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.customer_id = c.id AND i.product_id = p.id))`),
  X(189, TR, 'A', 'Bought once, never reordered', 6,
    'Retention team: which customer and product pairs were bought in one order only and never again?',
    'From order_items and orders list each customer and product pair that appears in exactly one distinct order. Show customer, product. Order by customer, product.',
    'customer, product; by customer, product', 'Group by pair, HAVING COUNT = 1', 'PS',
    'Which products are rarely reordered by anybody?',
    ['Count distinct orders, not lines', 'Same product twice in one order is still one order'], ['orders', 'order_items', 'products', 'customers'],
    'Group by customer and product and count distinct order ids.',
    'Reorder means a second order. Counting rows could be fooled by an order that lists the product on two lines.',
    `SELECT c.name AS customer, p.name AS product FROM orders o
JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id JOIN customers c ON c.id = o.customer_id
GROUP BY o.customer_id, i.product_id HAVING COUNT(DISTINCT o.id) = 1 ORDER BY customer, product`, true),
  X(201, D, 'A', 'On every project in own department', 9,
    'Department heads want staff who worked on every project owned by their own department.',
    'List employees (department from emp_profile.dept_id) who have an assignment on every project of that department. Skip departments with no projects. Show name and department name. Order by name.',
    'name, department; by name', 'Relational division per group', 'ON',
    'Add how many of the department projects each employee joined.',
    ['Departments without projects must not qualify anyone', 'Compare within each employee department'], ['employees', 'emp_profile', 'departments', 'projects', 'project_assignments'],
    'For this employee there is no project in their department without an assignment row, and the department has at least one project.',
    'The required set depends on the row, so it sits in a correlated subquery. Without the EXISTS check, people in project-less departments would pass vacuously.',
    `SELECT e.name, d.name AS department FROM employees e
JOIN emp_profile ep ON ep.emp_id = e.id JOIN departments d ON d.id = ep.dept_id
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.dept_id = ep.dept_id)
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.dept_id = ep.dept_id
    AND NOT EXISTS (SELECT 1 FROM project_assignments a WHERE a.emp_id = e.id AND a.project_id = p.id)) ORDER BY e.name`, true),
  X(204, G, 'A', 'Top 3 longest work streaks', 8,
    'Leadership wants to recognise the longest unbroken stretches of daily time logging.',
    'Find each employee longest run of consecutive calendar days in timesheets, rank employees by it (ties share a rank, no skipped numbers) and show those ranked 1 to 3: name, longest_run, rank. Order by rank, name.',
    'name, longest_run, rank; by rank, name', 'Gaps and islands + DENSE_RANK', 'ON',
    'What if ties should skip rank numbers instead?',
    ['Calendar-consecutive days', 'Tied employees share the rank'], ['timesheets', 'employees'],
    'Label islands, take the longest per employee, then DENSE_RANK over that length.',
    'First islands, then a maximum per person, then a ranking. DENSE_RANK keeps rank numbers contiguous when several people tie.',
    `WITH d AS (SELECT emp_id, julianday(work_date) - ROW_NUMBER() OVER (PARTITION BY emp_id ORDER BY work_date) AS grp FROM timesheets),
b AS (SELECT emp_id, MAX(days) AS longest_run FROM (SELECT emp_id, COUNT(*) AS days FROM d GROUP BY emp_id, grp) GROUP BY emp_id),
k AS (SELECT emp_id, longest_run, DENSE_RANK() OVER (ORDER BY longest_run DESC) AS rank FROM b)
SELECT e.name, k.longest_run, k.rank FROM k JOIN employees e ON e.id = k.emp_id WHERE k.rank <= 3 ORDER BY k.rank, e.name`, true),
  X(208, D, 'A', 'Bought every month lately', 7,
    'Retention wants customers who bought in every one of the last four months (September to December 2025, as of 31 Dec 2025).',
    'List customers with at least one sale in each month from 2025-09 to 2025-12. Use GROUP BY with HAVING COUNT(DISTINCT month) = 4. Show name and months. Order by name.',
    'name, months; by name', 'Division over a month window (HAVING)', 'ON',
    'Make the number of months a parameter.',
    ['Window is fixed to the snapshot', 'Count distinct months'], ['sales', 'customers'],
    'Filter the dates, group by customer and compare distinct months with 4.',
    'Division against four required months: the count of distinct months in the window must be four. The date filter defines the required set.',
    `SELECT c.name, COUNT(DISTINCT strftime('%Y-%m', s.sale_date)) AS months FROM sales s JOIN customers c ON c.id = s.customer_id
WHERE s.sale_date BETWEEN '2025-09-01' AND '2025-12-31' GROUP BY c.id HAVING COUNT(DISTINCT strftime('%Y-%m', s.sale_date)) = 4 ORDER BY c.name`, true),
  X(229, D, 'A', 'Every Electronics product that sells', 8,
    'Webcam never sold, so ask a fairer question: who bought every Electronics product that has ever been sold?',
    'List customers who bought every Electronics product that appears in sales at least once (products never sold are not required). Use NOT EXISTS twice. Show name.',
    'name', 'Relational division with a filtered required set', 'ON',
    'What changes if never-sold products are required?',
    ['Do not require products with no sales', 'Required set comes from sales'], ['customers', 'products', 'sales'],
    'Required set: Electronics products that have a sale. For this customer none of them is missing.',
    'The required set is itself filtered by EXISTS. Requiring all Electronics products, including one never sold, would return nobody.',
    `SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category = 'Electronics' AND EXISTS (SELECT 1 FROM sales x WHERE x.product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.id AND s.product_id = p.id)) ORDER BY c.name`, true),
  X(234, D, 'A', 'Sold 5+ units every quarter', 8,
    'Merchandising seeks reliable products: sold at least 5 units in every quarter of 2025.',
    'List products with at least 5 units sold (sales.qty) in each of the four quarters of 2025 (as of 31 Dec 2025). Show name. Order by name. Use grouping by quarter, then count quarters.',
    'name; by name', 'Division over quarters (count = 4)', 'ON',
    'Which quarter is the weakest for each product?',
    ['A quarter with 4 units fails', 'Count quarters that pass'], ['sales', 'products'],
    'Total units per product and quarter, keep totals of 5 or more, then keep products with 4 passing quarters.',
    'Filter first, then count what survives: a product must pass in all four quarters. Quarter comes from (month + 2) / 3.',
    `WITH q AS (SELECT product_id, (CAST(strftime('%m', sale_date) AS INT) + 2) / 3 AS qtr FROM sales WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY product_id, qtr HAVING SUM(qty) >= 5)
SELECT p.name FROM q JOIN products p ON p.id = q.product_id GROUP BY p.id HAVING COUNT(*) = 4 ORDER BY p.name`, true),
  X(260, D, 'A', 'On every big project', 8,
    'Finance asks who worked on all of the large projects, those with a budget of at least 250.',
    'List employees with an assignment on every project whose budget is at least 250. Use GROUP BY with HAVING COUNT(DISTINCT project) equal to the number of such projects. Show name. Order by name.',
    'name; by name', 'Relational division (HAVING COUNT DISTINCT)', 'ON',
    'Rewrite it with NOT EXISTS.',
    ['Count distinct projects', 'Filter projects before counting'], ['employees', 'project_assignments', 'projects'],
    'Join assignments to large projects, count distinct projects per employee and compare with the count of large projects.',
    'If the employee count of distinct large projects equals all large projects, they covered them all. A project with two roles must still count once.',
    `SELECT e.name FROM project_assignments a JOIN projects p ON p.id = a.project_id AND p.budget >= 250 JOIN employees e ON e.id = a.emp_id
GROUP BY e.id HAVING COUNT(DISTINCT p.id) = (SELECT COUNT(*) FROM projects WHERE budget >= 250) ORDER BY e.name`, true),
  X(261, D, 'A', 'Ordered from all categories', 7,
    'Which customers ordered products from every product category, based on their order items?',
    'List customers whose orders (any status) include products from every distinct category in products. Use GROUP BY with HAVING COUNT(DISTINCT category) equal to the total number of categories among products. Show name.',
    'name', 'Relational division (HAVING COUNT DISTINCT)', 'ON',
    'List the categories each of the others is missing.',
    ['Count distinct categories', 'Use categories that products have, not the categories table'], ['customers', 'orders', 'order_items', 'products'],
    'Join through order_items to products, group by customer and compare distinct categories with the distinct total.',
    'The categories table includes Toys, which has no products; counting categories that products actually have avoids an impossible target.',
    `SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id
GROUP BY c.id HAVING COUNT(DISTINCT p.category) = (SELECT COUNT(DISTINCT category) FROM products) ORDER BY c.name`, true),
  X(297, D, 'A', 'Suppliers covering all regions', 6,
    'Logistics wants suppliers who have delivered to every delivery region we serve.',
    'List suppliers who have at least one delivery in every region found in deliveries. Show name and regions. Use GROUP BY with HAVING COUNT(DISTINCT region) equal to the total number of regions. Order by name.',
    'name, regions; by name', 'Relational division (HAVING COUNT DISTINCT)', 'PS',
    'Which region is missing for each of the other suppliers?',
    ['Count distinct regions', 'Suppliers with no deliveries never qualify'], ['suppliers', 'deliveries'],
    'Group deliveries by supplier and compare distinct regions with the total distinct regions.',
    'Distinct counting prevents repeat deliveries to one region from inflating the total. Echo Freight has no deliveries and drops out.',
    `SELECT s.name, COUNT(DISTINCT d.region) AS regions FROM deliveries d JOIN suppliers s ON s.id = d.supplier_id
GROUP BY s.id HAVING COUNT(DISTINCT d.region) = (SELECT COUNT(DISTINCT region) FROM deliveries) ORDER BY s.name`, true),
]

// Part 3: trends and retention
const part3: SqlProblem[] = [
  X(30, TR, 'A', 'Month-over-month change per product', 8,
    'The sales dashboard shows how each product amount moved against the month before.',
    'For October to December 2025 (as of 31 Dec 2025) show each product monthly sales amount and the percent change vs the previous calendar month, 1 decimal. If the previous month has no sales, skip that row. Order by product name, month.',
    'name, month, amount, pct_change; by name, month', 'LAG with a month adjacency check', 'ON',
    'Return only rows where the change is above 50%.',
    ['The previous row may not be the previous month', 'Divide by the earlier amount'], ['sales', 'products'],
    'LAG returns the previous row; also compare its month with the calendar month before this one.',
    'Gaps in the data make LAG skip months silently, so verify adjacency. Percent change is (now - before) / before.',
    `WITH m AS (SELECT product_id, strftime('%Y-%m', sale_date) AS month, SUM(amount) AS amount FROM sales GROUP BY 1, 2),
l AS (SELECT product_id, month, amount, LAG(amount) OVER (PARTITION BY product_id ORDER BY month) AS prev_amount, LAG(month) OVER (PARTITION BY product_id ORDER BY month) AS prev_month FROM m)
SELECT p.name, l.month, l.amount, ROUND(100.0 * (l.amount - l.prev_amount) / l.prev_amount, 1) AS pct_change
FROM l JOIN products p ON p.id = l.product_id
WHERE l.month >= '2025-10' AND l.prev_month = strftime('%Y-%m', date(l.month || '-01', '-1 month')) ORDER BY p.name, l.month`, true),
  X(56, TR, 'A', 'Year-over-year payroll growth', 8,
    'Finance compares total pay with the same department a year earlier. There is only one year of sales, so use salary history.',
    'For each department with staff show, per year (effective_date), the total of salaries in salary_history and the percent growth vs the previous year of the same department, 1 decimal (NULL for the first year). Order by department, year.',
    'dept, year, payroll, growth_pct; by dept, year', 'Year-over-year with LAG', 'ON',
    'Show only departments whose payroll grew every year.',
    ['First year has no growth', 'Wen has no department', 'Partition by department'], ['salary_history', 'emp_profile', 'departments'],
    'Sum salary per department and year, then LAG over the year inside each department.',
    'LAG partitioned by department compares like with like. The first year has no earlier row, so its growth stays NULL instead of 0.',
    `WITH y AS (SELECT strftime('%Y', h.effective_date) AS year, p.dept_id, SUM(h.salary) AS payroll
  FROM salary_history h JOIN emp_profile p ON p.emp_id = h.emp_id WHERE p.dept_id IS NOT NULL GROUP BY 1, 2)
SELECT d.name AS dept, y.year, y.payroll,
  ROUND(100.0 * (y.payroll - LAG(y.payroll) OVER (PARTITION BY y.dept_id ORDER BY y.year)) / LAG(y.payroll) OVER (PARTITION BY y.dept_id ORDER BY y.year), 1) AS growth_pct
FROM y JOIN departments d ON d.id = y.dept_id ORDER BY d.name, y.year`, true),
  X(83, TR, 'A', 'Price rises in the last 6 months', 6,
    'Pricing review: which products got more expensive recently?',
    'Using product_prices, list price increases that took effect in the last 6 months (effective_date on or after 2025-06-30, as of 31 Dec 2025). Show product name, old_price, new_price and effective_date. Order by effective_date, name.',
    'name, old_price, new_price, effective_date', 'LAG over a price history', 'PS',
    'Also show the percent increase.',
    ['Compare with the previous price of the same product', 'A price cut is not an increase', 'First price has no previous'], ['product_prices', 'products'],
    'LAG the price per product by effective date, keep rows where price is higher and the date is in the window.',
    'The previous price comes from the same product earlier row. Filtering on the date after LAG would be wrong if the window were applied first, so compute LAG first.',
    `WITH p AS (SELECT product_id, price, effective_date, LAG(price) OVER (PARTITION BY product_id ORDER BY effective_date) AS old_price FROM product_prices)
SELECT pr.name, p.old_price, p.price AS new_price, p.effective_date FROM p JOIN products pr ON pr.id = p.product_id
WHERE p.old_price IS NOT NULL AND p.price > p.old_price AND p.effective_date >= '2025-06-30' ORDER BY p.effective_date, pr.name`, true),
  X(136, TR, 'A', 'Units up three months running', 7,
    'Which products are gaining momentum right now?',
    'List products whose monthly units sold rose each month across October, November and December 2025 (Oct < Nov < Dec, as of 31 Dec 2025). Show name and the three monthly unit totals. Order by name.',
    'name, oct_units, nov_units, dec_units; by name', 'Always-increasing series over a window', 'ON',
    'Make the number of months a parameter.',
    ['All three months must have sales', 'Strictly higher, equal does not count'], ['sales', 'products'],
    'Total units per product and month, join the three months side by side and compare them.',
    'A strict increase needs a value in all three months, so the joins double as a presence check. Flat months fail the test.',
    `WITH m AS (SELECT product_id, strftime('%Y-%m', sale_date) AS month, SUM(qty) AS units FROM sales GROUP BY 1, 2)
SELECT p.name, a.units AS oct_units, b.units AS nov_units, c.units AS dec_units
FROM m a JOIN m b ON b.product_id = a.product_id AND b.month = '2025-11' JOIN m c ON c.product_id = a.product_id AND c.month = '2025-12'
JOIN products p ON p.id = a.product_id WHERE a.month = '2025-10' AND a.units < b.units AND b.units < c.units ORDER BY p.name`, true),
  X(158, TR, 'A', 'Customers buying more each month', 7,
    'Account managers want customers whose purchase volume grows month after month at the end of the year.',
    'List customers whose total units (sales.qty) rose strictly across October, November and December 2025 (as of 31 Dec 2025). A month with no purchases counts as 0. Show name, oct_units, nov_units, dec_units. Order by name.',
    'name, oct_units, nov_units, dec_units; by name', 'Conditional aggregation, zero-filled trend', 'ON',
    'Extend it to the last six months.',
    ['Missing months count as 0', 'Strictly increasing'], ['sales', 'customers'],
    'One row per customer with three SUM(CASE ...) columns, one per month; missing months become 0.',
    'Conditional sums put the months side by side and give 0 where nothing was bought. A growth from 0 to a positive number still counts as a rise.',
    `WITH m AS (SELECT customer_id,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-10' THEN qty ELSE 0 END) AS oct_units,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-11' THEN qty ELSE 0 END) AS nov_units,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-12' THEN qty ELSE 0 END) AS dec_units FROM sales GROUP BY customer_id)
SELECT c.name, m.oct_units, m.nov_units, m.dec_units FROM m JOIN customers c ON c.id = m.customer_id
WHERE m.oct_units < m.nov_units AND m.nov_units < m.dec_units ORDER BY c.name`, true),
  X(181, TR, 'A', 'Units at least doubled', 7,
    'Which product months jumped to at least double the month before?',
    'Show each product and month in 2025 where units sold were at least twice the units in the previous calendar month (which must have sales). Show name, month, prev_units, units. Order by name, month.',
    'name, month, prev_units, units; by name, month', 'Self-join on the previous month', 'ON',
    'What if the previous month had zero sales?',
    ['Previous month must exist', 'At least twice, so equal to 2x counts'], ['sales', 'products'],
    'Join the monthly totals to themselves on product and the month before, then compare units.',
    'Joining on the exact previous month avoids the LAG trap of comparing with a month that is not adjacent.',
    `WITH m AS (SELECT product_id, strftime('%Y-%m', sale_date) AS month, SUM(qty) AS units FROM sales GROUP BY 1, 2)
SELECT p.name, cur.month, prev.units AS prev_units, cur.units
FROM m cur JOIN m prev ON prev.product_id = cur.product_id AND prev.month = strftime('%Y-%m', date(cur.month || '-01', '-1 month'))
JOIN products p ON p.id = cur.product_id WHERE cur.units >= 2 * prev.units ORDER BY p.name, cur.month`, true),
  X(196, TR, 'A', 'Spend up 20% in December', 7,
    'Which customers stepped up spending most sharply at the end of the year?',
    'List customers whose December 2025 spend (sales.amount) was at least 20% higher than November 2025 (as of 31 Dec 2025). They must have bought in November. Show name, nov_spend, dec_spend and pct_increase (1 decimal). Order by pct desc, name.',
    'name, nov_spend, dec_spend, pct_increase; by pct desc', 'Month-over-month growth threshold', 'ON',
    'What about customers with December sales but none in November?',
    ['No November sales means no base to compare', 'At least 20%, so exactly 20% counts'], ['sales', 'customers'],
    'Sum November and December amounts per customer in one row, then filter dec >= nov * 1.2.',
    'Comparing to the earlier month needs a non-empty base. NULL sums make the comparison false, so customers without November purchases drop out by themselves.',
    `WITH m AS (SELECT customer_id,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-11' THEN amount END) AS nov_spend,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-12' THEN amount END) AS dec_spend FROM sales GROUP BY customer_id)
SELECT c.name, m.nov_spend, m.dec_spend, ROUND(100.0 * (m.dec_spend - m.nov_spend) / m.nov_spend, 1) AS pct_increase
FROM m JOIN customers c ON c.id = m.customer_id WHERE m.dec_spend >= m.nov_spend * 1.2 ORDER BY pct_increase DESC, c.name`, true),
  X(203, TR, 'A', 'Biggest raises last year', 6,
    'The comp team wants the three biggest percentage raises from 2024 to 2025.',
    'Using salary_history, compare each employee 2025-01-01 salary with their 2024-01-01 salary. Show the top 3 by percent raise (1 decimal): name, salary_2024, salary_2025, raise_pct. Break ties by name. Only people with both years.',
    'name, salary_2024, salary_2025, raise_pct; top 3', 'Year-over-year compare + top-N', 'PS',
    'Include people with no 2024 row as new hires.',
    ['Wen has no 2024 row', 'Percent, not amount', 'Ties by name'], ['salary_history', 'employees'],
    'Join salary_history to itself on the employee for the two dates.',
    'A self-join with two fixed dates puts both salaries on one row. The inner join excludes people hired in 2025 (none with a 2024 row).',
    `SELECT e.name, a.salary AS salary_2024, b.salary AS salary_2025, ROUND(100.0 * (b.salary - a.salary) / a.salary, 1) AS raise_pct
FROM salary_history a JOIN salary_history b ON b.emp_id = a.emp_id AND a.effective_date = '2024-01-01' AND b.effective_date = '2025-01-01'
JOIN employees e ON e.id = a.emp_id ORDER BY raise_pct DESC, e.name LIMIT 3`, true),
  X(231, TR, 'A', 'Month-over-month retention', 8,
    'Retention is the share of customers who bought in a month and bought again in the next one.',
    'For each month from 2025-01 to 2025-11 show active customers (bought that month), retained (also bought the next month) and retention_pct (1 decimal). Use sales. Order by month.',
    'month, active, retained, retention_pct; by month', 'Self LEFT JOIN on the next month', 'ON',
    'Add a cohort view by signup month.',
    ['December has no next month in the data', 'Count each customer once per month', 'Use a LEFT JOIN'], ['sales'],
    'Take distinct customer and month, LEFT JOIN the same set on the next month and count matches.',
    'The left side is who was active; the right side marks who came back. COUNT of the right column ignores NULLs, giving retained.',
    `WITH m AS (SELECT DISTINCT customer_id, strftime('%Y-%m', sale_date) AS month FROM sales)
SELECT a.month, COUNT(*) AS active, COUNT(b.customer_id) AS retained, ROUND(100.0 * COUNT(b.customer_id) / COUNT(*), 1) AS retention_pct
FROM m a LEFT JOIN m b ON b.customer_id = a.customer_id AND b.month = strftime('%Y-%m', date(a.month || '-01', '+1 month'))
WHERE a.month < '2025-12' GROUP BY a.month ORDER BY a.month`, true),
  X(235, G, 'A', 'Spend falling three months running', 9,
    'Churn watch: customers whose monthly spend dropped month after month.',
    'Find customers with a run of at least 3 consecutive calendar months where each month spend (sales.amount) is lower than the month before (two drops in a row). Show name and months_falling (months in their longest such run). Order by months desc, name.',
    'name, months_falling; by months desc, name', 'Gaps and islands on drop flags', 'ON',
    'Show the start month of that run.',
    ['A month with no sales breaks the run', 'Equal spend is not a drop', 'Use calendar adjacency'], ['sales', 'customers'],
    'Flag a month as a drop vs the previous calendar month, then label runs of drop flags with month number minus row number.',
    'Only the flagged rows are numbered, so a run of consecutive drop months keeps a constant label. Two drops in a row mean three falling months.',
    `WITH m AS (SELECT customer_id, CAST(strftime('%Y', sale_date) AS INT) * 12 + CAST(strftime('%m', sale_date) AS INT) AS mi, SUM(amount) AS spend FROM sales GROUP BY 1, 2),
f AS (SELECT customer_id, mi, CASE WHEN LAG(mi) OVER (PARTITION BY customer_id ORDER BY mi) = mi - 1
  AND spend < LAG(spend) OVER (PARTITION BY customer_id ORDER BY mi) THEN 1 ELSE 0 END AS dropped FROM m),
d AS (SELECT customer_id, mi - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mi) AS grp FROM f WHERE dropped = 1),
r AS (SELECT customer_id, COUNT(*) AS drops FROM d GROUP BY customer_id, grp HAVING COUNT(*) >= 2)
SELECT c.name, MAX(r.drops) + 1 AS months_falling FROM r JOIN customers c ON c.id = r.customer_id GROUP BY c.id ORDER BY months_falling DESC, c.name`, true),
  X(241, TR, 'A', 'Four-month climbers', 7,
    'Which products have climbed in units every month for the last four months?',
    'List products whose monthly units rose in each of the last four months, September to December 2025 (three rises in a row, each month directly after the other, as of 31 Dec 2025). Show name, sep_units, dec_units. Order by name.',
    'name, sep_units, dec_units; by name', 'Always-increasing series with LAG', 'ON',
    'What if flat months were allowed (non-decreasing)?',
    ['Needs all four months', 'Strictly higher each month'], ['sales', 'products'],
    'Flag each month as a rise vs the previous calendar month, then keep products with 4 months and 3 rises.',
    'A rise flag per month turns the trend into a count: four months present and three rises means a strictly increasing series.',
    `WITH m AS (SELECT product_id, strftime('%Y-%m', sale_date) AS month, SUM(qty) AS units FROM sales WHERE sale_date >= '2025-09-01' GROUP BY 1, 2),
f AS (SELECT product_id, month, units, CASE WHEN LAG(month) OVER (PARTITION BY product_id ORDER BY month) = strftime('%Y-%m', date(month || '-01', '-1 month'))
  AND units > LAG(units) OVER (PARTITION BY product_id ORDER BY month) THEN 1 ELSE 0 END AS up FROM m)
SELECT p.name, MAX(CASE WHEN f.month = '2025-09' THEN f.units END) AS sep_units, MAX(CASE WHEN f.month = '2025-12' THEN f.units END) AS dec_units
FROM f JOIN products p ON p.id = f.product_id GROUP BY f.product_id HAVING COUNT(*) = 4 AND SUM(f.up) = 3 ORDER BY p.name`, true),
  X(253, G, 'A', 'Longest climbing streak', 9,
    'Growth team wants to see how long each customer purchase volume kept rising month after month.',
    'Find customers with at least 2 month-to-month rises in a row (three calendar months climbing) in total units (sales.qty). Show name and months_climbing (months in their longest rising run, including its first). Order by months desc, name.',
    'name, months_climbing; by months desc, name', 'Gaps and islands on rise flags', 'ON',
    'Return the months where the longest run starts and ends.',
    ['Months must be consecutive', 'A rise needs strictly more units', 'Use the longest run per customer'], ['sales', 'customers'],
    'Flag rises against the previous calendar month, then group runs of flags by month number minus row number.',
    'Each run of flagged rows is an island; its size is the rises, and one more gives the months climbing. Taking the maximum run per customer gives the longest streak.',
    `WITH m AS (SELECT customer_id, CAST(strftime('%Y', sale_date) AS INT) * 12 + CAST(strftime('%m', sale_date) AS INT) AS mi, SUM(qty) AS units FROM sales GROUP BY 1, 2),
f AS (SELECT customer_id, mi, CASE WHEN LAG(mi) OVER (PARTITION BY customer_id ORDER BY mi) = mi - 1
  AND units > LAG(units) OVER (PARTITION BY customer_id ORDER BY mi) THEN 1 ELSE 0 END AS rose FROM m),
d AS (SELECT customer_id, mi - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mi) AS grp FROM f WHERE rose = 1),
r AS (SELECT customer_id, COUNT(*) AS rises FROM d GROUP BY customer_id, grp HAVING COUNT(*) >= 2)
SELECT c.name, MAX(r.rises) + 1 AS months_climbing FROM r JOIN customers c ON c.id = r.customer_id GROUP BY c.id ORDER BY months_climbing DESC, c.name`, true),
  X(267, TR, 'A', 'Department headcount growth', 7,
    'Nobody was hired in 2025, so compare the staff counted at year-end 2023 with year-end 2021 to see which department grew most.',
    'For each department that has employees (emp_profile.dept_id) show headcount at 2021-12-31, headcount at 2023-12-31 (people with hire_date on or before the date) and the increase. Order by increase desc, department.',
    'department, headcount_2021, headcount_2023, increase; by increase desc', 'Point-in-time counts compared', 'ON',
    'Add a column for the percent growth.',
    ['Count by hire date, no end dates exist', 'Departments with no staff do not appear'], ['emp_profile', 'departments'],
    'Count with SUM of a date comparison, one column per date.',
    'A comparison inside SUM counts rows that satisfy it, so both snapshots come from one pass over the data.',
    `SELECT d.name AS department, SUM(p.hire_date <= '2021-12-31') AS headcount_2021, SUM(p.hire_date <= '2023-12-31') AS headcount_2023,
  SUM(p.hire_date <= '2023-12-31') - SUM(p.hire_date <= '2021-12-31') AS increase
FROM emp_profile p JOIN departments d ON d.id = p.dept_id GROUP BY d.id ORDER BY increase DESC, d.name`, true),
  X(272, TR, 'A', 'Pay that rose every year', 6,
    'HR recognises people whose pay went up at every review.',
    'Using salary_history, list employees with at least 3 salary records whose salary was higher than the previous record every time. Show name and records. Order by name.',
    'name, records; by name', 'Always-increasing series (no violations)', 'PS',
    'Which employees had a flat year?',
    ['A flat year breaks the series', 'Need at least 3 records', 'The first record has no previous'], ['salary_history', 'employees'],
    'LAG the salary, count the rows that are not higher than the previous one, and require none.',
    'Counting violations is easier than proving every step went up. The first row has NULL previous and is not a violation.',
    `WITH s AS (SELECT emp_id, salary, LAG(salary) OVER (PARTITION BY emp_id ORDER BY effective_date) AS prev FROM salary_history)
SELECT e.name, COUNT(*) AS records FROM s JOIN employees e ON e.id = s.emp_id GROUP BY e.id
HAVING COUNT(*) >= 3 AND SUM(CASE WHEN s.prev IS NOT NULL AND s.salary <= s.prev THEN 1 ELSE 0 END) = 0 ORDER BY e.name`, true),
  X(275, TR, 'A', 'Biggest December jumps', 6,
    'Which products gained the most units in December compared with November?',
    'For December 2025 vs November 2025 (as of 31 Dec 2025) show the three products with the largest increase in units sold: name, nov_units, dec_units, increase. A month with no sales counts as 0. Order by increase desc, name.',
    'name, nov_units, dec_units, increase; top 3', 'Month-over-month change + top-N', 'PS',
    'Return the biggest percent increase instead.',
    ['Missing month counts as 0', 'Ties by name'], ['sales', 'products'],
    'Conditional SUMs for the two months per product, then subtract and sort.',
    'SUM(CASE ...) gives 0 for a month with no rows when wrapped with ELSE 0, so new sellers still appear.',
    `WITH m AS (SELECT product_id, SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-11' THEN qty ELSE 0 END) AS nov_units,
  SUM(CASE WHEN strftime('%Y-%m', sale_date) = '2025-12' THEN qty ELSE 0 END) AS dec_units FROM sales GROUP BY product_id)
SELECT p.name, m.nov_units, m.dec_units, m.dec_units - m.nov_units AS increase FROM m JOIN products p ON p.id = m.product_id
ORDER BY increase DESC, p.name LIMIT 3`, true),
  X(294, TR, 'A', 'Growth every quarter flag', 8,
    'Customer spend rarely rises every month, so flag customers whose spend rose every quarter of 2025.',
    'For each customer show name and grew_every_quarter: 1 if they had sales in all four quarters of 2025 and total spend rose each quarter vs the previous one, else 0. Quarters by calendar month. Order by name.',
    'name, grew_every_quarter; by name', 'Flag from a LAG trend', 'ON',
    'List the quarters where spend fell.',
    ['All four quarters needed', 'Spend must be strictly higher', 'Customers with gaps get 0'], ['sales', 'customers'],
    'Sum spend per customer and quarter, LAG it, then count quarters with a rise and compare with 4.',
    'The first quarter counts as passing by itself, the other three must beat the previous. Requiring four rows stops customers with missing quarters from sneaking through.',
    `WITH q AS (SELECT customer_id, (CAST(strftime('%m', sale_date) AS INT) + 2) / 3 AS qtr, SUM(amount) AS spend FROM sales GROUP BY 1, 2),
p AS (SELECT customer_id, spend, LAG(spend) OVER (PARTITION BY customer_id ORDER BY qtr) AS prev FROM q)
SELECT c.name, CASE WHEN COUNT(*) = 4 AND SUM(CASE WHEN prev IS NULL OR spend > prev THEN 1 ELSE 0 END) = 4 THEN 1 ELSE 0 END AS grew_every_quarter
FROM p JOIN customers c ON c.id = p.customer_id GROUP BY c.id ORDER BY c.name`, true),
]

export const added300: SqlProblem[] = [...part1, ...part2, ...part3]
