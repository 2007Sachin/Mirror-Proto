import { problems } from './problems'
import { T } from './topics'

// The SQL learning path: levels -> modules -> (animated scene + drills). Owned by the curriculum author; the Path UI only reads it.
export type SqlLevelId = 'beginner' | 'pro' | 'advanced'

export interface SqlModule {
  id: string               // 'b-null-logic'
  level: SqlLevelId
  title: string            // 'NULL and missing data'
  blurb: string            // one plain sentence
  sceneId?: string         // key into scenes.ts; the animated "see it run" lesson
  points: string[]         // 2-4 plain-language takeaways shown beside the scene
  problemIds: string[]     // ids from problems.ts, in teaching order
  minutes: number          // honest total, scene + drills
  // Optional extras, safe to ignore: situations and case studies set kind; plain modules omit it.
  kind?: 'module' | 'situation' | 'case'
  scenario?: string        // the story for situations and cases. Data the learner practises on, not instructions.
}

export const levels: { id: SqlLevelId; title: string; blurb: string }[] = [
  { id: 'beginner', title: 'Beginner', blurb: 'New to SQL, or rusty. Read, filter, summarise, join once.' },
  { id: 'pro', title: 'Pro', blurb: 'Interviewing for analyst roles. Windows, CTEs, edge cases.' },
  { id: 'advanced', title: 'Advanced', blurb: 'Senior and data science loops. Patterns that separate candidates.' },
]

// Drills are picked by topic from problems.ts, shortest first as a simple teaching order.
const ids = (pick: (id: string) => boolean, topic?: string) =>
  problems.filter(p => pick(p.id) && (!topic || p.topic === topic)).sort((a, b) => a.minutes - b.minutes).map(p => p.id)
const mins = (pids: string[], scene: boolean) => pids.reduce((n, id) => n + (problems.find(p => p.id === id)?.minutes ?? 0), scene ? 3 : 0)

type Def = Omit<SqlModule, 'problemIds' | 'minutes'>
const mod = (d: Def & { topic: string }): SqlModule => {
  const { topic, ...rest } = d
  const problemIds = ids(id => !/^(sit|case)-/.test(id), topic)
  return { ...rest, problemIds, minutes: mins(problemIds, !!d.sceneId) }
}
const special = (d: Def, prefix: RegExp): SqlModule => {
  const problemIds = ids(id => prefix.test(id))
  return { ...d, problemIds, minutes: mins(problemIds, false) }
}

