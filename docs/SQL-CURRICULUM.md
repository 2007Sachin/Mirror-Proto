# MIRROR SQL practice: curriculum roadmap (proposal, nothing built yet)

Written from web research (2026 interview guides, LeetCode SQL 50, HackerRank SQL skills tests, data-science/DE SQL round write-ups) plus what already exists in `src/practice/sql` (17 problems, sql.js engine, run-and-check drill).

## What interviews actually test
- Joins, window functions and CTEs are the recurring core in every 2026 guide.
- Data-analyst loops lean on SQL about twice as much as data-scientist loops; roughly a third of SQL questions are conceptual (explain, predict output, spot the bug), not "write a query".
- Edge cases decide outcomes: NULL handling, duplicates from joins, ties, empty groups, the right denominator.
- Patterns that keep appearing: top-N per group, dedup-latest, second-highest, conditional aggregation, running totals, gaps and islands, sessionization (30 min gap), retention by cohort, funnels, recursive hierarchies, month-over-month change, self-joins.
- LeetCode SQL 50 groups: select, joins, aggregates, sorting/grouping, advanced select/joins, subqueries, string functions/regex, advanced techniques. HackerRank Basic and Intermediate cover simple queries, joins, unions, subqueries, aggregation.

## Levels (user can also "choose your own")
| Level | Who it is for | Exit test |
|---|---|---|
| Beginner | New to SQL, or rusty | Reads a table, filters, sorts, aggregates, does one join without duplicating rows |
| Pro | Interviewing for analyst roles | Window functions, CTEs, subqueries, NULL and tie handling, conditional aggregation |
| Advanced | Senior analyst, DS, DE loops | Gaps and islands, sessionization, cohorts, recursion, query plans and indexing, SQL dialect traps |
| Your own | Anyone | Pick topics, a difficulty and a time box; the app builds the set |

## Modules (each = visual lesson, 3-5 drills, 1 situation, 1 mini quiz)
Beginner: 1 Tables, rows, columns, types. 2 SELECT, WHERE, ORDER BY, LIMIT. 3 NULL and three-valued logic. 4 Aggregates and GROUP BY, HAVING vs WHERE. 5 INNER and LEFT JOIN. 6 CASE, string, date functions.
Pro: 7 All joins, self-joins, anti-joins, join fan-out. 8 Subqueries and EXISTS. 9 CTEs. 10 Window functions: ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD, running totals, frames. 11 Conditional aggregation and pivots. 12 Set operations. 13 Dedup and top-N per group.
Advanced: 14 Gaps and islands. 15 Sessionization. 16 Retention and cohorts. 17 Funnels and conversion. 18 Recursive CTEs. 19 Query plans, indexes, EXPLAIN. 20 Transactions, isolation, deadlocks. 21 Data modelling: normalisation, star schema, SCDs. 22 Dialect differences (Postgres, MySQL, SQL Server, SQLite).

## Visual, animated learning (the differentiator)
Each concept has an interactive "see it run" scene instead of a text lesson:
- Joins: two tables as card stacks; rows fly across and match; unmatched rows glow; the fan-out of a 1-to-many is shown as duplicated rows.
- GROUP BY: rows sort into buckets, then collapse into one summary row per bucket.
- Window functions: a sliding frame (a highlighted band) moves down the rows; the user can drag the frame edges and watch ROWS vs RANGE change.
- CTE and subquery: a pipeline of stages, each showing its intermediate table.
- NULL: truth-table playground showing why `= NULL` fails.
- Gaps and islands: numbers on a timeline, islands coloured, the ROW_NUMBER difference trick shown as it is computed.
- Query execution order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY as a stepping animation on the user's own query.
- Step-through of any user query: scrub a timeline and see the intermediate result after each clause.
Problem formats beyond "write a query": predict the output, spot the bug, complete the missing clause, drag-and-drop clause ordering, optimise this slow query, and "explain it to the interviewer" (typed answer checked against named ideas).

## Situation and case-study layer
Situations (5-10 min): "revenue is overstated", "why did signups drop on Tuesday", "find duplicate customers", "who are our power users". Case studies (20-30 min): multi-table schema, 4-6 linked questions, a final written takeaway. Domains: e-commerce, SaaS subscription, ride-hailing, streaming, fintech, marketplace.

## Engine and quality
Keep sql.js (SQLite) for everything that runs in the browser; mark dialect-specific topics as read-only lessons, or add a Postgres-compatible WASM build later (PGlite) if needed. Result checking compares sets or ordered rows, with a hint ladder (nudge, hint, approach, solution) and per-attempt stats feeding Today.

## Build phases
1. Foundations: levels and path UI, execution-order stepper, NULL and join visualisers, 40 beginner/pro drills.
2. Windows and CTE visualiser, 30 more drills, predict-the-output and spot-the-bug formats.
3. Advanced patterns (islands, sessions, cohorts, funnels, recursion) with animated scenes.
4. Situations and case studies; custom set builder ("choose your own").
5. Query-plan visualiser and dialect notes.
Rough volume target: about 150 drills, 10 case studies, 12 animated scenes.

## Open decisions for the owner
- Fully browser-run (SQLite only) versus adding a Postgres engine.
- Whether completion should unlock levels or leave everything open.
- Whether to generate extra drills with the model or hand-author all of them (hand-authored recommended for correctness).
