// The question bank: interview questions only, tagged so the Director can match role and spread competencies. No scores.

export type RoleFamily = 'data analyst' | 'analytics engineer' | 'data scientist' | 'product analyst' | 'general'

export interface BankQuestion {
  id: string
  text: string
  competency: string
  difficulty: 1 | 2 | 3
  /** Role families this suits; 'general' suits everyone. */
  roles: string[]
}

const ALL = ['general']
const ANALYTICS = ['data analyst', 'analytics engineer', 'data scientist', 'product analyst']
const TESTING = ['data analyst', 'data scientist', 'product analyst']
const BUILDERS = ['data analyst', 'analytics engineer', 'data scientist']

type Row = [difficulty: 1 | 2 | 3, roles: string[], text: string]

// Grouped by competency, then dealt out round-robin so any run of questions spreads across competencies.
// The first three keep the original catalogue lines (ownership, difficulty, impact).
const GROUPS: [competency: string, rows: Row[]][] = [
  ['ownership', [
    [1, ALL, 'What was specifically yours to own, and what decision did you make?'],
    [1, ALL, 'Tell me about a piece of work where people came to you for answers.'],
    [2, ALL, 'Describe a time you took something on that nobody had asked you to.'],
    [2, ALL, 'When you picked up a project halfway through, how did you decide what to keep and what to change?'],
    [3, ALL, 'Think of a decision you made alone that you would still stand behind. What went into it?'],
  ]],
  ['conflict', [
    [1, ALL, 'What resistance or unexpected difficulty did you encounter?'],
    [2, ALL, 'Tell me about a disagreement with a teammate over how to approach a problem. How did it settle?'],
    [2, ALL, 'Has a manager ever pushed back on your recommendation? What happened next?'],
    [3, ALL, 'Describe a working relationship that took effort. What did you change on your side?'],
    [3, ALL, 'When two people you supported wanted opposite things, how did you handle it?'],
  ]],
  ['impact', [
    [1, ALL, 'What changed because of your work, and what would you do differently now?'],
    [1, ALL, 'Which result from your last role are you most comfortable explaining in detail?'],
    [2, ALL, 'How did you know your work made a difference to the people using it?'],
    [2, ALL, 'Tell me about work that took longer to pay off than you expected.'],
    [3, ALL, 'If one number could show your contribution, which would you choose and why?'],
  ]],
  ['failure and recovery', [
    [1, ALL, 'Tell me about something that did not work out the way you hoped.'],
    [2, ALL, 'Describe a mistake in your own work that you found after it went out. How did you respond?'],
    [2, ALL, 'Which recommendation of yours turned out to be wrong?'],
    [2, ALL, 'When did you last change your mind about something important to your work?'],
    [3, ALL, 'Tell me about a time you had to rebuild something you had already finished.'],
  ]],
  ['ambiguity', [
    [1, ALL, 'Describe a vague question you were handed. How did you begin?'],
    [2, ALL, 'Tell me about a project where the goal shifted halfway through.'],
    [2, ALL, 'When the brief is incomplete, how do you decide you know enough to start?'],
    [2, ALL, 'Describe making progress when there was nobody to ask.'],
    [3, ALL, 'Think of a request that sounded simple and was not. What did you find?'],
  ]],
  ['stakeholder communication', [
    [1, ALL, 'Tell me about explaining a technical result to someone outside the field.'],
    [2, ALL, 'How have you shared bad news with a stakeholder?'],
    [2, ALL, 'Describe a stakeholder misreading your analysis. What did you do?'],
    [2, ALL, 'Walk me through a presentation or write-up you are proud of. Who was it for?'],
    [3, ALL, 'When have you had to say no to a request, and how did you say it?'],
  ]],
  ['prioritisation', [
    [1, ALL, 'How do you pick what to work on first when everything seems urgent?'],
    [2, ALL, 'Tell me about dropping something good to make room for something better.'],
    [2, ALL, 'Describe a week when your plans fell apart. What did you keep?'],
    [2, ALL, 'How do you handle requests from several people at once?'],
    [3, ALL, 'Tell me about pushing a piece of work back on purpose.'],
  ]],
  ['data quality', [
    [1, ANALYTICS, 'Tell me about a moment the numbers looked wrong. What did you check first?'],
    [2, ANALYTICS, 'Describe finding an error in a report other people already relied on.'],
    [2, ANALYTICS, 'How do you keep a metric definition steady when teams use it differently?'],
    [2, BUILDERS, 'Tell me about a pipeline or dashboard that broke. How did you find the cause?'],
    [3, ANALYTICS, 'When have you decided a dataset was not good enough to answer the question?'],
  ]],
  ['experimentation', [
    [1, TESTING, 'Tell me about a test you helped design.'],
    [2, TESTING, 'Describe a result that surprised you. What did you do with it?'],
    [2, TESTING, 'How do you explain an inconclusive result to people who wanted a clear answer?'],
    [2, TESTING, 'Tell me about choosing not to run an experiment. Why?'],
    [3, TESTING, 'When have you had to stop or change a test partway through?'],
  ]],
  ['SQL and tooling', [
    [1, BUILDERS, 'Tell me about a SQL query you are proud of. What made it tricky?'],
    [2, BUILDERS, 'Describe making a slow query or report faster.'],
    [1, ALL, 'Which tool did you have to pick up quickly, and how did you go about it?'],
    [2, BUILDERS, 'How would you hand over a model or report you built to a colleague?'],
    [2, ALL, 'Tell me about automating something you used to do by hand.'],
  ]],
  ['deadline pressure', [
    [1, ALL, 'Tell me about a deadline that was tighter than you wanted.'],
    [2, ALL, 'Describe delivering something quickly that you knew was not perfect.'],
    [2, ALL, 'When a due date moved up, what did you cut and what did you protect?'],
    [2, ALL, 'How do you keep a long project on track when the date is far away?'],
    [3, ALL, 'Tell me about asking for more time. How did that conversation go?'],
  ]],
  ['influence', [
    [1, ALL, 'Describe changing someone’s mind with your work.'],
    [2, ALL, 'Tell me about getting a team to adopt something you suggested.'],
    [2, ALL, 'How have you built trust with people who were unsure about data?'],
    [2, ALL, 'Describe leading without being the person in charge.'],
    [3, ALL, 'Tell me about helping a colleague get better at something.'],
  ]],
]

export const BANK: readonly BankQuestion[] = (() => {
  const out: BankQuestion[] = []
  for (let round = 0; round < 5; round++) {
    for (const [competency, rows] of GROUPS) {
      const [difficulty, roles, text] = rows[round]
      out.push({ id: `bank-${out.length + 1}`, text, competency, difficulty, roles })
    }
  }
  return out
})()

export const COMPETENCIES: readonly string[] = GROUPS.map(g => g[0])

export function roleFamily(role: string): RoleFamily {
  const r = role.toLowerCase()
  for (const f of ['analytics engineer', 'data scientist', 'product analyst', 'data analyst'] as const) if (r.includes(f)) return f
  return 'general'
}

/** Whether a bank question suits this role: anything for a general role, else a matching family or a general question. */
export function suitsRole(q: BankQuestion, role: string): boolean {
  const family = roleFamily(role)
  return family === 'general' || q.roles.includes(family) || q.roles.includes('general')
}
