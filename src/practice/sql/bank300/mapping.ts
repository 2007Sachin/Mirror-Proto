import { T } from '../topics'

// How the 300 interview questions land in MIRROR's modules. Modules pick problems by `topic` and level,
// so a question must carry exactly the value returned here (topic string + numeric level 1|2|3).
export const pdfTopics = [
  'Filtering, sorting and basics',
  'Aggregation and GROUP BY',
  'Joins and enriching rows',
  'Dates and time windows',
  'Anti-joins, EXISTS and missing data',
  'Subqueries and comparing to an average',
  'Duplicates and set operations',
  'Conditional aggregation, pivots and percentages',
  'Ranking, top-N and nth highest',
  'Self-joins, hierarchies and overlaps',
  'Window functions: running totals and LAG/LEAD',
  'Gaps, islands and consecutive runs',
  'Recursive CTEs and trees',
  'Median, percentiles and statistics',
  'Relational division: "all" and "every"',
  'Trends and retention over time',
] as const

type Level = 'Beginner' | 'Pro' | 'Advanced'
// [Beginner, Pro, Advanced] module topic per pdf topic
const MAP: Record<(typeof pdfTopics)[number], [string, string, string]> = {
  'Filtering, sorting and basics': [T.b2, T.p8, T.a19],
  'Aggregation and GROUP BY': [T.b4, T.p15, T.a19],
  'Joins and enriching rows': [T.b5, T.p7, T.a19],
  'Dates and time windows': [T.b6, T.p9, T.a16],
  'Anti-joins, EXISTS and missing data': [T.b3, T.p7, T.a20],
  'Subqueries and comparing to an average': [T.b4, T.p8, T.a19],
  'Duplicates and set operations': [T.b4, T.p12, T.a19],
  'Conditional aggregation, pivots and percentages': [T.b6, T.p11, T.a17],
  'Ranking, top-N and nth highest': [T.b2, T.p13, T.a19],
  'Self-joins, hierarchies and overlaps': [T.b5, T.p14, T.a18],
  'Window functions: running totals and LAG/LEAD': [T.b4, T.p10, T.a19],
  'Gaps, islands and consecutive runs': [T.b4, T.p10, T.a14],
  'Recursive CTEs and trees': [T.b5, T.p9, T.a18],
  'Median, percentiles and statistics': [T.b4, T.p15, T.a19],
  'Relational division: "all" and "every"': [T.b3, T.p8, T.a20],
  'Trends and retention over time': [T.b4, T.p10, T.a21],
}
const IDX = { Beginner: 0, Pro: 1, Advanced: 2 } as const

export const moduleTopic = (pdfTopic: string, level: Level): { topic: string; level: 1 | 2 | 3 } => {
  // The roadmap splits ranking into two topics; both land in the same modules.
  const key = pdfTopic === 'Nth highest and ranking' || pdfTopic === 'Top-N per group' ? 'Ranking, top-N and nth highest' : pdfTopic
  const row = MAP[key as keyof typeof MAP]
  if (!row) throw new Error(`unknown pdf topic: ${pdfTopic}`)
  return { topic: row[IDX[level]], level: (IDX[level] + 1) as 1 | 2 | 3 }
}

export const idFor = (n: number) => 'sql-x-' + String(n).padStart(3, '0')
