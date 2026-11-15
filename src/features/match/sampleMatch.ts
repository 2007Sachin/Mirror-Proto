import type { GapMatchRow } from '../../lib/data'
import type { MatchResult } from '../../lib/matchApi'

const base = { targetId: 't1', workspaceId: 'dev', createdAt: '2026-01-01T00:00:00.000Z', source: 'fallback' as const, area: 'sql' }
const row = (r: Partial<GapMatchRow> & Pick<GapMatchRow, 'skill' | 'weight' | 'status' | 'note'>): GapMatchRow =>
  ({ ...base, id: r.skill, claimQuote: null, probeQuestion: null, ...r })

/** Sample data for tests (and the copy scan): one row of each status. */
export const sampleMatch: MatchResult = {
  hasResume: true,
  aiAttempted: false,
  source: 'fallback',
  matches: [
    row({ skill: 'Tableau', weight: 'core', status: 'covered', claimQuote: 'Built a Tableau dashboard that cut weekly reporting time from 6 hours to 1 hour', note: 'The job asks for Tableau. Your résumé says “Built a Tableau dashboard”, which names what changed.' }),
    row({ skill: 'SQL', weight: 'core', status: 'partial', claimQuote: 'Helped with various SQL reports for the finance team', note: 'The job asks for SQL. Your résumé mentions it only in a vague line: “Helped with various SQL reports for the finance team”.', probeQuestion: 'Your résumé says "Helped with various SQL reports for the finance team". What did you do yourself, and what changed because of it?' }),
    row({ skill: 'Docker', weight: 'core', status: 'gap', note: 'Docker is a core requirement here and does not appear on your résumé.', probeQuestion: 'Docker comes up in this job. What is the closest thing you have done?' }),
    row({ skill: 'Python', weight: 'nice', status: 'partial', claimQuote: 'Worked on Python scripts', note: 'The job asks for Python. Your résumé mentions it only in a vague line: “Worked on Python scripts”.', probeQuestion: 'Your résumé says "Worked on Python scripts". What did you do yourself, and what changed because of it?' }),
  ],
  claims: [
    { id: 'c1', workspaceId: 'dev', createdAt: base.createdAt, quote: 'Worked on Python scripts', skills: ['Python'], hasNumber: false, vague: true },
    { id: 'c2', workspaceId: 'dev', createdAt: base.createdAt, quote: 'Built a Tableau dashboard that cut weekly reporting time from 6 hours to 1 hour', skills: ['Tableau'], hasNumber: true, vague: false },
  ],
  probes: [],
}
