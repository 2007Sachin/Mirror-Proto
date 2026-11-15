import type { Round, Skill, SkillArea } from '../repo/types.js'

// ponytail: a keyword dictionary, not NLP. Ceiling: only skills listed here are found. Add a row to teach Scout a new one.
export const DICTIONARY: { name: string; area: SkillArea; re: RegExp }[] = [
  { name: 'SQL', area: 'sql', re: /\bSQL\b/gi },
  { name: 'Snowflake', area: 'sql', re: /\bsnowflake\b/gi },
  { name: 'BigQuery', area: 'sql', re: /\bbig\s?query\b/gi },
  { name: 'dbt', area: 'sql', re: /\bdbt\b/gi },
  { name: 'Python', area: 'python', re: /\bpython\b/gi },
  { name: 'pandas', area: 'python', re: /\bpandas\b/gi },
  { name: 'Excel', area: 'tools', re: /\bexcel\b/gi },
  { name: 'Tableau', area: 'tools', re: /\btableau\b/gi },
  { name: 'Power BI', area: 'tools', re: /\bpower\s?bi\b/gi },
  { name: 'Looker', area: 'tools', re: /\blooker\b/gi },
  { name: 'Airflow', area: 'tools', re: /\bairflow\b/gi },
  { name: 'Git', area: 'tools', re: /\bgit\b/gi },
  { name: 'Docker', area: 'tools', re: /\bdocker\b/gi },
  { name: 'AWS', area: 'tools', re: /\baws\b/gi },
  { name: 'A/B testing', area: 'analytics', re: /\ba\/b\s+test\w*|\bexperimentation\b/gi },
  { name: 'Statistics', area: 'analytics', re: /\bstatistic\w*|\bhypothesis testing\b|\bregression\b/gi },
  { name: 'Stakeholder communication', area: 'behavioural', re: /\bstakeholder\w*|\bcommunicat\w*/gi },
]

const REQUIRED_HEADING = /requirement|qualification|must[- ]have|what you(?:'|’)?ll need|what you bring|you have/i
const NICE_HEADING = /nice|preferred|bonus|a plus|good to have/i

/** The nearest short line above `index` that looks like a heading says whether we are under "requirements" or "nice to have". */
function underRequirements(jd: string, index: number): boolean {
  const lineStart = jd.lastIndexOf('\n', index - 1) + 1
  if (NICE_HEADING.test(jd.slice(lineStart, index))) return false
  const lines = jd.slice(0, index).split('\n')
  for (let i = lines.length - 2; i >= 0; i--) {
    const line = lines[i].trim()
    if (line.length === 0 || line.length > 60) continue
    if (NICE_HEADING.test(line)) return false
    if (REQUIRED_HEADING.test(line)) return true
  }
  return false
}

/** A short window around the match, inside its line, trimmed. Always a substring of `jd`. */
function quoteAround(jd: string, index: number, length: number): string {
  const lineStart = jd.lastIndexOf('\n', index - 1) + 1
  const nl = jd.indexOf('\n', index + length)
  const lineEnd = nl === -1 ? jd.length : nl
  let start = Math.max(lineStart, index - 40)
  let end = Math.min(lineEnd, index + length + 80)
  // snap to word edges so the quote does not start or end mid-word
  if (start > lineStart) start = jd.indexOf(' ', start) + 1 || index
  if (end < lineEnd) end = jd.lastIndexOf(' ', end) > index + length ? jd.lastIndexOf(' ', end) : index + length
  return jd.slice(Math.min(start, index), Math.max(end, index + length)).trim().replace(/^[-•*]\s+/, '')
}

/** Deterministic skill extraction with a verbatim JD quote per skill. Core skills first, then JD order. */
export function extractSkills(jd: string): Skill[] {
  const found: (Skill & { at: number })[] = []
  for (const { name, area, re } of DICTIONARY) {
    const matches = [...jd.matchAll(re)]
    if (matches.length === 0) continue
    const first = matches[0]
    const core = matches.length >= 2 || matches.some(m => underRequirements(jd, m.index))
    found.push({ name, area, weight: core ? 'core' : 'nice', quote: quoteAround(jd, first.index, first[0].length), at: first.index })
  }
  found.sort((a, b) => (a.weight === b.weight ? a.at - b.at : a.weight === 'core' ? -1 : 1))
  return found.map(s => ({ name: s.name, area: s.area, weight: s.weight, quote: s.quote }))
}

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** Four rounds. SQL and behavioural can run today; Python and tools are in the plan but marked "Next". */
export function buildRounds(skills: Skill[]): Round[] {
  const names = (area: SkillArea) => skills.filter(s => s.area === area).map(s => s.name)
  const sql = names('sql')
  const python = names('python')
  const tools = names('tools')
  const analytics = names('analytics')
  const talk = names('behavioural')
  return [
    {
      id: 'sql',
      kind: 'sql',
      title: 'SQL round',
      why: sql.length ? `The job description asks for ${list(sql)}, so you will likely be given a query to write.` : 'No SQL is named in the job description, so this round is not ready yet.',
      available: sql.length > 0,
    },
    {
      id: 'python',
      kind: 'python',
      title: 'Python round',
      why: python.length ? `The job description asks for ${list(python)}, so expect a data-handling exercise.` : 'Python is not named in the job description.',
      available: false,
    },
    {
      id: 'tools',
      kind: 'tools',
      title: 'Tools round',
      why: tools.length || analytics.length ? `Expect questions on ${list([...tools, ...analytics])}.` : 'No specific tools are named in the job description.',
      available: false,
    },
    {
      id: 'behavioural',
      kind: 'behavioural',
      title: 'Behavioural round',
      why: talk.length ? 'The job description stresses working with stakeholders, so expect stories about people and pushback.' : 'Every interview has a conversation about how you work, so expect stories about your own decisions.',
      available: true,
    },
  ]
}
