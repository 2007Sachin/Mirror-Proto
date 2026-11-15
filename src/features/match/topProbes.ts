import type { MatchProbe } from '../../lib/matchApi'

interface Row { skill: string; weight: 'core' | 'nice'; status: 'covered' | 'partial' | 'gap'; claimQuote: string | null; probeQuestion: string | null }

/** The weakest résumé lines as questions: core gaps, then core partials, then nice partials. Pure. */
export function topProbes(matches: Row[], n: number): MatchProbe[] {
  const rank = (m: Row) => (m.weight === 'core' ? (m.status === 'gap' ? 0 : 1) : 2)
  return matches
    .filter(m => m.probeQuestion && m.status !== 'covered')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, Math.max(0, n))
    .map(m => ({ skill: m.skill, quote: m.claimQuote, question: m.probeQuestion as string }))
}
