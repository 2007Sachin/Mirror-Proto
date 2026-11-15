import type { Skill } from '../repo/types.js'
import { DICTIONARY } from './scout.js'

export interface Claim { quote: string; skills: string[]; hasNumber: boolean; vague: boolean }
export interface MatchRow {
  skill: string
  area: string
  weight: 'core' | 'nice'
  status: 'covered' | 'partial' | 'gap'
  claimQuote: string | null
  note: string
  probeQuestion: string | null
  source: 'ai' | 'fallback'
}

const MAX_CLAIM = 220
const MAX_PROBE_QUOTE = 160

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g
const ACTION = /\b(built|build|led|lead|reduced|automated|automate|analy[sz]ed|designed|shipped|owned|managed|launched|improved|created|developed|wrote|ran|delivered|cut|increased|grew|saved|migrated|implemented|optimi[sz]ed|presented|trained|negotiated|forecast|forecasted|streamlined|established|drove|scaled|replaced|resolved|coordinated)\b/i
const RESULT = /\b(reduced|cut|increased|grew|saved|improved|doubled|halved|faster|from\s+\S+\s+to\s+\S+)\b/i
const WEAK = /\b(helped(?: with)?|assisted|worked (?:on|with)|was responsible for|responsible for|familiar with|exposure to|various|involved in|participated in|duties included|team player|hard[- ]working|results[- ]driven)\b/i
const SPLIT = /(?<=[.!?])\s+|\s*[•·▪●◦–]\s*|\s+-\s+|\b(?:[A-Z]{2,}\s+)*(?:EXPERIENCE|SKILLS|EDUCATION|PROJECTS|SUMMARY|CERTIFICATIONS|ACHIEVEMENTS)\b:?/

/** The résumé with emails and phone numbers removed (each leaves a split point), whitespace collapsed. Claims are substrings of this. */
export function cleanResume(text: string): string {
  return text.replace(EMAIL, ' · ').replace(PHONE, ' · ').replace(/\s+/g, ' ').trim()
}

const trimEdges = (s: string) => s.replace(/^[\s,:;|·]+|[\s|·,;:]+$/g, '')

function clipAtWord(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return trimEdges(space > max / 2 ? cut.slice(0, space) : cut)
}

const skillsIn = (s: string) => DICTIONARY.filter(d => [...s.matchAll(d.re)].length > 0).map(d => d.name)

/** The derived flags of one résumé line. `hasVerb` is only used to decide whether a line is a claim at all. */
export function describeClaim(quote: string): Claim & { hasVerb: boolean } {
  const skills = skillsIn(quote)
  const hasNumber = /\d/.test(quote)
  const hasVerb = ACTION.test(quote)
  const bareList = !hasVerb && !hasNumber && skills.length > 0
  const vague = (WEAK.test(quote) && !hasNumber) || bareList
  return { quote, skills, hasNumber, vague, hasVerb }
}

export function extractClaims(resumeText: string): Claim[] {
  const claims: Claim[] = []
  for (const piece of cleanResume(resumeText).split(SPLIT)) {
    if (!piece) continue
    const quote = clipAtWord(trimEdges(piece), MAX_CLAIM)
    if (quote.length < 12) continue
    const { hasVerb, ...claim } = describeClaim(quote)
    if (!hasVerb && !claim.hasNumber && claim.skills.length === 0) continue
    claims.push(claim)
  }
  return claims
}

/** A short piece of the learner's own line for a question: at most 160 chars, at a word edge, never past a quote mark. */
export function probeQuote(quote: string): string {
  const q = quote.split(/["“”]/)[0].trim()
  return clipAtWord(q, MAX_PROBE_QUOTE)
}

const hasResult = (c: Claim) => c.hasNumber || RESULT.test(c.quote)

export function matchClaims(skills: Skill[], claims: Claim[]): MatchRow[] {
  const ordered = [...skills.filter(s => s.weight === 'core'), ...skills.filter(s => s.weight !== 'core')]
  return ordered.map(s => {
    const named = claims.filter(c => c.skills.includes(s.name))
    const base = { skill: s.name, area: s.area, weight: s.weight, source: 'fallback' as const }
    const strong = named.find(c => !c.vague && hasResult(c))
    if (strong) {
      return { ...base, status: 'covered' as const, claimQuote: strong.quote, note: `The job asks for ${s.name}. Your résumé says “${probeQuote(strong.quote)}”, which names what changed.`, probeQuestion: null }
    }
    const weak = named.find(c => !c.vague) ?? named[0]
    if (weak) {
      const q = probeQuote(weak.quote)
      if (weak.vague) {
        return { ...base, status: 'partial' as const, claimQuote: weak.quote, note: `The job asks for ${s.name}. Your résumé mentions it only in a vague line: “${q}”.`, probeQuestion: `Your résumé says "${q}". What did you do yourself, and what changed because of it?` }
      }
      return { ...base, status: 'partial' as const, claimQuote: weak.quote, note: `The job asks for ${s.name}. Your résumé says “${q}” but does not say what changed.`, probeQuestion: `What numbers could you put on "${q}"?` }
    }
    const core = s.weight === 'core'
    return {
      ...base,
      status: 'gap' as const,
      claimQuote: null,
      note: `${s.name} is ${core ? 'a core requirement' : 'a nice-to-have'} here and does not appear on your résumé.`,
      probeQuestion: core ? `${s.name} comes up in this job. What is the closest thing you have done?` : null,
    }
  })
}

/** Fragments inside straight or curly double quotes. */
export const quotedFragments = (text: string): string[] =>
  [...text.matchAll(/"([^"]+)"|“([^”]+)”/g)].map(m => m[1] ?? m[2])

/** AI rewrites are kept only when every quoted piece is the learner's own words, verbatim. */
export function acceptProbe(question: string, resume: string): boolean {
  const q = question.trim()
  if (q.length < 8 || q.length > 300 || !q.endsWith('?')) return false
  if (/\b(agentic|evidence|reflect\w*|evaluat\w*)\b/i.test(q) || /\d\s?%|\bpercent(age)?\b|\bof \d+\b|\b\d+ questions?\b/i.test(q)) return false
  return quotedFragments(q).every(f => resume.includes(f))
}