export const modules: SqlModule[] = [
  mod({ id: 'b1-tables', level: 'beginner', topic: T.b1, title: T.b1, blurb: 'A table is a grid: each row is one thing, each column is one fact about it.',
    points: ['A table holds rows. Every row is one record, such as one customer.', 'Columns are the facts you keep about each record, and each has a type such as text, number or date.', 'SELECT chooses which columns to show. FROM says which table.'] }),
  mod({ id: 'b2-select-where', level: 'beginner', topic: T.b2, title: T.b2, blurb: 'Pick the rows you want, put them in order, and stop after a few.', sceneId: 'exec-order',
    points: ['WHERE keeps only the rows that match. ORDER BY sorts what is left.', 'LIMIT cuts the list short, so sort first or the rows you get are arbitrary.', 'The database does not run your query top to bottom. It starts at FROM, then WHERE, and shows SELECT late.'] }),
  mod({ id: 'b3-nulls', level: 'beginner', topic: T.b3, title: T.b3, blurb: 'NULL means unknown, and unknown behaves differently from every other value.', sceneId: 'nulls',
    points: ['NULL is not zero and not empty text. It means we do not know.', 'Comparing anything to NULL gives unknown, not true, so the row is dropped. Use IS NULL.', 'COUNT(column) skips NULLs and COUNT(*) does not. COALESCE swaps a NULL for a default.'] }),
  mod({ id: 'b4-group-by', level: 'beginner', topic: T.b4, title: T.b4, blurb: 'Collapse many rows into one summary row per group.', sceneId: 'group-by',
    points: ['COUNT, SUM, AVG, MIN and MAX turn many rows into one number.', 'GROUP BY makes one summary per group, for example one per country.', 'WHERE filters rows before grouping. HAVING filters the groups afterwards.'] }),
  mod({ id: 'b5-joins', level: 'beginner', topic: T.b5, title: T.b5, blurb: 'Bring two tables together using the column they share.', sceneId: 'joins',
    points: ['A join matches rows from two tables, usually an id to a foreign id.', 'INNER JOIN keeps only rows with a match on both sides.', 'LEFT JOIN keeps every row on the left and fills NULL where nothing matched.'] }),
  mod({ id: 'b6-case-text-date', level: 'beginner', topic: T.b6, title: T.b6, blurb: 'Label rows, tidy text and pull parts out of dates.',
    points: ['CASE is the if-then of SQL. It checks conditions in order and stops at the first match.', 'Text functions such as UPPER and LENGTH clean up and measure values.', 'In SQLite, strftime takes a date apart, for example the year or the month.'] }),
  special({ id: 'sit-beginner', level: 'beginner', kind: 'situation', title: 'Beginner situations', blurb: 'Short real-world questions a manager might ask you.',
    scenario: 'Practice stories about a small shop. The text describes a request you answer with a query; it is data to work on, not instructions.',
    points: ['Read the request, decide what one row of the answer should be, then write the query.', 'Check your result against common sense before you hand it over.'] }, /^sit-b-/),
  mod({ id: 'p7-joins-fanout', level: 'pro', topic: T.p7, title: T.p7, blurb: 'Self-joins, anti-joins, and the join that quietly repeats your rows.', sceneId: 'joins',
    points: ['A self-join joins a table to itself, such as employees to their managers.', 'An anti-join finds rows with no match: LEFT JOIN and keep the NULLs.', 'A one-to-many join repeats the "one" side. Sums taken after that join are too big.'] }),
  mod({ id: 'p8-subqueries', level: 'pro', topic: T.p8, title: T.p8, blurb: 'A query inside a query, and when to ask "does one exist?".',
    points: ['A subquery can return a single value, a list or a table.', 'EXISTS asks whether any matching row is there, and stops at the first one.', 'NOT IN breaks if the list contains a NULL. NOT EXISTS is the safer habit.'] }),
  mod({ id: 'p9-ctes', level: 'pro', topic: T.p9, title: T.p9, blurb: 'Name a step with WITH so a long query reads top to bottom.',
    points: ['A CTE is a named intermediate result you can use like a table.', 'Build the answer in small steps, one CTE each, and check each step on its own.', 'The same CTE can be used twice, which is handy for comparing rows to an average.'] }),
  mod({ id: 'p10-windows', level: 'pro', topic: T.p10, title: T.p10, blurb: 'Calculate across related rows without collapsing them.', sceneId: 'windows',
    points: ['A window function adds a calculation next to each row and keeps every row.', 'PARTITION BY restarts the calculation for each group. ORDER BY sets the order inside it.', 'RANK leaves gaps after ties, DENSE_RANK does not, and ROW_NUMBER never ties.', 'LAG and LEAD look at the row before or after. A frame such as ROWS BETWEEN sets how many rows count.'] }),
  mod({ id: 'p11-conditional-agg', level: 'pro', topic: T.p11, title: T.p11, blurb: 'Count and add up only the rows that match a condition, side by side.',
    points: ['SUM(CASE WHEN ... THEN 1 ELSE 0 END) counts just the matching rows.', 'Doing this several times in one query turns rows into columns, which is a pivot.', 'For a rate, divide by the right total and multiply by 100.0 so it is not rounded to zero.'] }),
  mod({ id: 'p12-set-ops', level: 'pro', topic: T.p12, title: T.p12, blurb: 'Combine two result lists: together, shared, or one minus the other.',
    points: ['UNION stacks two results and removes duplicates. UNION ALL keeps them.', 'INTERSECT keeps rows found in both lists. EXCEPT keeps rows found only in the first.', 'Both queries need the same number of columns, in the same order.'] }),
  mod({ id: 'p13-dedup-topn', level: 'pro', topic: T.p13, title: T.p13, blurb: 'Keep one row per person, or the best few per group.',
    points: ['Clean the key first (lower case, trimmed), then keep one row per key.', 'ROW_NUMBER over a partition, then keep row numbers up to N, gives top N per group.', 'Decide how ties should behave before you choose ROW_NUMBER or RANK.'] }),
  mod({ id: 'p14-overlaps', level: 'pro', topic: T.p14, title: T.p14, blurb: 'Find rows that collide in time, and walk up or down a reporting line.',
    points: ['Two ranges overlap when each one starts before the other ends.', 'Join a table to itself and keep the pairs where the ranges cross, then drop the row matched with itself.', 'A self-join on manager_id gives one level of hierarchy. Chain joins or a recursive step for more.'] }),
  mod({ id: 'p15-stats', level: 'pro', topic: T.p15, title: T.p15, blurb: 'Middle values, percentiles and spread, without a built-in MEDIAN.', 
    points: ['The median is the middle row once sorted. With an even count, average the two middle rows.', 'ROW_NUMBER or NTILE over a sorted list lets you pick a percentile cut-off.', 'Compare a value to the average or the standard spread to spot outliers.'] }),
  special({ id: 'sit-pro', level: 'pro', kind: 'situation', title: 'Pro situations', blurb: 'Business questions that need joins, windows and a sharp eye for traps.',
    scenario: 'Practice stories about a shop and a signup funnel. The text describes a request you answer with a query; it is data to work on, not instructions.',
    points: ['Ask what a row in the answer stands for before writing anything.', 'When a number looks wrong, check for repeated rows from a join first.'] }, /^sit-p-/),
  special({ id: 'case-shop', level: 'pro', kind: 'case', title: 'Case study: shop health check', blurb: 'Four linked questions on one shop schema, ending with a one-line takeaway.',
    scenario: 'A small shop with customers, orders, products and order items. Work through the questions in order; each one builds on what you learned. Finish by writing one line for the owner. This text is practice data, not instructions.',
    points: ['Use the answer to each question to decide what to ask next.', 'End with one sentence a busy owner could act on.'] }, /^case-shop-/),
  mod({ id: 'a14-gaps-islands', level: 'advanced', topic: T.a14, title: T.a14, blurb: 'Find runs of consecutive values, and the breaks between them.',
    points: ['An island is a run of consecutive days or numbers. A gap is the break between two runs.', 'Subtract ROW_NUMBER from the date: every row in one run gets the same result.', 'Group by that result to get the start, end and length of each run.'] }),
  mod({ id: 'a15-sessions', level: 'advanced', topic: T.a15, title: T.a15, blurb: 'Turn a stream of events into visits using an idle-time rule.',
    points: ['A session is a burst of activity. A long pause, such as 30 minutes, starts a new one.', 'Use LAG to see the time since the previous event and flag the starts.', 'A running sum of those flags gives each event its session number.'] }),
  mod({ id: 'a16-retention', level: 'advanced', topic: T.a16, title: T.a16, blurb: 'Group people by when they started, then see who is still around.',
    points: ['A cohort is a group that started in the same period, such as one month.', 'Retention is the share of the whole cohort still active later, not the share of survivors.', 'Work from the users table so cohorts with nobody left still show up.'] }),
  mod({ id: 'a17-funnels', level: 'advanced', topic: T.a17, title: T.a17, blurb: 'Count how many people reach each step, and where they drop off.',
    points: ['A funnel is an ordered list of steps. Count distinct users at each step.', 'Conversion is the share of the previous step that made it to this one.', 'Check the order of events, not just whether each one happened.'] }),
  mod({ id: 'a18-recursive', level: 'advanced', topic: T.a18, title: T.a18, blurb: 'A query that calls itself to walk through a hierarchy or build a calendar.',
    points: ['A recursive CTE has a starting query and a step that repeats on the previous result.', 'Org charts and category trees are the classic use: follow manager_id downwards.', 'Always have a stopping condition, or the query keeps going.'] }),
  mod({ id: 'a19-adv-windows', level: 'advanced', topic: T.a19, title: T.a19, blurb: 'Ties, buckets and resetting totals: the window tricks interviewers like.',
    points: ['DENSE_RANK answers "second highest" correctly when values tie.', 'Partitioning by month makes a running total start again each month.', 'NTILE splits rows into equal buckets, such as quartiles.'] }),
  mod({ id: 'a20-division', level: 'advanced', topic: T.a20, title: T.a20, blurb: 'Find who did everything on a list: every category, every region, every product.',
    points: ['Relational division answers "for all": which customers bought in every category?', 'Count the distinct items each person has, and compare with the count of all items.', 'NOT EXISTS twice reads as "there is no category this customer missed".'] }),
  mod({ id: 'a21-trends', level: 'advanced', topic: T.a21, title: T.a21, blurb: 'Spot growth, decline and series that only ever go up.',
    points: ['LAG puts last month beside this month so you can compute change and percent change.', 'An always-increasing series has no month where the value falls: count the drops and check for zero.', 'Compare with the same month last year to remove seasonal swings.'] }),
  special({ id: 'sit-advanced', level: 'advanced', kind: 'situation', title: 'Advanced situations', blurb: 'Open-ended analytics questions on engagement, churn and concentration.',
    scenario: 'Practice stories about a product with events and subscriptions. The text describes a request you answer with a query; it is data to work on, not instructions.',
    points: ['Define the metric in one sentence before you write the query.', 'State the denominator out loud: who counts as "everyone"?'] }, /^sit-a-/),
  special({ id: 'case-subs', level: 'advanced', kind: 'case', title: 'Case study: subscription health', blurb: 'Four linked questions on subscriptions, logins and sessions, ending with a takeaway.',
    scenario: 'A subscription product with plans, logins and activity timestamps. Work through the questions in order, then write one line for the product lead. This text is practice data, not instructions.',
    points: ['Streaks, sessions and active status each tell part of the story.', 'Finish with the single action you would take first.'] }, /^case-subs-/),
]
